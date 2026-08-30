const MAX_DIMENSION = 20_000;

export interface ImageDimensions {
  width: number;
  height: number;
}

function validDimensions(width: number, height: number): ImageDimensions | null {
  return Number.isInteger(width) && Number.isInteger(height)
    && width > 0 && height > 0 && width <= MAX_DIMENSION && height <= MAX_DIMENSION
    ? { width, height }
    : null;
}

function readPng(bytes: Uint8Array): ImageDimensions | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || !signature.every((value, index) => bytes[index] === value)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return validDimensions(view.getUint32(16), view.getUint32(20));
}

const JPEG_START_OF_FRAME = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function readJpeg(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  let segments = 0;
  while (offset + 4 <= bytes.length && segments < 4096) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset];
    offset += 1;
    segments += 1;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (JPEG_START_OF_FRAME.has(marker) && segmentLength >= 7) {
      return validDimensions(view.getUint16(offset + 5), view.getUint16(offset + 3));
    }
    offset += segmentLength;
  }
  return null;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readUint24Le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readWebp(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let chunks = 0;
  while (offset + 8 <= bytes.length && chunks < 2048) {
    const kind = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (size > bytes.length - dataOffset) return null;
    if (kind === "VP8X" && size >= 10) {
      return validDimensions(readUint24Le(bytes, dataOffset + 4) + 1, readUint24Le(bytes, dataOffset + 7) + 1);
    }
    if (kind === "VP8 " && size >= 10 && bytes[dataOffset + 3] === 0x9d && bytes[dataOffset + 4] === 0x01 && bytes[dataOffset + 5] === 0x2a) {
      return validDimensions(view.getUint16(dataOffset + 6, true) & 0x3fff, view.getUint16(dataOffset + 8, true) & 0x3fff);
    }
    if (kind === "VP8L" && size >= 5 && bytes[dataOffset] === 0x2f) {
      const bits = view.getUint32(dataOffset + 1, true);
      return validDimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
    }
    offset = dataOffset + size + (size % 2);
    chunks += 1;
  }
  return null;
}

const AVIF_CONTAINER_BOXES = new Set(["meta", "moov", "trak", "mdia", "minf", "stbl", "iprp", "ipco", "dinf"]);

function collectAvifDimensions(bytes: Uint8Array, start: number, end: number, depth: number, output: ImageDimensions[]) {
  if (depth > 8) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = start;
  let boxes = 0;
  while (offset + 8 <= end && boxes < 4096) {
    let size = view.getUint32(offset);
    const type = ascii(bytes, offset + 4, 4);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) return;
      const extendedSize = view.getBigUint64(offset + 8);
      if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) return;
      size = Number(extendedSize);
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) return;
    const dataOffset = offset + headerSize;
    if (type === "ispe" && size >= headerSize + 12) {
      const dimensions = validDimensions(view.getUint32(dataOffset + 4), view.getUint32(dataOffset + 8));
      if (dimensions) output.push(dimensions);
    } else if (AVIF_CONTAINER_BOXES.has(type)) {
      collectAvifDimensions(bytes, dataOffset + (type === "meta" ? 4 : 0), offset + size, depth + 1, output);
    }
    offset += size;
    boxes += 1;
  }
}

function readAvif(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24 || ascii(bytes, 4, 4) !== "ftyp") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ftypSize = Math.min(view.getUint32(0), bytes.length, 4096);
  const brands = ascii(bytes, 8, Math.max(0, ftypSize - 8));
  if (!brands.includes("avif") && !brands.includes("avis")) return null;
  const found: ImageDimensions[] = [];
  collectAvifDimensions(bytes, 0, bytes.length, 0, found);
  return found.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
}

export function readImageDimensions(bytes: Uint8Array, mimeType: string): ImageDimensions {
  const dimensions = mimeType === "image/png" ? readPng(bytes)
    : mimeType === "image/jpeg" ? readJpeg(bytes)
      : mimeType === "image/webp" ? readWebp(bytes)
        : mimeType === "image/avif" ? readAvif(bytes)
          : null;
  if (!dimensions) throw new Error("Unsupported or malformed image metadata");
  return dimensions;
}
