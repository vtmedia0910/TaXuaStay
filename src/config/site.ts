export const SITE = {
  name: "TÀ XÙA STAY",
  tagline: "Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.",
  description:
    "Tìm loại phòng tại Tà Xùa theo sức chứa, view cơ bản, đường vào và tiện ích đang được ghi nhận.",
} as const;

function parseSiteUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function getSiteUrl() {
  return parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
    ?? parseSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    ?? new URL("http://localhost:3000");
}
