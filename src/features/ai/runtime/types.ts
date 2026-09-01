import type { AIBehaviorProfile } from "@/features/ai/behavior/types";
import type { AIProviderConfig, AIProviderHealthStatus } from "@/features/ai/types";

export interface AIActiveRuntime {
  enabled: boolean;
  provider: string;
  model: string;
  runtimeRevision: number;
  profileRevision: number;
  profile: AIBehaviorProfile;
}

export interface AIResolvedRuntime {
  runtime: AIActiveRuntime | null;
  config: AIProviderConfig;
  compiledPrompt: string | null;
}

export interface AIAdminProfileRow {
  id: string;
  profile_key: string;
  revision: number;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  role_description: string;
  persona: string;
  tone: AIBehaviorProfile["tone"];
  verbosity: AIBehaviorProfile["verbosity"];
  answer_style: AIBehaviorProfile["answerStyle"];
  language_policy: AIBehaviorProfile["languagePolicy"];
  sales_policy: AIBehaviorProfile["salesPolicy"];
  uncertainty_policy: AIBehaviorProfile["uncertaintyPolicy"];
  custom_instructions: string;
  created_at: string;
  activated_at: string | null;
  archived_at: string | null;
}

export interface AIAdminRuntimeRow {
  revision: number;
  provider: string;
  model: string;
  profile_id: string;
  profile_revision: number;
  enabled: boolean;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED";
  test_status: "NOT_TESTED" | "PASSED" | "FAILED";
  tested_at: string | null;
  test_summary_code: string | null;
  created_at: string;
  activated_at: string | null;
  supersedes_revision: number | null;
}

export interface AIAdminHealthRow {
  provider: string;
  model: string;
  status: AIProviderHealthStatus;
  latency_ms: number | null;
  checked_at: string;
}

export interface AIAdminAuditRow {
  id: number;
  event_type: string;
  runtime_revision: number | null;
  provider: string | null;
  model: string | null;
  event_metadata: Record<string, unknown>;
  created_at: string;
}
