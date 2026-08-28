"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeAdminRole } from "@/features/admin/authz";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8).max(200),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) redirect("/admin/login?error=invalid");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/login?error=config");

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) redirect("/admin/login?error=credentials");

  if (!normalizeAdminRole(data.user.app_metadata?.role)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();

  redirect("/admin/login");
}
