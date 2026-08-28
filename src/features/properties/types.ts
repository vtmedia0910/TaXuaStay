export const PROPERTY_TYPES = [
  "homestay",
  "bungalow",
  "hotel",
  "guesthouse",
  "glamping",
  "other",
] as const;

export const PUBLISH_STATUSES = ["draft", "published", "archived"] as const;
export const ROAD_ACCESS_GRADES = ["unknown", "a", "b", "c", "d"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];
export type RoadAccessGrade = (typeof ROAD_ACCESS_GRADES)[number];

export interface PropertyDto {
  id: string;
  slug: string;
  name: string;
  property_type: PropertyType;
  short_description: string | null;
  description: string | null;
  area_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude_m: number | null;
  google_maps_url: string | null;
  public_phone: string | null;
  public_zalo_url: string | null;
  check_in_time: string;
  check_out_time: string;
  road_access_grade: RoadAccessGrade;
  car_access: boolean;
  motorbike_access: boolean;
  parking: boolean;
  restaurant: boolean;
  breakfast: boolean;
  bbq: boolean;
  wifi: boolean;
  is_featured: boolean;
  is_active: boolean;
  publish_status: PublishStatus;
  archived_at: string | null;
  property_verified_at: string | null;
  location_verified_at: string | null;
  updated_at: string;
}

export type PublicPropertyDto = Omit<
  PropertyDto,
  | "is_active"
  | "publish_status"
  | "archived_at"
  | "property_verified_at"
  | "location_verified_at"
>;

export interface PropertyListItem extends PropertyDto {
  room_count: number;
  media_count: number;
}

export interface PropertyOption {
  id: string;
  name: string;
  slug: string;
}
