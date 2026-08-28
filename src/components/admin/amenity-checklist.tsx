import type { AmenityDto } from "@/features/amenities/types";

export function AmenityChecklist({
  amenities,
  selectedIds = [],
}: {
  amenities: AmenityDto[];
  selectedIds?: string[];
}) {
  if (!amenities.length) {
    return <p className="text-sm text-muted">Chưa có amenity trong catalog.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {amenities.map((amenity) => (
        <label
          key={amenity.id}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-line px-3 text-sm"
        >
          <input
            type="checkbox"
            name="amenity_ids"
            value={amenity.id}
            defaultChecked={selectedIds.includes(amenity.id)}
            className="size-4 accent-pine"
          />
          <span>
            <span className="font-bold text-ink">{amenity.name}</span>
            <span className="ml-2 text-xs text-muted">{amenity.category}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
