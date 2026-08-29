// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PanoramaViewer } from "@/components/media/panorama-viewer";

const validProps = {
  mediaType: "panorama_360",
  url: "https://example.com/full-panorama.jpg",
  thumbnailUrl: "https://example.com/thumb.jpg",
  alt: "Toàn cảnh từ ban công phòng",
  positionLabel: "Vị trí ngắm view" as const,
};

afterEach(cleanup);

describe("PanoramaViewer", () => {
  it("lazy-renders only the thumbnail before the visitor opens the panorama", () => {
    render(<PanoramaViewer {...validProps} />);
    expect(screen.getByRole("button", { name: /Mở ảnh 360/i })).toBeTruthy();
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("src")).toBe(validProps.thumbnailUrl);
    expect(images[0].getAttribute("loading")).toBe("lazy");
  });

  it("opens an accessible interactive view and supports keyboard panning", () => {
    render(<PanoramaViewer {...validProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Mở ảnh 360/i }));
    const viewer = screen.getByRole("img", { name: /Dùng phím mũi tên/i });
    const panorama = viewer.querySelector("img");
    expect(viewer.getAttribute("data-pan")).toBe("50");
    expect(panorama?.style.left).toBe("50%");
    fireEvent.keyDown(viewer, { key: "ArrowRight" });
    expect(viewer.getAttribute("data-pan")).toBe("55");
    expect(panorama?.style.left).toBe("55%");
    expect(screen.getByRole("link", { name: "Ảnh gốc" }).getAttribute("href")).toBe(validProps.url);
  });

  it("uses a graceful fallback for missing or unsupported panorama data", () => {
    const { rerender } = render(<PanoramaViewer {...validProps} url={null} />);
    expect(screen.getByText(/chưa thể mở tương tác/i)).toBeTruthy();
    rerender(<PanoramaViewer {...validProps} mediaType="photo" />);
    expect(screen.getByText(/chưa thể mở tương tác/i)).toBeTruthy();
  });
});
