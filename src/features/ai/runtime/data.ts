import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { compileAIBehaviorProfile } from "@/features/ai/behavior/compiler";
import { validateStoredBehaviorProfile } from "@/features/ai/behavior/policy";
import { getAIProviderConfig } from "@/features/ai/config";
import type {
  AIActiveRuntime,
  AIAdminAuditRow,
  AIAdminHealthRow,
  AIAdminProfileRow,
  AIAdminRuntimeRow,
  AIResolvedRuntime,
} from "@/features/ai/runtime/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ActiveRuntimeRow {
  enabled: boolean;
  provider: string;
  model: string;
  runtime_revision: number;
  profile_revision: number;
  profile_name: string;
  role_description: string;
  persona: string;
  tone: string;
  verbosity: string;
  answer_style: string;
  language_policy: string;
  sales_policy: string;
  uncertainty_policy: string;
  custom_instructions: string;
}

export function resolveAIRuntimeRow(
  row: ActiveRuntimeRow | null,
  environment: NodeJS.ProcessEnv = process.env,
): AIResolvedRuntime {
  if (!row) return { runtime: null, config: getAIProviderConfig(null, environment), compiledPrompt: null };
  const parsed = validateStoredBehaviorProfile({
    name: row.profile_name,
    role_description: row.role_description,
    persona: row.persona,
    tone: row.tone,
    verbosity: row.verbosity,
    answer_style: row.answer_style,
    language_policy: row.language_policy,
    sales_policy: row.sales_policy,
    uncertainty_policy: row.uncertainty_policy,
    custom_instructions: row.custom_instructions,
  });
  if (!parsed.success) return { runtime: null, config: getAIProviderConfig(null, environment), compiledPrompt: null };
  const profile = {
    revision: row.profile_revision,
    name: parsed.data.name,
    roleDescription: parsed.data.role_description,
    persona: parsed.data.persona,
    tone: parsed.data.tone,
    verbosity: parsed.data.verbosity,
    answerStyle: parsed.data.answer_style,
    languagePolicy: parsed.data.language_policy,
    salesPolicy: parsed.data.sales_policy,
    uncertaintyPolicy: parsed.data.uncertainty_policy,
    customInstructions: parsed.data.custom_instructions,
  };
  const runtime: AIActiveRuntime = {
    enabled: row.enabled,
    provider: row.provider,
    model: row.model,
    runtimeRevision: row.runtime_revision,
    profileRevision: row.profile_revision,
    profile,
  };
  return {
    runtime,
    config: getAIProviderConfig({ provider: row.provider, model: row.model, enabled: row.enabled }, environment),
    compiledPrompt: compileAIBehaviorProfile(profile),
  };
}

export async function getActiveAIRuntime(environment: NodeJS.ProcessEnv = process.env) {
  const client = createPublicSupabaseClient();
  if (!client) return resolveAIRuntimeRow(null, environment);
  const { data, error } = await client.rpc("get_active_ai_runtime");
  if (error || !Array.isArray(data) || !data[0]) return resolveAIRuntimeRow(null, environment);
  return resolveAIRuntimeRow(data[0] as ActiveRuntimeRow, environment);
}

export async function getAIAdminState() {
  await requireAdminUser(["admin"]);
  const client = await createServerSupabaseClient();
  if (!client) return { profiles: [], runtimes: [], health: [], audit: [], error: "config" as const };
  const [profilesResult, runtimesResult, healthResult, auditResult] = await Promise.all([
    client.from("ai_assistant_profiles").select("id,profile_key,revision,name,status,role_description,persona,tone,verbosity,answer_style,language_policy,sales_policy,uncertainty_policy,custom_instructions,created_at,activated_at,archived_at").order("created_at", { ascending: false }).limit(100),
    client.from("ai_runtime_settings").select("revision,provider,model,profile_id,profile_revision,enabled,status,test_status,tested_at,test_summary_code,created_at,activated_at,supersedes_revision").order("revision", { ascending: false }).limit(50),
    client.from("ai_provider_health_checks").select("provider,model,status,latency_ms,checked_at").order("checked_at", { ascending: false }).limit(50),
    client.from("ai_runtime_audit_events").select("id,event_type,runtime_revision,provider,model,event_metadata,created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  if (profilesResult.error || runtimesResult.error || healthResult.error || auditResult.error) {
    return { profiles: [], runtimes: [], health: [], audit: [], error: "query" as const };
  }
  return {
    profiles: (profilesResult.data ?? []) as AIAdminProfileRow[],
    runtimes: (runtimesResult.data ?? []) as AIAdminRuntimeRow[],
    health: (healthResult.data ?? []) as AIAdminHealthRow[],
    audit: (auditResult.data ?? []) as AIAdminAuditRow[],
    error: null,
  };
}
