import "server-only";

import { ZodError } from "zod";
import { extractAdvisorOptionReferences } from "@/features/ai/advisor/policy";
import { AssistantError } from "@/features/ai/errors";
import { recordAIToolError, recordAIToolUsage } from "@/features/ai/metrics";
import { AI_SYSTEM_PROMPT } from "@/features/ai/prompt";
import { getDeterministicSafetyReply, redactUserPII, sanitizeAssistantText, sanitizeProviderContext } from "@/features/ai/sanitization";
import { createAssistantToolRegistry, type AssistantTool } from "@/features/ai/tools";
import type {
  AIConversationMessage,
  AIProviderAdapter,
  AIProviderResponse,
  AIProviderUsage,
  AIPublicSource,
  AssistantAnswer,
} from "@/features/ai/types";
import type { AssistantPageContext } from "@/features/ai/discovery";

export const MAX_AI_TOOL_ROUNDS = 4;
export const MAX_AI_TOOL_CALLS = 8;
export const MAX_AI_REPEAT_TOOL_CALLS = 3;
export const MAX_AI_OUTPUT_CHARACTERS = 3_200;
export const MAX_AI_OUTPUT_TOKENS = 800;
export const AI_REQUEST_TIMEOUT_MS = 18_000;
export const AI_PROVIDER_TIMEOUT_MS = 12_000;

function mergeUsage(total: AIProviderUsage, next?: AIProviderUsage) {
  if (next?.inputTokens !== undefined) {
    total.inputTokens = (total.inputTokens ?? 0) + next.inputTokens;
  }
  if (next?.outputTokens !== undefined) {
    total.outputTokens = (total.outputTokens ?? 0) + next.outputTokens;
  }
  if (next?.estimatedCostUsd !== undefined && next.estimatedCostUsd !== null) {
    total.estimatedCostUsd = (total.estimatedCostUsd ?? 0) + next.estimatedCostUsd;
  }
}

function publicSources(values: AIPublicSource[]) {
  const unique = new Map<string, AIPublicSource>();
  for (const item of values) {
    const key = `${item.label}|${item.href ?? ""}|${item.asOf ?? ""}`;
    unique.set(key, item);
  }
  return [...unique.values()].slice(0, 6);
}

async function generateWithTimeout(
  adapter: AIProviderAdapter,
  request: Omit<Parameters<AIProviderAdapter["generate"]>[0], "signal">,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      adapter.generate({ ...request, signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new AssistantError("AI_TIMEOUT", 504));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function runAssistant(input: {
  message: string;
  history: AIConversationMessage[];
  adapter: AIProviderAdapter;
  tools?: Map<string, AssistantTool>;
  providerTimeoutMs?: number;
  requestTimeoutMs?: number;
  maxOutputTokens?: number;
  safetyIdentifier?: string;
  systemPrompt?: string;
  pageContext?: AssistantPageContext;
}): Promise<AssistantAnswer> {
  const safetyReply = getDeterministicSafetyReply(input.message);
  if (safetyReply) return { answer: safetyReply, sources: [], toolCalls: 0, toolNames: [], responseKind: "refusal", advisorOptions: [] };
  if (!input.adapter.configured) throw new AssistantError("AI_NOT_CONFIGURED", 503);

  const registry = input.tools ?? createAssistantToolRegistry();
  const toolDefinitions = [...registry.values()].map((tool) => tool.definition);
  const pageContextHint = input.pageContext
    ? `Bối cảnh trang công khai (chỉ là gợi ý điều hướng, không phải dữ kiện kinh doanh): ${JSON.stringify(input.pageContext)}`
    : null;
  const messages = [
    ...input.history.slice(-6).map((message) => ({ ...message, content: redactUserPII(message.content) })),
    {
      role: "user" as const,
      content: [pageContextHint, `Câu hỏi của khách: ${redactUserPII(input.message)}`].filter(Boolean).join("\n"),
    },
  ];
  const toolResults: Parameters<AIProviderAdapter["generate"]>[0]["toolResults"] = [];
  const sources: AIPublicSource[] = [];
  const usage: AIProviderUsage = {};
  const startedAt = Date.now();
  let toolCallCount = 0;
  let toolRoundCount = 0;
  const repeatedToolCalls = new Map<string, number>();
  const toolNames = new Set<string>();
  const advisorOptions = new Map<string, ReturnType<typeof extractAdvisorOptionReferences>[number]>();

  for (let round = 0; round <= MAX_AI_TOOL_ROUNDS; round += 1) {
    const elapsed = Date.now() - startedAt;
    const remaining = (input.requestTimeoutMs ?? AI_REQUEST_TIMEOUT_MS) - elapsed;
    if (remaining <= 0) throw new AssistantError("AI_TIMEOUT", 504);
    const response: AIProviderResponse = await generateWithTimeout(input.adapter, {
      systemPrompt: input.systemPrompt ?? AI_SYSTEM_PROMPT,
      messages,
      tools: toolDefinitions,
      toolResults,
      maxOutputCharacters: MAX_AI_OUTPUT_CHARACTERS,
      maxOutputTokens: input.maxOutputTokens ?? MAX_AI_OUTPUT_TOKENS,
      safetyIdentifier: input.safetyIdentifier,
    }, Math.min(input.providerTimeoutMs ?? AI_PROVIDER_TIMEOUT_MS, remaining));
    mergeUsage(usage, response.usage);

    if (response.type === "final") {
      if (response.kind === "tool_based" && toolCallCount === 0) {
        throw new AssistantError("AI_RESPONSE_INVALID", 502);
      }
      const answer = sanitizeAssistantText(response.text, MAX_AI_OUTPUT_CHARACTERS);
      if (!answer) throw new AssistantError("AI_RESPONSE_INVALID", 502);
      return {
        answer,
        sources: publicSources(sources),
        usage,
        toolCalls: toolCallCount,
        toolNames: [...toolNames],
        responseKind: response.kind,
        advisorOptions: [...advisorOptions.values()].slice(0, 3),
      };
    }

    toolRoundCount += 1;
    if (toolRoundCount > MAX_AI_TOOL_ROUNDS) throw new AssistantError("AI_TOOL_LIMIT", 502);
    if (!response.calls.length || toolCallCount + response.calls.length > MAX_AI_TOOL_CALLS) {
      throw new AssistantError("AI_TOOL_LIMIT", 502);
    }
    const ids = new Set<string>();
    for (const call of response.calls) {
      if (!call.id || ids.has(call.id)) throw new AssistantError("AI_RESPONSE_INVALID", 502);
      ids.add(call.id);
      const tool = registry.get(call.name);
      if (!tool) throw new AssistantError("AI_RESPONSE_INVALID", 502);
      const repeats = (repeatedToolCalls.get(call.name) ?? 0) + 1;
      if (repeats > MAX_AI_REPEAT_TOOL_CALLS) throw new AssistantError("AI_TOOL_LIMIT", 502);
      repeatedToolCalls.set(call.name, repeats);
      try {
        const result = await tool.execute(call.input);
        const safeResult = { ...result, data: sanitizeProviderContext(result.data) };
        for (const option of extractAdvisorOptionReferences(call.name, safeResult.data)) {
          advisorOptions.set(`${option.kind}:${option.publicSlug}`, option);
        }
        toolResults.push({ callId: call.id, toolName: call.name, input: call.input, result: safeResult });
        sources.push({ label: result.source.label, href: result.source.href, asOf: result.source.asOf });
        recordAIToolUsage(call.name);
        toolNames.add(call.name);
        toolCallCount += 1;
      } catch (error) {
        recordAIToolError();
        if (error instanceof ZodError) throw new AssistantError("AI_RESPONSE_INVALID", 502);
        throw new AssistantError("AI_TOOL_ERROR", 503);
      }
    }
  }

  throw new AssistantError("AI_TOOL_LIMIT", 502);
}
