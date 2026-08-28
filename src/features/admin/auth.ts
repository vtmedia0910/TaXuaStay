import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { isAuthorizedRole, normalizeAdminRole, type AdminRole } from "@/features/admin/authz";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminUserDto {
  id: string;
  email: string | null;
  role: AdminRole;
}

export const getCurrentAdminUser = cache(async (): Promise<AdminUserDto | null> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const role = normalizeAdminRole(data.user.app_metadata?.role);
  if (!role) return null;

  return { id: data.user.id, email: data.user.email ?? null, role };
});

export async function requireAdminUser(allowed: readonly AdminRole[] = ["admin", "staff"]) {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/admin/login");
  if (!isAuthorizedRole(user.role, allowed)) redirect("/admin/login?error=forbidden");

  return user;
}
