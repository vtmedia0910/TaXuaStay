import { describe, expect, it } from "vitest";
import {
  roomProfileNoteSchema,
  roomQualityScoreSchema,
} from "@/features/room-profiles/schema";

const roomTypeId = "11111111-1111-4111-8111-111111111111";
const physicalRoomId = "22222222-2222-4222-8222-222222222222";

describe("Room Quality score schema", () => {
  it.each([0, 50, 100])("accepts integer boundary %i", (score) => {
    expect(roomQualityScoreSchema.safeParse(score).success).toBe(true);
  });

  it.each([-1, 101, 50.5])("rejects invalid score %s", (score) => {
    expect(roomQualityScoreSchema.safeParse(score).success).toBe(false);
  });

  it("preserves unknown rather than coercing it to zero", () => {
    expect(roomQualityScoreSchema.parse("")).toBeNull();
    expect(roomQualityScoreSchema.parse(undefined)).toBeNull();
  });
});

describe("Room profile notes", () => {
  const valid = {
    id: "",
    room_type_id: roomTypeId,
    physical_room_id: "",
    note_type: "pro",
    category: "view",
    text: "Ban công riêng nhìn thẳng thung lũng",
    sort_order: 10,
    is_public: "on",
  };

  it("accepts supported factual note types, categories, visibility, and ordering", () => {
    const result = roomProfileNoteSchema.parse(valid);
    expect(result.note_type).toBe("pro");
    expect(result.category).toBe("view");
    expect(result.sort_order).toBe(10);
    expect(result.is_public).toBe(true);
  });

  it("accepts one exact-room target and rejects both or neither", () => {
    expect(roomProfileNoteSchema.safeParse({ ...valid, room_type_id: "", physical_room_id: physicalRoomId }).success).toBe(true);
    expect(roomProfileNoteSchema.safeParse({ ...valid, physical_room_id: physicalRoomId }).success).toBe(false);
    expect(roomProfileNoteSchema.safeParse({ ...valid, room_type_id: "" }).success).toBe(false);
  });

  it("rejects unsupported values, blank text, excessive text, and sort range", () => {
    expect(roomProfileNoteSchema.safeParse({ ...valid, note_type: "neutral" }).success).toBe(false);
    expect(roomProfileNoteSchema.safeParse({ ...valid, category: "sponsor" }).success).toBe(false);
    expect(roomProfileNoteSchema.safeParse({ ...valid, text: " " }).success).toBe(false);
    expect(roomProfileNoteSchema.safeParse({ ...valid, text: "x".repeat(501) }).success).toBe(false);
    expect(roomProfileNoteSchema.safeParse({ ...valid, sort_order: -1 }).success).toBe(false);
  });

  it("keeps a private note private", () => {
    expect(roomProfileNoteSchema.parse({ ...valid, is_public: "" }).is_public).toBe(false);
  });
});
