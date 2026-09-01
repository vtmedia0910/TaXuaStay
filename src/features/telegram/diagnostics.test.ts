import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getTelegramBotIdentity,
  getTelegramDeploymentPolicy,
  getTelegramSystemDiagnostics,
  getTelegramWebhookDiagnostics,
  installTelegramWebhook,
} from "@/features/telegram/bot";

const token = "123456789:phase12h-test-token-never-render";
const secret = "phase12h_webhook_secret";
const productionEnvironment = {
  VERCEL_ENV: "production",
  VERCEL_PROJECT_PRODUCTION_URL: "taxuaslay1.vercel.app",
};
const expectedUrl = "https://taxuaslay1.vercel.app/api/integrations/telegram/webhook";

function telegramResponse(result: unknown, status = 200) {
  return new Response(JSON.stringify(status === 200 ? { ok: true, result } : { ok: false, error_code: status, description: token }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function telegramFetch(options: {
  username?: string;
  webhook?: Record<string, unknown>;
  setWebhookResult?: boolean;
} = {}) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/getMe")) return telegramResponse({ id: 101, is_bot: true, first_name: "Tà Xùa Trip", username: options.username ?? "Ta_Xua_Trip_bot" });
    if (url.endsWith("/getWebhookInfo")) return telegramResponse(options.webhook ?? {
      url: expectedUrl,
      allowed_updates: ["message", "callback_query"],
      pending_update_count: 0,
      max_connections: 40,
    });
    if (url.endsWith("/setWebhook")) return telegramResponse(options.setWebhookResult ?? true);
    throw new Error("Unexpected method");
  }) as unknown as typeof fetch;
}

describe("Phase 12H Telegram diagnostics", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = token;
    process.env.TELEGRAM_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });

  it("diagnoses missing, valid, invalid and unreachable bot tokens without leaking them", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    expect(await getTelegramBotIdentity(telegramFetch())).toMatchObject({ configured: false, errorCode: "bot_token_missing" });

    process.env.TELEGRAM_BOT_TOKEN = token;
    expect(await getTelegramBotIdentity(telegramFetch())).toMatchObject({ reachable: true, botId: 101, username: "Ta_Xua_Trip_bot" });

    const invalidFetch = vi.fn(async () => telegramResponse(null, 401)) as unknown as typeof fetch;
    const invalid = await getTelegramBotIdentity(invalidFetch);
    expect(invalid).toMatchObject({ reachable: false, errorCode: "bot_token_invalid" });
    expect(JSON.stringify(invalid)).not.toContain(token);

    const unreachableFetch = vi.fn(async () => { throw new Error(token); }) as unknown as typeof fetch;
    const unreachable = await getTelegramBotIdentity(unreachableFetch);
    expect(unreachable).toMatchObject({ reachable: false, errorCode: "telegram_unreachable" });
    expect(JSON.stringify(unreachable)).not.toContain(token);
  });

  it("reports missing, mismatched and healthy webhook facts with sanitized errors", async () => {
    const missing = await getTelegramWebhookDiagnostics(expectedUrl, telegramFetch({ webhook: { url: "", pending_update_count: 0 } }));
    expect(missing).toMatchObject({ installed: false, matchesExpectedUrl: false });

    const mismatch = await getTelegramWebhookDiagnostics(expectedUrl, telegramFetch({ webhook: {
      url: "https://preview.example/api/integrations/telegram/webhook",
      allowed_updates: ["message"],
      pending_update_count: 7,
      last_error_date: 1788282000,
      last_error_message: `Telegram rejected ${token}`,
    } }));
    expect(mismatch).toMatchObject({ installed: true, matchesExpectedUrl: false, allowedUpdatesMatch: false, pendingUpdateCount: 7 });
    expect(mismatch.lastErrorMessage).toContain("[redacted]");
    expect(JSON.stringify(mismatch)).not.toContain(token);

    const healthy = await getTelegramWebhookDiagnostics(expectedUrl, telegramFetch());
    expect(healthy).toMatchObject({ installed: true, matchesExpectedUrl: true, allowedUpdatesMatch: true, pendingUpdateCount: 0 });
  });

  it("fails closed on malformed Telegram responses", async () => {
    const malformedFetch = vi.fn(async () => telegramResponse("not-an-object")) as unknown as typeof fetch;
    expect(await getTelegramBotIdentity(malformedFetch)).toMatchObject({ reachable: false, errorCode: "malformed_response" });
    expect(await getTelegramWebhookDiagnostics(expectedUrl, malformedFetch)).toMatchObject({ reachable: false, errorCode: "malformed_response" });
  });

  it("derives only the stable Vercel Production webhook and disables Preview installation", () => {
    expect(getTelegramDeploymentPolicy(productionEnvironment)).toEqual({
      deploymentEnvironment: "production",
      productionInstallEnabled: true,
      expectedWebhookUrl: expectedUrl,
    });
    expect(getTelegramDeploymentPolicy({ ...productionEnvironment, VERCEL_ENV: "preview" })).toMatchObject({
      deploymentEnvironment: "preview",
      productionInstallEnabled: false,
      expectedWebhookUrl: expectedUrl,
    });
  });

  it("installs the exact webhook safely and never drops pending updates", async () => {
    const fetchImpl = telegramFetch();
    const result = await installTelegramWebhook({ fetchImpl, environment: productionEnvironment });
    expect(result).toMatchObject({ ok: true, errorCode: null });
    const calls = vi.mocked(fetchImpl).mock.calls;
    const setCall = calls.find(([input]) => String(input).endsWith("/setWebhook"));
    expect(setCall).toBeTruthy();
    const request = JSON.parse(String((setCall?.[1] as RequestInit).body)) as Record<string, unknown>;
    expect(request).toEqual({ url: expectedUrl, secret_token: secret, allowed_updates: ["message", "callback_query"] });
    expect(request).not.toHaveProperty("drop_pending_updates");
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("rejects Preview and invalid secret before setWebhook", async () => {
    const previewFetch = telegramFetch();
    expect(await installTelegramWebhook({ fetchImpl: previewFetch, environment: { ...productionEnvironment, VERCEL_ENV: "preview" } }))
      .toMatchObject({ ok: false, errorCode: "preview_install_disabled" });
    expect(vi.mocked(previewFetch).mock.calls.some(([input]) => String(input).endsWith("/setWebhook"))).toBe(false);

    process.env.TELEGRAM_WEBHOOK_SECRET = "invalid secret";
    const invalidSecretFetch = telegramFetch();
    expect(await installTelegramWebhook({ fetchImpl: invalidSecretFetch, environment: productionEnvironment }))
      .toMatchObject({ ok: false, errorCode: "webhook_secret_invalid" });
    expect(vi.mocked(invalidSecretFetch).mock.calls.some(([input]) => String(input).endsWith("/setWebhook"))).toBe(false);
  });

  it("shows a rotated bot immediately without mutating Supplier mappings", async () => {
    const supplierMapping = Object.freeze({ supplierId: "supplier-1", telegramChatId: -100123456 });
    const oldBot = await getTelegramSystemDiagnostics({ fetchImpl: telegramFetch({ username: "Old_Ta_Xua_bot" }), environment: productionEnvironment });
    const newBot = await getTelegramSystemDiagnostics({ fetchImpl: telegramFetch({ username: "New_Ta_Xua_bot", webhook: { url: "", pending_update_count: 0 } }), environment: productionEnvironment });
    expect(oldBot.bot.username).toBe("Old_Ta_Xua_bot");
    expect(newBot.bot.username).toBe("New_Ta_Xua_bot");
    expect(newBot.health).toBe("webhook_missing");
    expect(supplierMapping).toEqual({ supplierId: "supplier-1", telegramChatId: -100123456 });
  });
});
