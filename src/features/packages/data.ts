import "server-only";

import { cache } from "react";
import { getPublicAvailabilityQuotes } from "@/features/availability/data";
import type { CmsMediaAsset } from "@/features/cms/types";
import { getAdminCommercialPreviewRules } from "@/features/economics/data";
import { resolveRoomEconomics } from "@/features/economics/resolver";
import type { EconomicsQuote } from "@/features/economics/types";
import { getPublicMotorbikeCatalog } from "@/features/motorbike/public-data";
import {
  ADMIN_PACKAGE_COLUMNS,
  ADMIN_PACKAGE_COMPONENT_COLUMNS,
  ADMIN_PACKAGE_PRICE_RULE_COLUMNS,
  PUBLIC_PACKAGE_COLUMNS,
} from "@/features/packages/columns";
import { PACKAGE_PRICE_FRESH_MS, vietnamDate } from "@/features/packages/policy";
import { resolvePrivatePackage, resolvePublicPackage } from "@/features/packages/resolver";
import type {
  AdminPackage,
  AdminPackageBundle,
  AdminPackageComponent,
  AdminPackagePriceRule,
  PackageMotorbikeSourceOption,
  PackageQuoteInput,
  PackageRoomSourceOption,
  PackageWarningCode,
  PrivatePackageResolution,
  PublicPackage,
  PublicPackageComponent,
  PublicPackagePriceRule,
  PublicPackageQuote,
} from "@/features/packages/types";
import { getPublicPriceQuotes } from "@/features/pricing/data";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/features/admin/auth";

type PublicPackageRow = Record<string, unknown>;
export type PackageCatalogStatus = "ready" | "empty" | "unconfigured" | "error";

function value<T>(row: PublicPackageRow, key: string) {
  return row[key] as T;
}

function normalizeMedia(row: PublicPackageRow): CmsMediaAsset | null {
  const id = value<string | null>(row, "image_media_id");
  if (!id) return null;
  return {
    id,
    title: value<string>(row, "image_title"),
    alt_text: value<string>(row, "image_alt_text"),
    caption: value<string | null>(row, "image_caption"),
    media_type: "image",
    role: value<CmsMediaAsset["role"]>(row, "image_role"),
    storage_bucket: value<string | null>(row, "image_storage_bucket"),
    storage_path: value<string | null>(row, "image_storage_path"),
    external_url: value<string | null>(row, "image_external_url"),
    mime_type: value<string | null>(row, "image_mime_type"),
    width: value<number | null>(row, "image_width"),
    height: value<number | null>(row, "image_height"),
    focal_x: value<number>(row, "image_focal_x"),
    focal_y: value<number>(row, "image_focal_y"),
  };
}

function normalizePublicPackage(row: PublicPackageRow): PublicPackage {
  return {
    id: value<string>(row, "id"),
    destination_id: value<string>(row, "destination_id"),
    destination_slug: value<string>(row, "destination_slug"),
    destination_name: value<string>(row, "destination_name"),
    slug: value<string>(row, "slug"),
    name: value<string>(row, "name"),
    proposition: value<string>(row, "proposition"),
    description: value<string | null>(row, "description"),
    valid_from: value<string | null>(row, "valid_from"),
    valid_until: value<string | null>(row, "valid_until"),
    confirmation_mode: value<PublicPackage["confirmation_mode"]>(row, "confirmation_mode"),
    public_request_url: value<string | null>(row, "public_request_url"),
    is_featured: value<boolean>(row, "is_featured"),
    sort_order: value<number>(row, "sort_order"),
    updated_at: value<string>(row, "updated_at"),
    image: normalizeMedia(row),
  };
}

async function readPublicPackages() {
  const client = createPublicSupabaseClient();
  if (!client) return { status: "unconfigured" as const, packages: [] };
  const { data, error } = await client
    .from("public_packages")
    .select(PUBLIC_PACKAGE_COLUMNS)
    .order("is_featured", { ascending: false })
    .order("sort_order")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return { status: "error" as const, packages: [] };
  const packages = (data ?? []).map((row) => normalizePublicPackage(row as unknown as PublicPackageRow));
  return { status: packages.length ? "ready" as const : "empty" as const, packages };
}

export const getPublicPackageCatalog = cache(readPublicPackages);

export const hasPublicPackages = cache(async () => {
  const client = createPublicSupabaseClient();
  if (!client) return false;
  const { data, error } = await client.from("public_packages").select("id").limit(1);
  return !error && Boolean(data?.length);
});

export const getPublicPackageBySlug = cache(async (slug: string) => {
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("public_packages")
    .select(PUBLIC_PACKAGE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  return error || !data ? null : normalizePublicPackage(data as unknown as PublicPackageRow);
});

async function getPublicPackageFacts(packageIds: string[]) {
  const client = createPublicSupabaseClient();
  if (!client || !packageIds.length) return { components: [] as PublicPackageComponent[], priceRules: [] as PublicPackagePriceRule[] };
  const [{ data: components, error: componentError }, { data: rules, error: ruleError }] = await Promise.all([
    client.rpc("get_public_package_components", { target_package_ids: packageIds }),
    client.rpc("get_public_package_price_rules", { target_package_ids: packageIds }),
  ]);
  if (componentError || ruleError) return { components: [], priceRules: [] };
  return {
    components: (components ?? []) as unknown as PublicPackageComponent[],
    priceRules: (rules ?? []) as unknown as PublicPackagePriceRule[],
  };
}

export const getPublicPackageFactsByIds = cache(getPublicPackageFacts);

export async function getPublicPackageQuote(input: {
  package: PublicPackage;
  quoteInput: PackageQuoteInput;
}): Promise<PublicPackageQuote> {
  const facts = await getPublicPackageFacts([input.package.id]);
  const roomTypeIds = facts.components.flatMap((component) => component.room_type_id ? [component.room_type_id] : []);
  const [roomAvailabilityQuotes, motorbikeCatalog] = await Promise.all([
    getPublicAvailabilityQuotes({ roomTypeIds, checkIn: input.quoteInput.check_in, checkOut: input.quoteInput.check_out, requestedRooms: input.quoteInput.rooms }),
    getPublicMotorbikeCatalog(),
  ]);
  return resolvePublicPackage({
    package: input.package,
    components: facts.components,
    priceRules: facts.priceRules,
    quoteInput: input.quoteInput,
    sources: {
      roomAvailabilityQuotes,
      motorbikeOfferings: new Map(motorbikeCatalog.offerings.map((offering) => [offering.slug, offering])),
    },
  });
}

export async function getPublicPackageQuotes(input: {
  packages: PublicPackage[];
  quoteInput: Omit<PackageQuoteInput, "package_id">;
}): Promise<Map<string, PublicPackageQuote>> {
  if (!input.packages.length) return new Map();
  const facts = await getPublicPackageFacts(input.packages.map((item) => item.id));
  const roomTypeIds = [...new Set(facts.components.flatMap((component) => component.room_type_id ? [component.room_type_id] : []))];
  const [roomAvailabilityQuotes, motorbikeCatalog] = await Promise.all([
    getPublicAvailabilityQuotes({ roomTypeIds, checkIn: input.quoteInput.check_in, checkOut: input.quoteInput.check_out, requestedRooms: input.quoteInput.rooms }),
    getPublicMotorbikeCatalog(),
  ]);
  const sources = {
    roomAvailabilityQuotes,
    motorbikeOfferings: new Map(motorbikeCatalog.offerings.map((offering) => [offering.slug, offering])),
  };
  return new Map(input.packages.map((item) => [item.id, resolvePublicPackage({
    package: item,
    components: facts.components.filter((component) => component.package_id === item.id),
    priceRules: facts.priceRules.filter((rule) => rule.package_id === item.id),
    quoteInput: { package_id: item.id, ...input.quoteInput },
    sources,
  })]));
}

function collectWarnings(input: {
  package: AdminPackage;
  components: AdminPackageComponent[];
  priceRules: AdminPackagePriceRule[];
  rooms: PackageRoomSourceOption[];
  motorbikes: PackageMotorbikeSourceOption[];
  now?: Date;
}) {
  const warnings: PackageWarningCode[] = [];
  const now = input.now ?? new Date();
  const today = vietnamDate(now);
  const roomMap = new Map(input.rooms.map((room) => [room.id, room]));
  const motorbikeMap = new Map(input.motorbikes.map((offering) => [offering.id, offering]));
  if (!input.components.some((component) => component.is_required && component.component_type === "ROOM")) warnings.push("required-room-missing");
  if (input.package.lifecycle_status === "published" && input.components.length === 0) warnings.push("published-without-components");
  if (!input.package.hero_media_id) warnings.push("image-missing");
  if (!input.package.proposition || !input.package.description) warnings.push("copy-missing");
  for (const component of input.components) {
    if (component.component_type === "ROOM") {
      const room = component.room_type_id ? roomMap.get(component.room_type_id) : null;
      if (!room || !room.is_active || room.publish_status !== "published") warnings.push("source-inactive");
    }
    if (component.component_type === "MOTORBIKE") {
      const motorbike = component.motorbike_offering_id ? motorbikeMap.get(component.motorbike_offering_id) : null;
      if (!motorbike || motorbike.publication_status !== "published") warnings.push("motorbike-paused");
      if (component.is_required && (!motorbike || motorbike.availability_state === "unknown")) warnings.push("required-availability-unknown");
    }
    if (component.component_type === "CUSTOM" && component.is_required) warnings.push("required-availability-unknown");
    if (component.component_type !== "ROOM" && component.is_required && component.unit_cost_vnd === null) warnings.push("component-cost-missing");
  }
  const activeRules = input.priceRules.filter((rule) => rule.is_active);
  if (!activeRules.length) warnings.push("package-price-missing");
  else if (activeRules.every((rule) => {
    const checked = new Date(rule.verified_at).getTime();
    return !Number.isFinite(checked) || checked > now.getTime() || now.getTime() - checked > PACKAGE_PRICE_FRESH_MS || rule.price_valid_until < today;
  })) warnings.push("package-price-stale");
  const signatures = new Set<string>();
  for (const rule of activeRules) {
    const signature = [rule.priority, rule.effective_from, rule.effective_until, rule.adults_min, rule.adults_max, rule.children_min, rule.children_max, rule.rooms_min, rule.rooms_max, [...rule.selected_optional_component_keys].sort().join("|")].join(":");
    if (signatures.has(signature)) warnings.push("price-conflict");
    signatures.add(signature);
  }
  if (input.package.valid_from && input.package.valid_until && input.package.valid_from > input.package.valid_until) warnings.push("dates-invalid");
  return [...new Set(warnings)];
}

export async function getAdminPackageSources() {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return { rooms: [] as PackageRoomSourceOption[], motorbikes: [] as PackageMotorbikeSourceOption[] };
  const [roomsResult, propertiesResult, motorbikesResult] = await Promise.all([
    client.from("room_types").select("id,property_id,name,slug,publish_status,is_active").order("name"),
    client.from("properties").select("id,name,slug"),
    client.from("motorbike_offerings").select("id,display_name,slug,publication_status,availability_state").order("display_name"),
  ]);
  const properties = new Map((propertiesResult.data ?? []).map((property) => [String(property.id), property]));
  const rooms = (roomsResult.data ?? []).map((room) => {
    const property = properties.get(String(room.property_id));
    return {
      id: String(room.id),
      property_id: String(room.property_id),
      property_name: String(property?.name ?? "Không xác định"),
      property_slug: String(property?.slug ?? ""),
      name: String(room.name),
      slug: String(room.slug),
      publish_status: String(room.publish_status),
      is_active: room.is_active === true,
    };
  });
  return {
    rooms,
    motorbikes: (motorbikesResult.data ?? []).map((offering) => ({
      id: String(offering.id),
      display_name: String(offering.display_name),
      slug: String(offering.slug),
      publication_status: String(offering.publication_status),
      availability_state: String(offering.availability_state),
    })),
  };
}

export async function getAdminPackages(): Promise<AdminPackage[]> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data, error } = await client.from("packages").select(ADMIN_PACKAGE_COLUMNS).order("updated_at", { ascending: false });
  return error ? [] : (data ?? []) as unknown as AdminPackage[];
}

export async function getAdminPackageBundle(id: string): Promise<AdminPackageBundle | null> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const [{ data: packageRow, error }, { data: components }, { data: priceRules }, sources] = await Promise.all([
    client.from("packages").select(ADMIN_PACKAGE_COLUMNS).eq("id", id).maybeSingle(),
    client.from("package_components").select(ADMIN_PACKAGE_COMPONENT_COLUMNS).eq("package_id", id).order("sort_order").order("component_key"),
    client.from("package_price_rules").select(ADMIN_PACKAGE_PRICE_RULE_COLUMNS).eq("package_id", id).order("priority", { ascending: false }).order("rule_key"),
    getAdminPackageSources(),
  ]);
  if (error || !packageRow) return null;
  const packageValue = packageRow as unknown as AdminPackage;
  const componentValues = (components ?? []) as unknown as AdminPackageComponent[];
  const priceRuleValues = (priceRules ?? []) as unknown as AdminPackagePriceRule[];
  return {
    package: packageValue,
    components: componentValues,
    priceRules: priceRuleValues,
    warnings: collectWarnings({ package: packageValue, components: componentValues, priceRules: priceRuleValues, ...sources }),
  };
}

export async function getAdminPackagePreview(input: {
  bundle: AdminPackageBundle;
  quoteInput: PackageQuoteInput;
}): Promise<PrivatePackageResolution> {
  await requireAdminUser();
  const sources = await getAdminPackageSources();
  const client = await createServerSupabaseClient();
  const destination = client
    ? (await client.from("destinations").select("slug,name").eq("id", input.bundle.package.destination_id).maybeSingle()).data
    : null;
  const media = client && input.bundle.package.hero_media_id
    ? (await client.from("cms_media_assets").select("id,title,alt_text,caption,media_type,role,storage_bucket,storage_path,external_url,mime_type,width,height,focal_x,focal_y").eq("id", input.bundle.package.hero_media_id).maybeSingle()).data as unknown as CmsMediaAsset | null
    : null;
  const roomMap = new Map(sources.rooms.map((room) => [room.id, room]));
  const motorbikeMap = new Map(sources.motorbikes.map((offering) => [offering.id, offering]));
  const publicComponents: PublicPackageComponent[] = input.bundle.components.flatMap((component) => {
    const room = component.room_type_id ? roomMap.get(component.room_type_id) : null;
    const motorbike = component.motorbike_offering_id ? motorbikeMap.get(component.motorbike_offering_id) : null;
    const name = room?.name ?? motorbike?.display_name ?? component.custom_name;
    if (!name || (component.component_type !== "ROOM" && component.component_type !== "MOTORBIKE" && component.component_type !== "CUSTOM")) return [];
    return [{
      package_id: component.package_id,
      component_key: component.component_key,
      component_type: component.component_type,
      is_required: component.is_required,
      quantity: component.quantity,
      sort_order: component.sort_order,
      confirmation_mode: component.confirmation_mode,
      public_copy_override: component.public_copy_override,
      room_type_id: component.room_type_id,
      motorbike_offering_slug: motorbike?.slug ?? null,
      source_name: name,
      source_parent_name: room?.property_name ?? null,
      source_path: room ? `/stay/${room.property_slug}/${room.slug}` : motorbike ? `/motorbike/${motorbike.slug}` : null,
      custom_code: component.custom_code,
      custom_name: component.custom_name,
      custom_description: component.custom_description,
    }];
  });
  const roomTypeIds = publicComponents.flatMap((component) => component.room_type_id ? [component.room_type_id] : []);
  const [roomPriceQuotes, roomAvailabilityQuotes, motorbikeCatalog] = await Promise.all([
    getPublicPriceQuotes({ roomTypeIds, checkIn: input.quoteInput.check_in, checkOut: input.quoteInput.check_out }),
    getPublicAvailabilityQuotes({ roomTypeIds, checkIn: input.quoteInput.check_in, checkOut: input.quoteInput.check_out, requestedRooms: input.quoteInput.rooms }),
    getPublicMotorbikeCatalog(),
  ]);
  const publicPackage: PublicPackage = {
    ...input.bundle.package,
    destination_slug: String(destination?.slug ?? "ta-xua"),
    destination_name: String(destination?.name ?? "Tà Xùa"),
    image: media,
  };
  const publicRules: PublicPackagePriceRule[] = input.bundle.priceRules.map((rule) => ({ ...rule, rule_id: rule.id }));
  const publicQuote = resolvePublicPackage({
    package: publicPackage,
    components: publicComponents,
    priceRules: publicRules,
    quoteInput: input.quoteInput,
    sources: { roomAvailabilityQuotes, motorbikeOfferings: new Map(motorbikeCatalog.offerings.map((offering) => [offering.slug, offering])) },
  });
  const roomEconomicsQuotes = new Map<string, EconomicsQuote>();
  await Promise.all(roomTypeIds.map(async (roomTypeId) => {
    const sellQuote = roomPriceQuotes.get(roomTypeId);
    if (!sellQuote) return;
    const commercialRules = await getAdminCommercialPreviewRules(roomTypeId);
    roomEconomicsQuotes.set(roomTypeId, resolveRoomEconomics({
      roomTypeId,
      checkIn: input.quoteInput.check_in,
      checkOut: input.quoteInput.check_out,
      sellQuote,
      commercialRules,
    }));
  }));
  return resolvePrivatePackage({
    publicQuote,
    components: input.bundle.components,
    priceRules: publicRules,
    roomEconomicsQuotes,
  });
}
