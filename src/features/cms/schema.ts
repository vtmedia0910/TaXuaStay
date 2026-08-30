import { z } from "zod";
import { CMS_PAGE_KEYS } from "@/features/cms/types";

const blankToNull = (value: unknown) => typeof value === "string" && value.trim() === "" ? null : value;
const optionalText = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max).nullable());
const optionalUuid = z.preprocess(blankToNull, z.uuid().nullable());
const checkbox = z.preprocess((value) => value === true || value === "on", z.boolean());
const optionalLink = z.preprocess(blankToNull, z.string().trim().max(2048).refine((value) => value.startsWith("/") || value.startsWith("https://"), "Unsafe link").nullable());
const optionalInteger = (min: number, max: number) => z.preprocess(blankToNull, z.coerce.number().int().min(min).max(max).nullable());

export const cmsPageSchema = z.object({
  page_key: z.enum(CMS_PAGE_KEYS), title: z.string().trim().min(2).max(160),
  seo_title: optionalText(70), seo_description: optionalText(180), og_media_id: optionalUuid,
});

export const cmsSectionSchema = z.object({
  id: z.uuid(), page_key: z.enum(CMS_PAGE_KEYS), eyebrow: optionalText(100),
  heading: optionalText(180), body: optionalText(1200), cta_label: optionalText(80),
  cta_href: optionalLink, desktop_media_id: optionalUuid, mobile_media_id: optionalUuid,
  is_enabled: checkbox, max_items: optionalInteger(1, 24),
});

export const cmsItemSchema = z.object({
  id: z.preprocess(blankToNull, z.uuid().nullable()), section_id: z.uuid(),
  page_key: z.enum(CMS_PAGE_KEYS), item_key: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/),
  item_type: z.enum(["content", "link", "faq", "room_reference"]),
  title: z.string().trim().min(1).max(180), body: optionalText(1000), label: optionalText(80),
  href: optionalLink, media_id: optionalUuid, room_type_id: optionalUuid, physical_room_id: optionalUuid,
  is_enabled: checkbox,
}).refine((data) => !(data.room_type_id && data.physical_room_id), { message: "Choose one room entity" });

const mediaBase = z.object({
  title: z.string().trim().min(2).max(160), alt_text: z.string().trim().min(2).max(300),
  caption: optionalText(500), role: z.enum(["hero", "card", "gallery", "banner", "og", "icon", "general"]),
  focal_x: z.coerce.number().int().min(0).max(100), focal_y: z.coerce.number().int().min(0).max(100),
});

export const externalCmsMediaSchema = mediaBase.extend({ external_url: z.url({ protocol: /^https$/ }).max(2048) });
export const uploadCmsMediaSchema = mediaBase.extend({ folder: z.enum(["homepage", "stay", "about", "banners", "og", "general"]) });
export const updateCmsMediaSchema = mediaBase.extend({ id: z.uuid() });
export const cmsMediaQuerySchema = z.object({
  query: z.string().trim().max(80).default(""),
  role: z.enum(["all", "hero", "card", "gallery", "banner", "og", "icon", "general"]).default("all"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});
export const cmsMoveSchema = z.object({
  page_key: z.enum(CMS_PAGE_KEYS), id: z.uuid(), direction: z.enum(["up", "down"]),
});
export const cmsIdSchema = z.uuid();
