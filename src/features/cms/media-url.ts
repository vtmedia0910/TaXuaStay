import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { CmsMediaAsset } from "@/features/cms/types";

export function resolveCmsMediaUrl(media: CmsMediaAsset | null | undefined): string | null {
  if (!media) return null;
  if (media.external_url?.startsWith("https://")) return media.external_url;
  if (!media.storage_bucket || !media.storage_path) return null;
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const path = media.storage_path.split("/").map(encodeURIComponent).join("/");
  return `${config.url}/storage/v1/object/public/${encodeURIComponent(media.storage_bucket)}/${path}`;
}
