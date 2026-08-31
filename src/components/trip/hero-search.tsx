import {
  HeroSearchFields,
  HeroSearchPreferences,
  HeroServiceTabs,
} from "@/components/trip/hero-search-controls";

export function HeroSearch() {
  return (
    <div className="trip-hero-search-panel">
      <HeroServiceTabs />

      <form action="/stay" method="get" className="trip-hero-search-form">
        <input type="hidden" name="children" value="0" />
        <HeroSearchFields idPrefix="hero" submitLabel="TÌM PHÒNG PHÙ HỢP" />
        <HeroSearchPreferences />
      </form>
    </div>
  );
}
