import { describe, expect, it } from "vitest";
import { cmsItemSchema, cmsPageSchema, cmsSectionSchema, externalCmsMediaSchema } from "@/features/cms/schema";

describe("structured CMS validation", () => {
  it("allows only known pages and safe editable SEO fields", () => {
    expect(cmsPageSchema.safeParse({ page_key: "home", title: "Trang chủ", seo_title: "Tà Xùa Trip", seo_description: "Mô tả đủ dài và trung thực.", og_media_id: "" }).success).toBe(true);
    expect(cmsPageSchema.safeParse({ page_key: "checkout", title: "Checkout", seo_title: "X", seo_description: "unsafe", og_media_id: "" }).success).toBe(false);
  });

  it("rejects unsafe CTA schemes and preserves enable/order controls", () => {
    const base = { id: "00000000-0000-4000-8000-000000000001", page_key: "home", eyebrow: "", heading: "Tiêu đề", body: "", cta_label: "Mở", desktop_media_id: "", mobile_media_id: "", sort_order: "10", is_enabled: "on", max_items: "3" };
    expect(cmsSectionSchema.safeParse({ ...base, cta_href: "/stay" }).success).toBe(true);
    expect(cmsSectionSchema.safeParse({ ...base, cta_href: "https://example.com" }).success).toBe(true);
    expect(cmsSectionSchema.safeParse({ ...base, cta_href: "javascript:alert(1)" }).success).toBe(false);
  });

  it("never lets a hybrid block copy two room entity scopes", () => {
    const base = { id: "", section_id: "00000000-0000-4000-8000-000000000001", page_key: "home", item_key: "featured-room", item_type: "room_reference", title: "Phòng đã chọn", body: "", label: "", href: "", media_id: "", sort_order: "10", is_enabled: "on" };
    const entity = "00000000-0000-4000-8000-000000000002";
    expect(cmsItemSchema.safeParse({ ...base, room_type_id: entity, physical_room_id: "" }).success).toBe(true);
    expect(cmsItemSchema.safeParse({ ...base, room_type_id: entity, physical_room_id: entity }).success).toBe(false);
  });

  it("requires useful alt text and HTTPS external media", () => {
    const base = { title: "Hero săn mây", alt_text: "Dãy núi Tà Xùa trong nắng sớm", caption: "", role: "hero", width: "1600", height: "900", focal_x: "50", focal_y: "42" };
    expect(externalCmsMediaSchema.safeParse({ ...base, external_url: "https://images.example.com/hero.webp" }).success).toBe(true);
    expect(externalCmsMediaSchema.safeParse({ ...base, alt_text: "", external_url: "https://images.example.com/hero.webp" }).success).toBe(false);
    expect(externalCmsMediaSchema.safeParse({ ...base, external_url: "http://images.example.com/hero.webp" }).success).toBe(false);
  });
});
