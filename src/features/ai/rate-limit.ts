import "server-only";

import { createHash } from "node:crypto";

const WINDOW_MS = 60_000;
const IP_LIMIT = 8;
const SESSION_LIMIT = 10;
const GLOBAL_LIMIT = 80;
const MAX_BUCKETS = 2_500;

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function consume(key: string, limit: number, now: number) {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  while (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value as string);
}

export function getAssistantClientIdentity(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headers.get("x-real-ip")?.trim();
  return hash((forwarded || real || "anonymous").slice(0, 120));
}

export function consumeAssistantRateLimit(input: { ipHash: string; sessionId?: string; now?: number }) {
  const now = input.now ?? Date.now();
  prune(now);
  const checks = [
    consume(`global:${Math.floor(now / WINDOW_MS)}`, GLOBAL_LIMIT, now),
    consume(`ip:${input.ipHash}`, IP_LIMIT, now),
    ...(input.sessionId ? [consume(`session:${hash(input.sessionId)}`, SESSION_LIMIT, now)] : []),
  ];
  const denied = checks.find((item) => !item.allowed);
  return denied ?? { allowed: true, retryAfterSeconds: 0 };
}

export function resetAssistantRateLimitsForTests() { buckets.clear(); }
