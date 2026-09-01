export const AI_ERROR_CODES = [
  "AI_NOT_CONFIGURED",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_RATE_LIMITED",
  "AI_TOOL_ERROR",
  "AI_TIMEOUT",
  "AI_BAD_REQUEST",
  "AI_RESPONSE_INVALID",
] as const;

export type AIErrorCode = (typeof AI_ERROR_CODES)[number];
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
}

export interface AIProviderRequest {
  systemPrompt: string;
  messages: AIConversationMessage[];
  tools: AIToolDefinition[];
  toolResults: Array<{
    callId: string;
    toolName: string;
    result: AIToolResult;
  }>;
  maxOutputCharacters: number;
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

export interface AIPublicSource {
  label: string;
  href?: string;
  asOf?: string | null;
}

export interface AssistantAnswer {
  answer: string;
  sources: AIPublicSource[];
  usage?: AIProviderUsage;
}

export interface AIProviderConfig {
  status: "unconfigured" | "incomplete" | "unsupported";
  provider: string | null;
  model: string | null;
  credentialConfigured: boolean;
  message: string;
}
