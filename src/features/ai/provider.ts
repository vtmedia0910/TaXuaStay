import "server-only";

import { APPROVED_AI_MODEL, APPROVED_AI_PROVIDER, getAIProviderConfig } from "@/features/ai/config";
import { AssistantError } from "@/features/ai/errors";
import type {
  AIProviderAdapter,
  AIProviderRequest,
  AIProviderResponse,
  AIProviderUsage,
} from "@/features/ai/types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

interface OpenAIResponseItem {
  type?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: Array<{ type?: string; text?: string }>;
}

interface OpenAIResponseBody {
  status?: string;
  output?: OpenAIResponseItem[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

function normalizedUsage(body: OpenAIResponseBody): AIProviderUsage | undefined {
  const inputTokens = body.usage?.input_tokens;
  const outputTokens = body.usage?.output_tokens;
  if (!Number.isSafeInteger(inputTokens) || !Number.isSafeInteger(outputTokens)) return undefined;
  return { inputTokens, outputTokens };
}

function responseText(output: OpenAIResponseItem[]) {
  return output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function providerInput(request: AIProviderRequest) {
  return [
    ...request.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    ...request.toolResults.flatMap((item) => [
      {
        type: "function_call",
        call_id: item.callId,
        name: item.toolName,
        arguments: JSON.stringify(item.input),
      },
      {
        type: "function_call_output",
        call_id: item.callId,
        output: JSON.stringify(item.result),
      },
    ]),
  ];
}

export class OpenAIResponsesAdapter implements AIProviderAdapter {
  readonly configured = true;
  readonly provider = APPROVED_AI_PROVIDER;

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    let response: Response;
    try {
      response = await this.fetcher(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          instructions: request.systemPrompt,
          input: providerInput(request),
          tools: request.tools.map((tool) => ({
            type: "function",
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
            strict: false,
          })),
          tool_choice: request.tools.length ? "auto" : "none",
          parallel_tool_calls: false,
          max_output_tokens: request.maxOutputTokens,
          safety_identifier: request.safetyIdentifier,
          store: false,
        }),
        cache: "no-store",
        signal: request.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new AssistantError("AI_TIMEOUT", 504);
      throw new AssistantError("AI_PROVIDER_UNAVAILABLE", 503);
    }

    if (response.status === 429) throw new AssistantError("AI_PROVIDER_UNAVAILABLE", 503);
    if (!response.ok) throw new AssistantError("AI_PROVIDER_ERROR", 503);

    let body: OpenAIResponseBody;
    try {
      body = await response.json() as OpenAIResponseBody;
    } catch {
      throw new AssistantError("AI_PROVIDER_ERROR", 503);
    }
    if (body.status !== "completed" || !Array.isArray(body.output)) {
      throw new AssistantError("AI_RESPONSE_INVALID", 502);
    }

    const usage = normalizedUsage(body);
    const calls = body.output.filter((item) => item.type === "function_call");
    if (calls.length) {
      return {
        type: "tool_calls",
        usage,
        calls: calls.map((call) => {
          if (!call.call_id || !call.name || typeof call.arguments !== "string") {
            throw new AssistantError("AI_RESPONSE_INVALID", 502);
          }
          let input: unknown;
          try { input = JSON.parse(call.arguments); } catch { throw new AssistantError("AI_RESPONSE_INVALID", 502); }
          return { id: call.call_id, name: call.name, input };
        }),
      };
    }

    const text = responseText(body.output);
    if (!text) throw new AssistantError("AI_RESPONSE_INVALID", 502);
    if (!request.toolResults.length) {
      const clarification = text.match(/^CLARIFY:\s*([\s\S]+)$/i);
      if (clarification?.[1]?.trim()) {
        return { type: "final", kind: "clarification", text: clarification[1].trim(), usage };
      }
      const refusal = text.match(/^REFUSAL:\s*([\s\S]+)$/i);
      if (refusal?.[1]?.trim()) {
        return { type: "final", kind: "refusal", text: refusal[1].trim(), usage };
      }
      throw new AssistantError("AI_RESPONSE_INVALID", 502);
    }
    return {
      type: "final",
      kind: "tool_based",
      text,
      usage,
    };
  }
}

class UnconfiguredAIProviderAdapter implements AIProviderAdapter {
  readonly configured = false;

  constructor(
    readonly provider: string,
    readonly model: string,
  ) {}

  async generate(_request: AIProviderRequest): Promise<AIProviderResponse> {
    void _request;
    throw new AssistantError("AI_NOT_CONFIGURED", 503);
  }
}

export function createAIProviderAdapter(
  environment: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): AIProviderAdapter {
  const config = getAIProviderConfig(environment);
  const key = environment.AI_API_KEY?.trim();
  if (config.adapterSupported && key && config.model === APPROVED_AI_MODEL) {
    return new OpenAIResponsesAdapter(config.model, key, fetcher);
  }
  return new UnconfiguredAIProviderAdapter(
    config.provider ?? "unconfigured",
    config.model ?? "unconfigured",
  );
}

export async function checkAIProviderHealth(adapter: AIProviderAdapter, timeoutMs: number) {
  if (!adapter.configured) return { status: "unconfigured" as const, latencyMs: null, usage: undefined };
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await adapter.generate({
      systemPrompt: "Trả lời đúng chuỗi: CLARIFY: OK. Không gọi tool và không dùng dữ liệu khách hàng.",
      messages: [{ role: "user", content: "Health check" }],
      tools: [],
      toolResults: [],
      maxOutputCharacters: 16,
      maxOutputTokens: 32,
      signal: controller.signal,
    });
    if (response.type !== "final") throw new AssistantError("AI_RESPONSE_INVALID", 502);
    return { status: "connected" as const, latencyMs: Date.now() - startedAt, usage: response.usage };
  } catch (error) {
    const normalized = error instanceof AssistantError ? error : new AssistantError("AI_PROVIDER_ERROR", 503);
    const status = normalized.code === "AI_TIMEOUT"
      ? "timeout" as const
      : normalized.code === "AI_PROVIDER_UNAVAILABLE"
        ? "unavailable" as const
        : "provider_error" as const;
    return { status, latencyMs: Date.now() - startedAt, usage: undefined };
  } finally {
    clearTimeout(timeout);
  }
}
