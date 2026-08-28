import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveAmenityAction } from "@/features/amenities/actions";
import { AMENITY_CATEGORIES, type AmenityDto } from "@/features/amenities/types";

export function AmenityForm({ amenity }: { amenity?: AmenityDto | null }) {
  return (
    <form action={saveAmenityAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={amenity?.id ?? ""} />
      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tên amenity" htmlFor="name">
            <Input id="name" name="name" defaultValue={amenity?.name ?? ""} maxLength={120} required />
          </Field>
          <Field label="Slug" htmlFor="slug">
            <Input id="slug" name="slug" defaultValue={amenity?.slug ?? ""} maxLength={120} required />
          </Field>
          <Field label="Danh mục" htmlFor="category">
            <Select id="category" name="category" defaultValue={amenity?.category ?? "room"}>
              {AMENITY_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Icon key" htmlFor="icon_key" hint="Khóa biểu tượng, không phải HTML.">
            <Input id="icon_key" name="icon_key" defaultValue={amenity?.icon_key ?? ""} maxLength={80} />
          </Field>
          <Field label="Thứ tự" htmlFor="sort_order">
            <Input id="sort_order" name="sort_order" type="number" min={0} max={100000} defaultValue={amenity?.sort_order ?? 0} required />
          </Field>
          <CheckboxField name="is_active" label="Đang hoạt động" defaultChecked={amenity?.is_active ?? true} />
        </div>
        <Field label="Mô tả" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={amenity?.description ?? ""} maxLength={500} />
        </Field>
      </Card>
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu amenity" /></div>
      </div>
    </form>
  );
}
