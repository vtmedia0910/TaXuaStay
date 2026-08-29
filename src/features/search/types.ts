import type { PublicAmenityDto } from "@/features/amenities/types";
import type { AccessCertainty, PropertyType } from "@/features/properties/types";
import type { BathroomType, PublicRoomTypeDto, ViewType } from "@/features/rooms/types";
import type { PublicCloudViewVerificationDto, PublicRoadVerificationDto } from "@/features/verification/types";
import type { PriceQuote } from "@/features/pricing/types";

export const SEARCH_PAGE_SIZE = 18;

export interface RoomSearchParams {
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  rooms: number;
  propertyType?: PropertyType;
  area?: string;
  bathroomType?: BathroomType;
  balcony?: "yes" | "no";
  viewType?: ViewType;
  carAccess?: AccessCertainty;
  motorbikeAccess?: AccessCertainty;
  parking?: AccessCertainty;
  wifi: boolean;
  breakfast: boolean;
  restaurant: boolean;
  bbq: boolean;
  page: number;
}

export interface ParsedRoomSearch {
  params: RoomSearchParams;
  issues: string[];
  normalizedQuery: string;
}

export interface SearchPropertyDto {
  id: string;
  slug: string;
  name: string;
  property_type: PropertyType;
  area_name: string;
  car_access: AccessCertainty;
  motorbike_access: AccessCertainty;
  parking: AccessCertainty;
  restaurant: boolean;
  breakfast: boolean;
  bbq: boolean;
  wifi: boolean;
  is_featured: boolean;
  updated_at: string;
}

export interface SearchMediaDto {
  id: string;
  property_id: string | null;
  room_type_id: string | null;
  media_type: "photo" | "video" | "panorama_360";
  url: string;
  thumbnail_url: string | null;
  alt_text: string;
  sort_order: number;
}

export interface RoomSearchResult {
  room: PublicRoomTypeDto;
  property: SearchPropertyDto;
  roomAmenities: PublicAmenityDto[];
  propertyAmenities: PublicAmenityDto[];
  image: SearchMediaDto | null;
  cloudView: PublicCloudViewVerificationDto | null;
  road: PublicRoadVerificationDto | null;
  priceQuote: PriceQuote | null;
}

export interface SearchPreset {
  propertyTypes?: PropertyType[];
  viewTypes?: ViewType[];
  bathroomTypes?: BathroomType[];
  minGuests?: number;
  maxGuests?: number;
  carAccess?: AccessCertainty;
  parking?: AccessCertainty;
}

export interface RoomSearchResponse {
  items: RoomSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  status: "ready" | "unconfigured" | "error";
}

export interface SearchOptions {
  areas: string[];
}

export interface PublicSitemapProperty {
  slug: string;
  updated_at: string;
}

export interface PublicSitemapRoom {
  slug: string;
  updated_at: string;
  property: { slug: string };
}

export interface PublicSitemapData {
  properties: PublicSitemapProperty[];
  rooms: PublicSitemapRoom[];
}
