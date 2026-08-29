import { AmenityChecklist } from "@/components/admin/amenity-checklist";
import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AmenityDto } from "@/features/amenities/types";
import type { DestinationOption } from "@/features/destinations/types";
import { savePropertyAction } from "@/features/properties/actions";
import {
  ACCESS_CERTAINTIES,
  PROPERTY_TYPES,
  PUBLISH_STATUSES,
  ROAD_ACCESS_GRADES,
  type PropertyDto,
} from "@/features/properties/types";
import { formatAccessCertainty } from "@/features/properties/access";

type PropertyFormValue = PropertyDto & { amenity_ids: string[] };

export function PropertyForm({
  property,
  amenities,
  destinations,
}: {
  property?: PropertyFormValue | null;
  amenities: AmenityDto[];
  destinations: DestinationOption[];
}) {
  return (
    <form action={savePropertyAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={property?.id ?? ""} />

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Nhận diện</h2>
          <p className="mt-1 text-sm text-muted">Property là cơ sở lưu trú, không phải Place chung.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Điểm đến" htmlFor="destination_id" hint="area_name bên dưới là tiểu vùng trong điểm đến.">
            <Select id="destination_id" name="destination_id" defaultValue={property?.destination_id ?? destinations[0]?.id ?? ""} required>
              <option value="">Chọn điểm đến</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>{destination.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tên nơi lưu trú" htmlFor="name">
            <Input id="name" name="name" defaultValue={property?.name ?? ""} maxLength={160} required />
          </Field>
          <Field label="Slug" htmlFor="slug" hint="Chữ thường, số và dấu gạch ngang.">
            <Input id="slug" name="slug" defaultValue={property?.slug ?? ""} maxLength={120} required />
          </Field>
          <Field label="Loại hình" htmlFor="property_type">
            <Select id="property_type" name="property_type" defaultValue={property?.property_type ?? "homestay"}>
              {PROPERTY_TYPES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Khu vực" htmlFor="area_name">
            <Input id="area_name" name="area_name" defaultValue={property?.area_name ?? ""} maxLength={120} required />
          </Field>
        </div>
        <Field label="Mô tả ngắn" htmlFor="short_description">
          <Input id="short_description" name="short_description" defaultValue={property?.short_description ?? ""} maxLength={300} />
        </Field>
        <Field label="Mô tả đầy đủ" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={property?.description ?? ""} maxLength={10000} className="min-h-40" />
        </Field>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Vị trí và liên hệ công khai</h2>
          <p className="mt-1 text-sm text-muted">Không điền tọa độ hoặc địa chỉ nếu chưa có dữ liệu thật.</p>
        </div>
        <Field label="Địa chỉ" htmlFor="address">
          <Input id="address" name="address" defaultValue={property?.address ?? ""} maxLength={500} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Latitude" htmlFor="latitude">
            <Input id="latitude" name="latitude" type="number" step="0.000001" min={-90} max={90} defaultValue={property?.latitude ?? ""} />
          </Field>
          <Field label="Longitude" htmlFor="longitude">
            <Input id="longitude" name="longitude" type="number" step="0.000001" min={-180} max={180} defaultValue={property?.longitude ?? ""} />
          </Field>
          <Field label="Độ cao (m)" htmlFor="altitude_m">
            <Input id="altitude_m" name="altitude_m" type="number" min={-500} max={9000} defaultValue={property?.altitude_m ?? ""} />
          </Field>
        </div>
        <Field label="Google Maps URL" htmlFor="google_maps_url">
          <Input id="google_maps_url" name="google_maps_url" type="url" defaultValue={property?.google_maps_url ?? ""} maxLength={2048} placeholder="https://..." />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Điện thoại công khai" htmlFor="public_phone">
            <Input id="public_phone" name="public_phone" type="tel" defaultValue={property?.public_phone ?? ""} maxLength={30} />
          </Field>
          <Field label="Zalo URL công khai" htmlFor="public_zalo_url">
            <Input id="public_zalo_url" name="public_zalo_url" type="url" defaultValue={property?.public_zalo_url ?? ""} maxLength={2048} placeholder="https://zalo.me/..." />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-pine">Vận hành và đường vào</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Check-in" htmlFor="check_in_time">
            <Input id="check_in_time" name="check_in_time" type="time" defaultValue={property?.check_in_time?.slice(0, 5) ?? "14:00"} required />
          </Field>
          <Field label="Check-out" htmlFor="check_out_time">
            <Input id="check_out_time" name="check_out_time" type="time" defaultValue={property?.check_out_time?.slice(0, 5) ?? "12:00"} required />
          </Field>
          <Field label="Mức đường vào sơ bộ" htmlFor="road_access_grade" hint="Không phải Road Verified.">
            <Select id="road_access_grade" name="road_access_grade" defaultValue={property?.road_access_grade ?? "unknown"}>
              {ROAD_ACCESS_GRADES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Ô tô tiếp cận" htmlFor="car_access">
            <Select id="car_access" name="car_access" defaultValue={property?.car_access ?? "unknown"}>
              {ACCESS_CERTAINTIES.map((value) => <option key={value} value={value}>{formatAccessCertainty(value)}</option>)}
            </Select>
          </Field>
          <Field label="Xe máy tiếp cận" htmlFor="motorbike_access">
            <Select id="motorbike_access" name="motorbike_access" defaultValue={property?.motorbike_access ?? "unknown"}>
              {ACCESS_CERTAINTIES.map((value) => <option key={value} value={value}>{formatAccessCertainty(value)}</option>)}
            </Select>
          </Field>
          <Field label="Chỗ đỗ xe" htmlFor="parking">
            <Select id="parking" name="parking" defaultValue={property?.parking ?? "unknown"}>
              {ACCESS_CERTAINTIES.map((value) => <option key={value} value={value}>{formatAccessCertainty(value)}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CheckboxField name="wifi" label="Wi-Fi" defaultChecked={property?.wifi} />
          <CheckboxField name="restaurant" label="Nhà hàng" defaultChecked={property?.restaurant} />
          <CheckboxField name="breakfast" label="Bữa sáng" defaultChecked={property?.breakfast} />
          <CheckboxField name="bbq" label="BBQ" defaultChecked={property?.bbq} />
          <CheckboxField name="is_featured" label="Nổi bật" defaultChecked={property?.is_featured} />
        </div>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Amenities</h2>
          <p className="mt-1 text-sm text-muted">Gán từ catalog chuẩn, không lưu tên lặp trong JSON.</p>
        </div>
        <AmenityChecklist amenities={amenities} selectedIds={property?.amenity_ids} />
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-pine">Xuất bản</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Trạng thái" htmlFor="publish_status">
            <Select id="publish_status" name="publish_status" defaultValue={property?.publish_status ?? "draft"}>
              {PUBLISH_STATUSES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
          <CheckboxField name="is_active" label="Đang hoạt động" defaultChecked={property?.is_active} hint="Bắt buộc bật trước khi published." />
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu nơi lưu trú" /></div>
      </div>
    </form>
  );
}
