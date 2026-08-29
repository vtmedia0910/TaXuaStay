import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ACCESS_CERTAINTIES, PROPERTY_TYPES } from "@/features/properties/types";
import { BATHROOM_TYPES, VIEW_TYPES } from "@/features/rooms/types";
import {
  ACCESS_FILTER_LABELS,
  BATHROOM_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  VIEW_TYPE_LABELS,
} from "@/features/search/labels";
import { countActiveSearchFilters } from "@/features/search/params";
import type { RoomSearchParams, SearchOptions } from "@/features/search/types";

function FormField({ label, htmlFor, children }: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-bold text-ink">{label}</label>
      {children}
    </div>
  );
}

function FacilityCheckbox({ name, label, checked }: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-3 text-sm font-bold text-ink">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        className="size-5 accent-pine"
      />
      {label}
    </label>
  );
}

export function SearchForm({ params, options }: {
  params: RoomSearchParams;
  options: SearchOptions;
}) {
  const activeCount = countActiveSearchFilters(params);

  return (
    <details open className="group rounded-[1.75rem] border border-line bg-surface shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-bold text-pine marker:hidden">
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={19} aria-hidden="true" />
          Bộ lọc
        </span>
        <span className="rounded-full bg-pine-soft px-3 py-1 text-xs">
          {activeCount ? `${activeCount} đang dùng` : "Chưa lọc"}
        </span>
      </summary>

      <form action="/tim-phong" method="get" className="grid gap-6 border-t border-line p-5">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-display text-xl font-bold text-pine">Lịch trình và khách</legend>
          <FormField label="Nhận phòng" htmlFor="search-check-in">
            <Input id="search-check-in" name="check_in" type="date" defaultValue={params.checkIn} />
          </FormField>
          <FormField label="Trả phòng" htmlFor="search-check-out">
            <Input id="search-check-out" name="check_out" type="date" defaultValue={params.checkOut} />
          </FormField>
          <FormField label="Người lớn" htmlFor="search-adults">
            <Input id="search-adults" name="adults" type="number" min={1} max={20} defaultValue={params.adults} required />
          </FormField>
          <FormField label="Trẻ em" htmlFor="search-children">
            <Input id="search-children" name="children" type="number" min={0} max={20} defaultValue={params.children} required />
          </FormField>
          <FormField label="Số phòng cần" htmlFor="search-rooms">
            <Input id="search-rooms" name="rooms" type="number" min={1} max={10} defaultValue={params.rooms} required />
          </FormField>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-display text-xl font-bold text-pine">Nơi lưu trú và phòng</legend>
          <FormField label="Loại nơi lưu trú" htmlFor="search-property-type">
            <Select id="search-property-type" name="property_type" defaultValue={params.propertyType ?? ""}>
              <option value="">Tất cả loại</option>
              {PROPERTY_TYPES.map((value) => <option key={value} value={value}>{PROPERTY_TYPE_LABELS[value]}</option>)}
            </Select>
          </FormField>
          <FormField label="Khu vực" htmlFor="search-area">
            <Select id="search-area" name="area" defaultValue={params.area ?? ""}>
              <option value="">Tất cả khu vực</option>
              {params.area && !options.areas.includes(params.area) ? <option value={params.area}>{params.area}</option> : null}
              {options.areas.map((area) => <option key={area} value={area}>{area}</option>)}
            </Select>
          </FormField>
          <FormField label="Phòng tắm" htmlFor="search-bathroom">
            <Select id="search-bathroom" name="bathroom" defaultValue={params.bathroomType ?? ""}>
              <option value="">Tất cả</option>
              {BATHROOM_TYPES.map((value) => <option key={value} value={value}>{BATHROOM_TYPE_LABELS[value]}</option>)}
            </Select>
          </FormField>
          <FormField label="Ban công riêng" htmlFor="search-balcony">
            <Select id="search-balcony" name="balcony" defaultValue={params.balcony ?? ""}>
              <option value="">Tất cả</option>
              <option value="yes">Có</option>
              <option value="no">Không</option>
            </Select>
          </FormField>
          <FormField label="Hướng nhìn" htmlFor="search-view">
            <Select id="search-view" name="view" defaultValue={params.viewType ?? ""}>
              <option value="">Tất cả</option>
              {VIEW_TYPES.map((value) => <option key={value} value={value}>{VIEW_TYPE_LABELS[value]}</option>)}
            </Select>
          </FormField>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-3 font-display text-xl font-bold text-pine">Tiếp cận</legend>
          {([
            ["car_access", "Ô tô tiếp cận", params.carAccess],
            ["motorbike_access", "Xe máy tiếp cận", params.motorbikeAccess],
            ["parking", "Chỗ đỗ xe", params.parking],
          ] as const).map(([name, label, value]) => (
            <FormField key={name} label={label} htmlFor={`search-${name}`}>
              <Select id={`search-${name}`} name={name} defaultValue={value ?? ""}>
                <option value="">Không yêu cầu</option>
                {ACCESS_CERTAINTIES.map((certainty) => (
                  <option key={certainty} value={certainty}>{ACCESS_FILTER_LABELS[certainty]}</option>
                ))}
              </Select>
            </FormField>
          ))}
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-display text-xl font-bold text-pine">Tiện ích nơi lưu trú</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <FacilityCheckbox name="wifi" label="Wi-Fi" checked={params.wifi} />
            <FacilityCheckbox name="breakfast" label="Bữa sáng" checked={params.breakfast} />
            <FacilityCheckbox name="restaurant" label="Nhà hàng" checked={params.restaurant} />
            <FacilityCheckbox name="bbq" label="BBQ" checked={params.bbq} />
          </div>
        </fieldset>

        <p className="rounded-2xl bg-mist/70 p-3 text-sm leading-6 text-muted">
          Ngày đi và số phòng được lưu cùng bộ lọc. Kết quả hiện chưa xác nhận tình trạng phòng theo ngày; vui lòng liên hệ nơi lưu trú trước khi quyết định.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="accent">ÁP DỤNG BỘ LỌC</Button>
          <Link href="/tim-phong" className={buttonVariants({ variant: "secondary" })}>Xóa tất cả</Link>
        </div>
      </form>
    </details>
  );
}
