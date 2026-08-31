import type { ComponentProps } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
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

export const HERO_SERVICE_TABS = [
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
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  icon: LucideIcon;
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
  icon: LucideIcon;
}) {
  return (
    <label className="trip-hero-preference-chip" data-event="hero_preference_toggle">
      <input type="checkbox" name={name} value={value} className="peer sr-only" />
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function HeroServiceTabs({ mobile = false, packagesAvailable = false }: { mobile?: boolean; packagesAvailable?: boolean }) {
  return (
    <div
      className={mobile ? "trip-hero-service-tabs trip-mobile-search-services" : "trip-hero-service-tabs"}
      aria-label="Dịch vụ tìm kiếm"
      role="tablist"
    >
      {HERO_SERVICE_TABS.map(({ label, Icon, active }) => {
        const available = active || (label === "Combo" && packagesAvailable);
        const content = <><Icon size={17} aria-hidden="true" /><span className="trip-hero-service-label">{label}{!available ? <small className="trip-hero-service-status">Sắp có</small> : null}</span></>;
        return label === "Combo" && packagesAvailable ? <Link key={label} href="/packages" className="trip-hero-service-tab is-available" role="tab" aria-selected="false">{content}</Link> : <div
          key={label}
          className={active ? "trip-hero-service-tab is-active" : "trip-hero-service-tab"}
          role="tab"
          aria-selected={active}
          aria-disabled={active ? undefined : "true"}
        >
          {content}
        </div>;
      })}
    </div>
  );
}

export function HeroSearchFields({
  idPrefix,
  submitLabel,
}: {
  idPrefix: string;
  submitLabel: string;
}) {
  return (
    <div className="trip-hero-search-fields">
      <SearchField id={`${idPrefix}-check-in`} label="Nhận phòng" icon={CalendarDays} name="check_in" type="date" />
      <SearchField id={`${idPrefix}-check-out`} label="Trả phòng" icon={CalendarDays} name="check_out" type="date" />
      <SearchField id={`${idPrefix}-guests`} label="Số khách" icon={Users} name="adults" type="number" min={1} max={20} defaultValue={2} required />
      <SearchField id={`${idPrefix}-rooms`} label="Số phòng" icon={Hotel} name="rooms" type="number" min={1} max={10} defaultValue={1} required />
      <Button type="submit" className="trip-hero-search-submit" data-event="hero_search_submit">
        {submitLabel}
        <Search size={19} aria-hidden="true" />
      </Button>
    </div>
  );
}

export function HeroSearchPreferences() {
  return (
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
  );
}
