import "server-only";

import type { AIProviderConfig } from "@/features/ai/types";

export function getAIProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AIProviderConfig {
  const provider = environment.AI_PROVIDER?.trim() || null;
  const model = environment.AI_MODEL?.trim() || null;
  const credentialConfigured = Boolean(environment.AI_API_KEY?.trim());
  const configuredCount = Number(Boolean(provider)) + Number(Boolean(model)) + Number(credentialConfigured);

  if (configuredCount === 0) {
    return {
      status: "unconfigured",
      provider: null,
      model: null,
      credentialConfigured: false,
      message: "Chưa cấu hình AI_PROVIDER, AI_MODEL và AI_API_KEY.",
    };
  }
  if (configuredCount < 3) {
    return {
      status: "incomplete",
      provider,
      model,
      credentialConfigured,
      message: "Cấu hình AI chưa đầy đủ; hệ thống đang khóa an toàn.",
    };
  }
  return {
    status: "unsupported",
    provider,
    model,
    credentialConfigured,
    message: "Chưa có adapter đã duyệt cho provider này; hệ thống đang khóa an toàn.",
  };
}
