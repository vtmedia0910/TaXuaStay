import type { AccessCertainty } from "@/features/properties/types";

const ACCESS_CERTAINTY_LABELS: Record<AccessCertainty, string> = {
  unknown: "Chưa xác nhận",
  yes: "Có",
  no: "Không",
};

export function formatAccessCertainty(value: AccessCertainty) {
  return ACCESS_CERTAINTY_LABELS[value];
}
