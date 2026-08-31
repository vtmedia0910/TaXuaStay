import {
  Bike,
  BusFront,
  CalendarDays,
  CarFront,
  CheckCircle2,
  CloudSun,
  Eye,
  Hotel,
  Package,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const serviceTabs = [
  { label: "Lưu trú", Icon: Hotel, active: true },
  { label: "Combo", Icon: Package, active: false },
  { label: "Xe khách", Icon: BusFront, active: false },
  { label: "Xe máy", Icon: Bike, active: false },
] as const;

function SearchField({
  id,
  label,
  icon: Icon,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  icon: typeof CalendarDays;
}) {
  return (
    <label htmlFor={id} className="trip-hero-search-field">
      <span className="trip-hero-search-label">
        <Icon size={15} aria-hidden="true" />
        {label}
      </span>
      <Input id={id} {...props} className="trip-hero-search-input" />
    </label>
  );
}

function PreferenceCheckbox({
  name,
  value = "1",
  label,
  icon: Icon,
}: {
  name: string;
  value?: string;
  label: string;
  icon: typeof CheckCircle2;
}) {
  return (
    <label className="trip-hero-preference-chip">
      <input type="checkbox" name={name} value={value} className="peer sr-only" />
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function HeroSearch() {
  return (
    <div className="trip-hero-search-panel">
      <div className="trip-hero-service-tabs" aria-label="Dịch vụ tìm kiếm">
        {serviceTabs.map(({ label, Icon, active }) => (
          <div
            key={label}
            className={active ? "trip-hero-service-tab is-active" : "trip-hero-service-tab"}
            aria-current={active ? "page" : undefined}
            aria-disabled={active ? undefined : "true"}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            {!active ? <small>Sắp có</small> : null}
          </div>
        ))}
      </div>

      <form action="/stay" method="get" className="trip-hero-search-form">
        <input type="hidden" name="children" value="0" />
        <div className="trip-hero-search-fields">
          <SearchField id="hero-check-in" label="Nhận phòng" icon={CalendarDays} name="check_in" type="date" />
          <SearchField id="hero-check-out" label="Trả phòng" icon={CalendarDays} name="check_out" type="date" />
          <SearchField id="hero-guests" label="Số khách" icon={Users} name="adults" type="number" min={1} max={20} defaultValue={2} required />
          <SearchField id="hero-rooms" label="Số phòng" icon={Hotel} name="rooms" type="number" min={1} max={10} defaultValue={1} required />
          <Button type="submit" className="trip-hero-search-submit">
            TÌM PHÒNG PHÙ HỢP
            <Search size={19} aria-hidden="true" />
          </Button>
        </div>

        <fieldset className="trip-hero-preferences">
          <legend>Bạn quan tâm:</legend>
          <div className="trip-hero-preference-list">
            <PreferenceCheckbox name="verified" label="Đã thẩm định" icon={CheckCircle2} />
            <span
              className="trip-hero-preference-chip is-unavailable"
              aria-disabled="true"
              title="Chưa có dữ liệu dự báo hoặc tiềm năng săn mây đủ để lọc an toàn"
            >
              <CloudSun size={16} aria-hidden="true" />
              <span>Săn mây</span>
              <span className="sr-only"> — chưa có bộ lọc dữ liệu phù hợp</span>
            </span>
            <PreferenceCheckbox name="view_from_bed" label="View từ giường" icon={Eye} />
            <PreferenceCheckbox name="car_access" value="yes" label="Ô tô vào được" icon={CarFront} />
          </div>
        </fieldset>
      </form>
    </div>
  );
}
