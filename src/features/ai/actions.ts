"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { compileAIBehaviorProfile } from "@/features/ai/behavior/compiler";
import { behaviorProfileInputSchema } from "@/features/ai/behavior/policy";
import { getAIProviderConfig } from "@/features/ai/config";
import { createAIControlStore } from "@/features/ai/control-store";
import { estimateAIUsageCostMicros, microsToUsd } from "@/features/ai/cost";
import { runAssistant } from "@/features/ai/engine";
import { normalizeAssistantError } from "@/features/ai/errors";
import { checkAIProviderHealth, createAIProviderAdapter } from "@/features/ai/provider";
import { isAISelectionActivatable } from "@/features/ai/providers/registry";
import { hashAssistantIdentity } from "@/features/ai/rate-limit";
import {
  aiHealthSchema,
  aiRevisionSchema,
  aiRuntimeDraftSchema,
  promptLabQuestionSchema,
} from "@/features/ai/runtime/policy";
import type { AIProviderHealthStatus } from "@/features/ai/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const integrationPath = "/admin/integrations/ai";

function finish(result: string): never {
  revalidatePath(integrationPath);
  redirect(`${integrationPath}?result=${encodeURIComponent(result)}`);
}

async function adminClient() {
  await requireAdminUser(["admin"], `${integrationPath}?result=forbidden`);
  const client = await createServerSupabaseClient();
  if (!client) finish("config");
  return client;
}

function controlsForSelection(provider: string, model: string) {
  const config = getAIProviderConfig({ provider, model, enabled: true });
  const salt = process.env.AI_IDENTITY_HASH_SALT?.trim() || null;
  const controls = createAIControlStore(config);
  const allowed = !config.killSwitch
    && config.environmentAllowed
    && config.adapterSupported
    && config.credentialConfigured
    && config.rateLimiterConfigured
    && config.identitySaltConfigured
    && Boolean(controls && salt);
  return { config, salt, controls, allowed };
}

export async function saveAIBehaviorProfileAction(formData: FormData) {
  const client = await adminClient();
  const parsed = behaviorProfileInputSchema.safeParse({
    profile_key: String(formData.get("profile_key") || "") || undefined,
    name: formData.get("name"),
    role_description: formData.get("role_description"),
    persona: formData.get("persona"),
    tone: formData.get("tone"),
    verbosity: formData.get("verbosity"),
    answer_style: formData.get("answer_style"),
    language_policy: formData.get("language_policy"),
    sales_policy: formData.get("sales_policy"),
    uncertainty_policy: formData.get("uncertainty_policy"),
    custom_instructions: formData.get("custom_instructions"),
  });
  if (!parsed.success) finish("profile-invalid");
  const { error } = await client.rpc("create_ai_behavior_profile_revision", {
    target_profile_key: parsed.data.profile_key ?? null,
    target_name: parsed.data.name,
    target_role_description: parsed.data.role_description,
    target_persona: parsed.data.persona,
    target_tone: parsed.data.tone,
    target_verbosity: parsed.data.verbosity,
    target_answer_style: parsed.data.answer_style,
    target_language_policy: parsed.data.language_policy,
    target_sales_policy: parsed.data.sales_policy,
    target_uncertainty_policy: parsed.data.uncertainty_policy,
    target_custom_instructions: parsed.data.custom_instructions,
  });
  if (error) finish("profile-save-failed");
  finish("profile-saved");
}

export async function archiveAIBehaviorProfileAction(formData: FormData) {
  const client = await adminClient();
  const id = String(formData.get("profile_id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) finish("profile-invalid");
  const { error } = await client.rpc("archive_ai_behavior_profile", { target_profile_id: id });
  if (error) finish("profile-archive-blocked");
  finish("profile-archived");
}

export async function saveAIRuntimeDraftAction(formData: FormData) {
  const client = await adminClient();
  const parsed = aiRuntimeDraftSchema.safeParse({
    provider: formData.get("provider"),
    model: formData.get("model"),
    profile_id: formData.get("profile_id"),
  });
  if (!parsed.success) finish("runtime-invalid");
  const { error } = await client.rpc("create_ai_runtime_draft", {
    target_provider: parsed.data.provider,
    target_model: parsed.data.model,
    target_profile_id: parsed.data.profile_id,
  });
  if (error) finish("runtime-save-failed");
  finish("runtime-draft-saved");
}

export async function checkAIProviderHealthAction(formData: FormData) {
  const user = await requireAdminUser(["admin"], `${integrationPath}?result=forbidden`);
  const parsed = aiHealthSchema.safeParse({ provider: formData.get("provider"), model: formData.get("model") });
  if (!parsed.success) finish("health-invalid-selection");
  const { provider, model } = parsed.data;
  const client = await createServerSupabaseClient();
  if (!client) finish("config");
  const guard = controlsForSelection(provider, model);
  let status: AIProviderHealthStatus = "BLOCKED";
  let latencyMs: number | null = null;
  if (guard.allowed && guard.controls && guard.salt) {
    const identity = hashAssistantIdentity(`admin-health:${user.id}:${provider}:${model}`, guard.salt);
    let reservationMicros = 0;
    try {
      const admission = await guard.controls.admit({ ipHash: identity, sessionHash: identity });
      if (admission.allowed) {
        reservationMicros = admission.reservationMicros;
        const result = await checkAIProviderHealth(
          createAIProviderAdapter({ provider, model }),
          guard.config.limits.providerTimeoutMs,
        );
        status = result.status;
        latencyMs = result.latencyMs;
        await guard.controls.finalize({
          ok: status === "CONNECTED",
          reservationMicros,
          actualCostMicros: estimateAIUsageCostMicros(provider, model, result.usage),
          usage: result.usage,
          toolCalls: 0,
          latencyMs: latencyMs ?? 0,
          errorCode: status === "CONNECTED" ? undefined : status === "TIMEOUT" ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR",
        });
        reservationMicros = 0;
      }
    } catch {
      status = "PROVIDER_ERROR";
      if (reservationMicros) {
        try {
          await guard.controls.finalize({
            ok: false,
            reservationMicros,
            actualCostMicros: null,
            toolCalls: 0,
            latencyMs: latencyMs ?? 0,
            errorCode: "AI_PROVIDER_ERROR",
          });
        } catch { /* keep conservative reservation */ }
      }
    }
    try {
      await guard.controls.recordProviderHealth({
        status,
        checkedAt: new Date().toISOString(),
        latencyMs,
      });
    } catch { /* DB metadata below remains the activation authority. */ }
  }
  const { error } = await client.rpc("record_ai_provider_health", {
    target_provider: provider,
    target_model: model,
    target_status: status,
    target_latency_ms: latencyMs,
  });
  if (error) finish("health-record-failed");
  finish(`health-${provider}-${status.toLowerCase()}`);
}

export interface PromptLabState {
  status: "idle" | "passed" | "failed" | "blocked";
  code?: string;
  provider?: string;
  model?: string;
  runtimeRevision?: number;
  profileRevision?: number;
  answer?: string;
  sources?: Array<{ label: string; href?: string; asOf?: string | null }>;
  toolCalls?: number;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number | null;
}

export async function testAIRuntimeDraftAction(
  _previous: PromptLabState,
  formData: FormData,
): Promise<PromptLabState> {
  const user = await requireAdminUser(["admin"], `${integrationPath}?result=forbidden`);
  const revision = aiRevisionSchema.safeParse(formData.get("runtime_revision"));
  const question = promptLabQuestionSchema.safeParse(formData.get("question"));
  if (!revision.success || !question.success) return { status: "blocked", code: "INVALID_INPUT" };
  const client = await createServerSupabaseClient();
  if (!client) return { status: "blocked", code: "CONFIG" };
  const { data: runtimeData, error: runtimeError } = await client
    .from("ai_runtime_settings")
    .select("revision,provider,model,profile_id,profile_revision,status")
    .eq("revision", revision.data)
    .maybeSingle();
  if (runtimeError || !runtimeData || runtimeData.status !== "DRAFT") return { status: "blocked", code: "DRAFT_NOT_FOUND" };
  const { data: profileData, error: profileError } = await client
    .from("ai_assistant_profiles")
    .select("name,role_description,persona,tone,verbosity,answer_style,language_policy,sales_policy,uncertainty_policy,custom_instructions")
    .eq("id", runtimeData.profile_id)
    .maybeSingle();
  const profileParsed = behaviorProfileInputSchema.omit({ profile_key: true }).safeParse(profileData);
  if (profileError || !profileParsed.success) return { status: "blocked", code: "PROFILE_INVALID" };
  const { provider, model } = runtimeData;
  if (!isAISelectionActivatable(provider, model)) return { status: "blocked", code: "SELECTION_UNSUPPORTED" };
  const guard = controlsForSelection(provider, model);
  if (!guard.allowed || !guard.controls || !guard.salt) return { status: "blocked", code: "PREFLIGHT_BLOCKED" };
  const identity = hashAssistantIdentity(`admin-prompt-lab:${user.id}:${revision.data}`, guard.salt);
  let reservationMicros = 0;
  const startedAt = Date.now();
  try {
    const admission = await guard.controls.admit({ ipHash: identity, sessionHash: identity });
    if (!admission.allowed) {
      const isRateLimit = admission.reason?.startsWith("rate_") ?? false;
      const code = isRateLimit ? "AI_RATE_LIMITED" : "AI_BUDGET_EXHAUSTED";
      try {
        await guard.controls.recordBlocked(isRateLimit ? "rate_limited" : "budget_blocked", code);
      } catch { /* The atomic admission decision remains authoritative. */ }
      return { status: "blocked", code };
    }
    reservationMicros = admission.reservationMicros;
    const profile = {
      revision: runtimeData.profile_revision,
      name: profileParsed.data.name,
      roleDescription: profileParsed.data.role_description,
      persona: profileParsed.data.persona,
      tone: profileParsed.data.tone,
      verbosity: profileParsed.data.verbosity,
      answerStyle: profileParsed.data.answer_style,
      languagePolicy: profileParsed.data.language_policy,
      salesPolicy: profileParsed.data.sales_policy,
      uncertaintyPolicy: profileParsed.data.uncertainty_policy,
      customInstructions: profileParsed.data.custom_instructions,
    };
    const answer = await runAssistant({
      message: question.data,
      history: [],
      adapter: createAIProviderAdapter({ provider, model }),
      providerTimeoutMs: guard.config.limits.providerTimeoutMs,
      requestTimeoutMs: guard.config.limits.requestTimeoutMs,
      maxOutputTokens: guard.config.limits.maxOutputTokens,
      safetyIdentifier: identity,
      systemPrompt: compileAIBehaviorProfile(profile),
    });
    const latencyMs = Date.now() - startedAt;
    const actualCostMicros = estimateAIUsageCostMicros(provider, model, answer.usage);
    await guard.controls.finalize({
      ok: true,
      reservationMicros,
      actualCostMicros,
      usage: answer.usage,
      toolCalls: answer.toolCalls,
      latencyMs,
    });
    reservationMicros = 0;
    const { error: recordError } = await client.rpc("record_ai_runtime_test", {
      target_revision: revision.data,
      target_status: "PASSED",
      target_summary_code: "PROMPT_LAB_PASS",
    });
    if (recordError) {
      return { status: "failed", code: "TEST_RECORD_FAILED", provider, model, runtimeRevision: revision.data };
    }
    revalidatePath(integrationPath);
    return {
      status: "passed",
      provider,
      model,
      runtimeRevision: revision.data,
      profileRevision: runtimeData.profile_revision,
      answer: answer.answer,
      sources: answer.sources,
      toolCalls: answer.toolCalls,
      latencyMs,
      inputTokens: answer.usage?.inputTokens,
      outputTokens: answer.usage?.outputTokens,
      estimatedCostUsd: microsToUsd(actualCostMicros),
    };
  } catch (rawError) {
    const error = normalizeAssistantError(rawError);
    if (reservationMicros) {
      try {
        await guard.controls.finalize({
          ok: false,
          reservationMicros,
          actualCostMicros: null,
          toolCalls: 0,
          latencyMs: Date.now() - startedAt,
          errorCode: error.code,
        });
      } catch { /* keep conservative reservation */ }
    }
    await client.rpc("record_ai_runtime_test", {
      target_revision: revision.data,
      target_status: "FAILED",
      target_summary_code: error.code,
    });
    revalidatePath(integrationPath);
    return { status: "failed", code: error.code, provider, model, runtimeRevision: revision.data };
  }
}

export async function activateAIRuntimeAction(formData: FormData) {
  const client = await adminClient();
  const revision = aiRevisionSchema.safeParse(formData.get("runtime_revision"));
  const provider = String(formData.get("provider") || "");
  const model = String(formData.get("model") || "");
  if (!revision.success || !isAISelectionActivatable(provider, model)) finish("activation-invalid");
  const guard = controlsForSelection(provider, model);
  if (!guard.allowed) finish("activation-preflight-blocked");
  const { error } = await client.rpc("activate_ai_runtime", { target_revision: revision.data });
  if (error) finish("activation-blocked");
  finish("runtime-activated");
}

export async function rollbackAIRuntimeAction(formData: FormData) {
  const client = await adminClient();
  const revision = aiRevisionSchema.safeParse(formData.get("runtime_revision"));
  const provider = String(formData.get("provider") || "");
  const model = String(formData.get("model") || "");
  if (!revision.success || !isAISelectionActivatable(provider, model)) finish("rollback-invalid");
  const guard = controlsForSelection(provider, model);
  if (!guard.allowed) finish("rollback-preflight-blocked");
  const { error } = await client.rpc("rollback_ai_runtime", { target_revision: revision.data });
  if (error) finish("rollback-blocked");
  finish("runtime-rolled-back");
}

export async function disableAIRuntimeAction() {
  const client = await adminClient();
  const { error } = await client.rpc("disable_ai_runtime");
  if (error) finish("runtime-disable-failed");
  finish("runtime-disabled");
}
