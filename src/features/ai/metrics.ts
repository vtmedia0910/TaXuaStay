import "server-only";

import type { AIProviderUsage } from "@/features/ai/types";

interface MutableAIMetrics {
  startedAt: string;
  requests: number;
  successes: number;
  failures: number;
  rateLimited: number;
  toolErrors: number;
  totalLatencyMs: number;
  lastLatencyMs: number | null;
  lastSuccessAt: string | null;
  inputTokens: number;
  outputTokens: number;
  toolUsage: Record<string, number>;
}

const store: MutableAIMetrics = {
  startedAt: new Date().toISOString(), requests: 0, successes: 0, failures: 0,
  rateLimited: 0, toolErrors: 0, totalLatencyMs: 0, lastLatencyMs: null,
  lastSuccessAt: null, inputTokens: 0, outputTokens: 0, toolUsage: {},
};

export function recordAIRequest() { store.requests += 1; }
export function recordAIRateLimit() { store.rateLimited += 1; }
export function recordAIToolUsage(name: string) { store.toolUsage[name] = (store.toolUsage[name] ?? 0) + 1; }
export function recordAIToolError() { store.toolErrors += 1; }
export function recordAICompletion(input: { ok: boolean; latencyMs: number; usage?: AIProviderUsage }) {
  if (input.ok) { store.successes += 1; store.lastSuccessAt = new Date().toISOString(); }
  else store.failures += 1;
  store.lastLatencyMs = input.latencyMs;
  store.totalLatencyMs += input.latencyMs;
  store.inputTokens += input.usage?.inputTokens ?? 0;
  store.outputTokens += input.usage?.outputTokens ?? 0;
}
export function getAIMetricsSnapshot() {
  return {
    ...store,
    averageLatencyMs: store.successes + store.failures
      ? Math.round(store.totalLatencyMs / (store.successes + store.failures)) : null,
    toolUsage: { ...store.toolUsage },
  };
}
export function resetAIMetricsForTests() {
  Object.assign(store, {
    startedAt: new Date().toISOString(), requests: 0, successes: 0, failures: 0,
    rateLimited: 0, toolErrors: 0, totalLatencyMs: 0, lastLatencyMs: null,
    lastSuccessAt: null, inputTokens: 0, outputTokens: 0, toolUsage: {},
  });
}
