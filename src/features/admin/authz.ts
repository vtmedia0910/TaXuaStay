export type AdminRole = "admin" | "staff";

export function normalizeAdminRole(value: unknown): AdminRole | null {
  return value === "admin" || value === "staff" ? value : null;
}

export function isAuthorizedRole(
  role: unknown,
  allowed: readonly AdminRole[] = ["admin", "staff"],
) {
  const normalized = normalizeAdminRole(role);
  return normalized !== null && allowed.includes(normalized);
}
