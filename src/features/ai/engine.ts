import "server-only";

import { ZodError } from "zod";
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

export const MAX_AI_TOOL_CALLS = 4;
export const MAX_AI_OUTPUT_CHARACTERS = 2_400;
export const AI_REQUEST_TIMEOUT_MS = 15_000;
export const AI_PROVIDER_TIMEOUT_MS = 12_000;

function mergeUsage(total: AIProviderUsage, next?: AIProviderUsage) {
  total.inputTokens = (total.inputTokens ?? 0) + (next?.inputTokens ?? 0);
  total.outputTokens = (total.outputTokens ?? 0) + (next?.outputTokens ?? 0);
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
}): Promise<AssistantAnswer> {
  const safetyReply = getDeterministicSafetyReply(input.message);
  if (safetyReply) return { answer: safetyReply, sources: [] };
  if (!input.adapter.configured) throw new AssistantError("AI_NOT_CONFIGURED", 503);

  const registry = input.tools ?? createAssistantToolRegistry();
  const toolDefinitions = [...registry.values()].map((tool) => tool.definition);
  const messages = [
    ...input.history.slice(-6).map((message) => ({ ...message, content: redactUserPII(message.content) })),
    { role: "user" as const, content: redactUserPII(input.message) },
  ];
  const toolResults: Parameters<AIProviderAdapter["generate"]>[0]["toolResults"] = [];
  const sources: AIPublicSource[] = [];
  const usage: AIProviderUsage = {};
  const startedAt = Date.now();
  let toolCallCount = 0;

  for (let round = 0; round <= MAX_AI_TOOL_CALLS; round += 1) {
    const elapsed = Date.now() - startedAt;
    const remaining = (input.requestTimeoutMs ?? AI_REQUEST_TIMEOUT_MS) - elapsed;
    if (remaining <= 0) throw new AssistantError("AI_TIMEOUT", 504);
    const response: AIProviderResponse = await generateWithTimeout(input.adapter, {
      systemPrompt: AI_SYSTEM_PROMPT,
      messages,
      tools: toolDefinitions,
      toolResults,
      maxOutputCharacters: MAX_AI_OUTPUT_CHARACTERS,
    }, Math.min(input.providerTimeoutMs ?? AI_PROVIDER_TIMEOUT_MS, remaining));
    mergeUsage(usage, response.usage);

    if (response.type === "final") {
      if (response.kind === "tool_based" && toolCallCount === 0) {
        throw new AssistantError("AI_RESPONSE_INVALID", 502);
      }
      const answer = sanitizeAssistantText(response.text, MAX_AI_OUTPUT_CHARACTERS);
      if (!answer) throw new AssistantError("AI_RESPONSE_INVALID", 502);
      return { answer, sources: publicSources(sources), usage };
    }

    if (!response.calls.length || toolCallCount + response.calls.length > MAX_AI_TOOL_CALLS) {
      throw new AssistantError("AI_RESPONSE_INVALID", 502);
    }
    const ids = new Set<string>();
    for (const call of response.calls) {
      if (!call.id || ids.has(call.id)) throw new AssistantError("AI_RESPONSE_INVALID", 502);
      ids.add(call.id);
      const tool = registry.get(call.name);
      if (!tool) throw new AssistantError("AI_RESPONSE_INVALID", 502);
      try {
        const result = await tool.execute(call.input);
        const safeResult = { ...result, data: sanitizeProviderContext(result.data) };
        toolResults.push({ callId: call.id, toolName: call.name, result: safeResult });
        sources.push({ label: result.source.label, href: result.source.href, asOf: result.source.asOf });
        recordAIToolUsage(call.name);
        toolCallCount += 1;
      } catch (error) {
        recordAIToolError();
        if (error instanceof ZodError) throw new AssistantError("AI_RESPONSE_INVALID", 502);
        throw new AssistantError("AI_TOOL_ERROR", 503);
      }
    }
  }

  throw new AssistantError("AI_RESPONSE_INVALID", 502);
}
