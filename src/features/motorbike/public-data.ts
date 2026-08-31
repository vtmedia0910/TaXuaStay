import "server-only";

import { cache } from "react";
import { ManualMotorbikeProviderAdapter } from "@/features/motorbike/adapter/manual";

const adapter = new ManualMotorbikeProviderAdapter();

export const getPublicMotorbikeCatalog = cache(() => adapter.listPublicOfferings());
export const getPublicMotorbikeOffering = cache((slug: string) => adapter.getPublicOffering(slug));

export function getMotorbikeProviderAdapter() {
  return adapter;
}
