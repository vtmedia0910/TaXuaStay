"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveAIBehaviorProfileAction } from "@/features/ai/actions";
import type { AIAdminProfileRow } from "@/features/ai/runtime/types";

const NEW_PROFILE = "new";

export function AIBehaviorProfileForm({ profiles }: { profiles: AIAdminProfileRow[] }) {
  const editable = useMemo(() => profiles.filter((profile) => profile.status !== "ARCHIVED"), [profiles]);
  const [selected, setSelected] = useState(editable[0]?.id ?? NEW_PROFILE);
  const profile = editable.find((item) => item.id === selected) ?? null;
  const formKey = profile?.id ?? NEW_PROFILE;

  return (
    <div className="grid gap-4">
      <Field label="Tạo revision từ" htmlFor="behavior-source">
        <Select id="behavior-source" value={selected} onChange={(event) => setSelected(event.target.value)}>
          {editable.map((item) => <option key={item.id} value={item.id}>{item.name} · v{item.revision} · {item.status}</option>)}
          <option value={NEW_PROFILE}>Profile mới</option>
        </Select>
      </Field>
      <form key={formKey} action={saveAIBehaviorProfileAction} className="grid gap-4 sm:grid-cols-2">
        {profile ? <input type="hidden" name="profile_key" value={profile.profile_key} /> : null}
        <div className="sm:col-span-2"><Field label="Tên Profile" htmlFor={`profile-name-${formKey}`}>
          <Input id={`profile-name-${formKey}`} name="name" required minLength={2} maxLength={80} defaultValue={profile?.name ?? "Tà Xùa Local Expert"} />
        </Field></div>
        <div className="sm:col-span-2"><Field label="Vai trò" htmlFor={`profile-role-${formKey}`}>
          <Textarea id={`profile-role-${formKey}`} name="role_description" required minLength={10} maxLength={600} rows={3} defaultValue={profile?.role_description ?? "Trợ lý du lịch Tà Xùa của TÀ XÙA TRIP, giúp khách hiểu dữ liệu thực tế có trong hệ thống."} />
        </Field></div>
        <div className="sm:col-span-2"><Field label="Persona" htmlFor={`profile-persona-${formKey}`}>
          <Textarea id={`profile-persona-${formKey}`} name="persona" required minLength={10} maxLength={600} rows={3} defaultValue={profile?.persona ?? "Thân thiện, thực tế, tự nhiên, không khoa trương và không bán hàng quá mức."} />
        </Field></div>
        <Field label="Tone" htmlFor={`profile-tone-${formKey}`}><Select id={`profile-tone-${formKey}`} name="tone" defaultValue={profile?.tone ?? "friendly"}><option value="friendly">Thân thiện</option><option value="neutral">Trung tính</option><option value="professional">Chuyên nghiệp</option><option value="warm">Ấm áp</option></Select></Field>
        <Field label="Độ dài" htmlFor={`profile-verbosity-${formKey}`}><Select id={`profile-verbosity-${formKey}`} name="verbosity" defaultValue={profile?.verbosity ?? "short"}><option value="short">Ngắn</option><option value="medium">Vừa</option><option value="detailed">Chi tiết</option></Select></Field>
        <Field label="Cách trả lời" htmlFor={`profile-style-${formKey}`}><Select id={`profile-style-${formKey}`} name="answer_style" defaultValue={profile?.answer_style ?? "direct"}><option value="direct">Trực tiếp</option><option value="balanced">Cân bằng</option><option value="guided">Hướng dẫn</option></Select></Field>
        <Field label="Ngôn ngữ" htmlFor={`profile-language-${formKey}`}><Select id={`profile-language-${formKey}`} name="language_policy" defaultValue={profile?.language_policy ?? "vietnamese_first"}><option value="vietnamese_first">Vietnamese-first</option><option value="match_customer">Theo ngôn ngữ khách</option></Select></Field>
        <Field label="Tư vấn" htmlFor={`profile-sales-${formKey}`}><Select id={`profile-sales-${formKey}`} name="sales_policy" defaultValue={profile?.sales_policy ?? "light"}><option value="none">Không bán hàng</option><option value="light">Tư vấn nhẹ</option><option value="proactive">Tư vấn chủ động</option></Select></Field>
        <Field label="Khi chưa có dữ liệu" htmlFor={`profile-unknown-${formKey}`}><Select id={`profile-unknown-${formKey}`} name="uncertainty_policy" defaultValue={profile?.uncertainty_policy ?? "explicit"}><option value="explicit">Nói rõ chưa có dữ liệu</option><option value="clarify">Hỏi làm rõ</option><option value="support">Gợi ý hỗ trợ công khai</option></Select></Field>
        <div className="sm:col-span-2"><Field label="Chỉ dẫn bổ sung" htmlFor={`profile-custom-${formKey}`} hint="Tối đa 2.000 ký tự. Không thể ghi đè source of truth, unknown semantics, privacy hoặc tool boundary.">
          <Textarea id={`profile-custom-${formKey}`} name="custom_instructions" maxLength={2000} rows={5} defaultValue={profile?.custom_instructions ?? "Trả lời ngắn trước; giải thích thêm khi khách cần."} />
        </Field></div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><SubmitButton label="Lưu thành revision DRAFT" icon={<Save size={17} />} /><p className="text-xs leading-5 text-muted">Core safety và 9 tool nằm trong code, không được chỉnh tại đây.</p></div>
      </form>
    </div>
  );
}
