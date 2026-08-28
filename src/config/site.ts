export const SITE = {
  name: "TÀ XÙA STAY",
  tagline: "Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.",
  description:
    "Tìm chỗ ở Tà Xùa với thông tin phòng, view, đường vào, giá và tình trạng phòng rõ ràng hơn.",
} as const;

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    return configured ? new URL(configured) : new URL("http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}
