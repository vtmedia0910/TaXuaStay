import { describe, expect, it } from "vitest";
import { siteSettingsSchema } from "@/features/settings/schema";

const validSettings = {
  site_name: "TÀ XÙA STAY",
  tagline: "Đúng phòng. Đúng view.",
  hotline: "",
  zalo_url: "",
  facebook_url: "https://facebook.com/taxuastay",
  tiktok_url: "",
  address: "Tà Xùa, Bắc Yên, Sơn La",
  google_maps_url: "https://maps.google.com/example",
  announcement: "",
  announcement_enabled: "on",
  hero_title: "Tìm chỗ ở rõ ràng hơn",
  hero_subtitle: "Thông tin cần thiết trước khi bạn bắt đầu chuyến đi.",
};

describe("site settings validation", () => {
  it("normalizes optional blanks and checkbox input", () => {
    const result = siteSettingsSchema.parse(validSettings);

    expect(result.hotline).toBeNull();
    expect(result.zalo_url).toBeNull();
    expect(result.announcement).toBeNull();
    expect(result.announcement_enabled).toBe(true);
  });

  it("rejects non-HTTPS public links", () => {
    const result = siteSettingsSchema.safeParse({
      ...validSettings,
      facebook_url: "http://facebook.com/taxuastay",
    });

    expect(result.success).toBe(false);
  });
});
