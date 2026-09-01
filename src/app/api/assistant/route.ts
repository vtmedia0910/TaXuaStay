import { NextResponse } from "next/server";
import { createAIProviderAdapter } from "@/features/ai/provider";
import { runAssistant } from "@/features/ai/engine";
import { AssistantError, normalizeAssistantError } from "@/features/ai/errors";
import { recordAICompletion, recordAIRateLimit, recordAIRequest } from "@/features/ai/metrics";
import { consumeAssistantRateLimit, getAssistantClientIdentity } from "@/features/ai/rate-limit";
import { assistantRequestSchema } from "@/features/ai/schema";

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
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_REQUEST_BYTES) throw new AssistantError("AI_BAD_REQUEST", 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) throw new AssistantError("AI_BAD_REQUEST", 413);
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(raw); } catch { throw new AssistantError("AI_BAD_REQUEST", 400); }
    const parsed = assistantRequestSchema.safeParse(parsedJson);
    if (!parsed.success) throw new AssistantError("AI_BAD_REQUEST", 400);

    const limit = consumeAssistantRateLimit({
      ipHash: getAssistantClientIdentity(request.headers),
      sessionId: parsed.data.sessionId,
    });
    if (!limit.allowed) {
      recordAIRateLimit();
      const response = json({ error: { code: "AI_RATE_LIMITED", message: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng đợi một chút rồi thử lại." }, fallbacks: FALLBACKS }, { status: 429 });
      response.headers.set("retry-after", String(limit.retryAfterSeconds));
      recordAICompletion({ ok: false, latencyMs: Date.now() - startedAt });
      return response;
    }

    const answer = await runAssistant({
      message: parsed.data.message,
      history: parsed.data.history,
      adapter: createAIProviderAdapter(),
    });
    recordAICompletion({ ok: true, latencyMs: Date.now() - startedAt, usage: answer.usage });
    return json(answer);
  } catch (rawError) {
    const error = normalizeAssistantError(rawError);
    recordAICompletion({ ok: false, latencyMs: Date.now() - startedAt });
    return json({ error: { code: error.code, message: error.message }, fallbacks: FALLBACKS }, { status: error.status });
  }
}
