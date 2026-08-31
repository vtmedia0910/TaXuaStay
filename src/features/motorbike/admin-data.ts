import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { ADMIN_MOTORBIKE_OFFERING_COLUMNS } from "@/features/motorbike/columns";
import { MOTORBIKE_STALE_AFTER_MS } from "@/features/motorbike/policy";
import type {
  AdminMotorbikeListItem,
  AdminMotorbikeOffering,
  MotorbikeSourceOption,
} from "@/features/motorbike/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminMotorbikeSources(): Promise<MotorbikeSourceOption[]> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const [{ data: suppliers }, { data: refs }] = await Promise.all([
    client.from("suppliers").select("id,display_name,status").eq("supplier_type", "motorbike").neq("status", "archived").order("display_name"),
    client.from("supplier_external_refs").select("id,supplier_id,external_reference,is_active").eq("system_key", "taxua_biker").order("updated_at", { ascending: false }),
  ]);
  const supplierMap = new Map((suppliers ?? []).map((supplier) => [String(supplier.id), supplier]));
  return (refs ?? []).flatMap((ref) => {
    const supplier = supplierMap.get(String(ref.supplier_id));
    if (!supplier) return [];
    return [{
      supplier_id: String(supplier.id),
      supplier_name: String(supplier.display_name),
      supplier_status: String(supplier.status),
      external_ref_id: String(ref.id),
      external_reference: String(ref.external_reference),
      external_ref_active: ref.is_active === true,
    }];
  });
}

function warningsFor(offering: AdminMotorbikeOffering, source: MotorbikeSourceOption | null, now = new Date()) {
  const warnings: string[] = [];
  if (!source) warnings.push("Không tìm thấy mapping taxua_biker");
  if (source && (source.supplier_status !== "active" || !source.external_ref_active)) warnings.push("Nguồn hoặc nhà cung cấp không hoạt động");
  if (!offering.image_media_id) warnings.push("Thiếu ảnh công khai");
  if (offering.public_price_vnd === null) warnings.push("Chưa có giá công khai");
  if (!offering.public_request_url) warnings.push("Thiếu URL xác nhận");
  if (!offering.source_checked_at || now.getTime() - new Date(offering.source_checked_at).getTime() > MOTORBIKE_STALE_AFTER_MS) warnings.push("Nguồn cần kiểm tra lại");
  if (offering.availability_state === "unavailable") warnings.push("Tạm chưa nhận yêu cầu");
  if (offering.confirmation_mode === "manual") warnings.push("Xác nhận thủ công");
  return warnings;
}

export async function getAdminMotorbikeOfferings(): Promise<AdminMotorbikeListItem[]> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const [{ data, error }, sources] = await Promise.all([
    client.from("motorbike_offerings").select(ADMIN_MOTORBIKE_OFFERING_COLUMNS).order("sort_order").order("updated_at", { ascending: false }),
    getAdminMotorbikeSources(),
  ]);
  if (error) return [];
  const sourceMap = new Map(sources.map((source) => [source.external_ref_id, source]));
  return ((data ?? []) as unknown as AdminMotorbikeOffering[]).map((offering) => {
    const source = sourceMap.get(offering.source_external_ref_id) ?? null;
    return { ...offering, source, warnings: warningsFor(offering, source) };
  });
}

export async function getAdminMotorbikeOffering(id: string): Promise<AdminMotorbikeOffering | null> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from("motorbike_offerings").select(ADMIN_MOTORBIKE_OFFERING_COLUMNS).eq("id", id).maybeSingle();
  return error || !data ? null : data as unknown as AdminMotorbikeOffering;
}
