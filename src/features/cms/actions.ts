"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminCmsMediaPage } from "@/features/cms/data";
import { readImageDimensions } from "@/features/cms/image-metadata";
import {
  cmsIdSchema, cmsItemSchema, cmsMediaQuerySchema, cmsMoveSchema, cmsPageSchema,
  cmsSectionSchema, externalCmsMediaSchema, updateCmsMediaSchema, uploadCmsMediaSchema,
} from "@/features/cms/schema";
import { CMS_PAGE_KEYS, type CmsMediaPage, type CmsPageKey } from "@/features/cms/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function contentPath(value: FormDataEntryValue | null): string {
  const key = String(value ?? "");
  return CMS_PAGE_KEYS.includes(key as CmsPageKey) ? `/admin/content/${key}` : "/admin/content";
}

function revalidateCms(pageKey?: CmsPageKey) {
  revalidatePath("/admin/content");
  revalidatePath("/admin/site-media");
  revalidatePath("/admin/content/preview");
  if (!pageKey || pageKey === "home") revalidatePath("/");
  if (!pageKey || pageKey === "stay") revalidatePath("/stay");
  if (!pageKey || pageKey === "footer") revalidatePath("/", "layout");
}

export async function saveCmsPageAction(formData: FormData) {
  const returnPath = contentPath(formData.get("page_key"));
  await requireAdminUser(["admin", "staff"], `${returnPath}?error=unauthorized`);
  const parsed = cmsPageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${returnPath}?error=cms-page-invalid`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${returnPath}?error=config`);
  const { page_key, ...draft } = parsed.data;
  const current = await client.from("cms_pages").select("status").eq("page_key", page_key).maybeSingle();
  if (current.error || !current.data) redirect(`${returnPath}?error=cms-page-save`);
  const { error } = await client.from("cms_pages").update({ ...draft, status: current.data.status === "archived" ? "archived" : "draft" }).eq("page_key", page_key);
  if (error) redirect(`${returnPath}?error=cms-page-save`);
  revalidateCms(page_key);
  redirect(`${returnPath}?saved=draft`);
}

export async function saveCmsSectionAction(formData: FormData) {
  const returnPath = contentPath(formData.get("page_key"));
  await requireAdminUser(["admin", "staff"], `${returnPath}?error=unauthorized`);
  const parsed = cmsSectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${returnPath}?error=cms-section-invalid`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${returnPath}?error=config`);
  const { id, page_key, ...draft } = parsed.data;
  const { error } = await client.from("cms_sections").update(draft).eq("id", id);
  if (error) redirect(`${returnPath}?error=cms-section-save`);
  await client.from("cms_pages").update({ status: "draft" }).eq("page_key", page_key).neq("status", "archived");
  revalidateCms(page_key);
  redirect(`${returnPath}?saved=draft#section-${id}`);
}

export async function saveCmsItemAction(formData: FormData) {
  const returnPath = contentPath(formData.get("page_key"));
  await requireAdminUser(["admin", "staff"], `${returnPath}?error=unauthorized`);
  const values = Object.fromEntries(formData);
  if (!values.id && !values.item_key) values.item_key = `item_${randomUUID().replaceAll("-", "")}`;
  const parsed = cmsItemSchema.safeParse(values);
  if (!parsed.success) redirect(`${returnPath}?error=cms-item-invalid`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${returnPath}?error=config`);
  const { id, page_key, ...draft } = parsed.data;
  let result;
  if (id) {
    result = await client.from("cms_section_items").update(draft).eq("id", id);
  } else {
    const lastItem = await client.from("cms_section_items").select("sort_order").eq("section_id", draft.section_id)
      .order("sort_order", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
    if (lastItem.error) redirect(`${returnPath}?error=cms-item-save`);
    result = await client.from("cms_section_items").insert({ ...draft, sort_order: Number(lastItem.data?.sort_order ?? 0) + 10 });
  }
  if (result.error) redirect(`${returnPath}?error=cms-item-save`);
  await client.from("cms_pages").update({ status: "draft" }).eq("page_key", page_key).neq("status", "archived");
  revalidateCms(page_key);
  redirect(`${returnPath}?saved=draft#section-${draft.section_id}`);
}

export async function publishCmsPageAction(formData: FormData) {
  const parsed = cmsPageSchema.pick({ page_key: true }).safeParse({ page_key: formData.get("page_key") });
  if (!parsed.success) redirect("/admin/content?error=cms-publish");
  await requireAdminUser(["admin"], `/admin/content/${parsed.data.page_key}?error=cms-publish-forbidden`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/content/${parsed.data.page_key}?error=config`);
  const { error } = await client.rpc("publish_cms_page", { target_page_key: parsed.data.page_key });
  if (error) redirect(`/admin/content/${parsed.data.page_key}?error=cms-publish`);
  revalidateCms(parsed.data.page_key);
  redirect(`/admin/content/${parsed.data.page_key}?saved=published`);
}

export async function archiveCmsPageAction(formData: FormData) {
  const parsed = cmsPageSchema.pick({ page_key: true }).safeParse({ page_key: formData.get("page_key") });
  if (!parsed.success) redirect("/admin/content?error=cms-page-archive");
  await requireAdminUser(["admin"], `/admin/content/${parsed.data.page_key}?error=cms-archive-forbidden`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/content/${parsed.data.page_key}?error=config`);
  const { error } = await client.rpc("archive_cms_page", { target_page_key: parsed.data.page_key });
  if (error) redirect(`/admin/content/${parsed.data.page_key}?error=cms-page-archive`);
  revalidateCms(parsed.data.page_key);
  redirect(`/admin/content/${parsed.data.page_key}?saved=archived`);
}

function mediaFields(formData: FormData) {
  return {
    title: formData.get("title"), alt_text: formData.get("alt_text"), caption: formData.get("caption"),
    role: formData.get("role"), focal_x: formData.get("focal_x"), focal_y: formData.get("focal_y"),
  };
}

export async function addExternalCmsMediaAction(formData: FormData) {
  await requireAdminUser(["admin", "staff"], "/admin/site-media?error=unauthorized");
  const parsed = externalCmsMediaSchema.safeParse({ ...mediaFields(formData), external_url: formData.get("external_url") });
  if (!parsed.success) redirect("/admin/site-media?error=cms-media-invalid");
  const client = await createServerSupabaseClient();
  if (!client) redirect("/admin/site-media?error=config");
  const { error } = await client.from("cms_media_assets").insert({ ...parsed.data, media_type: "image" });
  if (error) redirect("/admin/site-media?error=cms-media-save");
  revalidateCms();
  redirect("/admin/site-media?saved=external");
}

const UPLOAD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
};

export async function uploadCmsMediaAction(formData: FormData) {
  await requireAdminUser(["admin", "staff"], "/admin/site-media?error=unauthorized");
  const parsed = uploadCmsMediaSchema.safeParse({ ...mediaFields(formData), folder: formData.get("folder") });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File) || file.size < 1 || file.size > 10 * 1024 * 1024 || !UPLOAD_TYPES[file.type]) {
    redirect("/admin/site-media?error=cms-media-invalid");
  }
  const client = await createServerSupabaseClient();
  if (!client) redirect("/admin/site-media?error=config");
  let dimensions: { width: number; height: number };
  try {
    dimensions = readImageDimensions(new Uint8Array(await file.arrayBuffer()), file.type);
  } catch {
    redirect("/admin/site-media?error=cms-media-metadata");
  }
  const path = `${parsed.data.folder}/${randomUUID()}.${UPLOAD_TYPES[file.type]}`;
  const upload = await client.storage.from("site-content").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (upload.error) redirect("/admin/site-media?error=cms-media-upload");
  const { error } = await client.from("cms_media_assets").insert({
    title: parsed.data.title,
    alt_text: parsed.data.alt_text,
    caption: parsed.data.caption,
    role: parsed.data.role,
    width: dimensions.width,
    height: dimensions.height,
    focal_x: parsed.data.focal_x,
    focal_y: parsed.data.focal_y,
    media_type: "image",
    storage_bucket: "site-content",
    storage_path: path,
    mime_type: file.type,
  });
  if (error) {
    await client.storage.from("site-content").remove([path]);
    redirect("/admin/site-media?error=cms-media-save");
  }
  revalidateCms();
  redirect("/admin/site-media?saved=upload");
}

export async function archiveCmsMediaAction(formData: FormData) {
  const parsed = cmsIdSchema.safeParse(formData.get("id"));
  if (!parsed.success) redirect("/admin/site-media?error=cms-media-archive");
  await requireAdminUser(["admin"], "/admin/site-media?error=cms-media-archive-forbidden");
  const client = await createServerSupabaseClient();
  if (!client) redirect("/admin/site-media?error=config");
  const { error } = await client.rpc("archive_cms_media_asset", { target_media_id: parsed.data });
  if (error) redirect("/admin/site-media?error=cms-media-referenced");
  revalidateCms();
  redirect("/admin/site-media?saved=archived");
}

export async function updateCmsMediaAction(formData: FormData) {
  await requireAdminUser(["admin", "staff"], "/admin/site-media?error=unauthorized");
  const parsed = updateCmsMediaSchema.safeParse({ id: formData.get("id"), ...mediaFields(formData) });
  if (!parsed.success) redirect("/admin/site-media?error=cms-media-invalid");
  const client = await createServerSupabaseClient();
  if (!client) redirect("/admin/site-media?error=config");
  const { id, ...metadata } = parsed.data;
  const { error } = await client.from("cms_media_assets").update(metadata).eq("id", id).eq("is_active", true);
  if (error) redirect("/admin/site-media?error=cms-media-save");
  revalidateCms();
  redirect(`/admin/site-media?saved=media#media-${id}`);
}

export async function reorderCmsSectionAction(formData: FormData) {
  const returnPath = contentPath(formData.get("page_key"));
  await requireAdminUser(["admin", "staff"], `${returnPath}?error=unauthorized`);
  const parsed = cmsMoveSchema.safeParse({ page_key: formData.get("page_key"), id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) redirect(`${returnPath}?error=cms-reorder`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${returnPath}?error=config`);
  const { error } = await client.rpc("reorder_cms_section", {
    target_page_key: parsed.data.page_key, target_section_id: parsed.data.id, move_direction: parsed.data.direction,
  });
  if (error) redirect(`${returnPath}?error=cms-reorder`);
  revalidateCms(parsed.data.page_key);
  redirect(`${returnPath}?saved=reordered#section-${parsed.data.id}`);
}

export async function reorderCmsItemAction(formData: FormData) {
  const returnPath = contentPath(formData.get("page_key"));
  await requireAdminUser(["admin", "staff"], `${returnPath}?error=unauthorized`);
  const parsed = cmsMoveSchema.safeParse({ page_key: formData.get("page_key"), id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) redirect(`${returnPath}?error=cms-reorder`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${returnPath}?error=config`);
  const { error } = await client.rpc("reorder_cms_section_item", {
    target_page_key: parsed.data.page_key, target_item_id: parsed.data.id, move_direction: parsed.data.direction,
  });
  if (error) redirect(`${returnPath}?error=cms-reorder`);
  revalidateCms(parsed.data.page_key);
  redirect(`${returnPath}?saved=reordered#section-item-${parsed.data.id}`);
}

export async function searchCmsMediaAction(input: unknown): Promise<CmsMediaPage> {
  await requireAdminUser(["admin", "staff"]);
  const parsed = cmsMediaQuerySchema.parse(input);
  return getAdminCmsMediaPage(parsed);
}
