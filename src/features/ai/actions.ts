"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { APPROVED_AI_MODEL, APPROVED_AI_PROVIDER, getAIProviderConfig } from "@/features/ai/config";
import { createAIControlStore } from "@/features/ai/control-store";
import { estimateAIUsageCostMicros } from "@/features/ai/cost";
import { checkAIProviderHealth, createAIProviderAdapter } from "@/features/ai/provider";
import { hashAssistantIdentity } from "@/features/ai/rate-limit";

const integrationPath = "/admin/integrations/ai";

function finish(result: "connected" | "timeout" | "unavailable" | "provider_error" | "blocked"): never {
  revalidatePath(integrationPath);
  redirect(`${integrationPath}?health=${result}`);
}

export async function checkAIProviderHealthAction() {
  const user = await requireAdminUser(["admin"], `${integrationPath}?health=forbidden`);
  const config = getAIProviderConfig();
  if (config.killSwitch || !config.environmentAllowed) finish("blocked");
  if (
    config.provider !== APPROVED_AI_PROVIDER
    || config.model !== APPROVED_AI_MODEL
    || !config.credentialConfigured
    || !config.rateLimiterConfigured
    || !config.identitySaltConfigured
  ) finish("blocked");

  const controls = createAIControlStore(config);
  const salt = process.env.AI_IDENTITY_HASH_SALT?.trim();
  if (!controls || !salt) finish("blocked");

  const identity = hashAssistantIdentity(`admin-health:${user.id}`, salt);
  let reservationMicros = 0;
  let finalStatus: "connected" | "timeout" | "unavailable" | "provider_error" | "blocked" = "provider_error";
  try {
    const admission = await controls.admit({ ipHash: identity, sessionHash: identity });
    if (!admission.allowed) {
      try {
        await controls.recordBlocked(
          admission.reason?.startsWith("rate_") ? "rate_limited" : "budget_blocked",
          admission.reason?.startsWith("rate_") ? "AI_RATE_LIMITED" : "AI_BUDGET_EXHAUSTED",
        );
      } catch {
        // Admission is authoritative even when the follow-up aggregate metric is unavailable.
      }
      finalStatus = "blocked";
    } else {
      reservationMicros = admission.reservationMicros;
      const checkedAt = new Date().toISOString();
      const result = await checkAIProviderHealth(createAIProviderAdapter(), config.limits.providerTimeoutMs);
      const actualCostMicros = estimateAIUsageCostMicros(config.provider, config.model, result.usage);
      await controls.finalize({
        ok: result.status === "connected",
        reservationMicros,
        actualCostMicros,
        usage: result.usage,
        toolCalls: 0,
        latencyMs: result.latencyMs ?? 0,
        errorCode: result.status === "connected" ? undefined : "AI_PROVIDER_ERROR",
      });
      reservationMicros = 0;
      await controls.recordProviderHealth({ status: result.status, checkedAt, latencyMs: result.latencyMs });
      finalStatus = result.status === "unconfigured" ? "blocked" : result.status;
    }
  } catch {
    if (reservationMicros) {
      try {
        await controls.finalize({
          ok: false,
          reservationMicros,
          actualCostMicros: null,
          toolCalls: 0,
          latencyMs: 0,
          errorCode: "AI_PROVIDER_ERROR",
        });
      } catch {
        // Keep the conservative reservation if shared accounting is unavailable.
      }
    }
    try {
      await controls.recordProviderHealth({ status: "provider_error", checkedAt: new Date().toISOString(), latencyMs: null });
    } catch {
      // Never expose infrastructure errors or credentials through the action response.
    }
    finalStatus = "provider_error";
  }
  finish(finalStatus);
}
