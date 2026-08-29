export interface DateInterval {
  valid_from: string | null;
  valid_until: string | null;
}

export function dateIntervalsOverlap(left: DateInterval, right: DateInterval) {
  return (!left.valid_until || !right.valid_from || left.valid_until >= right.valid_from)
    && (!right.valid_until || !left.valid_from || right.valid_until >= left.valid_from);
}

export function intersectDateIntervals(left: DateInterval, right: DateInterval): DateInterval | null {
  if (!dateIntervalsOverlap(left, right)) return null;

  const starts = [left.valid_from, right.valid_from].filter((value): value is string => Boolean(value));
  const ends = [left.valid_until, right.valid_until].filter((value): value is string => Boolean(value));
  return {
    valid_from: starts.length ? starts.sort().at(-1) ?? null : null,
    valid_until: ends.length ? ends.sort()[0] : null,
  };
}
