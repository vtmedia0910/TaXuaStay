import { NextResponse } from "next/server";
import { getAIConfigurationError, getAIProviderConfig } from "@/features/ai/config";
import { createAIControlStore, type AIControlStore } from "@/features/ai/control-store";
import { estimateAIUsageCostMicros } from "@/features/ai/cost";
import { createAIProviderAdapter } from "@/features/ai/provider";
import { runAssistant } from "@/features/ai/engine";
import { AssistantError, normalizeAssistantError } from "@/features/ai/errors";
import { recordAICompletion, recordAIRateLimit, recordAIRequest } from "@/features/ai/metrics";
import { getAssistantClientIdentity, getAssistantSessionIdentity } from "@/features/ai/rate-limit";
import { assistantRequestSchema } from "@/features/ai/schema";
import type { AIErrorCode, AIProviderUsage } from "@/features/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 16_384;
const FALLBACKS = [
  { label: "Tìm chuyến đi", href: "/trip-finder" },
  { label: "Xem Lưu trú", href: "/stay" },
  { label: "Cách mở My Trip", href: "/assistant#my-trip-help" },
] as const;

function json(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("cache-control", "no-store, private");
  response.headers.set("x-content-type-options", "nosniff");
  return response;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  recordAIRequest();
  let controls: AIControlStore | null = null;
  let reservationMicros = 0;
  let usage: AIProviderUsage | undefined;
  let toolCalls = 0;
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_REQUEST_BYTES) throw new AssistantError("AI_BAD_REQUEST", 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) throw new AssistantError("AI_BAD_REQUEST", 413);
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(raw); } catch { throw new AssistantError("AI_BAD_REQUEST", 400); }
    const parsed = assistantRequestSchema.safeParse(parsedJson);
    if (!parsed.success) throw new AssistantError("AI_BAD_REQUEST", 400);

    const config = getAIProviderConfig();
    const configurationError = getAIConfigurationError(config);
    if (configurationError) throw new AssistantError(configurationError, 503);
    const salt = process.env.AI_IDENTITY_HASH_SALT?.trim();
    if (!salt) throw new AssistantError("AI_NOT_CONFIGURED", 503);
    controls = createAIControlStore(config);
    if (!controls) throw new AssistantError("AI_NOT_CONFIGURED", 503);

    const admission = await controls.admit({
      ipHash: getAssistantClientIdentity(request.headers, salt),
      sessionHash: getAssistantSessionIdentity(parsed.data.sessionId, salt),
    });
    if (!admission.allowed) {
      const isRateLimit = admission.reason?.startsWith("rate_");
      const code: AIErrorCode = isRateLimit ? "AI_RATE_LIMITED" : "AI_BUDGET_EXHAUSTED";
      try {
        await controls.recordBlocked(isRateLimit ? "rate_limited" : "budget_blocked", code);
      } catch {
        // The atomic admission decision is authoritative even if its follow-up metric cannot be written.
      }
      if (isRateLimit) recordAIRateLimit();
      const error = new AssistantError(code, isRateLimit ? 429 : 503);
      const response = json({ error: { code: error.code, message: error.message }, fallbacks: FALLBACKS }, { status: error.status });
      if (admission.retryAfterSeconds) response.headers.set("retry-after", String(admission.retryAfterSeconds));
      recordAICompletion({ ok: false, latencyMs: Date.now() - startedAt });
      return response;
    }
    reservationMicros = admission.reservationMicros;

    const answer = await runAssistant({
      message: parsed.data.message,
      history: parsed.data.history,
      adapter: createAIProviderAdapter(),
      providerTimeoutMs: config.limits.providerTimeoutMs,
      requestTimeoutMs: config.limits.requestTimeoutMs,
      maxOutputTokens: config.limits.maxOutputTokens,
      safetyIdentifier: getAssistantSessionIdentity(parsed.data.sessionId, salt)
        ?? getAssistantClientIdentity(request.headers, salt),
    });
    usage = answer.usage;
    toolCalls = answer.toolCalls;
    const actualCostMicros = estimateAIUsageCostMicros(config.provider ?? "", config.model ?? "", usage);
    try {
      await controls.finalize({
        ok: true,
        reservationMicros,
        actualCostMicros,
        usage,
        toolCalls,
        latencyMs: Date.now() - startedAt,
      });
      reservationMicros = 0;
    } catch {
      // Admission already reserved a conservative maximum, so returning the safe answer cannot overspend.
    }
    recordAICompletion({ ok: true, latencyMs: Date.now() - startedAt, usage });
    return json({ answer: answer.answer, sources: answer.sources });
  } catch (rawError) {
    const error = normalizeAssistantError(rawError);
    if (controls && reservationMicros) {
      try {
        await controls.finalize({
          ok: false,
          reservationMicros,
          actualCostMicros: null,
          usage,
          toolCalls,
          latencyMs: Date.now() - startedAt,
          errorCode: error.code,
        });
      } catch {
        // Keep the conservative reservation when shared accounting is unavailable.
      }
    }
    recordAICompletion({ ok: false, latencyMs: Date.now() - startedAt });
    return json({ error: { code: error.code, message: error.message }, fallbacks: FALLBACKS }, { status: error.status });
  }
}
