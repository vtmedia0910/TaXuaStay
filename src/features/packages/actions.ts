"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { packageCommerceSchema } from "@/features/packages/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const adminPath = "/admin/packages";

function vietnamLocalDateTime(value: string | null) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}+07:00`;
}

export async function savePackageCommerceAction(formData: FormData) {
  await requireAdminUser(["admin"], `${adminPath}?error=package-forbidden`);
  const raw = Object.fromEntries(formData);
  const parsed = packageCommerceSchema.safeParse({
    ...raw,
    components: raw.components_json,
    price_rules: raw.price_rules_json,
  });
  if (!parsed.success) redirect(`${adminPath}?error=package-invalid`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${adminPath}?error=config`);
  const value = parsed.data;
  const components = value.components.map((component) => ({
    ...component,
    cost_verified_at: vietnamLocalDateTime(component.cost_verified_at),
  }));
  const priceRules = value.price_rules.map((rule) => ({
    ...rule,
    verified_at: vietnamLocalDateTime(rule.verified_at),
  }));
  const { data, error } = await client.rpc("save_package_commerce", {
    target_package_id: value.id,
    target_destination_id: value.destination_id,
    target_code: value.code,
    target_slug: value.slug,
    target_name: value.name,
    target_proposition: value.proposition,
    target_description: value.description,
    target_lifecycle_status: value.lifecycle_status,
    target_valid_from: value.valid_from,
    target_valid_until: value.valid_until,
    target_confirmation_mode: value.confirmation_mode,
    target_public_request_url: value.public_request_url,
    target_is_featured: value.is_featured,
    target_sort_order: value.sort_order,
    target_hero_media_id: value.hero_media_id,
    target_internal_notes: value.internal_notes,
    target_components: components,
    target_price_rules: priceRules,
  });
  const savedId = typeof data === "string" ? data : value.id;
  if (error || !savedId) redirect(`${adminPath}?error=package-save`);
  revalidatePath(adminPath);
  revalidatePath("/packages");
  revalidatePath("/packages/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  redirect(`${adminPath}/${savedId}/edit?saved=package`);
}
