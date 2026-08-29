import type { PublishStatus } from "@/features/properties/types";

export interface DestinationDto {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  province: string | null;
  country_code: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  altitude_reference_m: number | null;
  description: string | null;
  is_active: boolean;
  publish_status: PublishStatus;
  updated_at: string;
}
export type PublicDestinationDto = Omit<
  DestinationDto,
  "is_active" | "publish_status"
>;

export interface DestinationOption {
  id: string;
  slug: string;
  name: string;
}
