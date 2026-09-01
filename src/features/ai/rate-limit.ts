import "server-only";

import { createHmac } from "node:crypto";

export function hashAssistantIdentity(value: string, salt: string) {
  return createHmac("sha256", salt).update(value.slice(0, 160)).digest("hex").slice(0, 32);
}

export function getAssistantClientIdentity(headers: Headers, salt: string) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headers.get("x-real-ip")?.trim();
  return hashAssistantIdentity(forwarded || real || "anonymous", salt);
}

export function getAssistantSessionIdentity(sessionId: string | undefined, salt: string) {
  return sessionId ? hashAssistantIdentity(sessionId, salt) : undefined;
}
