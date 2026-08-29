import { AlertTriangle, CalendarCheck, DatabaseZap } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { setInventoryRangeAction } from "@/features/availability/actions";
import { getAdminInventoryRows } from "@/features/availability/data";
import { detectAdminAvailabilityIssues } from "@/features/availability/diagnostics";
import { availabilityFreshnessState, AVAILABILITY_STATE_LABELS, INVENTORY_SOURCE_LABELS } from "@/features/availability/policy";
import { INVENTORY_SOURCES } from "@/features/availability/types";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { formatVnd, vietnamDate } from "@/features/pricing/policy";
import { getAdminRooms } from "@/features/rooms/data";
import { addLodgingDays, enumerateInclusiveLodgingDates, parseLodgingDate } from "@/lib/lodging-dates";

type AvailabilitySearchParams = {
  saved?: string;
  error?: string;
  property?: string;
  room?: string;
  from?: string;
  to?: string;
};

function safeEditorDates(from: string | undefined, to: string | undefined, today: string) {
  const defaultTo = addLodgingDays(today, 6) as string;
  if (!from || !to || !parseLodgingDate(from) || !parseLodgingDate(to)) {
    return { from: today, to: defaultTo };
  }
  return enumerateInclusiveLodgingDates(from, to, 365).length
    ? { from, to }
    : { from: today, to: defaultTo };
}

export default async function AdminAvailabilityPage({ searchParams }: {
  searchParams: Promise<AvailabilitySearchParams>;
}) {
  const params = await searchParams;
  const today = vietnamDate();
  const editorRange = safeEditorDates(params.from, params.to, today);
  const properties = await getAdminPropertyOptions();
  const rooms = await getAdminRooms(properties);
  const filteredRooms = params.property
    ? rooms.filter((room) => room.property_id === params.property)
    : rooms;
  const selectedRoom = filteredRooms.find((room) => room.id === params.room) ?? null;
  const dashboardDates = enumerateInclusiveLodgingDates(today, addLodgingDays(today, 13) as string, 14);
  const editorDates = enumerateInclusiveLodgingDates(editorRange.from, editorRange.to, 365);
  const activeRooms = rooms.filter((room) => room.is_active);
  const [dashboardRows, editorRows] = await Promise.all([
    getAdminInventoryRows({
      roomTypeIds: activeRooms.map((room) => room.id),
      dateFrom: dashboardDates[0],
      dateTo: dashboardDates.at(-1) as string,
    }),
    selectedRoom
      ? getAdminInventoryRows({ roomTypeIds: [selectedRoom.id], dateFrom: editorRange.from, dateTo: editorRange.to })
      : Promise.resolve([]),
  ]);
  const issues = detectAdminAvailabilityIssues({ rooms: activeRooms, rows: dashboardRows, expectedDates: dashboardDates });
  const editorRowsByDate = new Map(editorRows.map((row) => [row.date, row]));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Tình trạng phòng"
        description="Cập nhật số phòng có thể bán theo từng đêm. Thao tác này không giữ chỗ, không tạo booking và không thay đổi số phòng vật lý."
      />
      <FormFeedback saved={params.saved} error={params.error} />

      <section className="mb-8" aria-labelledby="availability-warning-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="availability-warning-title" className="font-display text-2xl font-bold text-pine">Cần chú ý trong 14 đêm tới</h2>
            <p className="mt-1 text-sm text-muted">Thiếu dữ liệu không được xem là còn phòng.</p>
          </div>
          <Badge>{activeRooms.length} loại phòng đang hoạt động</Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {issues.slice(0, 30).map((issue, index) => (
            <p key={`${issue.code}-${issue.room_type_id}-${index}`} className={issue.severity === "error" ? "flex gap-2 rounded-2xl bg-red-50 p-4 text-sm font-bold text-danger" : "flex gap-2 rounded-2xl bg-copper/10 p-4 text-sm font-bold text-copper-strong"}>
              <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />{issue.message}
            </p>
          ))}
          {!issues.length ? <p className="rounded-2xl bg-pine-soft p-4 text-sm font-bold text-success">✓ Mọi phòng đang hoạt động có dữ liệu đầy đủ, còn mới và không vượt sức chứa vật lý trong 14 đêm tới.</p> : null}
          {issues.length > 30 ? <p className="text-sm text-muted">Còn {issues.length - 30} cảnh báo; hãy lọc từng nơi lưu trú và cập nhật theo nhóm.</p> : null}
        </div>
      </section>

      <Card className="mb-8 p-5 sm:p-6">
        <form method="get" className="grid gap-4 md:grid-cols-5">
          <label className="grid gap-2 text-sm font-bold">Nơi lưu trú<Select name="property" defaultValue={params.property ?? ""}><option value="">Tất cả</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">Loại phòng<Select name="room" defaultValue={selectedRoom?.id ?? ""}><option value="">Chọn phòng</option>{filteredRooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.property_name} · tối đa {room.quantity}</option>)}</Select></label>
          <label className="grid gap-2 text-sm font-bold">Từ đêm<Input name="from" type="date" defaultValue={editorRange.from} required /></label>
          <label className="grid gap-2 text-sm font-bold">Đến đêm<Input name="to" type="date" defaultValue={editorRange.to} required /></label>
          <button className={`${buttonVariants({ variant: "secondary" })} md:col-start-5`}>Mở lịch</button>
        </form>
      </Card>

      {selectedRoom ? (
        <>
          <Card className="mb-8 p-5 sm:p-6">
            <div className="flex gap-3"><DatabaseZap className="shrink-0 text-copper" aria-hidden="true" /><div><h2 className="font-display text-2xl font-bold text-pine">Cập nhật nhanh · {selectedRoom.name}</h2><p className="mt-1 text-sm text-muted">{selectedRoom.property_name} · {editorDates.length} đêm tính cả hai đầu · tối đa {selectedRoom.quantity} phòng vật lý.</p></div></div>
            <form action={setInventoryRangeAction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="room_type_id" value={selectedRoom.id} />
              <input type="hidden" name="date_from" value={editorRange.from} />
              <input type="hidden" name="date_to" value={editorRange.to} />
              <label className="grid gap-2 text-sm font-bold">Số phòng có thể bán<Input name="available_quantity" type="number" min={0} max={selectedRoom.quantity} step={1} required /></label>
              <label className="grid gap-2 text-sm font-bold">Nguồn<Select name="source" defaultValue="admin">{INVENTORY_SOURCES.filter((source) => source !== "booking_engine").map((source) => <option key={source} value={source}>{INVENTORY_SOURCE_LABELS[source]}</option>)}</Select></label>
              <label className="grid gap-2 text-sm font-bold lg:col-span-2">Giá vận hành tùy chọn (VND)<Input name="price_override_vnd" type="number" min={0} step={1} placeholder="Để trống nếu không dùng" /></label>
              <div className="self-end"><SubmitButton label={`Cập nhật ${editorDates.length} đêm`} /></div>
            </form>
            <p className="mt-4 rounded-2xl bg-mist p-3 text-sm leading-6 text-muted">Thời điểm xác nhận mặc định là lúc lưu. Giá vận hành được giữ riêng cho nghiệp vụ; Phase 6 chưa dùng giá này để thay thế bảng giá công khai.</p>
          </Card>

          <section aria-labelledby="inventory-grid-title">
            <h2 id="inventory-grid-title" className="flex items-center gap-2 font-display text-2xl font-bold text-pine"><CalendarCheck aria-hidden="true" />Chi tiết từng đêm</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {editorDates.map((date) => {
                const row = editorRowsByDate.get(date);
                const state = row ? availabilityFreshnessState(row.verified_at) : "unknown";
                return (
                  <Card key={date} className="p-4">
                    <div className="flex items-start justify-between gap-3"><h3 className="font-bold text-pine">{date}</h3><Badge>{AVAILABILITY_STATE_LABELS[state]}</Badge></div>
                    {row ? <div className="mt-3 grid gap-1 text-sm text-muted"><p><strong className="text-ink">{row.available_quantity}</strong> phòng có thể bán</p><p>{INVENTORY_SOURCE_LABELS[row.source]}</p><p>Xác nhận {new Date(row.verified_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>{row.price_override_vnd !== null ? <p>Giá vận hành: {formatVnd(row.price_override_vnd)}</p> : null}</div> : <p className="mt-3 text-sm text-muted">Chưa có bản ghi — trạng thái là chưa xác định.</p>}
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <Card className="p-8 text-center"><CalendarCheck className="mx-auto text-copper" size={34} aria-hidden="true" /><h2 className="mt-4 font-display text-2xl font-bold text-pine">Chọn loại phòng để cập nhật</h2><p className="mt-2 text-sm text-muted">Bạn có thể đặt cùng một số lượng cho tối đa 365 đêm trong một giao dịch an toàn.</p></Card>
      )}
    </main>
  );
}
