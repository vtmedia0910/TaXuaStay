import type { MotorbikeCatalogResult, MotorbikeIntegrationMode, PublicMotorbikeOffering } from "@/features/motorbike/types";

export interface MotorbikeProviderAdapter {
  readonly mode: MotorbikeIntegrationMode;
  readonly providerKey: "taxua_biker";
  listPublicOfferings(): Promise<MotorbikeCatalogResult>;
  getPublicOffering(slug: string): Promise<PublicMotorbikeOffering | null>;
}
