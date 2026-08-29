import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { ADMIN_INVENTORY_QUERY, PUBLIC_INVENTORY_QUERY } from "@/features/availability/columns";
import { resolveRoomAvailabilities } from "@/features/availability/resolver";
import type { AdminInventoryRowDto, AvailabilityQuote, PublicInventoryRowDto } from "@/features/availability/types";
import { enumerateLodgingNights } from "@/lib/lodging-dates";
import { MAX_AVAILABILITY_STAY_NIGHTS } from "@/features/availability/policy";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ROOM_ID_BATCH_SIZE = 25;

function chunks<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => (
    values.slice(index * size, (index + 1) * size)
  ));
}

export async function getPublicAvailabilityQuotes(input: {
  roomTypeIds: string[];
  checkIn?: string;
  checkOut?: string;
  requestedRooms: number;
}): Promise<Map<string, AvailabilityQuote>> {
  const roomTypeIds = [...new Set(input.roomTypeIds)];
  if (!roomTypeIds.length || !input.checkIn || !input.checkOut) return new Map();
  const unknownQuotes = () => resolveRoomAvailabilities({
    roomTypeIds,
    checkIn: input.checkIn as string,
    checkOut: input.checkOut as string,
    requestedRooms: input.requestedRooms,
    inventory: [],
  });
  const nights = enumerateLodgingNights(input.checkIn, input.checkOut, MAX_AVAILABILITY_STAY_NIGHTS);
  if (!nights.length) return unknownQuotes();

  const supabase = createPublicSupabaseClient();
  if (!supabase) return unknownQuotes();
  const results = await Promise.all(chunks(roomTypeIds, ROOM_ID_BATCH_SIZE).map((ids) => (
    supabase
      .from("public_room_inventory")
      .select(PUBLIC_INVENTORY_QUERY)
      .in("room_type_id", ids)
      .gte("date", input.checkIn as string)
      .lt("date", input.checkOut as string)
      .order("date")
      .limit(1000)
      .overrideTypes<PublicInventoryRowDto[], { merge: false }>()
  )));
  if (results.some((result) => result.error)) return unknownQuotes();
  const inventory = results.flatMap((result) => result.data ?? []);
  return resolveRoomAvailabilities({
    roomTypeIds,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    requestedRooms: input.requestedRooms,
    inventory,
  });
}

export async function getAdminInventoryRows(input: {
  roomTypeIds: string[];
  dateFrom: string;
  dateTo: string;
}): Promise<AdminInventoryRowDto[]> {
  await requireAdminUser();
  const roomTypeIds = [...new Set(input.roomTypeIds)];
  if (!roomTypeIds.length) return [];
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const results = await Promise.all(chunks(roomTypeIds, ROOM_ID_BATCH_SIZE).map((ids) => (
    supabase
      .from("room_inventory")
      .select(ADMIN_INVENTORY_QUERY)
      .in("room_type_id", ids)
      .gte("date", input.dateFrom)
      .lte("date", input.dateTo)
      .order("date")
      .limit(1000)
      .overrideTypes<AdminInventoryRowDto[], { merge: false }>()
  )));
  if (results.some((result) => result.error)) return [];
  return results.flatMap((result) => result.data ?? []);
}
