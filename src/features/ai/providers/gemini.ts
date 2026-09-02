import "server-only";

import type { AIProviderAdapter, AIProviderRequest, AIProviderResponse } from "@/features/ai/types";
import {
  AIProviderAdapterError,
  mapProviderFailure,
  normalizeFinalResponse,
  providerFetchFailure,
  safeIntegerUsage,
} from "@/features/ai/providers/shared";

const GEMINI_API_ORIGIN = "https://generativelanguage.googleapis.com";
const GEMINI_THINKING_BUDGETS: Readonly<Record<string, number>> = {
  "gemini-2.5-flash": 0,
};

function thinkingBudgetFor(model: string) {
  const budget = GEMINI_THINKING_BUDGETS[model];
  if (budget === undefined) {
    throw new AIProviderAdapterError("AI_PROVIDER_ERROR", 503, "UNSUPPORTED_MODEL");
  }
  return budget;
}

interface GeminiPart {
  text?: string;
  functionCall?: { id?: string; name?: string; args?: unknown };
}

interface GeminiBody {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
}

function outputTokenUsage(body: GeminiBody) {
  const candidates = body.usageMetadata?.candidatesTokenCount;
  const thoughts = body.usageMetadata?.thoughtsTokenCount;
  if (!Number.isSafeInteger(candidates) || Number(candidates) < 0) return candidates;
  if (thoughts === undefined) return candidates;
  if (!Number.isSafeInteger(thoughts) || Number(thoughts) < 0) return undefined;
  const total = Number(candidates) + Number(thoughts);
  return Number.isSafeInteger(total) ? total : undefined;
}

function contents(request: AIProviderRequest) {
  return [
    ...request.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    ...request.toolResults.flatMap((item) => [
      {
        role: "model",
        parts: [{ functionCall: { id: item.callId, name: item.toolName, args: item.input } }],
      },
      {
        role: "user",
        parts: [{ functionResponse: { id: item.callId, name: item.toolName, response: { result: item.result } } }],
      },
    ]),
  ];
}

export class GeminiAdapter implements AIProviderAdapter {
  readonly configured = true;
  readonly provider = "gemini";

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const thinkingBudget = thinkingBudgetFor(this.model);
    let response: Response;
    try {
      response = await this.fetcher(
        `${GEMINI_API_ORIGIN}/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.systemPrompt }] },
            contents: contents(request),
            tools: request.tools.length
              ? [{ functionDeclarations: request.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  // Application tools intentionally use JSON Schema. Gemini's `parameters`
                  // field accepts its narrower OpenAPI Schema dialect; passing JSON Schema
                  // keywords there causes the provider to reject the whole request.
                  parametersJsonSchema: tool.inputSchema,
                })) }]
              : undefined,
            toolConfig: request.tools.length
              ? { functionCallingConfig: { mode: "AUTO" } }
              : undefined,
            generationConfig: {
              maxOutputTokens: request.maxOutputTokens,
              // The current grounded assistant does not need hidden reasoning. Keeping this
              // explicit prevents Gemini 2.5 Flash's dynamic thinking from consuming the
              // bounded response budget and avoids thought-signature state in the tool loop.
              thinkingConfig: {
                thinkingBudget,
              },
            },
          }),
          cache: "no-store",
          signal: request.signal,
        },
      );
    } catch (error) {
      throw providerFetchFailure(error);
    }
    if (!response.ok) throw mapProviderFailure(response.status);
    let body: GeminiBody;
    try { body = await response.json() as GeminiBody; } catch {
      throw new AIProviderAdapterError("AI_PROVIDER_ERROR", 503, "PROVIDER_ERROR");
    }
    const parts = body.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
      throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
    }
    const usage = safeIntegerUsage(
      body.usageMetadata?.promptTokenCount,
      outputTokenUsage(body),
    );
    const calls = parts.filter((part) => part.functionCall);
    if (calls.length) {
      return {
        type: "tool_calls",
        usage,
        calls: calls.map((part, index) => {
          const call = part.functionCall;
          if (!call?.name || call.args === undefined) {
            throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
          }
          return {
            id: call.id || `gemini-${request.toolResults.length}-${index}`,
            name: call.name,
            input: call.args,
          };
        }),
      };
    }
    return normalizeFinalResponse({
      text: parts.map((part) => part.text ?? "").join("\n"),
      hasToolResults: request.toolResults.length > 0,
      usage,
    });
  }
}
