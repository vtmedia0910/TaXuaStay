import { describe, expect, it } from "vitest";
import {
  ASSISTANT_DISCOVERY_VERSION,
  ASSISTANT_TEASER_COOLDOWN_MS,
  getAssistantPageContext,
  getAssistantSuggestions,
  isAssistantDiscoveryRouteSuppressed,
  parseAssistantDiscoveryRecord,
  shouldShowAssistantTeaser,
} from "@/features/ai/discovery";

describe("Phase 13C assistant discovery policy", () => {
  it("builds only allow-listed public page context", () => {
    expect(getAssistantPageContext("/stay/po-mu/phong-may")).toEqual({
      pageKind: "room",
      pathname: "/stay/po-mu/phong-may",
      destinationSlug: "ta-xua",
      propertySlug: "po-mu",
      roomSlug: "phong-may",
    });
    expect(getAssistantPageContext("/packages/combo-2n1d")?.packageSlug).toBe("combo-2n1d");
    expect(getAssistantPageContext("/booking/TX-PRIVATE")).toBeNull();
    expect(getAssistantPageContext("/stay/not_safe!")).toBeNull();
  });

  it("keeps contextual suggestions deterministic and non-operational", () => {
    const suggestions = getAssistantSuggestions(getAssistantPageContext("/stay/po-mu/phong-may"));
    expect(suggestions).toContain("Phòng này đã xác minh những gì?");
    expect(suggestions.join(" ")).not.toMatch(/đặt|thanh toán|xác nhận giúp/i);
  });

  it("suppresses sensitive and collision-prone routes", () => {
    expect(isAssistantDiscoveryRouteSuppressed("/assistant")).toBe(true);
    expect(isAssistantDiscoveryRouteSuppressed("/admin/integrations/ai")).toBe(true);
    expect(isAssistantDiscoveryRouteSuppressed("/booking/TX-123")).toBe(true);
    expect(isAssistantDiscoveryRouteSuppressed("/trip-finder")).toBe(true);
    expect(isAssistantDiscoveryRouteSuppressed("/stay/po-mu")).toBe(false);
  });

  it("honors readiness, session dedupe, version and cooldown", () => {
    const now = Date.UTC(2026, 8, 2);
    const current = { version: ASSISTANT_DISCOVERY_VERSION, lastDismissedAt: now - 1_000 };
    expect(shouldShowAssistantTeaser({ readiness: "disabled", pathname: "/", record: null, seenThisSession: false, now })).toBe(false);
    expect(shouldShowAssistantTeaser({ readiness: "ready", pathname: "/", record: null, seenThisSession: true, now })).toBe(false);
    expect(shouldShowAssistantTeaser({ readiness: "ready", pathname: "/", record: current, seenThisSession: false, now })).toBe(false);
    expect(shouldShowAssistantTeaser({ readiness: "ready", pathname: "/", record: { ...current, lastDismissedAt: now - ASSISTANT_TEASER_COOLDOWN_MS }, seenThisSession: false, now })).toBe(true);
    expect(parseAssistantDiscoveryRecord(JSON.stringify({ version: "old", lastShownAt: now }))).toBeNull();
    expect(parseAssistantDiscoveryRecord("not-json")).toBeNull();
  });
});
