export const AI_ERROR_CODES = [
  "AI_DISABLED",
  "AI_NOT_CONFIGURED",
  "AI_PROVIDER_UNSUPPORTED",
  "AI_MODEL_UNSUPPORTED",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_PROVIDER_ERROR",
  "AI_RATE_LIMITED",
  "AI_BUDGET_EXHAUSTED",
  "AI_TOOL_ERROR",
  "AI_TOOL_LIMIT",
  "AI_TIMEOUT",
  "AI_BAD_REQUEST",
  "AI_RESPONSE_INVALID",
] as const;

export type AIErrorCode = (typeof AI_ERROR_CODES)[number];
export type AIProviderId = "gemini" | "openai" | "deepseek";
export type AIProviderHealthStatus =
  | "NOT_CHECKED"
  | "CONNECTED"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "INVALID_CREDENTIAL"
  | "UNSUPPORTED_MODEL"
  | "PROVIDER_ERROR"
  | "BLOCKED";
export type AIMessageRole = "user" | "assistant";

export interface AIConversationMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AIToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface AIToolSource {
  label: string;
  href?: string;
  asOf?: string | null;
  reference?: string;
}

export interface AIToolResult {
  status: "known" | "unknown" | "unavailable";
  data: unknown;
  source: AIToolSource;
}

export interface AIProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number | null;
}

export interface AIProviderRequest {
  systemPrompt: string;
  messages: AIConversationMessage[];
  tools: AIToolDefinition[];
  toolResults: Array<{
    callId: string;
    toolName: string;
    input: unknown;
    result: AIToolResult;
  }>;
  maxOutputCharacters: number;
  maxOutputTokens: number;
  safetyIdentifier?: string;
  signal: AbortSignal;
}

export type AIProviderResponse =
  | {
      type: "final";
      kind: "clarification" | "refusal" | "tool_based";
      text: string;
      usage?: AIProviderUsage;
    }
  | {
      type: "tool_calls";
      calls: AIToolCall[];
      usage?: AIProviderUsage;
    };

export interface AIProviderAdapter {
  readonly provider: string;
  readonly model: string;
  readonly configured: boolean;
  generate(request: AIProviderRequest): Promise<AIProviderResponse>;
}

export interface AIModelDefinition {
  id: string;
  label: string;
  provider: AIProviderId;
  enabled: boolean;
  supportsTools: boolean;
  pricing?: {
    inputUsdPerMillion?: number;
    outputUsdPerMillion?: number;
  };
}

export interface AIProviderDefinition {
  id: AIProviderId;
  label: string;
  credentialEnv: "GEMINI_API_KEY" | "OPENAI_API_KEY" | "DEEPSEEK_API_KEY";
  enabled: boolean;
  supportsTools: boolean;
  models: readonly AIModelDefinition[];
}

export interface AIPublicSource {
  label: string;
  href?: string;
  asOf?: string | null;
}

export interface AssistantAnswer {
  answer: string;
  sources: AIPublicSource[];
  usage?: AIProviderUsage;
  toolCalls: number;
  toolNames: string[];
  responseKind: "clarification" | "refusal" | "tool_based";
  advisorOptions: import("@/features/ai/advisor/types").AdvisorOptionReference[];
}

export interface AIProviderConfig {
  status: "disabled" | "unconfigured" | "incomplete" | "unsupported" | "ready";
  provider: string | null;
  model: string | null;
  credentialConfigured: boolean;
  adapterSupported: boolean;
  rateLimiterConfigured: boolean;
  identitySaltConfigured: boolean;
  enabled: boolean;
  masterEnabled: boolean;
  runtimeEnabled: boolean;
  killSwitch: boolean;
  environmentAllowed: boolean;
  limits: {
    providerTimeoutMs: number;
    requestTimeoutMs: number;
    maxOutputTokens: number;
    perIpPerMinute: number;
    perSessionPerMinute: number;
    globalPerMinute: number;
    dailyRequests: number;
    dailyBudgetMicros: number;
    monthlyBudgetMicros: number;
    maxRequestReservationMicros: number;
  };
  message: string;
}
