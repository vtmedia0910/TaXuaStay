export const PUBLIC_INVENTORY_QUERY = [
  "room_type_id",
  "date",
  "available_quantity",
  "source",
  "verified_at",
].join(",");

export const ADMIN_INVENTORY_QUERY = [
  "id",
  PUBLIC_INVENTORY_QUERY,
  "price_override_vnd",
  "updated_at",
].join(",");
