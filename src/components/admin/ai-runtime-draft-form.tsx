"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { saveAIRuntimeDraftAction } from "@/features/ai/actions";

interface SafeProvider {
  id: string;
  label: string;
  enabled: boolean;
  supportsTools: boolean;
  models: Array<{ id: string; label: string; enabled: boolean; supportsTools: boolean }>;
}

export function AIRuntimeDraftForm({
  providers,
  profiles,
  defaultProvider,
  defaultModel,
}: {
  providers: SafeProvider[];
  profiles: Array<{ id: string; name: string; revision: number; status: string }>;
  defaultProvider?: string;
  defaultModel?: string;
}) {
  const firstProvider = providers.find((provider) => provider.enabled && provider.supportsTools) ?? providers[0];
  const [provider, setProvider] = useState(defaultProvider && providers.some((item) => item.id === defaultProvider) ? defaultProvider : firstProvider?.id ?? "");
  const models = useMemo(() => providers.find((item) => item.id === provider)?.models.filter((model) => model.enabled && model.supportsTools) ?? [], [provider, providers]);
  const selectedDefaultModel = models.some((model) => model.id === defaultModel) ? defaultModel : models[0]?.id;

  return (
    <form action={saveAIRuntimeDraftAction} className="grid gap-4 sm:grid-cols-3">
      <Field label="Provider" htmlFor="ai-provider">
        <Select id="ai-provider" name="provider" value={provider} onChange={(event) => setProvider(event.target.value)} required>
          {providers.filter((item) => item.enabled && item.supportsTools).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
      </Field>
      <Field label="Model allow-list" htmlFor="ai-model">
        <Select key={`${provider}:${selectedDefaultModel}`} id="ai-model" name="model" defaultValue={selectedDefaultModel} required>
          {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
        </Select>
      </Field>
      <Field label="Behavior Profile" htmlFor="ai-profile">
        <Select id="ai-profile" name="profile_id" required defaultValue={profiles[0]?.id}>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · v{profile.revision} · {profile.status}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
        {profiles.length && models.length ? <SubmitButton label="Lưu Draft" icon={<Save size={17} />} /> : <p className="text-sm font-semibold text-danger">Cần profile và model hợp lệ trước khi lưu.</p>}
        <p className="text-xs leading-5 text-muted">Lưu chỉ tạo revision DRAFT mới. Không tự test, không tự activate và không gọi provider.</p>
      </div>
    </form>
  );
}
