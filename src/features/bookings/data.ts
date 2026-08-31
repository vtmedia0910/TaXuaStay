import "server-only";

import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { requireAdminUser } from "@/features/admin/auth";
import type {
  AdminBookingBundle,
  AdminBookingConfirmationDto,
  AdminBookingDto,
  AdminBookingEventDto,
  AdminBookingItemDto,
  BookingRequestReview,
  PublicBookingSelection,
  PublicBookingStatusDto,
} from "@/features/bookings/types";
import { getPublicAvailabilityQuotes } from "@/features/availability/data";
import { AVAILABILITY_STATE_LABELS } from "@/features/availability/policy";
import { getPublicMotorbikeOffering } from "@/features/motorbike/public-data";
import { resolveMotorbikePublicTruth } from "@/features/motorbike/policy";
import { getPublicPackageCatalog, getPublicPackageQuote } from "@/features/packages/data";
import { PACKAGE_AVAILABILITY_LABELS, formatPackageVnd } from "@/features/packages/policy";
import { getPublicPriceQuotes } from "@/features/pricing/data";
import { formatVnd } from "@/features/pricing/policy";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const BOOKING_ACCESS_COOKIE = "tx_trip_booking_access";

export async function getBookingRequestReview(input: {
  selections: PublicBookingSelection[];
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  rooms: number;
}): Promise<BookingRequestReview> {
  const client = createPublicSupabaseClient();
  if (!client) return { selections: input.selections, items: [], status: "unconfigured" };
  const items: BookingRequestReview["items"] = [];
  for (const selection of input.selections) {
    if (selection.type === "ROOM") {
      const { data: room, error } = await client.from("room_types").select("id,property_id,name").eq("id", selection.source_id).maybeSingle();
      if (error || !room) return { selections: input.selections, items: [], status: "invalid" };
      const { data: property } = await client.from("properties").select("name").eq("id", room.property_id).maybeSingle();
      const [prices, availability] = await Promise.all([
        getPublicPriceQuotes({ roomTypeIds: [selection.source_id], checkIn: input.checkIn, checkOut: input.checkOut }),
        getPublicAvailabilityQuotes({ roomTypeIds: [selection.source_id], checkIn: input.checkIn, checkOut: input.checkOut, requestedRooms: selection.quantity ?? input.rooms }),
      ]);
      const price = prices.get(selection.source_id);
      const availabilityQuote = availability.get(selection.source_id);
      items.push({
        type: "ROOM",
        name: String(room.name),
        context: property?.name ? String(property.name) : null,
        priceLabel: price?.total_vnd !== null && price?.total_vnd !== undefined ? formatVnd(price.total_vnd * (selection.quantity ?? input.rooms)) : "Chưa có tổng giá đủ rõ ràng",
        availabilityLabel: availabilityQuote ? AVAILABILITY_STATE_LABELS[availabilityQuote.state] : "Chọn ngày để kiểm tra tình trạng",
      });
    } else if (selection.type === "MOTORBIKE") {
      const offering = await getPublicMotorbikeOffering(selection.source_slug);
      if (!offering) return { selections: input.selections, items: [], status: "invalid" };
      const truth = resolveMotorbikePublicTruth(offering);
      items.push({ type: "MOTORBIKE", name: offering.display_name, context: "Nguồn vận hành xác nhận thủ công", priceLabel: truth.priceLabel, availabilityLabel: truth.availabilityLabel });
    } else {
      const catalog = await getPublicPackageCatalog();
      const packageItem = catalog.packages.find((item) => item.id === selection.source_id);
      if (!packageItem) return { selections: input.selections, items: [], status: "invalid" };
      const quote = input.checkIn && input.checkOut ? await getPublicPackageQuote({
        package: packageItem,
        quoteInput: { package_id: packageItem.id, check_in: input.checkIn, check_out: input.checkOut, adults: input.adults, children: input.children, rooms: input.rooms, selected_optional_component_keys: selection.optional_component_keys ?? [] },
      }) : null;
      items.push({
        type: "PACKAGE",
        name: packageItem.name,
        context: packageItem.proposition,
        priceLabel: quote?.sell_price.total_vnd !== null && quote?.sell_price.total_vnd !== undefined ? formatPackageVnd(quote.sell_price.total_vnd) : "Cần xác nhận giá gói",
        availabilityLabel: quote ? PACKAGE_AVAILABILITY_LABELS[quote.availability_state] : "Chọn ngày để kiểm tra từng dịch vụ",
      });
    }
  }
  return {
    selections: input.selections,
    items,
    status: input.selections.length > 0 && items.length === input.selections.length ? "ready" : "invalid",
  };
}

export async function getPublicBookingStatus(bookingCode: string): Promise<PublicBookingStatusDto | null> {
  const cookieStore = await cookies();
  const credential = cookieStore.get(BOOKING_ACCESS_COOKIE)?.value;
  if (!credential) return null;
  const separator = credential.indexOf(".");
  if (separator < 1 || credential.slice(0, separator) !== bookingCode) return null;
  const token = credential.slice(separator + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await client.rpc("get_public_booking_status", { target_booking_code: bookingCode, target_token_hash: tokenHash });
  return error || !data ? null : data as unknown as PublicBookingStatusDto;
}

export async function getAdminBookings(): Promise<AdminBookingDto[]> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data, error } = await client.from("bookings").select("id,booking_code,lifecycle_status,confirmation_status,check_in,check_out,adults,children,rooms,currency,quoted_sell_total_vnd,price_status,quoted_at,customer_name,customer_phone,customer_email,customer_zalo,customer_note,internal_note,submitted_at,updated_at").order("submitted_at", { ascending: false }).limit(500);
  return error ? [] : data as unknown as AdminBookingDto[];
}

export async function getAdminBooking(id: string): Promise<AdminBookingBundle | null> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const [bookingResult, itemsResult, eventsResult] = await Promise.all([
    client.from("bookings").select("id,booking_code,lifecycle_status,confirmation_status,check_in,check_out,adults,children,rooms,currency,quoted_sell_total_vnd,price_status,quoted_at,customer_name,customer_phone,customer_email,customer_zalo,customer_note,internal_note,submitted_at,updated_at").eq("id", id).maybeSingle(),
    client.from("booking_items").select("id,booking_id,parent_booking_item_id,item_key,component_type,display_name_snapshot,description_snapshot,parent_name_snapshot,confirmation_mode_snapshot,quantity,is_required,counts_toward_booking_total,sell_price_vnd,net_cost_vnd,price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,verification_snapshot,policy_snapshot,quoted_at").eq("booking_id", id).order("created_at").order("item_key"),
    client.from("booking_events").select("id,booking_id,booking_item_id,event_type,public_message,internal_detail,actor_type,created_at").eq("booking_id", id).order("created_at").order("id"),
  ]);
  if (bookingResult.error || !bookingResult.data || itemsResult.error || eventsResult.error) return null;
  const itemRows = itemsResult.data ?? [];
  const confirmationsResult = itemRows.length
    ? await client.from("booking_item_confirmations").select("id,booking_item_id,supplier_id,supplier_contact_id,status,confirmation_mode,requested_at,responded_at,expires_at,external_reference,response_note_internal,supplier_snapshot,updated_at").in("booking_item_id", itemRows.map((item) => item.id))
    : { data: [], error: null };
  if (confirmationsResult.error) return null;
  const confirmations = new Map((confirmationsResult.data as unknown as AdminBookingConfirmationDto[]).map((item) => [item.booking_item_id, item]));
  const items = (itemRows as unknown as Array<AdminBookingItemDto & { display_name_snapshot: string; description_snapshot: string | null; parent_name_snapshot: string | null; confirmation_mode_snapshot: AdminBookingItemDto["confirmation_mode"] }>).map((item) => ({ ...item, display_name: item.display_name_snapshot, description: item.description_snapshot, parent_name: item.parent_name_snapshot, confirmation_mode: item.confirmation_mode_snapshot, confirmation: confirmations.get(item.id) ?? null }));
  return { booking: bookingResult.data as unknown as AdminBookingDto, items, events: eventsResult.data as unknown as AdminBookingEventDto[] };
}
