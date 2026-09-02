import "server-only";

import { Redis } from "@upstash/redis";
import { z } from "zod";
import {
  AI_CONVERSATION_DELETE_BATCH_MAX,
  AI_CONVERSATION_MAX_ASSISTANT_CHARACTERS,
  AI_CONVERSATION_MAX_MESSAGES,
  AI_CONVERSATION_MAX_USER_CHARACTERS,
  DEFAULT_AI_CONVERSATION_RETENTION_DAYS,
  retentionCutoff,
  retentionExpiry,
  retentionTtlSeconds,
  truncateConversationContent,
} from "@/features/ai-conversations/retention";
import type {
  AIConversationDeleteResult,
  AIConversationFilters,
  AIConversationMessageRecord,
  AIConversationMeta,
  AIConversationPage,
  AIConversationRetentionConfig,
  AIConversationRetentionDays,
  AIConversationStore,
  AIConversationSummary,
  AIConversationTurnInput,
  AIConversationWithMessages,
} from "@/features/ai-conversations/types";
import { AI_CONVERSATION_ENTRY_POINTS, AI_CONVERSATION_RETENTION_PRESETS } from "@/features/ai-conversations/types";
import { AI_ERROR_CODES } from "@/features/ai/types";

const PREFIX = "txtrip:ai-conversations:v1";
const INDEX_SCAN_LIMIT = 250;
const INDEX_BATCH_SIZE = 100;
const DAILY_METRICS_TTL_SECONDS = 100 * 24 * 60 * 60;

const messageSchema = z.object({
  id: z.string().uuid(), conversationId: z.string().uuid(), role: z.enum(["user", "assistant"]), createdAt: z.string().datetime(),
  contentRedacted: z.string(), contentTruncated: z.boolean(), provider: z.string().nullable(), model: z.string().nullable(),
  runtimeRevision: z.number().int().nullable(), profileRevision: z.number().int().nullable(), latencyMs: z.number().int().nonnegative().nullable(),
  inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable(), estimatedCostUsd: z.number().nonnegative().nullable(),
  toolNames: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/)).max(9), normalizedResult: z.enum(["success", "error"]), normalizedErrorCode: z.enum(AI_ERROR_CODES).nullable(),
}).strict();

const publicMetaSchema = z.object({
  id: z.string().uuid(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(), lastMessageAt: z.string().datetime(),
  entryPoint: z.enum(AI_CONVERSATION_ENTRY_POINTS), provider: z.string().min(1).max(40), model: z.string().min(1).max(120),
  runtimeRevision: z.number().int().positive(), profileRevision: z.number().int().positive(), status: z.enum(["success", "error"]),
  messageCount: z.number().int().min(0).max(AI_CONVERSATION_MAX_MESSAGES), userMessageCount: z.number().int().min(0), assistantMessageCount: z.number().int().min(0),
  totalInputTokens: z.number().int().nonnegative().nullable(), totalOutputTokens: z.number().int().nonnegative().nullable(), totalEstimatedCostUsd: z.number().nonnegative().nullable(),
  lastLatencyMs: z.number().int().nonnegative(), lastErrorCode: z.enum(AI_ERROR_CODES).nullable(), retentionExpiresAt: z.string().datetime(),
}).strict();

const storedMetaSchema = publicMetaSchema.extend({ sessionHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
type StoredMeta = z.infer<typeof storedMetaSchema>;

const retentionSchema = z.object({
  loggingEnabled: z.boolean(), retentionDays: z.number().int().refine((value) => AI_CONVERSATION_RETENTION_PRESETS.includes(value as AIConversationRetentionDays)),
  updatedAt: z.string().datetime().nullable(), updatedBy: z.enum(["admin", "default"]),
}).strict();

interface DailyMetrics extends Record<string, unknown> {
  conversation_count?: string | number;
  message_count?: string | number;
  assistant_error_count?: string | number;
  latency_ms?: string | number;
  latency_count?: string | number;
}

function metaKey(id: string) { return `${PREFIX}:conversation:${id}:meta`; }
function messagesKey(id: string) { return `${PREFIX}:conversation:${id}:messages`; }
function sessionKey(hash: string) { return `${PREFIX}:session:${hash}`; }
function statusIndex(status: "success" | "error") { return `${PREFIX}:index:status:${status}`; }
function dayKey(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${PREFIX}:metrics:${value.year}-${value.month}-${value.day}`;
}
const updatedIndex = `${PREFIX}:index:updated`;
const createdIndex = `${PREFIX}:index:created`;
const retentionConfigKey = `${PREFIX}:config:retention`;

function numberOrNull(value: number | undefined) {
  return value === undefined || !Number.isFinite(value) || value < 0 ? null : value;
}

function sumKnown(previous: number | null, next: number | null, isNew: boolean) {
  if (next === null) return null;
  if (isNew) return next;
  return previous === null ? null : previous + next;
}

function decodeCursor(value: string | undefined) {
  if (!value) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { offset?: unknown };
    return typeof parsed.offset === "number" && Number.isInteger(parsed.offset) && parsed.offset >= 0 ? parsed.offset : 0;
  } catch { return 0; }
}

function encodeCursor(offset: number) {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function matchesFilters(meta: AIConversationMeta, filters: AIConversationFilters) {
  if (filters.from && meta.lastMessageAt < filters.from) return false;
  if (filters.to && meta.lastMessageAt > filters.to) return false;
  if (filters.entryPoint && meta.entryPoint !== filters.entryPoint) return false;
  if (filters.provider && meta.provider !== filters.provider) return false;
  if (filters.model && meta.model !== filters.model) return false;
  if (filters.profileRevision && meta.profileRevision !== filters.profileRevision) return false;
  if (filters.status && meta.status !== filters.status) return false;
  if (filters.hasError !== undefined && (meta.lastErrorCode !== null) !== filters.hasError) return false;
  return true;
}

function safeMeta(value: unknown): StoredMeta | null {
  const parsed = storedMetaSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function publicMeta(value: StoredMeta): AIConversationMeta {
  const safe: Partial<StoredMeta> = { ...value };
  delete safe.sessionHash;
  return safe as AIConversationMeta;
}

export class UpstashAIConversationStore implements AIConversationStore {
  constructor(private readonly redis: Redis) {}

  private async removeIndexEntries(ids: string[]) {
    if (!ids.length) return;
    const multi = this.redis.multi();
    multi.zrem(updatedIndex, ...ids); multi.zrem(createdIndex, ...ids); multi.zrem(statusIndex("success"), ...ids); multi.zrem(statusIndex("error"), ...ids);
    await multi.exec();
  }

  private async pruneExpiredIndexHead() {
    for (let batch = 0; batch < 10; batch += 1) {
      const ids = await this.redis.zrange<string[]>(createdIndex, 0, INDEX_BATCH_SIZE - 1);
      if (!ids.length) return;
      const stale: string[] = [];
      for (const id of ids) if (!safeMeta(await this.redis.get<unknown>(metaKey(id)))) stale.push(id);
      await this.removeIndexEntries(stale);
      if (stale.length < ids.length) return;
    }
  }

  async getRetentionConfig(): Promise<AIConversationRetentionConfig> {
    const raw = await this.redis.get<unknown>(retentionConfigKey);
    const parsed = retentionSchema.safeParse(raw);
    return parsed.success ? parsed.data as AIConversationRetentionConfig : {
      loggingEnabled: false, retentionDays: DEFAULT_AI_CONVERSATION_RETENTION_DAYS, updatedAt: null, updatedBy: "default",
    };
  }

  async updateRetentionConfig(input: { loggingEnabled: boolean; retentionDays: AIConversationRetentionDays }) {
    const config: AIConversationRetentionConfig = { ...input, updatedAt: new Date().toISOString(), updatedBy: "admin" };
    await this.redis.set(retentionConfigKey, config);
    return config;
  }

  async appendTurn(input: AIConversationTurnInput, retentionDays: AIConversationRetentionDays) {
    const now = input.now ?? new Date();
    const timestamp = now.toISOString();
    const ttl = retentionTtlSeconds(retentionDays);
    let conversationId = await this.redis.get<string>(sessionKey(input.sessionHash));
    if (!conversationId || !z.string().uuid().safeParse(conversationId).success) conversationId = crypto.randomUUID();
    const [existingRaw, messagesRaw] = await Promise.all([
      this.redis.get<unknown>(metaKey(conversationId)),
      this.redis.get<unknown>(messagesKey(conversationId)),
    ]);
    const existing = safeMeta(existingRaw);
    const parsedMessages = z.array(messageSchema).safeParse(messagesRaw);
    const currentMessages = parsedMessages.success ? parsedMessages.data : [];
    const customer = truncateConversationContent(input.customerMessage, AI_CONVERSATION_MAX_USER_CHARACTERS);
    const assistant = truncateConversationContent(input.assistantAnswer, AI_CONVERSATION_MAX_ASSISTANT_CHARACTERS);
    const safeToolNames = [...new Set(input.toolNames.filter((name) => /^[a-z][a-z0-9_]{0,63}$/.test(name)))].slice(0, 9);
    const userMessage: AIConversationMessageRecord = {
      id: crypto.randomUUID(), conversationId, role: "user", createdAt: timestamp, contentRedacted: customer.content,
      contentTruncated: customer.truncated, provider: null, model: null, runtimeRevision: null, profileRevision: null,
      latencyMs: null, inputTokens: null, outputTokens: null, estimatedCostUsd: null, toolNames: [], normalizedResult: "success", normalizedErrorCode: null,
    };
    const assistantMessage: AIConversationMessageRecord = {
      id: crypto.randomUUID(), conversationId, role: "assistant", createdAt: timestamp, contentRedacted: assistant.content,
      contentTruncated: assistant.truncated, provider: input.provider, model: input.model, runtimeRevision: input.runtimeRevision,
      profileRevision: input.profileRevision, latencyMs: Math.max(0, Math.round(input.latencyMs)), inputTokens: numberOrNull(input.inputTokens ?? undefined),
      outputTokens: numberOrNull(input.outputTokens ?? undefined), estimatedCostUsd: numberOrNull(input.estimatedCostUsd ?? undefined),
      toolNames: safeToolNames, normalizedResult: input.result, normalizedErrorCode: input.errorCode,
    };
    const messages = [...currentMessages, userMessage, assistantMessage].slice(-AI_CONVERSATION_MAX_MESSAGES);
    const isNew = !existing;
    const meta: StoredMeta = {
      id: conversationId, sessionHash: input.sessionHash, createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp, lastMessageAt: timestamp,
      entryPoint: existing?.entryPoint ?? input.entryPoint, provider: input.provider, model: input.model, runtimeRevision: input.runtimeRevision,
      profileRevision: input.profileRevision, status: input.result, messageCount: messages.length,
      userMessageCount: (existing?.userMessageCount ?? 0) + 1, assistantMessageCount: (existing?.assistantMessageCount ?? 0) + 1,
      totalInputTokens: sumKnown(existing?.totalInputTokens ?? null, numberOrNull(input.inputTokens ?? undefined), isNew),
      totalOutputTokens: sumKnown(existing?.totalOutputTokens ?? null, numberOrNull(input.outputTokens ?? undefined), isNew),
      totalEstimatedCostUsd: sumKnown(existing?.totalEstimatedCostUsd ?? null, numberOrNull(input.estimatedCostUsd ?? undefined), isNew),
      lastLatencyMs: Math.max(0, Math.round(input.latencyMs)), lastErrorCode: input.errorCode, retentionExpiresAt: retentionExpiry(now, retentionDays).toISOString(),
    };
    const score = now.getTime();
    const multi = this.redis.multi();
    multi.set(metaKey(conversationId), meta, { ex: ttl });
    multi.set(messagesKey(conversationId), messages, { ex: ttl });
    multi.set(sessionKey(input.sessionHash), conversationId, { ex: ttl });
    multi.zadd(updatedIndex, { score, member: conversationId });
    multi.zadd(createdIndex, { score: new Date(meta.createdAt).getTime(), member: conversationId });
    multi.zrem(statusIndex(input.result === "success" ? "error" : "success"), conversationId);
    multi.zadd(statusIndex(input.result), { score, member: conversationId });
    if (isNew) multi.hincrby(dayKey(now), "conversation_count", 1);
    multi.hincrby(dayKey(now), "message_count", 2);
    if (input.result === "error") multi.hincrby(dayKey(now), "assistant_error_count", 1);
    multi.hincrby(dayKey(now), "latency_ms", Math.max(0, Math.round(input.latencyMs)));
    multi.hincrby(dayKey(now), "latency_count", 1);
    multi.expire(dayKey(now), DAILY_METRICS_TTL_SECONDS);
    await multi.exec();
    return conversationId;
  }

  async getConversation(id: string): Promise<AIConversationWithMessages | null> {
    if (!z.string().uuid().safeParse(id).success) return null;
    const [metaRaw, messagesRaw] = await Promise.all([this.redis.get<unknown>(metaKey(id)), this.redis.get<unknown>(messagesKey(id))]);
    const meta = safeMeta(metaRaw);
    const messages = z.array(messageSchema).safeParse(messagesRaw);
    if (!meta || !messages.success) return null;
    return { meta: publicMeta(meta), messages: messages.data };
  }

  async listConversations(input: { filters?: AIConversationFilters; cursor?: string; limit?: number }): Promise<AIConversationPage> {
    const limit = Math.min(50, Math.max(1, input.limit ?? 25));
    const start = decodeCursor(input.cursor);
    const ids = await this.redis.zrange<string[]>(updatedIndex, start, start + INDEX_SCAN_LIMIT - 1, { rev: true });
    const items: AIConversationMeta[] = [];
    const stale: string[] = [];
    let scanned = 0;
    for (const id of ids) {
      scanned += 1;
      const meta = safeMeta(await this.redis.get<unknown>(metaKey(id)));
      if (!meta) { stale.push(id); continue; }
      const safe = publicMeta(meta);
      if (matchesFilters(safe, input.filters ?? {})) items.push(safe);
      if (items.length >= limit) break;
    }
    await this.removeIndexEntries(stale);
    return { items, nextCursor: start + scanned < start + ids.length ? encodeCursor(start + scanned) : ids.length === INDEX_SCAN_LIMIT ? encodeCursor(start + scanned) : null };
  }

  async getSummary(now = new Date()): Promise<AIConversationSummary> {
    await this.pruneExpiredIndexHead();
    const [daily, storedConversations, oldestIds] = await Promise.all([
      this.redis.hgetall<DailyMetrics>(dayKey(now)), this.redis.zcard(updatedIndex), this.redis.zrange<string[]>(createdIndex, 0, 0),
    ]);
    const oldest = oldestIds[0] ? safeMeta(await this.redis.get<unknown>(metaKey(oldestIds[0]))) : null;
    const latencyCount = Number(daily?.latency_count ?? 0);
    return {
      conversationsToday: Number(daily?.conversation_count ?? 0), messagesToday: Number(daily?.message_count ?? 0),
      assistantErrorsToday: Number(daily?.assistant_error_count ?? 0),
      averageLatencyMs: latencyCount ? Math.round(Number(daily?.latency_ms ?? 0) / latencyCount) : null,
      storedConversations, oldestRetainedAt: oldest?.createdAt ?? null,
    };
  }

  async deleteConversation(id: string) { return this.deleteConversations([id]); }

  async deleteConversations(ids: string[]): Promise<AIConversationDeleteResult> {
    const unique = [...new Set(ids)].filter((id) => z.string().uuid().safeParse(id).success).slice(0, AI_CONVERSATION_DELETE_BATCH_MAX);
    const result: AIConversationDeleteResult = { requested: unique.length, successCount: 0, failedCount: 0, failedIds: [] };
    for (const id of unique) {
      try {
        const meta = safeMeta(await this.redis.get<unknown>(metaKey(id)));
        const multi = this.redis.multi();
        multi.del(metaKey(id), messagesKey(id));
        if (meta) multi.del(sessionKey(meta.sessionHash));
        multi.zrem(updatedIndex, id); multi.zrem(createdIndex, id); multi.zrem(statusIndex("success"), id); multi.zrem(statusIndex("error"), id);
        await multi.exec();
        result.successCount += 1;
      } catch { result.failedCount += 1; result.failedIds.push(id); }
    }
    return result;
  }

  async deleteBefore(cutoff: Date): Promise<AIConversationDeleteResult> {
    const aggregate: AIConversationDeleteResult = { requested: 0, successCount: 0, failedCount: 0, failedIds: [] };
    for (;;) {
      const ids = await this.redis.zrange<string[]>(updatedIndex, "-inf", cutoff.getTime(), { byScore: true, offset: 0, count: INDEX_BATCH_SIZE });
      if (!ids.length) break;
      const next = await this.deleteConversations(ids);
      aggregate.requested += next.requested; aggregate.successCount += next.successCount; aggregate.failedCount += next.failedCount; aggregate.failedIds.push(...next.failedIds);
      if (next.successCount === 0 || next.failedCount > 0) break;
    }
    return aggregate;
  }

  async deleteAll(): Promise<AIConversationDeleteResult> {
    const aggregate: AIConversationDeleteResult = { requested: 0, successCount: 0, failedCount: 0, failedIds: [] };
    for (;;) {
      const ids = await this.redis.zrange<string[]>(updatedIndex, 0, INDEX_BATCH_SIZE - 1);
      if (!ids.length) break;
      const next = await this.deleteConversations(ids);
      aggregate.requested += next.requested; aggregate.successCount += next.successCount; aggregate.failedCount += next.failedCount; aggregate.failedIds.push(...next.failedIds);
      if (next.successCount === 0 || next.failedCount > 0) break;
    }
    return aggregate;
  }

  async applyRetentionToExisting(retentionDays: AIConversationRetentionDays, now = new Date()) {
    const deleted = await this.deleteBefore(retentionCutoff(now, retentionDays));
    const ttl = retentionTtlSeconds(retentionDays);
    let offset = 0;
    for (;;) {
      const ids = await this.redis.zrange<string[]>(updatedIndex, offset, offset + INDEX_BATCH_SIZE - 1);
      if (!ids.length) break;
      for (const id of ids) {
        const meta = safeMeta(await this.redis.get<unknown>(metaKey(id)));
        if (!meta) continue;
        const remaining = Math.max(1, Math.round((retentionExpiry(new Date(meta.lastMessageAt), retentionDays).getTime() - now.getTime()) / 1_000));
        const nextMeta = { ...meta, retentionExpiresAt: retentionExpiry(new Date(meta.lastMessageAt), retentionDays).toISOString() };
        const multi = this.redis.multi();
        multi.set(metaKey(id), nextMeta, { ex: Math.min(ttl, remaining) });
        multi.expire(messagesKey(id), Math.min(ttl, remaining));
        multi.expire(sessionKey(meta.sessionHash), Math.min(ttl, remaining));
        await multi.exec();
      }
      if (ids.length < INDEX_BATCH_SIZE) break;
      offset += ids.length;
    }
    return deleted;
  }
}
