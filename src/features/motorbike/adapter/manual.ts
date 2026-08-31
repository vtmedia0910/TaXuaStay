import "server-only";

import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { PUBLIC_MOTORBIKE_OFFERING_COLUMNS } from "@/features/motorbike/columns";
import type { MotorbikeProviderAdapter } from "@/features/motorbike/adapter/types";
import { normalizePublicMotorbikeOffering, type PublicMotorbikeRow } from "@/features/motorbike/adapter/normalize";
import type { MotorbikeCatalogResult, PublicMotorbikeOffering } from "@/features/motorbike/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

function rowsFrom(result: PostgrestSingleResponse<unknown[]>): PublicMotorbikeOffering[] {
  return (result.data ?? []).map((row) => normalizePublicMotorbikeOffering(row as PublicMotorbikeRow));
}

export class ManualMotorbikeProviderAdapter implements MotorbikeProviderAdapter {
  readonly mode = "manual_reference" as const;
  readonly providerKey = "taxua_biker" as const;

  async listPublicOfferings(): Promise<MotorbikeCatalogResult> {
    const client = createPublicSupabaseClient();
    if (!client) return { status: "unconfigured", offerings: [] };
    const result = await client
      .from("public_motorbike_offerings")
      .select(PUBLIC_MOTORBIKE_OFFERING_COLUMNS)
      .order("sort_order")
      .order("updated_at", { ascending: false });
    if (result.error) return { status: "error", offerings: [] };
    const offerings = rowsFrom(result as PostgrestSingleResponse<unknown[]>);
    return { status: offerings.length ? "ready" : "empty", offerings };
  }

  async getPublicOffering(slug: string): Promise<PublicMotorbikeOffering | null> {
    const client = createPublicSupabaseClient();
    if (!client) return null;
    const result = await client
      .from("public_motorbike_offerings")
      .select(PUBLIC_MOTORBIKE_OFFERING_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (result.error || !result.data) return null;
    return normalizePublicMotorbikeOffering(result.data as unknown as PublicMotorbikeRow);
  }
}
