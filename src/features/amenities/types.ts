export const AMENITY_CATEGORIES = [
  "room",
  "bathroom",
  "food",
  "parking",
  "comfort",
  "family",
  "outdoor",
  "policy",
  "other",
] as const;

export type AmenityCategory = (typeof AMENITY_CATEGORIES)[number];

export interface AmenityDto {
  id: string;
  slug: string;
  name: string;
  category: AmenityCategory;
  icon_key: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at?: string;
}

export type PublicAmenityDto = Omit<AmenityDto, "is_active" | "updated_at">;
