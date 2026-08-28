import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminUser } from "@/features/admin/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser();

  return (
    <div className="min-h-dvh lg:flex">
      <AdminNav role={user.role} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="border-b border-line bg-surface px-4 py-3 sm:px-6">
          <div className="mx-auto flex min-h-11 max-w-5xl items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm font-bold tracking-[0.08em] text-pine">
                TÀ XÙA STAY ADMIN
              </p>
              <p className="text-xs text-muted">
                {user.email} · {user.role}
              </p>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
