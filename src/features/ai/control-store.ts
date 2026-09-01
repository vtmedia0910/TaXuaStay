import "server-only";

import { Redis } from "@upstash/redis";
import type { AIErrorCode, AIProviderConfig, AIProviderUsage } from "@/features/ai/types";

const PREFIX = "txtrip:ai:v1";
const WINDOW_MS = 60_000;
const DAY_RETENTION_SECONDS = 3 * 24 * 60 * 60;
const MONTH_RETENTION_SECONDS = 40 * 24 * 60 * 60;

export const AI_ADMISSION_LUA = `
local global_count = tonumber(redis.call('GET', KEYS[1]) or '0')
local ip_count = tonumber(redis.call('GET', KEYS[2]) or '0')
local session_count = tonumber(redis.call('GET', KEYS[3]) or '0')
local daily_requests = tonumber(redis.call('HGET', KEYS[4], 'requests') or '0')
local daily_cost = tonumber(redis.call('HGET', KEYS[4], 'cost_micros') or '0')
local monthly_cost = tonumber(redis.call('HGET', KEYS[5], 'cost_micros') or '0')

if global_count >= tonumber(ARGV[1]) then return {'rate_global', redis.call('PTTL', KEYS[1])} end
if ip_count >= tonumber(ARGV[2]) then return {'rate_ip', redis.call('PTTL', KEYS[2])} end
if ARGV[10] == '1' and session_count >= tonumber(ARGV[3]) then return {'rate_session', redis.call('PTTL', KEYS[3])} end
if daily_requests >= tonumber(ARGV[4]) then return {'daily_requests', 0} end
if daily_cost + tonumber(ARGV[5]) > tonumber(ARGV[6]) then return {'budget_daily', 0} end
if monthly_cost + tonumber(ARGV[5]) > tonumber(ARGV[7]) then return {'budget_monthly', 0} end

local global_next = redis.call('INCR', KEYS[1])
if global_next == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[8]) end
local ip_next = redis.call('INCR', KEYS[2])
if ip_next == 1 then redis.call('PEXPIRE', KEYS[2], ARGV[8]) end
if ARGV[10] == '1' then
  local session_next = redis.call('INCR', KEYS[3])
  if session_next == 1 then redis.call('PEXPIRE', KEYS[3], ARGV[8]) end
end
redis.call('HINCRBY', KEYS[4], 'requests', 1)
redis.call('HINCRBY', KEYS[4], 'cost_micros', ARGV[5])
redis.call('EXPIRE', KEYS[4], ARGV[9])
redis.call('HINCRBY', KEYS[5], 'requests', 1)
redis.call('HINCRBY', KEYS[5], 'cost_micros', ARGV[5])
redis.call('EXPIRE', KEYS[5], ARGV[11])
return {'ok', global_next, ip_next, daily_requests + 1, daily_cost + tonumber(ARGV[5]), monthly_cost + tonumber(ARGV[5])}
`;

const AI_COMPLETION_LUA = `
local delta = tonumber(ARGV[1])
redis.call('HINCRBY', KEYS[1], 'cost_micros', delta)
redis.call('HINCRBY', KEYS[2], 'cost_micros', delta)
redis.call('HINCRBY', KEYS[1], ARGV[2], 1)
redis.call('HINCRBY', KEYS[2], ARGV[2], 1)
redis.call('HINCRBY', KEYS[1], 'input_tokens', ARGV[3])
redis.call('HINCRBY', KEYS[1], 'output_tokens', ARGV[4])
redis.call('HINCRBY', KEYS[1], 'tool_calls', ARGV[5])
redis.call('HINCRBY', KEYS[1], 'latency_ms', ARGV[6])
if ARGV[7] ~= '' then
  redis.call('HSET', KEYS[1], 'last_error', ARGV[7])
  if ARGV[7] == 'AI_TIMEOUT' then redis.call('HINCRBY', KEYS[1], 'timeouts', 1) end
  if string.sub(ARGV[7], 1, 11) == 'AI_PROVIDER' then redis.call('HINCRBY', KEYS[1], 'provider_errors', 1) end
  if string.sub(ARGV[7], 1, 7) == 'AI_TOOL' then redis.call('HINCRBY', KEYS[1], 'tool_errors', 1) end
end
redis.call('EXPIRE', KEYS[1], ARGV[8])
redis.call('EXPIRE', KEYS[2], ARGV[9])
return 1
`;

const AI_BLOCKED_LUA = `
redis.call('HINCRBY', KEYS[1], ARGV[1], 1)
redis.call('HSET', KEYS[1], 'last_error', ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 1
`;

const AI_HEALTH_LUA = `
redis.call('HSET', KEYS[1], 'status', ARGV[1], 'checked_at', ARGV[2], 'latency_ms', ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[4])
return 1
`;

export type AIAdmissionReason = "rate_global" | "rate_ip" | "rate_session" | "daily_requests" | "budget_daily" | "budget_monthly";

export interface AIControlAdmission {
  allowed: boolean;
  reason?: AIAdmissionReason;
  retryAfterSeconds: number;
  reservationMicros: number;
}

export interface AISharedMetrics {
  requests: number;
  successes: number;
  failures: number;
  rateLimited: number;
  budgetBlocked: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  timeouts: number;
  providerErrors: number;
  toolErrors: number;
  latencyMs: number;
  costMicros: number;
  lastError: string | null;
}

export interface AIControlDiagnostics {
  healthy: boolean;
  daily: AISharedMetrics;
  monthly: AISharedMetrics;
  providerHealth: { status: string; checkedAt: string | null; latencyMs: number | null };
}

export interface AIControlStore {
  admit(input: { ipHash: string; sessionHash?: string; now?: number }): Promise<AIControlAdmission>;
  recordBlocked(reason: "rate_limited" | "budget_blocked", code: AIErrorCode, now?: number): Promise<void>;
  finalize(input: {
    ok: boolean;
    reservationMicros: number;
    actualCostMicros: number | null;
    usage?: AIProviderUsage;
    toolCalls: number;
    latencyMs: number;
    errorCode?: AIErrorCode;
    now?: number;
  }): Promise<void>;
  recordProviderHealth(input: { status: string; checkedAt: string; latencyMs: number | null }): Promise<void>;
  diagnostics(now?: number): Promise<AIControlDiagnostics>;
}

function vietnamBucket(now: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = `${value.year}-${value.month}-${value.day}`;
  return { day, month: `${value.year}-${value.month}` };
}

function metric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metrics(hash: Record<string, unknown> | null | undefined): AISharedMetrics {
  return {
    requests: metric(hash?.requests),
    successes: metric(hash?.success),
    failures: metric(hash?.failure),
    rateLimited: metric(hash?.rate_limited),
    budgetBlocked: metric(hash?.budget_blocked),
    inputTokens: metric(hash?.input_tokens),
    outputTokens: metric(hash?.output_tokens),
    toolCalls: metric(hash?.tool_calls),
    timeouts: metric(hash?.timeouts),
    providerErrors: metric(hash?.provider_errors),
    toolErrors: metric(hash?.tool_errors),
    latencyMs: metric(hash?.latency_ms),
    costMicros: metric(hash?.cost_micros),
    lastError: typeof hash?.last_error === "string" ? hash.last_error : null,
  };
}

export class UpstashAIControlStore implements AIControlStore {
  constructor(
    private readonly redis: Redis,
    private readonly config: AIProviderConfig,
  ) {}

  private keys(now: number) {
    const bucket = vietnamBucket(now);
    return {
      daily: `${PREFIX}:day:${bucket.day}`,
      monthly: `${PREFIX}:month:${bucket.month}`,
      health: `${PREFIX}:provider-health`,
    };
  }

  async admit(input: { ipHash: string; sessionHash?: string; now?: number }): Promise<AIControlAdmission> {
    const now = input.now ?? Date.now();
    const window = Math.floor(now / WINDOW_MS);
    const keys = this.keys(now);
    const ttlMs = Math.max(1_000, WINDOW_MS - (now % WINDOW_MS) + 1_000);
    const result = await this.redis.eval(AI_ADMISSION_LUA, [
      `${PREFIX}:rate:global:${window}`,
      `${PREFIX}:rate:ip:${input.ipHash}:${window}`,
      `${PREFIX}:rate:session:${input.sessionHash ?? "none"}:${window}`,
      keys.daily,
      keys.monthly,
    ], [
      String(this.config.limits.globalPerMinute),
      String(this.config.limits.perIpPerMinute),
      String(this.config.limits.perSessionPerMinute),
      String(this.config.limits.dailyRequests),
      String(this.config.limits.maxRequestReservationMicros),
      String(this.config.limits.dailyBudgetMicros),
      String(this.config.limits.monthlyBudgetMicros),
      String(ttlMs),
      String(DAY_RETENTION_SECONDS),
      input.sessionHash ? "1" : "0",
      String(MONTH_RETENTION_SECONDS),
    ]) as unknown as unknown[];
    const code = String(result?.[0] ?? "store_error");
    if (code === "ok") {
      return { allowed: true, retryAfterSeconds: 0, reservationMicros: this.config.limits.maxRequestReservationMicros };
    }
    if (!(["rate_global", "rate_ip", "rate_session", "daily_requests", "budget_daily", "budget_monthly"] as string[]).includes(code)) {
      throw new Error("AI control store returned an invalid admission result");
    }
    return {
      allowed: false,
      reason: code as AIAdmissionReason,
      retryAfterSeconds: code.startsWith("rate_") ? Math.max(1, Math.ceil(metric(result?.[1]) / 1_000)) : 0,
      reservationMicros: 0,
    };
  }

  async recordBlocked(reason: "rate_limited" | "budget_blocked", code: AIErrorCode, now = Date.now()) {
    const keys = this.keys(now);
    await this.redis.eval(AI_BLOCKED_LUA, [keys.daily], [reason, code, String(DAY_RETENTION_SECONDS)]);
  }

  async finalize(input: {
    ok: boolean;
    reservationMicros: number;
    actualCostMicros: number | null;
    usage?: AIProviderUsage;
    toolCalls: number;
    latencyMs: number;
    errorCode?: AIErrorCode;
    now?: number;
  }) {
    const keys = this.keys(input.now ?? Date.now());
    const delta = input.actualCostMicros === null ? 0 : input.actualCostMicros - input.reservationMicros;
    await this.redis.eval(AI_COMPLETION_LUA, [keys.daily, keys.monthly], [
      String(delta),
      input.ok ? "success" : "failure",
      String(input.usage?.inputTokens ?? 0),
      String(input.usage?.outputTokens ?? 0),
      String(input.toolCalls),
      String(Math.max(0, Math.round(input.latencyMs))),
      input.errorCode ?? "",
      String(DAY_RETENTION_SECONDS),
      String(MONTH_RETENTION_SECONDS),
    ]);
  }

  async recordProviderHealth(input: { status: string; checkedAt: string; latencyMs: number | null }) {
    await this.redis.eval(AI_HEALTH_LUA, [this.keys(Date.now()).health], [
      input.status,
      input.checkedAt,
      String(input.latencyMs ?? -1),
      String(MONTH_RETENTION_SECONDS),
    ]);
  }

  async diagnostics(now = Date.now()): Promise<AIControlDiagnostics> {
    const keys = this.keys(now);
    const [daily, monthly, health, ping] = await Promise.all([
      this.redis.hgetall<Record<string, unknown>>(keys.daily),
      this.redis.hgetall<Record<string, unknown>>(keys.monthly),
      this.redis.hgetall<Record<string, unknown>>(keys.health),
      this.redis.ping(),
    ]);
    return {
      healthy: ping === "PONG",
      daily: metrics(daily),
      monthly: metrics(monthly),
      providerHealth: {
        status: typeof health?.status === "string" ? health.status : "not_checked",
        checkedAt: typeof health?.checked_at === "string" ? health.checked_at : null,
        latencyMs: metric(health?.latency_ms) >= 0 ? metric(health?.latency_ms) : null,
      },
    };
  }
}

export function createAIControlStore(
  config: AIProviderConfig,
  environment: NodeJS.ProcessEnv = process.env,
): AIControlStore | null {
  const url = environment.UPSTASH_REDIS_REST_URL?.trim();
  const token = environment.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new UpstashAIControlStore(new Redis({ url, token }), config);
}

export function budgetState(costMicros: number, limitMicros: number) {
  if (costMicros >= limitMicros) return "exhausted" as const;
  if (costMicros >= limitMicros * 0.8) return "warning" as const;
  return "normal" as const;
}
