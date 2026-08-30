import { ImageResponse } from "next/og";

export const alt = "Tà Xùa Trip — Đi thật. Biết trước.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#F8FAFC",
        color: "#0F172A",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "72px 80px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#F59E0B",
          borderRadius: "999px",
          display: "flex",
          height: "118px",
          position: "absolute",
          right: "92px",
          top: "70px",
          width: "118px",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ color: "#0EA5A5", display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "0.18em" }}>
          TÀ XÙA • VERIFIED LOCAL TRAVEL
        </div>
        <div style={{ color: "#083D76", display: "flex", fontSize: 66, fontWeight: 700, letterSpacing: "0.04em", marginTop: 28 }}>
          TÀ XÙA TRIP
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 30 }}>
          Đi thật. Biết trước.
        </div>
      </div>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 26, maxWidth: "720px" }}>
          Xem nơi ở, bằng chứng thẩm định và điều cần biết trước chuyến đi.
        </div>
        <div style={{ color: "#0EA5A5", display: "flex", fontSize: 24, fontWeight: 700 }}>
          THẬT • HIỂU • TRỌN VẸN
        </div>
      </div>
      <div style={{ background: "#083D76", bottom: 0, display: "flex", height: 18, left: 0, position: "absolute", width: "72%" }} />
      <div style={{ background: "#0EA5A5", bottom: 0, display: "flex", height: 18, position: "absolute", right: 0, width: "28%" }} />
    </div>,
    size,
  );
}
