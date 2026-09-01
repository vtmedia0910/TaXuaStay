export const TELEGRAM_CHANNEL_STATUSES = ["active", "disabled", "error"] as const;
export const TELEGRAM_ASSIGNMENT_ROLES = ["primary", "backup", "observer"] as const;
export const TELEGRAM_OUTBOX_STATUSES = ["pending", "processing", "sent", "retry", "failed", "cancelled"] as const;
export const TELEGRAM_ACTION_TYPES = ["CONFIRM", "DECLINE", "NEED_DISCUSSION"] as const;

export type TelegramChannelStatus = (typeof TELEGRAM_CHANNEL_STATUSES)[number];
export type TelegramAssignmentRole = (typeof TELEGRAM_ASSIGNMENT_ROLES)[number];
export type TelegramOutboxStatus = (typeof TELEGRAM_OUTBOX_STATUSES)[number];
export type TelegramActionType = (typeof TELEGRAM_ACTION_TYPES)[number];

export type TelegramSystemHealth =
  | "ready"
  | "missing_config"
  | "bot_invalid"
  | "webhook_missing"
  | "webhook_mismatch"
  | "allowed_updates_mismatch"
  | "telegram_error"
  | "pending_updates_attention";

export type TelegramSafeErrorCode =
  | "bot_token_missing"
  | "bot_token_invalid"
  | "telegram_unreachable"
  | "telegram_rejected"
  | "malformed_response"
  | "webhook_secret_missing"
  | "webhook_secret_invalid"
  | "production_origin_missing"
  | "preview_install_disabled"
  | "post_install_verification_failed"
  | "unknown";

export interface TelegramBotIdentity {
  configured: boolean;
  reachable: boolean;
  botId: number | null;
  username: string | null;
  displayName: string | null;
  errorCode: TelegramSafeErrorCode | null;
  errorMessage: string | null;
}

export interface TelegramWebhookDiagnostics {
  reachable: boolean;
  installed: boolean;
  currentUrl: string | null;
  expectedUrl: string | null;
  matchesExpectedUrl: boolean;
  allowedUpdates: string[];
  allowedUpdatesMatch: boolean;
  pendingUpdateCount: number;
  lastErrorDate: string | null;
  lastErrorMessage: string | null;
  maxConnections: number | null;
  errorCode: TelegramSafeErrorCode | null;
  errorMessage: string | null;
}

export interface TelegramSystemDiagnostics {
  botTokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  deploymentEnvironment: "production" | "preview" | "development" | "unknown";
  productionInstallEnabled: boolean;
  expectedWebhookUrl: string | null;
  bot: TelegramBotIdentity;
  webhook: TelegramWebhookDiagnostics;
  health: TelegramSystemHealth;
  checkedAt: string;
}

export interface TelegramChannelDto {
  id: string;
  supplier_id: string;
  telegram_chat_id: number;
  telegram_chat_type: "group" | "supergroup";
  telegram_chat_title: string | null;
  status: TelegramChannelStatus;
  is_primary: boolean;
  connected_at: string;
  verified_at: string;
  disabled_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  consecutive_failures: number;
  last_error_code: string | null;
  last_error_summary: string | null;
  updated_at: string;
}
export interface TelegramAssignmentDto {
  id: string;
  supplier_id: string;
  user_id: string;
  assignment_role: TelegramAssignmentRole;
  is_active: boolean;
  updated_at: string;
}

export interface TelegramStaffOption {
  user_id: string;
  email: string | null;
  app_role: "admin" | "staff";
}

export interface TelegramConnectionCodeMeta {
  id: string;
  supplier_id: string;
  status: "pending" | "used" | "expired" | "revoked";
  expires_at: string;
  used_at: string | null;
  used_channel_id: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface TelegramOutboxDto {
  id: string;
  supplier_id: string;
  channel_id: string;
  booking_id: string | null;
  booking_item_id: string | null;
  confirmation_id: string | null;
  message_type: "confirmation_request" | "confirmation_follow_up" | "connection_ack" | "command_reply" | "test";
  status: TelegramOutboxStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string;
  claimed_at: string | null;
  sent_at: string | null;
  telegram_message_id: number | null;
  last_error_code: string | null;
  last_error_summary: string | null;
  created_at: string;
}

export interface TelegramDeliveryLogDto {
  id: number;
  outbox_id: string;
  channel_id: string;
  attempt_number: number;
  outcome: "accepted" | "retry" | "failed" | "cancelled";
  telegram_response_code: number | null;
  error_code: string | null;
  response_summary: string | null;
  created_at: string;
}

export interface TelegramActionDto {
  id: string;
  supplier_id: string;
  channel_id: string;
  booking_id: string;
  booking_item_id: string;
  confirmation_id: string;
  action_type: TelegramActionType;
  status: "pending" | "used" | "expired" | "rejected";
  expected_booking_revision: number;
  expected_confirmation_updated_at: string;
  expires_at: string;
  used_at: string | null;
  used_update_id: number | null;
  discussion_resolved_at: string | null;
  discussion_resolved_by: string | null;
  created_at: string;
}

export interface TelegramSupplierSummary {
  id: string;
  supplier_code: string;
  display_name: string;
  status: string;
  channel: TelegramChannelDto | null;
  assignments: Array<TelegramAssignmentDto & { email: string | null }>;
  pending_code: TelegramConnectionCodeMeta | null;
  outbox: TelegramOutboxDto[];
  logs: TelegramDeliveryLogDto[];
}

export interface TelegramDashboard {
  suppliers: TelegramSupplierSummary[];
  staff: TelegramStaffOption[];
  outbox: TelegramOutboxDto[];
  logs: TelegramDeliveryLogDto[];
}

export interface TelegramConnectionActionState {
  code?: string;
  supplierName?: string;
  expiresAt?: string;
  error?: string;
}

export interface TelegramClaimedOutbox {
  outbox_id: string;
  claim_token: string;
  supplier_id: string;
  channel_id: string;
  chat_id: number;
  chat_type: "group" | "supergroup";
  message_type: TelegramOutboxDto["message_type"];
  payload: Record<string, unknown>;
  attempt_number: number;
  max_attempts: number;
}

export interface TelegramWorkerSummary {
  claimed: number;
  sent: number;
  retry: number;
  failed: number;
  skipped: number;
}
