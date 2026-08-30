import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import {
  CMS_ADMIN_ITEM_COLUMNS, CMS_ADMIN_MEDIA_COLUMNS, CMS_ADMIN_PAGE_COLUMNS,
  CMS_ADMIN_SECTION_COLUMNS, CMS_MEDIA_COLUMNS, CMS_PUBLIC_ITEM_COLUMNS,
  CMS_PUBLIC_PAGE_COLUMNS, CMS_PUBLIC_SECTION_COLUMNS,
} from "@/features/cms/columns";
import { getDefaultCmsPage } from "@/features/cms/defaults";
import type { CmsMediaAsset, CmsPage, CmsPageKey, CmsRoomOption, CmsSection, CmsSectionItem } from "@/features/cms/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type QueryClient = NonNullable<ReturnType<typeof createPublicSupabaseClient>> | NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

function attachContent(
  page: Omit<CmsPage, "sections" | "og_media">,
  sections: Omit<CmsSection, "items" | "desktop_media" | "mobile_media">[],
  items: Omit<CmsSectionItem, "media">[],
  media: CmsMediaAsset[],
): CmsPage {
  const mediaMap = new Map(media.map((asset) => [asset.id, asset]));
  return {
    ...page,
    og_media: page.og_media_id ? mediaMap.get(page.og_media_id) ?? null : null,
    sections: sections.sort((a, b) => a.sort_order - b.sort_order).map((section) => ({
      ...section,
      desktop_media: section.desktop_media_id ? mediaMap.get(section.desktop_media_id) ?? null : null,
      mobile_media: section.mobile_media_id ? mediaMap.get(section.mobile_media_id) ?? null : null,
      items: items.filter((item) => item.section_id === section.id).sort((a, b) => a.sort_order - b.sort_order).map((item) => ({
        ...item, media: item.media_id ? mediaMap.get(item.media_id) ?? null : null,
      })),
    })),
  };
}
async function readCmsPage(client: QueryClient, pageKey: CmsPageKey, admin: boolean): Promise<CmsPage | null> {
  const pageTable = admin ? "cms_pages" : "public_cms_pages";
  const sectionTable = admin ? "cms_sections" : "public_cms_sections";
  const itemTable = admin ? "cms_section_items" : "public_cms_section_items";
  const mediaTable = admin ? "cms_media_assets" : "public_cms_media_assets";
  const pageColumns = admin ? CMS_ADMIN_PAGE_COLUMNS : CMS_PUBLIC_PAGE_COLUMNS;
  const sectionColumns = admin ? CMS_ADMIN_SECTION_COLUMNS : CMS_PUBLIC_SECTION_COLUMNS;
  const itemColumns = admin ? CMS_ADMIN_ITEM_COLUMNS : CMS_PUBLIC_ITEM_COLUMNS;
  const mediaColumns = admin ? CMS_ADMIN_MEDIA_COLUMNS : CMS_MEDIA_COLUMNS;

  const { data: rawPage, error: pageError } = await client.from(pageTable).select(pageColumns).eq("page_key", pageKey).maybeSingle();
  if (pageError || !rawPage) return null;
  const page = rawPage as unknown as Omit<CmsPage, "sections" | "og_media">;
  const { data: rawSections, error: sectionsError } = await client.from(sectionTable).select(sectionColumns).eq("page_id", page.id).order("sort_order");
  if (sectionsError) return null;
  const sections = (rawSections ?? []) as unknown as Omit<CmsSection, "items" | "desktop_media" | "mobile_media">[];
  const sectionIds = sections.map((section) => section.id);
  const rawItems = sectionIds.length
    ? (await client.from(itemTable).select(itemColumns).in("section_id", sectionIds).order("sort_order")).data ?? []
    : [];
  const items = rawItems as unknown as Omit<CmsSectionItem, "media">[];
  const mediaIds = new Set<string>();
  [page.og_media_id, ...sections.flatMap((section) => [section.desktop_media_id, section.mobile_media_id]), ...items.map((item) => item.media_id)]
    .forEach((id) => { if (id) mediaIds.add(id); });
  const rawMedia = mediaIds.size
    ? (await client.from(mediaTable).select(mediaColumns).in("id", [...mediaIds])).data ?? []
    : [];
  return attachContent(page, sections, items, rawMedia as unknown as CmsMediaAsset[]);
}

export async function getPublicCmsPage(pageKey: CmsPageKey): Promise<CmsPage> {
  const client = createPublicSupabaseClient();
  if (!client) return getDefaultCmsPage(pageKey);
  return (await readCmsPage(client, pageKey, false)) ?? getDefaultCmsPage(pageKey);
}

export async function getAdminCmsPage(pageKey: CmsPageKey): Promise<CmsPage | null> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return null;
  return readCmsPage(client, pageKey, true);
}

export async function getAdminCmsMedia(): Promise<CmsMediaAsset[]> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data } = await client.from("cms_media_assets").select(CMS_ADMIN_MEDIA_COLUMNS).eq("is_active", true).order("created_at", { ascending: false });
  return (data ?? []) as unknown as CmsMediaAsset[];
}

export async function getAdminCmsRoomOptions(): Promise<{ roomTypes: CmsRoomOption[]; physicalRooms: CmsRoomOption[] }> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return { roomTypes: [], physicalRooms: [] };
  const [roomTypesResult, physicalRoomsResult] = await Promise.all([
    client.from("room_types").select("id,name,properties(name)").order("name"),
    client.from("physical_rooms").select("id,room_code,properties(name)").order("room_code"),
  ]);
  const relationName = (relation: unknown) => {
    if (Array.isArray(relation)) return String((relation[0] as { name?: string } | undefined)?.name ?? "");
    return String((relation as { name?: string } | null)?.name ?? "");
  };
  const roomTypes = (roomTypesResult.data ?? []).map((row) => ({ id: String(row.id), label: `${relationName(row.properties)} · ${String(row.name)}` }));
  const physicalRooms = (physicalRoomsResult.data ?? []).map((row) => ({ id: String(row.id), label: `${relationName(row.properties)} · ${String(row.room_code)}` }));
  return { roomTypes, physicalRooms };
}
