import { AlertTriangle, Bot, CheckCircle2, RefreshCw, ShieldCheck, Webhook } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdminRole } from "@/features/admin/authz";
import { installTelegramWebhookAction, refreshTelegramSystemAction } from "@/features/telegram/actions";
import type { TelegramSystemDiagnostics, TelegramSystemHealth } from "@/features/telegram/types";

const HEALTH_LABELS: Record<TelegramSystemHealth, string> = {
  ready: "Sẵn sàng",
  missing_config: "Thiếu cấu hình",
  bot_invalid: "Bot Token không hợp lệ",
  webhook_missing: "Chưa cài webhook",
  webhook_mismatch: "Sai webhook",
  allowed_updates_mismatch: "Sai loại cập nhật",
  telegram_error: "Telegram đang lỗi",
  pending_updates_attention: "Có cập nhật đang chờ",
};

function dateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
    : "Không có";
}

function webhookLabel(system: TelegramSystemDiagnostics) {
  if (!system.webhook.reachable) return "Error";
  if (!system.webhook.installed) return "Missing";
  if (!system.webhook.matchesExpectedUrl || !system.webhook.allowedUpdatesMatch) return "Mismatch";
  return "Installed";
}

export function TelegramSystemCard({
  system,
  role,
  activeChannelCount,
}: {
  system: TelegramSystemDiagnostics;
  role: AdminRole;
  activeChannelCount: number;
}) {
  const ready = system.health === "ready";
  const botName = system.bot.username ? `@${system.bot.username}` : null;

  return <Card className={`mb-5 overflow-hidden border-2 ${ready ? "border-emerald-200" : "border-amber-200"}`}>
    <div className={`${ready ? "bg-emerald-50" : "bg-amber-50"} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-sky">
            <ShieldCheck size={17} />Telegram System
          </p>
          <h2 className="mt-2 text-xl font-bold text-pine">{botName ? `Bot hiện tại: ${botName}` : "Chưa xác minh được bot hiện tại"}</h2>
          <p className="mt-1 text-sm text-muted">Kiểm tra trực tiếp từ Telegram; không đọc hoặc hiển thị giá trị secret.</p>
        </div>
        <Badge className={ready ? "bg-emerald-100 text-success" : "bg-amber-100 text-amber-950"}>
          {HEALTH_LABELS[system.health]}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><p className="text-muted">Bot Token</p><p className="mt-1 font-bold text-pine">{system.botTokenConfigured ? "Configured" : "Missing"}</p></div>
        <div><p className="text-muted">Webhook Secret</p><p className="mt-1 font-bold text-pine">{system.webhookSecretConfigured ? "Configured" : "Missing"}</p></div>
        <div><p className="text-muted">Telegram API</p><p className="mt-1 font-bold text-pine">{system.bot.reachable ? "Connected" : "Failed"}</p></div>
        <div><p className="text-muted">Webhook</p><p className="mt-1 font-bold text-pine">{webhookLabel(system)}</p></div>
      </div>

      {system.bot.errorMessage || system.webhook.errorMessage ? <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-sm font-medium text-danger" role="alert">
        <AlertTriangle className="mt-0.5 shrink-0" size={17} />{system.bot.errorMessage ?? system.webhook.errorMessage}
      </p> : null}
      {activeChannelCount > 0 && system.bot.reachable && !system.webhook.installed ? <p className="mt-4 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-sm font-bold text-amber-950">
        <AlertTriangle className="mt-0.5 shrink-0" size={17} />Bot hiện tại chưa có webhook nhưng hệ thống đang giữ mapping Supplier Active. Đây thường là dấu hiệu vừa đổi Bot Token hoặc webhook của bot mới chưa được cài.
      </p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {role === "admin" ? <form action={refreshTelegramSystemAction}><SubmitButton label="Kiểm tra lại" icon={<RefreshCw size={17} />} /></form> : null}
        {role === "admin" && system.productionInstallEnabled
          ? <form action={installTelegramWebhookAction}><SubmitButton label="Cài / sửa webhook" icon={<Webhook size={17} />} confirmation="Cài webhook cho đúng Production bot và endpoint hiện tại? Hàng đợi Telegram đang có sẽ không bị xóa." /></form>
          : role === "admin" ? <Button type="button" size="lg" disabled>Cài / sửa webhook</Button> : null}
      </div>
      {!system.productionInstallEnabled ? <p className="mt-2 text-xs font-bold text-amber-950">
        {system.deploymentEnvironment === "preview" ? "Webhook installation disabled in Preview." : "Chỉ Production có Vercel project production URL hợp lệ mới được cài webhook."}
      </p> : null}
    </div>

    <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
      <section>
        <p className="flex items-center gap-2 font-bold text-pine"><Bot size={18} />Danh tính bot</p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div><dt className="text-muted">Username</dt><dd className="break-all font-bold text-pine">{botName ?? "Chưa có"}</dd></div>
          <div><dt className="text-muted">Tên hiển thị</dt><dd>{system.bot.displayName ?? "Chưa có"}</dd></div>
          <div><dt className="text-muted">Bot ID</dt><dd>{system.bot.botId ?? "Chưa có"}</dd></div>
        </dl>
      </section>
      <section>
        <p className="flex items-center gap-2 font-bold text-pine"><Webhook size={18} />Webhook Production</p>
        <dl className="mt-3 grid gap-3 text-sm">
          <div><dt className="text-muted">URL mong đợi</dt><dd className="break-all font-medium">{system.expectedWebhookUrl ?? "Không xác định"}</dd></div>
          <div><dt className="text-muted">URL hiện tại</dt><dd className="break-all font-medium">{system.webhook.currentUrl ?? "Chưa cài"}</dd></div>
          <div><dt className="text-muted">Allowed updates</dt><dd>{system.webhook.allowedUpdates.length ? system.webhook.allowedUpdates.join(", ") : "Chưa có"}</dd></div>
          <div className="grid grid-cols-2 gap-3"><div><dt className="text-muted">Pending</dt><dd className="font-bold">{system.webhook.pendingUpdateCount}</dd></div><div><dt className="text-muted">Max connections</dt><dd>{system.webhook.maxConnections ?? "Chưa có"}</dd></div></div>
          <div><dt className="text-muted">Lỗi webhook gần nhất</dt><dd>{system.webhook.lastErrorMessage ?? "Không có"}</dd><dd className="text-xs text-muted">{dateTime(system.webhook.lastErrorDate)}</dd></div>
        </dl>
      </section>
    </div>

    {activeChannelCount > 0 ? <div className="border-t border-line bg-mist/60 p-4 text-sm leading-6 sm:px-5">
      <p className="flex items-start gap-2 font-bold text-pine"><CheckCircle2 className="mt-0.5 shrink-0" size={17} />Bot rotation không thay đổi {activeChannelCount} mapping Supplier đang Active.</p>
      <p className="mt-1 text-muted">Nếu vừa đổi bot, hãy thêm bot mới vào tất cả nhóm đang dùng rồi gỡ bot cũ sau khi xác minh. Không cần chạy lại /connect khi group/chat ID không đổi.</p>
    </div> : null}
  </Card>;
}
