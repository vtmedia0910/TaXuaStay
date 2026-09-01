import "server-only";

import type {
  AIModelDefinition,
  AIProviderDefinition,
  AIProviderId,
} from "@/features/ai/types";

export const AI_PROVIDER_REGISTRY = [
  {
    id: "gemini",
    label: "Gemini",
    credentialEnv: "GEMINI_API_KEY",
    enabled: true,
    supportsTools: true,
    models: [
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        provider: "gemini",
        enabled: true,
        supportsTools: true,
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    credentialEnv: "OPENAI_API_KEY",
    enabled: true,
    supportsTools: true,
    models: [
      {
        id: "gpt-5-mini-2025-08-07",
        label: "GPT-5 mini · 2025-08-07",
        provider: "openai",
        enabled: true,
        supportsTools: true,
        pricing: { inputUsdPerMillion: 0.25, outputUsdPerMillion: 2 },
      },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    credentialEnv: "DEEPSEEK_API_KEY",
    enabled: true,
    supportsTools: true,
    models: [
      {
        id: "deepseek-v4-flash",
        label: "DeepSeek V4 Flash",
        provider: "deepseek",
        enabled: true,
        supportsTools: true,
      },
    ],
  },
] as const satisfies readonly AIProviderDefinition[];

export function isAIProviderId(value: string): value is AIProviderId {
  return AI_PROVIDER_REGISTRY.some((provider) => provider.id === value);
}

export function getAIProviderDefinition(provider: string | null | undefined) {
  return AI_PROVIDER_REGISTRY.find((item) => item.id === provider) ?? null;
}

export function getAIModelDefinition(provider: string | null | undefined, model: string | null | undefined): AIModelDefinition | null {
  return getAIProviderDefinition(provider)?.models.find((item) => item.id === model) ?? null;
}

export function isAISelectionActivatable(provider: string, model: string) {
  const providerDefinition = getAIProviderDefinition(provider);
  const modelDefinition = getAIModelDefinition(provider, model);
  return Boolean(
    providerDefinition?.enabled
    && providerDefinition.supportsTools
    && modelDefinition?.enabled
    && modelDefinition.supportsTools,
  );
}

export function getProviderCredential(
  provider: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const definition = getAIProviderDefinition(provider);
  if (!definition) return null;
  return environment[definition.credentialEnv]?.trim() || null;
}

export function getProviderCredentialStatuses(environment: NodeJS.ProcessEnv = process.env) {
  return AI_PROVIDER_REGISTRY.map((provider) => ({
    provider: provider.id,
    label: provider.label,
    configured: Boolean(environment[provider.credentialEnv]?.trim()),
  }));
}

export const SAFE_AI_PROVIDER_REGISTRY = AI_PROVIDER_REGISTRY.map((provider) => ({
  id: provider.id,
  label: provider.label,
  enabled: provider.enabled,
  supportsTools: provider.supportsTools,
  models: provider.models.map((model) => ({
    id: model.id,
    label: model.label,
    enabled: model.enabled,
    supportsTools: model.supportsTools,
  })),
}));
