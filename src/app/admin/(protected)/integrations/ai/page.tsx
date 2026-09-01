import Link from "next/link";
import { Bot, CircleAlert, Gauge, LockKeyhole, Wrench } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card } from "@/components/ui/card";
import { requireAdminUser } from "@/features/admin/auth";
import { getAISystemDiagnostics } from "@/features/ai/diagnostics";

export const dynamic = "force-dynamic";

export default async function AIIntegrationPage() {
  await requireAdminUser(["admin"]);
  const system = getAISystemDiagnostics();
  const metrics = system.metrics;
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader title="AI Customer Assistant" description="Kiểm tra cấu hình server-only, giới hạn an toàn và số liệu runtime không chứa prompt/PII. Không hiển thị API key." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${system.configured ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}><Bot size={22} aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">TRẠNG THÁI HỆ THỐNG</p><h2 className="mt-1 text-xl font-extrabold text-pine">{system.configured ? "Đã cấu hình" : "Chưa sẵn sàng"}</h2></div></div>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Provider</dt><dd className="font-bold text-ink">{system.provider ?? "Chưa cấu hình"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Model</dt><dd className="font-bold text-ink">{system.model ?? "Chưa cấu hình"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Credential server-only</dt><dd className="font-bold text-ink">{system.credentialConfigured ? "Có" : "Không"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Tool allow-list</dt><dd className="font-bold text-ink">{system.toolCount} tool chỉ đọc</dd></div>
          </dl>
          <div className="mt-5 rounded-2xl bg-[#fff8e8] p-4 text-sm leading-6 text-ink"><CircleAlert className="mr-2 inline text-warning" size={18} aria-hidden="true" />{system.configurationMessage}</div>
          <Link href="/assistant?prompt=Gợi%20ý%20phòng%20cho%202%20người%20và%20chỉ%20dùng%20dữ%20liệu%20đã%20xác%20minh." className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-pine px-4 text-sm font-bold text-white">Mở câu hỏi thử an toàn</Link>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3"><Gauge className="text-trip-teal" size={23} aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">RUNTIME GẦN ĐÂY</p><h2 className="mt-1 text-xl font-extrabold text-pine">Số liệu theo instance</h2></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[['Yêu cầu', metrics.requests], ['Thành công', metrics.successes], ['Thất bại', metrics.failures], ['Rate limit', metrics.rateLimited], ['Tool lỗi', metrics.toolErrors], ['Độ trễ TB', metrics.averageLatencyMs === null ? '—' : `${metrics.averageLatencyMs} ms`]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-cream p-3"><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-1 text-xl font-extrabold text-pine">{value}</p></div>)}
          </div>
          <dl className="mt-4 grid gap-2 text-xs leading-5 text-muted">
            <div className="flex justify-between gap-3"><dt>Lần thành công gần nhất</dt><dd className="text-right font-bold text-ink">{metrics.lastSuccessAt ? new Date(metrics.lastSuccessAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa có"}</dd></div>
            <div className="flex justify-between gap-3"><dt>Token provider ghi nhận</dt><dd className="text-right font-bold text-ink">{metrics.inputTokens} vào · {metrics.outputTokens} ra</dd></div>
            <div className="flex justify-between gap-3"><dt>Tool đã dùng</dt><dd className="max-w-[65%] text-right font-bold text-ink">{Object.entries(metrics.toolUsage).length ? Object.entries(metrics.toolUsage).map(([name, count]) => `${name}: ${count}`).join(" · ") : "Chưa có"}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted">Instance bắt đầu: {new Date(metrics.startedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Số liệu không lưu prompt, cookie, booking token hay PII và có thể reset khi serverless instance thay đổi.</p>
        </Card>
      </div>

      <Card className="mt-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3"><LockKeyhole className="shrink-0 text-success" size={21} aria-hidden="true" /><div><h3 className="font-bold text-pine">Không truy cập DB trực tiếp</h3><p className="mt-1 text-sm leading-6 text-muted">Model chỉ nhận customer-safe DTO từ allow-list.</p></div></div>
          <div className="flex gap-3"><Wrench className="shrink-0 text-success" size={21} aria-hidden="true" /><div><h3 className="font-bold text-pine">Không có write tool</h3><p className="mt-1 text-sm leading-6 text-muted">Không Booking, Payment, Telegram hoặc cập nhật nội dung.</p></div></div>
          <div className="flex gap-3"><Bot className="shrink-0 text-success" size={21} aria-hidden="true" /><div><h3 className="font-bold text-pine">Provider-agnostic</h3><p className="mt-1 text-sm leading-6 text-muted">Domain không phụ thuộc SDK hay response shape của một hãng.</p></div></div>
        </div>
      </Card>
    </main>
  );
}
