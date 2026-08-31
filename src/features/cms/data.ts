import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import {
  CMS_ADMIN_ITEM_COLUMNS, CMS_ADMIN_MEDIA_COLUMNS, CMS_ADMIN_PAGE_COLUMNS,
  CMS_ADMIN_SECTION_COLUMNS, CMS_MEDIA_COLUMNS, CMS_PUBLIC_ITEM_COLUMNS,
  CMS_PUBLIC_PAGE_COLUMNS, CMS_PUBLIC_SECTION_COLUMNS,
} from "@/features/cms/columns";
import { getDefaultCmsPage } from "@/features/cms/defaults";
import { cmsMediaQuerySchema } from "@/features/cms/schema";
import type {
  CmsMediaAsset, CmsMediaPage, CmsPage, CmsPageKey, CmsPageSummary,
  CmsRoomOption, CmsSection, CmsSectionItem,
} from "@/features/cms/types";
import { CMS_PAGE_LABELS, getCmsSectionLabel } from "@/features/cms/ui";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type QueryClient = NonNullable<ReturnType<typeof createPublicSupabaseClient>> | NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

function stripSnapshot<T extends Record<string, unknown>>(
  row: T,
  pairs: readonly (readonly [string, string])[],
) {
  const draftChanged = pairs.some(([draft, published]) => row[draft] !== row[published]);
  const snapshotKeys = new Set(pairs.map(([, published]) => published));
  return {
    ...Object.fromEntries(Object.entries(row).filter(([key]) => !snapshotKeys.has(key))),
    has_draft_changes: draftChanged,
  };
}

function normalizeAdminPage(row: Record<string, unknown>) {
  const normalized = stripSnapshot(row, [
    ["title", "published_title"], ["seo_title", "published_seo_title"],
    ["seo_description", "published_seo_description"], ["og_media_id", "published_og_media_id"],
  ]);
  return { ...normalized, has_draft_changes: normalized.has_draft_changes || row.status === "draft" };
}

function normalizeAdminSection(row: Record<string, unknown>) {
  return stripSnapshot(row, [
    ["eyebrow", "published_eyebrow"], ["heading", "published_heading"], ["body", "published_body"],
    ["cta_label", "published_cta_label"], ["cta_href", "published_cta_href"],
    ["desktop_media_id", "published_desktop_media_id"], ["mobile_media_id", "published_mobile_media_id"],
    ["sort_order", "published_sort_order"], ["is_enabled", "published_is_enabled"], ["max_items", "published_max_items"],
  ]);
}

function normalizeAdminItem(row: Record<string, unknown>) {
  return stripSnapshot(row, [
    ["title", "published_title"], ["body", "published_body"], ["label", "published_label"],
    ["href", "published_href"], ["media_id", "published_media_id"],
    ["room_type_id", "published_room_type_id"], ["physical_room_id", "published_physical_room_id"],
    ["sort_order", "published_sort_order"], ["is_enabled", "published_is_enabled"],
  ]);
}

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
  const page = (admin ? normalizeAdminPage(rawPage as unknown as Record<string, unknown>) : rawPage) as unknown as Omit<CmsPage, "sections" | "og_media">;
  const { data: rawSections, error: sectionsError } = await client.from(sectionTable).select(sectionColumns).eq("page_id", page.id).order("sort_order").order("id");
  if (sectionsError) return null;
  const sections = (admin ? (rawSections ?? []).map((row) => normalizeAdminSection(row as unknown as Record<string, unknown>)) : (rawSections ?? [])) as unknown as Omit<CmsSection, "items" | "desktop_media" | "mobile_media">[];
  const sectionIds = sections.map((section) => section.id);
  const rawItems = sectionIds.length
    ? (await client.from(itemTable).select(itemColumns).in("section_id", sectionIds).order("sort_order").order("id")).data ?? []
    : [];
  const items = (admin ? rawItems.map((row) => normalizeAdminItem(row as unknown as Record<string, unknown>)) : rawItems) as unknown as Omit<CmsSectionItem, "media">[];
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

async function attachMediaUsage(client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>, media: CmsMediaAsset[]) {
  if (!media.length) return media;
  const ids = new Set(media.map((asset) => asset.id));
  const [pagesResult, sectionsResult, itemsResult, motorbikeResult, packagesResult] = await Promise.all([
    client.from("cms_pages").select("id,page_key,title,og_media_id,published_og_media_id"),
    client.from("cms_sections").select("id,page_id,section_key,desktop_media_id,mobile_media_id,published_desktop_media_id,published_mobile_media_id"),
    client.from("cms_section_items").select("id,section_id,title,media_id,published_media_id"),
    client.from("motorbike_offerings").select("id,display_name,image_media_id,publication_status"),
    client.from("packages").select("id,name,hero_media_id,lifecycle_status"),
  ]);
  const pages = pagesResult.data ?? [];
  const sections = sectionsResult.data ?? [];
  const pageById = new Map(pages.map((page) => [String(page.id), page]));
  const sectionById = new Map(sections.map((section) => [String(section.id), section]));
  const usageMap = new Map<string, Map<string, string>>(media.map((asset) => [asset.id, new Map()]));
  const add = (assetId: unknown, key: string, label: string) => {
    const id = String(assetId ?? "");
    if (ids.has(id)) usageMap.get(id)?.set(key, label);
  };
  for (const page of pages) {
    const label = CMS_PAGE_LABELS[page.page_key as CmsPageKey] ?? String(page.title);
    add(page.og_media_id, `page-${page.id}-og`, `${label} → Ảnh chia sẻ`);
    add(page.published_og_media_id, `page-${page.id}-og`, `${label} → Ảnh chia sẻ`);
  }
  for (const section of sections) {
    const page = pageById.get(String(section.page_id));
    const pageLabel = page ? CMS_PAGE_LABELS[page.page_key as CmsPageKey] ?? String(page.title) : "Trang nội dung";
    const sectionLabel = getCmsSectionLabel(String(section.section_key));
    add(section.desktop_media_id, `section-${section.id}-desktop`, `${pageLabel} → ${sectionLabel} → Ảnh desktop`);
    add(section.published_desktop_media_id, `section-${section.id}-desktop`, `${pageLabel} → ${sectionLabel} → Ảnh desktop`);
    add(section.mobile_media_id, `section-${section.id}-mobile`, `${pageLabel} → ${sectionLabel} → Ảnh mobile`);
    add(section.published_mobile_media_id, `section-${section.id}-mobile`, `${pageLabel} → ${sectionLabel} → Ảnh mobile`);
  }
  for (const item of itemsResult.data ?? []) {
    const section = sectionById.get(String(item.section_id));
    const page = section ? pageById.get(String(section.page_id)) : null;
    const pageLabel = page ? CMS_PAGE_LABELS[page.page_key as CmsPageKey] ?? String(page.title) : "Trang nội dung";
    const sectionLabel = section ? getCmsSectionLabel(String(section.section_key)) : "Mục nội dung";
    add(item.media_id, `item-${item.id}`, `${pageLabel} → ${sectionLabel} → ${String(item.title)}`);
    add(item.published_media_id, `item-${item.id}`, `${pageLabel} → ${sectionLabel} → ${String(item.title)}`);
  }
  for (const offering of motorbikeResult.data ?? []) {
    add(offering.image_media_id, `motorbike-${offering.id}`, `Xe máy → ${String(offering.display_name)} → Ảnh công khai`);
  }
  for (const item of packagesResult.data ?? []) {
    add(item.hero_media_id, `package-${item.id}`, `Gói dịch vụ → ${String(item.name)} → Ảnh đại diện`);
  }
  return media.map((asset) => ({
    ...asset,
    usages: [...(usageMap.get(asset.id)?.entries() ?? [])].map(([key, label]) => ({ key, label })),
  }));
}

export async function getAdminCmsMediaPage(input: unknown = {}): Promise<CmsMediaPage> {
  await requireAdminUser();
  const filters = cmsMediaQuerySchema.parse(input);
  const client = await createServerSupabaseClient();
  if (!client) return { items: [], page: 1, pageSize: filters.pageSize, total: 0, totalPages: 1, query: filters.query, role: filters.role };
  let query = client.from("cms_media_assets").select(CMS_ADMIN_MEDIA_COLUMNS, { count: "exact" }).eq("is_active", true);
  if (filters.role !== "all") query = query.eq("role", filters.role);
  if (filters.query) query = query.ilike("title", `%${filters.query.replace(/[\\%_]/g, "\\$&")}%`);
  const from = (filters.page - 1) * filters.pageSize;
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + filters.pageSize - 1);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  if (total > 0 && filters.page > totalPages) return getAdminCmsMediaPage({ ...filters, page: totalPages });
  const page = Math.min(filters.page, totalPages);
  const items = await attachMediaUsage(client, (data ?? []) as unknown as CmsMediaAsset[]);
  return { items, page, pageSize: filters.pageSize, total, totalPages, query: filters.query, role: filters.role };
}

export async function getAdminCmsMedia(): Promise<CmsMediaAsset[]> {
  return (await getAdminCmsMediaPage({ pageSize: 24 })).items;
}

export async function getAdminCmsPageSummaries(): Promise<CmsPageSummary[]> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data } = await client.from("cms_pages").select("page_key,status,published_at,updated_at").in("page_key", ["home", "stay"]);
  return (data ?? []) as CmsPageSummary[];
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
