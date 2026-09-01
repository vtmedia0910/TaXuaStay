"use client";

import { useActionState } from "react";
import { FlaskConical } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  testAIRuntimeDraftAction,
} from "@/features/ai/actions";
import type { PromptLabState } from "@/features/ai/actions";

const INITIAL_PROMPT_LAB_STATE: PromptLabState = { status: "idle" };

export function AIPromptLab({ draft }: { draft: { revision: number; provider: string; model: string; profile_revision: number } | null }) {
  const [state, action] = useActionState(testAIRuntimeDraftAction, INITIAL_PROMPT_LAB_STATE);
  if (!draft) return <p className="rounded-2xl bg-cream p-4 text-sm text-muted">Lưu một runtime DRAFT trước khi chạy Prompt Lab.</p>;
  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="runtime_revision" value={draft.revision} />
        <Field label={`Câu hỏi test · Runtime rev ${draft.revision}`} htmlFor="prompt-lab-question" hint="Test dùng Draft provider/profile, vẫn qua shared quota/budget và có thể phát sinh chi phí provider.">
          <Textarea id="prompt-lab-question" name="question" required minLength={2} maxLength={1200} rows={4} defaultValue="Tôi đi 2 người cuối tuần, muốn phòng săn mây nhưng ô tô vào được." />
        </Field>
        <div><SubmitButton label="Test Draft" icon={<FlaskConical size={17} />} /></div>
      </form>
      {state.status !== "idle" ? (
        <section className={`rounded-2xl border p-4 ${state.status === "passed" ? "border-success/30 bg-success/5" : "border-warning/30 bg-[#fff8e8]"}`} aria-live="polite">
          <p className="font-bold text-pine">{state.status === "passed" ? "Prompt Lab PASS" : `Prompt Lab ${state.status.toUpperCase()}`}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Provider / model</dt><dd className="font-semibold text-ink">{state.provider ?? draft.provider} · {state.model ?? draft.model}</dd></div>
            <div><dt className="text-muted">Runtime / Profile</dt><dd className="font-semibold text-ink">rev {state.runtimeRevision ?? draft.revision} · v{state.profileRevision ?? draft.profile_revision}</dd></div>
            <div><dt className="text-muted">Latency / tool calls</dt><dd className="font-semibold text-ink">{state.latencyMs === undefined ? "—" : `${state.latencyMs} ms`} · {state.toolCalls ?? "—"}</dd></div>
            <div><dt className="text-muted">Tokens / cost</dt><dd className="font-semibold text-ink">{state.inputTokens ?? "—"} vào · {state.outputTokens ?? "—"} ra · {state.estimatedCostUsd === null || state.estimatedCostUsd === undefined ? "Cost unavailable" : `$${state.estimatedCostUsd}`}</dd></div>
          </dl>
          {state.answer ? <div className="mt-4 rounded-xl bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Câu trả lời</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{state.answer}</p></div> : null}
          {state.sources?.length ? <ul className="mt-3 space-y-1 text-xs text-muted">{state.sources.map((source, index) => <li key={`${source.label}-${index}`}>{source.label}{source.asOf ? ` · ${source.asOf}` : ""}</li>)}</ul> : null}
          {state.code ? <p className="mt-3 text-xs font-semibold text-muted">Safe code: {state.code}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
