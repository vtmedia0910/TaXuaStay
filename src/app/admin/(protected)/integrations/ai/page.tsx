import { Bot, CircleAlert, Gauge, History, LockKeyhole, Power, RefreshCw, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Wrench } from "lucide-react";
import { AIBehaviorProfileForm } from "@/components/admin/ai-behavior-profile-form";
import { AIPromptLab } from "@/components/admin/ai-prompt-lab";
import { AIRuntimeDraftForm } from "@/components/admin/ai-runtime-draft-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AIAdminNav } from "@/components/admin/ai-admin-nav";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdminUser } from "@/features/admin/auth";
import {
  activateAIRuntimeAction,
  checkAIProviderHealthAction,
  disableAIRuntimeAction,
  rollbackAIRuntimeAction,
} from "@/features/ai/actions";
import { behaviorProfileSummary } from "@/features/ai/behavior/compiler";
import { getAISystemDiagnostics } from "@/features/ai/diagnostics";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  forbidden: "Chỉ Admin được quản lý AI Control Center.",
  config: "Supabase server session chưa sẵn sàng.",
  "profile-invalid": "Profile không hợp lệ hoặc xung đột với lớp an toàn bắt buộc.",
  "profile-save-failed": "Không lưu được profile revision.",
  "profile-saved": "Đã lưu Behavior Profile thành revision DRAFT mới.",
  "profile-archive-blocked": "Không thể archive profile đang ACTIVE hoặc được runtime ACTIVE sử dụng.",
  "profile-archived": "Đã archive profile revision.",
  "runtime-invalid": "Provider/model/profile không hợp lệ.",
  "runtime-save-failed": "Không lưu được runtime DRAFT.",
  "runtime-draft-saved": "Đã lưu runtime DRAFT. Chưa có inference nào được bật.",
  "activation-invalid": "Runtime activation không hợp lệ.",
  "activation-preflight-blocked": "Activation bị chặn: credential, shared store, identity salt, environment hoặc allow-list chưa đạt.",
  "activation-blocked": "Activation bị chặn: cần Prompt Lab PASS và health CONNECTED trong 24 giờ gần nhất.",
  "runtime-activated": "Runtime revision đã ACTIVE. AI_KILL_SWITCH và AI_ENABLED vẫn là cổng hard fail-closed.",
  "rollback-invalid": "Revision rollback không hợp lệ.",
  "rollback-preflight-blocked": "Rollback bị chặn bởi credential/health/safety preflight hiện tại.",
  "rollback-blocked": "Không thể rollback revision này.",
  "runtime-rolled-back": "Đã tạo runtime ACTIVE revision mới từ lịch sử; không sửa revision cũ.",
  "runtime-disabled": "Đã tạo runtime ACTIVE revision mới ở trạng thái disabled.",
  "runtime-disable-failed": "Không thể tắt runtime.",
  "health-invalid-selection": "Provider/model health check không nằm trong allow-list.",
  "health-record-failed": "Health check đã kết thúc nhưng không ghi được metadata an toàn.",
};

function money(value: number | null) {
  return value === null ? "—" : `$${value.toFixed(value < 0.01 ? 6 : 2)}`;
}

function dateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value))
    : "Chưa kiểm tra";
}

function healthIsCurrent(value: { status: string; checked_at: string } | null) {
  return value?.status === "CONNECTED" && Date.now() - new Date(value.checked_at).getTime() <= 24 * 60 * 60 * 1000;
}

export default async function AIIntegrationPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  await requireAdminUser(["admin"]);
  const [system, query] = await Promise.all([getAISystemDiagnostics(), searchParams]);
  const shared = system.shared;
  const result = query.result;
  const resultMessage = result
    ? resultMessages[result] ?? (result.startsWith("health-") ? `Provider health: ${result.replace("health-", "").replaceAll("-", " · ")}.` : "Thao tác đã hoàn tất.")
    : null;
  const latestProfiles = system.profiles.filter((profile, index, profiles) => (
    profile.status !== "ARCHIVED"
    && profiles.findIndex((candidate) => candidate.profile_key === profile.profile_key) === index
  ));
  const activeProfileRow = system.activeRuntime
    ? system.profiles.find((profile) => profile.id === system.activeRuntime?.profile_id) ?? null
    : null;
  const activeSummary = activeProfileRow ? behaviorProfileSummary({
    revision: activeProfileRow.revision,
    name: activeProfileRow.name,
    roleDescription: activeProfileRow.role_description,
    persona: activeProfileRow.persona,
    tone: activeProfileRow.tone,
    verbosity: activeProfileRow.verbosity,
    answerStyle: activeProfileRow.answer_style,
    languagePolicy: activeProfileRow.language_policy,
    salesPolicy: activeProfileRow.sales_policy,
    uncertaintyPolicy: activeProfileRow.uncertainty_policy,
    customInstructions: activeProfileRow.custom_instructions,
  }) : null;
  const draftProvider = system.latestDraft
    ? system.registry.find((provider) => provider.id === system.latestDraft?.provider) ?? null
    : null;
  const draftModel = draftProvider?.models.find((model) => model.id === system.latestDraft?.model) ?? null;
  const activationReady = Boolean(
    system.latestDraft?.test_status === "PASSED"
    && draftProvider?.credentialConfigured
    && healthIsCurrent(draftModel?.health ?? null)
    && system.rateLimiterConfigured
    && system.identitySaltConfigured
    && system.environmentAllowed
    && !system.killSwitch,
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader title="AI Control Center" description="Multi-provider runtime, Behavior Studio và Prompt Lab. Secrets chỉ ở Vercel; trang không tự gọi provider khi tải." />
      <AIAdminNav />
      {resultMessage ? <p className="mb-4 rounded-2xl border border-line bg-surface p-4 text-sm font-semibold text-ink" role="status">{resultMessage}</p> : null}
      {system.dataError ? <p className="mb-4 rounded-2xl border border-warning/30 bg-[#fff8e8] p-4 text-sm font-semibold text-ink" role="alert">Chưa đọc được metadata Phase 13B. Kiểm tra migration 034 và phiên Admin.</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-trip-teal/10 text-trip-teal"><Bot size={22} /></span><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">CUSTOMER RUNTIME</p><h2 className="mt-1 text-xl font-extrabold text-pine">{system.activeRuntime ? `Revision ${system.activeRuntime.revision}` : "Chưa có runtime ACTIVE"}</h2></div></div>
            <Badge className={system.killSwitch || !system.enabled ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-success"}>{system.killSwitch ? "KILL SWITCH" : system.enabled ? "ENABLED" : "DISABLED"}</Badge>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-cream p-3"><dt className="text-muted">Provider / Model</dt><dd className="mt-1 break-all font-bold text-ink">{system.activeRuntime ? `${system.activeRuntime.provider} · ${system.activeRuntime.model}` : "—"}</dd></div>
            <div className="rounded-2xl bg-cream p-3"><dt className="text-muted">Behavior Profile</dt><dd className="mt-1 font-bold text-ink">{activeProfileRow ? `${activeProfileRow.name} · v${activeProfileRow.revision}` : "—"}</dd></div>
            <div className="rounded-2xl bg-cream p-3"><dt className="text-muted">Environment master gate</dt><dd className="mt-1 font-bold text-ink">{system.masterEnabled ? "AI_ENABLED=true" : "AI_ENABLED=false"}</dd></div>
            <div className="rounded-2xl bg-cream p-3"><dt className="text-muted">Shared controls</dt><dd className="mt-1 font-bold text-ink">{system.rateLimiterConfigured && system.identitySaltConfigured ? "Configured" : "Missing"}</dd></div>
          </dl>
          <div className="mt-4 rounded-2xl bg-[#fff8e8] p-4 text-sm leading-6 text-ink"><CircleAlert className="mr-2 inline text-warning" size={18} />{system.configurationMessage}</div>
          {system.activeRuntime?.enabled ? <form action={disableAIRuntimeAction} className="mt-4"><SubmitButton label="Tắt customer inference" icon={<Power size={17} />} variant="secondary" confirmation="Tạo revision mới để tắt customer inference?" /></form> : null}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3"><Gauge className="text-trip-teal" size={23} /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">GLOBAL AUTHORITY</p><h2 className="mt-1 text-xl font-extrabold text-pine">Quota & budget</h2></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[["Yêu cầu hôm nay", shared?.daily.requests ?? "—"], ["Chi phí hôm nay", shared ? money(shared.daily.costUsd) : "—"], ["Chi phí tháng", shared ? money(shared.monthly.costUsd) : "—"], ["Rate limited", shared?.daily.rateLimited ?? "—"], ["Budget blocked", shared?.daily.budgetBlocked ?? "—"], ["Provider errors", shared?.daily.providerErrors ?? "—"]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-cream p-3"><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-1 text-xl font-extrabold text-pine">{value}</p></div>)}
          </div>
          <dl className="mt-4 grid gap-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted">Budget ngày / tháng</dt><dd className="text-right font-bold text-ink">{money(system.limits.dailyBudgetUsd)} / {money(system.limits.monthlyBudgetUsd)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">Token hôm nay</dt><dd className="text-right font-bold text-ink">{shared ? `${shared.daily.inputTokens} vào · ${shared.daily.outputTokens} ra` : "—"}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">Tool / lỗi / timeout</dt><dd className="text-right font-bold text-ink">{shared ? `${shared.daily.toolCalls} / ${shared.daily.toolErrors} / ${shared.daily.timeouts}` : "—"}</dd></div></dl>
          {system.sharedStoreError ? <p className="mt-3 text-sm font-semibold text-danger">{system.sharedStoreError}</p> : null}
        </Card>
      </div>

      <Card className="mt-4 p-5 sm:p-6">
        <div className="flex items-center gap-3"><ShieldCheck className="text-trip-teal" size={22} /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">PROVIDER REGISTRY</p><h2 className="mt-1 text-xl font-extrabold text-pine">Credentials & explicit health</h2></div></div>
        <p className="mt-2 text-sm leading-6 text-muted">Không hiển thị key, ký tự cuối, raw response hoặc secret history. Health chỉ chạy khi Admin bấm nút và luôn qua shared quota/budget.</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {system.registry.map((provider) => {
            const model = provider.models[0];
            const health = model?.health ?? null;
            return <section key={provider.id} className="rounded-2xl border border-line p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-extrabold text-pine">{provider.label}</h3><p className="mt-1 break-all text-xs text-muted">{model?.label ?? "Không có model"}</p></div><Badge>{provider.credentialConfigured ? "Configured" : "Missing"}</Badge></div><dl className="mt-4 grid gap-2 text-sm"><div className="flex justify-between gap-2"><dt className="text-muted">Health</dt><dd className="font-bold text-ink">{health?.status ?? "NOT_CHECKED"}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted">Checked</dt><dd className="text-right font-bold text-ink">{dateTime(health?.checked_at)}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted">Latency</dt><dd className="font-bold text-ink">{health?.latency_ms === null || health?.latency_ms === undefined ? "—" : `${health.latency_ms} ms`}</dd></div></dl>{model ? <form action={checkAIProviderHealthAction} className="mt-4"><input type="hidden" name="provider" value={provider.id} /><input type="hidden" name="model" value={model.id} /><SubmitButton label={`Kiểm tra ${provider.label}`} icon={<RefreshCw size={17} />} variant="secondary" /></form> : null}</section>;
          })}
        </div>
      </Card>

      <Card className="mt-4 p-5 sm:p-6">
        <div className="flex items-center gap-3"><SlidersHorizontal className="text-trip-teal" size={22} /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">DRAFT → TEST → ACTIVATE</p><h2 className="mt-1 text-xl font-extrabold text-pine">Runtime Draft</h2></div></div>
        <div className="mt-5"><AIRuntimeDraftForm providers={system.registry} profiles={latestProfiles} defaultProvider={system.latestDraft?.provider ?? "gemini"} defaultModel={system.latestDraft?.model ?? "gemini-2.5-flash"} /></div>
        {system.latestDraft ? <div className="mt-5 rounded-2xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-pine">Draft rev {system.latestDraft.revision} · {system.latestDraft.provider} · {system.latestDraft.model}</p><p className="mt-1 text-sm text-muted">Profile v{system.latestDraft.profile_revision} · Test {system.latestDraft.test_status}</p></div>{activationReady ? <form action={activateAIRuntimeAction}><input type="hidden" name="runtime_revision" value={system.latestDraft.revision} /><input type="hidden" name="provider" value={system.latestDraft.provider} /><input type="hidden" name="model" value={system.latestDraft.model} /><SubmitButton label="Activate" icon={<Sparkles size={17} />} confirmation="Activate revision này cho customer runtime? Hard env gates vẫn tiếp tục áp dụng." /></form> : <button type="button" disabled className="min-h-11 rounded-full bg-mist px-4 text-sm font-bold text-muted">Activate bị khóa</button>}</div>{!activationReady ? <p className="mt-3 text-xs leading-5 text-muted">Cần credential Configured, health CONNECTED trong 24 giờ, Prompt Lab PASS, shared store + identity salt, environment cho phép và kill switch tắt.</p> : null}</div> : null}
      </Card>

      <Card className="mt-4 p-5 sm:p-6"><div className="flex items-center gap-3"><Sparkles className="text-trip-teal" size={22} /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">PROMPT LAB</p><h2 className="mt-1 text-xl font-extrabold text-pine">Test Draft trước khi Activate</h2></div></div><div className="mt-5"><AIPromptLab draft={system.latestDraft} /></div></Card>

      <Card className="mt-4 p-5 sm:p-6"><div className="flex items-center gap-3"><Bot className="text-trip-teal" size={22} /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">AI BEHAVIOR STUDIO</p><h2 className="mt-1 text-xl font-extrabold text-pine">Structured profile revisions</h2></div></div>{activeSummary ? <div className="mt-4 grid gap-2 rounded-2xl bg-cream p-4 text-sm sm:grid-cols-2"><p><strong>Role:</strong> {activeSummary.role}</p><p><strong>Tone:</strong> {activeSummary.tone}</p><p><strong>Verbosity:</strong> {activeSummary.verbosity}</p><p><strong>Sales:</strong> {activeSummary.sales}</p><p><strong>Unknown:</strong> {activeSummary.uncertainty}</p><p><strong>Language:</strong> {activeSummary.language}</p></div> : null}<div className="mt-5"><AIBehaviorProfileForm profiles={system.profiles} /></div></Card>

      <Card className="mt-4 p-5 sm:p-6"><div className="flex items-center gap-3"><History className="text-trip-teal" size={22} /><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">IMMUTABLE HISTORY</p><h2 className="mt-1 text-xl font-extrabold text-pine">Activation & rollback</h2></div></div><div className="mt-5 grid gap-3">{system.runtimes.filter((runtime) => runtime.status !== "DRAFT").length ? system.runtimes.filter((runtime) => runtime.status !== "DRAFT").map((runtime) => { const provider = system.registry.find((item) => item.id === runtime.provider); const model = provider?.models.find((item) => item.id === runtime.model); const rollbackReady = Boolean(provider?.credentialConfigured && healthIsCurrent(model?.health ?? null) && system.rateLimiterConfigured && system.identitySaltConfigured && system.environmentAllowed && !system.killSwitch); return <div key={runtime.revision} className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-pine">Rev {runtime.revision} · {runtime.provider} · {runtime.model}</p><p className="mt-1 text-sm text-muted">Profile v{runtime.profile_revision} · {runtime.status} · {dateTime(runtime.activated_at)}</p></div>{runtime.status === "SUPERSEDED" && rollbackReady ? <form action={rollbackAIRuntimeAction}><input type="hidden" name="runtime_revision" value={runtime.revision} /><input type="hidden" name="provider" value={runtime.provider} /><input type="hidden" name="model" value={runtime.model} /><SubmitButton label={`Rollback về rev ${runtime.revision}`} icon={<RotateCcw size={17} />} variant="secondary" confirmation="Rollback sẽ tạo ACTIVE revision mới, không sửa lịch sử. Tiếp tục?" /></form> : null}</div>; }) : <p className="rounded-2xl bg-cream p-4 text-sm text-muted">Chưa có activation history.</p>}</div></Card>

      <Card className="mt-4 p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-3"><div className="flex gap-3"><LockKeyhole className="shrink-0 text-success" size={21} /><div><h3 className="font-bold text-pine">Không secret trong DB/UI</h3><p className="mt-1 text-sm leading-6 text-muted">Chỉ trạng thái Configured/Missing; key ở Vercel server-only.</p></div></div><div className="flex gap-3"><Wrench className="shrink-0 text-success" size={21} /><div><h3 className="font-bold text-pine">Đúng 9 tool read-only</h3><p className="mt-1 text-sm leading-6 text-muted">Không SQL, HTTP, browser hoặc write tool.</p></div></div><div className="flex gap-3"><ShieldCheck className="shrink-0 text-success" size={21} /><div><h3 className="font-bold text-pine">Core safety code-owned</h3><p className="mt-1 text-sm leading-6 text-muted">Persona không thể ghi đè source of truth, privacy hay unknown semantics.</p></div></div></div></Card>
    </main>
  );
}
