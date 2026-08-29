import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveDestinationAction } from "@/features/destinations/actions";
import type { DestinationDto } from "@/features/destinations/types";
import { PUBLISH_STATUSES } from "@/features/properties/types";

export function DestinationForm({ destination }: { destination?: DestinationDto | null }) {
  return (
    <form action={saveDestinationAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={destination?.id ?? ""} />
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Nhận diện điểm đến</h2>
          <p className="mt-1 text-sm text-muted">Chỉ nhập dữ liệu địa lý đã biết; không suy diễn tọa độ hoặc độ cao.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tên" htmlFor="name"><Input id="name" name="name" defaultValue={destination?.name ?? ""} maxLength={160} required /></Field>
          <Field label="Tên ngắn" htmlFor="short_name"><Input id="short_name" name="short_name" defaultValue={destination?.short_name ?? ""} maxLength={80} /></Field>
          <Field label="Slug" htmlFor="slug" hint="Chữ thường, số và dấu gạch ngang."><Input id="slug" name="slug" defaultValue={destination?.slug ?? ""} maxLength={120} required /></Field>
          <Field label="Tỉnh" htmlFor="province"><Input id="province" name="province" defaultValue={destination?.province ?? ""} maxLength={120} /></Field>
          <Field label="Mã quốc gia" htmlFor="country_code"><Input id="country_code" name="country_code" defaultValue={destination?.country_code ?? "VN"} minLength={2} maxLength={2} required /></Field>
          <Field label="Múi giờ" htmlFor="timezone"><Input id="timezone" name="timezone" defaultValue={destination?.timezone ?? "Asia/Ho_Chi_Minh"} maxLength={100} required /></Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Latitude" htmlFor="latitude"><Input id="latitude" name="latitude" type="number" step="0.000001" min={-90} max={90} defaultValue={destination?.latitude ?? ""} /></Field>
          <Field label="Longitude" htmlFor="longitude"><Input id="longitude" name="longitude" type="number" step="0.000001" min={-180} max={180} defaultValue={destination?.longitude ?? ""} /></Field>
          <Field label="Độ cao tham chiếu (m)" htmlFor="altitude_reference_m"><Input id="altitude_reference_m" name="altitude_reference_m" type="number" min={0} max={9000} defaultValue={destination?.altitude_reference_m ?? ""} /></Field>
        </div>
        <Field label="Mô tả" htmlFor="description"><Textarea id="description" name="description" defaultValue={destination?.description ?? ""} maxLength={10000} className="min-h-36" /></Field>
      </Card>
      <Card className="grid gap-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-pine">Xuất bản</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Trạng thái" htmlFor="publish_status"><Select id="publish_status" name="publish_status" defaultValue={destination?.publish_status ?? "draft"}>{PUBLISH_STATUSES.map((value) => <option key={value}>{value}</option>)}</Select></Field>
          <CheckboxField name="is_active" label="Đang hoạt động" defaultChecked={destination?.is_active} hint="Bắt buộc bật trước khi published." />
        </div>
      </Card>
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu điểm đến" /></div></div>
    </form>
  );
}
