import { z } from "zod";

function blankToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function optionalText(maxLength: number) {
  return z.preprocess(blankToNull, z.string().trim().max(maxLength).nullable());
}

const optionalHttpsUrl = z.preprocess(
  blankToNull,
  z.url({ protocol: /^https$/ }).max(2048).nullable(),
);

const checkbox = z.preprocess((value) => value === true || value === "on", z.boolean());

export const siteSettingsSchema = z.object({
  site_name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(160),
  hotline: optionalText(30),
  zalo_url: optionalHttpsUrl,
  facebook_url: optionalHttpsUrl,
  tiktok_url: optionalHttpsUrl,
  address: optionalText(300),
  google_maps_url: optionalHttpsUrl,
  announcement: optionalText(300),
  announcement_enabled: checkbox,
  hero_title: z.string().trim().min(2).max(120),
  hero_subtitle: z.string().trim().min(10).max(300),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
