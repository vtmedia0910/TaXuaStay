import "server-only";

import type { AIProviderAdapter, AIProviderRequest, AIProviderResponse } from "@/features/ai/types";
import {
  AIProviderAdapterError,
  mapProviderFailure,
  normalizeFinalResponse,
  providerFetchFailure,
  safeIntegerUsage,
} from "@/features/ai/providers/shared";

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

function providerInput(request: AIProviderRequest) {
  return [
    ...request.messages.map((message) => ({ role: message.role, content: message.content })),
    ...request.toolResults.flatMap((item) => [
      { type: "function_call", call_id: item.callId, name: item.toolName, arguments: JSON.stringify(item.input) },
      { type: "function_call_output", call_id: item.callId, output: JSON.stringify(item.result) },
    ]),
  ];
}

export class OpenAIResponsesAdapter implements AIProviderAdapter {
  readonly configured = true;
  readonly provider = "openai";

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
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
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
      throw providerFetchFailure(error);
    }
    if (!response.ok) throw mapProviderFailure(response.status);

    let body: OpenAIResponseBody;
    try { body = await response.json() as OpenAIResponseBody; } catch {
      throw new AIProviderAdapterError("AI_PROVIDER_ERROR", 503, "PROVIDER_ERROR");
    }
    if (body.status !== "completed" || !Array.isArray(body.output)) {
      throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
    }
    const usage = safeIntegerUsage(body.usage?.input_tokens, body.usage?.output_tokens);
    const calls = body.output.filter((item) => item.type === "function_call");
    if (calls.length) {
      return {
        type: "tool_calls",
        usage,
        calls: calls.map((call) => {
          if (!call.call_id || !call.name || typeof call.arguments !== "string") {
            throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
          }
          let input: unknown;
          try { input = JSON.parse(call.arguments); } catch {
            throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
          }
          return { id: call.call_id, name: call.name, input };
        }),
      };
    }
    const text = body.output
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n");
    return normalizeFinalResponse({ text, hasToolResults: request.toolResults.length > 0, usage });
  }
}
