import { AlertTriangle, Check } from "lucide-react";
import type { PublicRoomProfileNoteDto } from "@/features/room-profiles/types";

export function RoomProfileNotes({ notes }: { notes: PublicRoomProfileNoteDto[] }) {
  const pros = notes.filter((note) => note.note_type === "pro");
  const cons = notes.filter((note) => note.note_type === "con");
  if (!pros.length && !cons.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-3xl bg-pine-soft p-4 text-ink">
        <h3 className="font-display text-lg font-bold text-pine">Điểm mạnh</h3>
        {pros.length ? <ul className="mt-3 grid gap-2">{pros.map((note) => <li key={note.id} className="flex gap-2 text-sm leading-6"><Check className="mt-1 shrink-0 text-success" size={16} aria-hidden="true" />{note.text}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Chưa có thông tin đã xác minh.</p>}
      </div>
      <div className="rounded-3xl bg-copper/10 p-4 text-ink">
        <h3 className="font-display text-lg font-bold text-pine">Điểm cần lưu ý</h3>
        {cons.length ? <ul className="mt-3 grid gap-2">{cons.map((note) => <li key={note.id} className="flex gap-2 text-sm leading-6"><AlertTriangle className="mt-1 shrink-0 text-copper-strong" size={16} aria-hidden="true" />{note.text}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Chưa có thông tin đã xác minh.</p>}
      </div>
    </div>
  );
}
