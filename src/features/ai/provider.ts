import "server-only";

import { getAIProviderConfig } from "@/features/ai/config";
import { AssistantError } from "@/features/ai/errors";
import type { AIProviderAdapter, AIProviderRequest, AIProviderResponse } from "@/features/ai/types";

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
): AIProviderAdapter {
  const config = getAIProviderConfig(environment);
  return new UnconfiguredAIProviderAdapter(
    config.provider ?? "unconfigured",
    config.model ?? "unconfigured",
  );
}
