const LODGING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function parseLodgingDate(value: string) {
  if (!LODGING_DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed;
}

export function addLodgingDays(value: string, days: number) {
  const parsed = parseLodgingDate(value);
  if (!parsed || !Number.isInteger(days)) return null;
  return new Date(parsed.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function enumerateLodgingNights(checkIn: string, checkOut: string, maximumNights: number) {
  const start = parseLodgingDate(checkIn);
  const end = parseLodgingDate(checkOut);
  if (!start || !end || start >= end || maximumNights < 1) return [];

  const nights: string[] = [];
  for (let cursor = start; cursor < end && nights.length <= maximumNights; cursor = new Date(cursor.getTime() + DAY_MS)) {
    nights.push(cursor.toISOString().slice(0, 10));
  }
  return nights.length > maximumNights ? [] : nights;
}

export function enumerateInclusiveLodgingDates(dateFrom: string, dateTo: string, maximumDates: number) {
  const dayAfterEnd = addLodgingDays(dateTo, 1);
  return dayAfterEnd ? enumerateLodgingNights(dateFrom, dayAfterEnd, maximumDates) : [];
}
