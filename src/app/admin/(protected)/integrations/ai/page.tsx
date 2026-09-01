import Link from "next/link";
import { Bot, CircleAlert, Gauge, LockKeyhole, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdminUser } from "@/features/admin/auth";
import { checkAIProviderHealthAction } from "@/features/ai/actions";
import { getAISystemDiagnostics } from "@/features/ai/diagnostics";

export const dynamic = "force-dynamic";

const healthMessages: Record<string, string> = {
  connected: "Provider đã phản hồi health check tối thiểu; chi phí và token đã được ghi nhận.",
  timeout: "Provider không phản hồi trong thời gian cho phép.",
  unavailable: "Provider đang không khả dụng; không có lỗi thô hoặc credential nào được hiển thị.",
  provider_error: "Health check thất bại an toàn. Kiểm tra cấu hình server-only và thử lại.",
  blocked: "Health check bị chặn bởi kill switch, môi trường, rate limit, budget hoặc cấu hình chưa đủ.",
  forbidden: "Chỉ Admin được chạy health check provider.",
};

function money(value: number | null) {
  return value === null ? "—" : `$${value.toFixed(value < 0.01 ? 6 : 2)}`;
}

function dateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value))
    : "Chưa kiểm tra";
}

export default async function AIIntegrationPage({ searchParams }: { searchParams: Promise<{ health?: string }> }) {
  await requireAdminUser(["admin"]);
  const [system, query] = await Promise.all([getAISystemDiagnostics(), searchParams]);
  const shared = system.shared;
  const healthMessage = query.health ? healthMessages[query.health] : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader title="AI Customer Assistant" description="Provider, kill switch, shared quota và chi phí. Không hiển thị API key, prompt, token truy cập hay PII." />
      {healthMessage ? <p className="mb-4 rounded-2xl border border-line bg-surface p-4 text-sm font-semibold text-ink" role="status">{healthMessage}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${system.configured ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}><Bot size={22} aria-hidden="true" /></span>
              <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">TRẠNG THÁI HỆ THỐNG</p><h2 className="mt-1 text-xl font-extrabold text-pine">{system.configured ? "Sẵn sàng" : "Đang khóa an toàn"}</h2></div>
            </div>
            <Badge className={system.killSwitch || !system.enabled ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-success"}>{system.killSwitch ? "KILL SWITCH" : system.enabled ? "ENABLED" : "DISABLED"}</Badge>
          </div>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Provider</dt><dd className="font-bold text-ink">{system.provider ?? "Chưa cấu hình"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Model</dt><dd className="break-all text-right font-bold text-ink">{system.model ?? "Chưa cấu hình"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Credential server-only</dt><dd className="font-bold text-ink">{system.credentialConfigured ? "Configured" : "Missing"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Shared safety store</dt><dd className="font-bold text-ink">{system.rateLimiterConfigured ? shared?.healthy ? "Connected" : "Configured" : "Missing"}</dd></div>
            <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Identity hash salt</dt><dd className="font-bold text-ink">{system.identitySaltConfigured ? "Configured" : "Missing"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Tool allow-list</dt><dd className="font-bold text-ink">{system.toolCount} tool chỉ đọc</dd></div>
          </dl>
          <div className="mt-5 rounded-2xl bg-[#fff8e8] p-4 text-sm leading-6 text-ink"><CircleAlert className="mr-2 inline text-warning" size={18} aria-hidden="true" />{system.configurationMessage}</div>
          {system.sharedStoreError ? <p className="mt-3 text-sm font-semibold text-danger" role="alert">{system.sharedStoreError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={checkAIProviderHealthAction}><SubmitButton label="Kiểm tra provider" icon={<RefreshCw size={17} />} /></form>
            <Link href="/assistant?prompt=Gợi%20ý%20phòng%20cho%202%20người%20và%20chỉ%20dùng%20dữ%20liệu%20đã%20xác%20minh." className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-bold text-pine">Mở giao diện thử</Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">Health check là thao tác Admin chủ động, vẫn đi qua shared quota/budget và bị kill switch chặn. Trang này không tự gọi provider khi tải.</p>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3"><Gauge className="text-trip-teal" size={23} aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">SHARED COST CONTROL</p><h2 className="mt-1 text-xl font-extrabold text-pine">Quota và ngân sách</h2></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Yêu cầu hôm nay", shared?.daily.requests ?? "—"],
              ["Chi phí hôm nay", shared ? money(shared.daily.costUsd) : "—"],
              ["Chi phí tháng", shared ? money(shared.monthly.costUsd) : "—"],
              ["Rate limited", shared?.daily.rateLimited ?? "—"],
              ["Budget blocked", shared?.daily.budgetBlocked ?? "—"],
              ["Provider errors", shared?.daily.providerErrors ?? "—"],
            ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-cream p-3"><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-1 text-xl font-extrabold text-pine">{value}</p></div>)}
          </div>
          <dl className="mt-4 grid gap-2 text-sm leading-5">
            <div className="flex justify-between gap-3"><dt className="text-muted">Budget ngày</dt><dd className="text-right font-bold text-ink">{money(system.limits.dailyBudgetUsd)} · {shared?.dailyBudgetState ?? "unknown"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Budget tháng</dt><dd className="text-right font-bold text-ink">{money(system.limits.monthlyBudgetUsd)} · {shared?.monthlyBudgetState ?? "unknown"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Giới hạn request/ngày</dt><dd className="text-right font-bold text-ink">{system.limits.dailyRequests}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Rate/phút</dt><dd className="text-right font-bold text-ink">IP {system.limits.perIpPerMinute} · phiên {system.limits.perSessionPerMinute} · toàn hệ thống {system.limits.globalPerMinute}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Token hôm nay</dt><dd className="text-right font-bold text-ink">{shared ? `${shared.daily.inputTokens} vào · ${shared.daily.outputTokens} ra` : "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Thành công / thất bại</dt><dd className="text-right font-bold text-ink">{shared ? `${shared.daily.successes} / ${shared.daily.failures}` : "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Tool calls / lỗi / timeout</dt><dd className="text-right font-bold text-ink">{shared ? `${shared.daily.toolCalls} / ${shared.daily.toolErrors} / ${shared.daily.timeouts}` : "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Lỗi an toàn gần nhất</dt><dd className="text-right font-bold text-ink">{shared?.daily.lastError ?? "Không có"}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted">Shared store không lưu prompt, raw IP, cookie, booking token hoặc PII. Chi phí là ước tính bảo thủ từ usage do provider trả về.</p>
        </Card>
      </div>

      <Card className="mt-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-bold text-pine"><ShieldCheck size={20} />Provider health</p><p className="mt-1 text-sm text-muted">Kiểm tra tối thiểu, không chứa dữ liệu khách hàng và không chạy tự động.</p></div><Badge>{shared?.providerHealth.status ?? "not_checked"}</Badge></div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-muted">Trạng thái gần nhất</dt><dd className="mt-1 font-bold text-ink">{shared?.providerHealth.status ?? "not_checked"}</dd></div><div><dt className="text-muted">Thời điểm</dt><dd className="mt-1 font-bold text-ink">{dateTime(shared?.providerHealth.checkedAt ?? null)}</dd></div><div><dt className="text-muted">Độ trễ</dt><dd className="mt-1 font-bold text-ink">{shared?.providerHealth.latencyMs === null || shared?.providerHealth.latencyMs === undefined ? "—" : `${shared.providerHealth.latencyMs} ms`}</dd></div></dl>
      </Card>

      <Card className="mt-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3"><LockKeyhole className="shrink-0 text-success" size={21} aria-hidden="true" /><div><h3 className="font-bold text-pine">Không truy cập DB trực tiếp</h3><p className="mt-1 text-sm leading-6 text-muted">Model chỉ nhận customer-safe DTO từ allow-list.</p></div></div>
          <div className="flex gap-3"><Wrench className="shrink-0 text-success" size={21} aria-hidden="true" /><div><h3 className="font-bold text-pine">Không có write tool</h3><p className="mt-1 text-sm leading-6 text-muted">Không Booking, Payment, Telegram hoặc cập nhật nội dung.</p></div></div>
          <div className="flex gap-3"><Bot className="shrink-0 text-success" size={21} aria-hidden="true" /><div><h3 className="font-bold text-pine">Provider có allow-list</h3><p className="mt-1 text-sm leading-6 text-muted">Chỉ adapter và model snapshot đã duyệt mới có thể hoạt động.</p></div></div>
        </div>
      </Card>
    </main>
  );
}
