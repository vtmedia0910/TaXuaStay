import { describe, expect, it } from "vitest";
import { readImageDimensions } from "@/features/cms/image-metadata";

function uint32(value: number) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

describe("CMS upload image metadata", () => {
  it("reads PNG dimensions from the actual file bytes", () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, ...uint32(1920), ...uint32(1080)]);
    expect(readImageDimensions(png, "image/png")).toEqual({ width: 1920, height: 1080 });
  });

  it("reads JPEG and WebP dimensions without accepting user-entered values", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x07, 0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(readImageDimensions(jpeg, "image/jpeg")).toEqual({ width: 1920, height: 1080 });
    const webp = new Uint8Array(30);
    webp.set([82, 73, 70, 70], 0); webp.set([87, 69, 66, 80], 8); webp.set([86, 80, 56, 88], 12);
    new DataView(webp.buffer).setUint32(16, 10, true);
    webp.set([0x7f, 0x07, 0x00], 24); webp.set([0x37, 0x04, 0x00], 27);
    expect(readImageDimensions(webp, "image/webp")).toEqual({ width: 1920, height: 1080 });
  });

  it("reads a bounded AVIF ispe box and rejects malformed inputs", () => {
    const ftyp = [...uint32(24), 102, 116, 121, 112, 97, 118, 105, 102, 0, 0, 0, 0, 97, 118, 105, 102, 109, 105, 102, 49];
    const ispe = [...uint32(20), 105, 115, 112, 101, 0, 0, 0, 0, ...uint32(1200), ...uint32(630)];
    const ipco = [...uint32(28), 105, 112, 99, 111, ...ispe];
    const iprp = [...uint32(36), 105, 112, 114, 112, ...ipco];
    const meta = [...uint32(48), 109, 101, 116, 97, 0, 0, 0, 0, ...iprp];
    expect(readImageDimensions(new Uint8Array([...ftyp, ...meta]), "image/avif")).toEqual({ width: 1200, height: 630 });
    expect(() => readImageDimensions(new Uint8Array([1, 2, 3]), "image/png")).toThrow(/malformed/i);
  });
});
