import "server-only";

import type { AIProviderAdapter, AIProviderRequest, AIProviderResponse } from "@/features/ai/types";
import {
  AIProviderAdapterError,
  mapProviderFailure,
  normalizeFinalResponse,
  providerFetchFailure,
  safeIntegerUsage,
} from "@/features/ai/providers/shared";

const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";

interface DeepSeekToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

interface DeepSeekBody {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: DeepSeekToolCall[] };
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function messages(request: AIProviderRequest) {
  return [
    { role: "system", content: request.systemPrompt },
    ...request.messages.map((message) => ({ role: message.role, content: message.content })),
    ...request.toolResults.flatMap((item) => [
      {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: item.callId,
          type: "function",
          function: { name: item.toolName, arguments: JSON.stringify(item.input) },
        }],
      },
      { role: "tool", tool_call_id: item.callId, content: JSON.stringify(item.result) },
    ]),
  ];
}

export class DeepSeekAdapter implements AIProviderAdapter {
  readonly configured = true;
  readonly provider = "deepseek";

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    let response: Response;
    try {
      response = await this.fetcher(DEEPSEEK_CHAT_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: messages(request),
          tools: request.tools.map((tool) => ({
            type: "function",
            function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
          })),
          tool_choice: request.tools.length ? "auto" : "none",
          max_tokens: request.maxOutputTokens,
          stream: false,
        }),
        cache: "no-store",
        signal: request.signal,
      });
    } catch (error) {
      throw providerFetchFailure(error);
    }
    if (!response.ok) throw mapProviderFailure(response.status);
    let body: DeepSeekBody;
    try { body = await response.json() as DeepSeekBody; } catch {
      throw new AIProviderAdapterError("AI_PROVIDER_ERROR", 503, "PROVIDER_ERROR");
    }
    const message = body.choices?.[0]?.message;
    if (!message) throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
    const usage = safeIntegerUsage(body.usage?.prompt_tokens, body.usage?.completion_tokens);
    if (message.tool_calls?.length) {
      return {
        type: "tool_calls",
        usage,
        calls: message.tool_calls.map((call) => {
          if (call.type !== "function" || !call.id || !call.function?.name || typeof call.function.arguments !== "string") {
            throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
          }
          let input: unknown;
          try { input = JSON.parse(call.function.arguments); } catch {
            throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
          }
          return { id: call.id, name: call.function.name, input };
        }),
      };
    }
    return normalizeFinalResponse({
      text: message.content ?? "",
      hasToolResults: request.toolResults.length > 0,
      usage,
    });
  }
}
