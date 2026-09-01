import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { TelegramDashboard } from "@/components/admin/telegram-dashboard";
import { TelegramSystemCard } from "@/components/admin/telegram-system-card";
import { requireAdminUser } from "@/features/admin/auth";
import { getTelegramSystemDiagnostics } from "@/features/telegram/bot";
import { getTelegramDashboard } from "@/features/telegram/data";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default async function TelegramIntegrationPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; q?: string; status?: string }> }) {
  const user = await requireAdminUser();
  const [dashboard, system, query] = await Promise.all([
    getTelegramDashboard(),
    getTelegramSystemDiagnostics(),
    searchParams,
  ]);
  const needle = query.q?.trim().toLocaleLowerCase("vi") ?? "";
  const status = ["all", "connected", "attention", "unconnected"].includes(query.status ?? "") ? query.status : "all";
  const filtered = dashboard.suppliers.filter((supplier) => {
    const matchesText = !needle || `${supplier.supplier_code} ${supplier.display_name}`.toLocaleLowerCase("vi").includes(needle);
    const matchesStatus = status === "all"
      || (status === "connected" && supplier.channel?.status === "active")
      || (status === "attention" && (supplier.channel?.status === "error" || supplier.outbox.some((item) => item.status === "failed")))
      || (status === "unconnected" && (!supplier.channel || supplier.channel.status === "disabled"));
    return matchesText && matchesStatus;
  });
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <AdminPageHeader title="Telegram Supplier" description="Kết nối nhóm riêng, điều phối outbox và theo dõi lỗi giao nhận. Không lưu bot token hoặc webhook secret trong database." />
    <FormFeedback saved={query.saved} error={query.error} />
    <TelegramSystemCard system={system} role={user.role} activeChannelCount={dashboard.suppliers.filter((supplier) => supplier.channel?.status === "active").length} />
    <Card className="mb-5 p-4"><form className="grid gap-3 sm:grid-cols-[1fr_14rem_auto]" method="get"><Input name="q" defaultValue={query.q ?? ""} placeholder="Mã hoặc tên Supplier" aria-label="Tìm Supplier" /><Select name="status" defaultValue={status}><option value="all">Tất cả kết nối</option><option value="connected">Đã kết nối</option><option value="attention">Cần xử lý</option><option value="unconnected">Chưa kết nối</option></Select><button className="min-h-11 rounded-xl bg-pine px-4 font-bold text-white">Lọc</button></form></Card>
    <TelegramDashboard dashboard={{ ...dashboard, suppliers: filtered }} role={user.role} system={system} />
  </main>;
}
