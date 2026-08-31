import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Bike,
  CalendarDays,
  Check,
  CircleHelp,
  CloudSun,
  ImageIcon,
  PackageCheck,
  Route,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PUBLIC_ROUTES } from "@/config/routes";
import { buildTripFinderUrl } from "@/features/trip-finder/params";
import type {
  ParsedTripFinderState,
  PublicTripRecommendation,
  TripFinderCandidateSet,
  TripFinderIntent,
  TripFinderResolution,
} from "@/features/trip-finder/types";

const TOTAL_STEPS = 5;

const hiddenFields = (intent: TripFinderIntent) => ({
  check_in: intent.checkIn,
  check_out: intent.checkOut,
  adults: String(intent.adults),
  children: String(intent.children),
  rooms: String(intent.rooms),
  style: intent.style,
  view: intent.viewPriority,
  road: intent.roadNeed,
  quality: intent.qualityPreference,
  budget: intent.budgetPreference,
  motorbike: intent.wantsMotorbike ? "1" : "",
  package: intent.wantsPackage ? "1" : "",
  verified: intent.prefersVerified ? "1" : "",
});

function IntentHiddenFields({ intent, omit = [] }: { intent: TripFinderIntent; omit?: string[] }) {
  const omitted = new Set(omit);
  return Object.entries(hiddenFields(intent)).flatMap(([name, value]) => value && !omitted.has(name)
    ? [<input key={name} type="hidden" name={name} value={value} />] : []);
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-6" aria-label={`Bước ${step} trên ${TOTAL_STEPS}`}>
      <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.12em] text-muted">
        <span>Bước {step}/{TOTAL_STEPS}</span>
        <span>Khoảng 2 phút</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mist" aria-hidden="true">
        <div className="h-full rounded-full bg-trip-teal transition-[width]" style={{ width: `${step / TOTAL_STEPS * 100}%` }} />
      </div>
    </div>
  );
}

function Choice({ name, value, checked, title, description }: {
  name: string;
  value: string;
  checked: boolean;
  title: string;
  description: string;
}) {
  return (
    <label className="group relative block cursor-pointer">
      <input className="peer sr-only" type="radio" name={name} value={value} defaultChecked={checked} required />
      <span className="flex min-h-18 items-start gap-3 rounded-2xl border border-line bg-white p-4 transition peer-checked:border-trip-teal peer-checked:bg-pine-soft peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-trip-sunrise">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line bg-white text-transparent peer-checked:text-pine group-has-[:checked]:border-trip-teal group-has-[:checked]:text-trip-teal"><Check size={15} aria-hidden="true" /></span>
        <span><strong className="block text-sm text-pine sm:text-base">{title}</strong><small className="mt-1 block text-xs leading-5 text-muted sm:text-sm">{description}</small></span>
      </span>
    </label>
  );
}

function ToggleChoice({ name, value = "1", checked, title, description }: {
  name: string;
  value?: string;
  checked: boolean;
  title: string;
  description: string;
}) {
  return (
    <label className="group relative block cursor-pointer">
      <input className="peer sr-only" type="checkbox" name={name} value={value} defaultChecked={checked} />
      <span className="flex min-h-18 items-start gap-3 rounded-2xl border border-line bg-white p-4 transition peer-checked:border-trip-teal peer-checked:bg-pine-soft peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-trip-sunrise">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-line bg-white text-transparent group-has-[:checked]:border-trip-teal group-has-[:checked]:text-trip-teal"><Check size={15} aria-hidden="true" /></span>
        <span><strong className="block text-sm text-pine sm:text-base">{title}</strong><small className="mt-1 block text-xs leading-5 text-muted sm:text-sm">{description}</small></span>
      </span>
    </label>
  );
}

function StepShell({ step, title, description, intent, children }: {
  step: number;
  title: string;
  description: string;
  intent: TripFinderIntent;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Progress step={step} />
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-copper-strong">Tìm chuyến đi</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight text-pine sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">{description}</p>
      <Card className="mt-6 p-4 sm:p-7">{children}</Card>
      <Link href={step === 1 ? "/trip-finder" : buildTripFinderUrl(intent, { step: step - 1 })} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pine hover:text-copper-strong">
        <ArrowLeft size={17} aria-hidden="true" />Quay lại
      </Link>
    </section>
  );
}

function SubmitBar({ label = "TIẾP TỤC" }: { label?: string }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0">
      <button type="submit" className={buttonVariants({ size: "lg", className: "min-h-14 w-full text-sm" })}>{label}<ArrowRight size={18} aria-hidden="true" /></button>
    </div>
  );
}

function DateGuestStep({ intent }: { intent: TripFinderIntent }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <StepShell step={1} title="Bạn dự định đi khi nào?" description="Ngày, số khách và số phòng là điều kiện thực tế để kiểm tra giá, sức chứa và tình trạng phòng." intent={intent}>
    <form action="/trip-finder" method="get">
      <IntentHiddenFields intent={intent} omit={["check_in", "check_out", "adults", "children", "rooms"]} />
      <input type="hidden" name="step" value="2" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-pine">Ngày đi<Input name="check_in" type="date" min={today} defaultValue={intent.checkIn} required className="min-h-12" /></label>
        <label className="grid gap-2 text-sm font-bold text-pine">Ngày về<Input name="check_out" type="date" min={intent.checkIn || today} defaultValue={intent.checkOut} required className="min-h-12" /></label>
        <label className="grid gap-2 text-sm font-bold text-pine">Người lớn<Input name="adults" type="number" min={1} max={20} defaultValue={intent.adults} required className="min-h-12" /></label>
        <label className="grid gap-2 text-sm font-bold text-pine">Trẻ em<Input name="children" type="number" min={0} max={20} defaultValue={intent.children} required className="min-h-12" /></label>
        <label className="grid gap-2 text-sm font-bold text-pine sm:col-span-2">Số phòng<Input name="rooms" type="number" min={1} max={10} defaultValue={intent.rooms} required className="min-h-12" /></label>
      </div>
      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-mist p-3 text-xs leading-5 text-muted"><CalendarDays className="mt-0.5 shrink-0 text-copper" size={16} aria-hidden="true" />Ngày về không tính là đêm lưu trú. Website chỉ kiểm tra dữ liệu hiện có, chưa giữ chỗ.</p>
      <SubmitBar />
    </form>
  </StepShell>;
}

function StyleStep({ intent }: { intent: TripFinderIntent }) {
  const choices = [
    ["balanced", "Cân bằng", "Ưu tiên lựa chọn phù hợp tổng thể, không đặt một trải nghiệm lên trước."],
    ["couple", "Đi đôi", "Ưu tiên sức chứa gọn và phòng tắm riêng khi có dữ liệu."],
    ["family", "Gia đình", "Ưu tiên sức chứa phù hợp cho cả người lớn và trẻ em."],
    ["group", "Nhóm bạn", "Ưu tiên lựa chọn đáp ứng đủ tổng số khách và số phòng."],
    ["slow", "Nghỉ chậm", "Ưu tiên không gian riêng như ban công khi thông tin đã được ghi nhận."],
  ] as const;
  return <StepShell step={2} title="Chuyến đi của bạn theo kiểu nào?" description="Đây là ưu tiên để sắp xếp, không thay thế các điều kiện bắt buộc về sức chứa và ngày đi." intent={intent}>
    <form action="/trip-finder" method="get"><IntentHiddenFields intent={intent} omit={["style"]} /><input type="hidden" name="step" value="3" />
      <fieldset><legend className="sr-only">Kiểu chuyến đi</legend><div className="grid gap-3 sm:grid-cols-2">{choices.map(([value, title, description]) => <Choice key={value} name="style" value={value} checked={intent.style === value} title={title} description={description} />)}</div></fieldset>
      <SubmitBar />
    </form>
  </StepShell>;
}

function ViewStep({ intent }: { intent: TripFinderIntent }) {
  const choices = [
    ["any", "Không đặt nặng góc nhìn", "Không dùng góc nhìn để ưu tiên kết quả."],
    ["cloud_view", "Cloud View đã thẩm định", "Ưu tiên góc nhìn vật lý có hồ sơ còn hiệu lực; không phải dự báo mây."],
    ["view_from_bed", "Nhìn cảnh từ giường", "Ưu tiên dữ liệu đã thẩm định là có hoặc một phần."],
    ["mountain", "Hướng nhìn núi", "Ưu tiên mô tả loại phòng ghi nhận hướng núi."],
    ["valley", "Hướng thung lũng", "Ưu tiên mô tả loại phòng ghi nhận hướng thung lũng."],
  ] as const;
  return <StepShell step={3} title="Bạn muốn ưu tiên góc nhìn nào?" description="Thông tin góc nhìn được dùng đúng phạm vi. Trip Finder không dự báo thời tiết hoặc hứa chắc có mây." intent={intent}>
    <form action="/trip-finder" method="get"><IntentHiddenFields intent={intent} omit={["view"]} /><input type="hidden" name="step" value="4" />
      <fieldset><legend className="sr-only">Ưu tiên góc nhìn</legend><div className="grid gap-3">{choices.map(([value, title, description]) => <Choice key={value} name="view" value={value} checked={intent.viewPriority === value} title={title} description={description} />)}</div></fieldset>
      <SubmitBar />
    </form>
  </StepShell>;
}

function AccessTrustStep({ intent }: { intent: TripFinderIntent }) {
  return <StepShell step={4} title="Đường vào và mức thông tin bạn cần?" description="Yêu cầu ô tô là điều kiện cứng khi thông tin xác định là không. Trạng thái chưa xác nhận được giữ riêng, không bị đổi thành “không”." intent={intent}>
    <form action="/trip-finder" method="get"><IntentHiddenFields intent={intent} omit={["road", "quality", "verified"]} /><input type="hidden" name="step" value="5" />
      <fieldset><legend className="mb-3 text-sm font-bold text-pine">Cách tiếp cận nơi ở</legend><div className="grid gap-3 sm:grid-cols-3">
        <Choice name="road" value="any" checked={intent.roadNeed === "any"} title="Linh hoạt" description="Không dùng đường vào như điều kiện ưu tiên." />
        <Choice name="road" value="car_required" checked={intent.roadNeed === "car_required"} title="Ô tô phải vào được" description="Loại lựa chọn đã xác định ô tô không vào được; dữ liệu chưa rõ sẽ được cảnh báo." />
        <Choice name="road" value="motorbike_ok" checked={intent.roadNeed === "motorbike_ok"} title="Đi xe máy được" description="Ưu tiên nơi có ghi nhận xe máy tiếp cận được." />
      </div></fieldset>
      <fieldset className="mt-6"><legend className="mb-3 text-sm font-bold text-pine">Mức bằng chứng ưu tiên</legend><div className="grid gap-3 sm:grid-cols-2">
        <ToggleChoice name="verified" checked={intent.prefersVerified} title="Ưu tiên hồ sơ đã thẩm định" description="Cloud View, đường vào, loại phòng hoặc chất lượng còn hiệu lực đều được nói rõ phạm vi." />
        <ToggleChoice name="quality" value="current_quality" checked={intent.qualityPreference === "current_quality"} title="Ưu tiên tiêu chí chất lượng còn mới" description="Dùng từng tiêu chí còn hiệu lực; không tạo điểm chất lượng tổng hợp." />
      </div></fieldset>
      <SubmitBar />
    </form>
  </StepShell>;
}

function ServicesBudgetStep({ intent }: { intent: TripFinderIntent }) {
  return <StepShell step={5} title="Bạn muốn ghép chuyến theo cách nào?" description="Gói có giá riêng; dịch vụ tự ghép không được cộng thành một mức giá giả. Xe máy luôn cần nhà vận hành xác nhận." intent={intent}>
    <form action="/trip-finder" method="get"><IntentHiddenFields intent={intent} omit={["budget", "motorbike", "package"]} /><input type="hidden" name="results" value="1" />
      <fieldset><legend className="mb-3 text-sm font-bold text-pine">Dịch vụ muốn cân nhắc</legend><div className="grid gap-3 sm:grid-cols-2">
        <ToggleChoice name="package" checked={intent.wantsPackage} title="Ưu tiên gói dịch vụ" description="Chỉ dùng Package thật đang công khai với thành phần và giá riêng." />
        <ToggleChoice name="motorbike" checked={intent.wantsMotorbike} title="Cần thêm xe máy" description="Có thể gợi ý gói chứa xe hoặc cách xem phòng và xe riêng." />
      </div></fieldset>
      <fieldset className="mt-6"><legend className="mb-3 text-sm font-bold text-pine">Ưu tiên ngân sách</legend><div className="grid gap-3 sm:grid-cols-2">
        <Choice name="budget" value="flexible" checked={intent.budgetPreference === "flexible"} title="Linh hoạt" description="Không dùng mức giá để sắp xếp." />
        <Choice name="budget" value="complete_price" checked={intent.budgetPreference === "complete_price"} title="Ưu tiên có tổng giá" description="Ưu tiên dữ liệu giá đầy đủ cho đúng ngày đã chọn." />
        <Choice name="budget" value="under_1500000" checked={intent.budgetPreference === "under_1500000"} title="Ưu tiên đến 1.500.000 ₫" description="Là ưu tiên, không tự động loại lựa chọn cao hơn hoặc chưa có giá." />
        <Choice name="budget" value="under_3000000" checked={intent.budgetPreference === "under_3000000"} title="Ưu tiên đến 3.000.000 ₫" description="Là ưu tiên, không phải cam kết tổng chi phí chuyến đi." />
      </div></fieldset>
      <SubmitBar label="XEM GỢI Ý CÓ GIẢI THÍCH" />
    </form>
  </StepShell>;
}

function RecommendationImage({ item }: { item: PublicTripRecommendation }) {
  if (!item.imageUrl) {
    return <div className="grid size-full place-items-center text-pine"><ImageIcon size={50} strokeWidth={1.4} aria-hidden="true" /><span className="sr-only">Chưa có ảnh công khai</span></div>;
  }
  return <>
    {/* Public media can use approved external HTTPS hosts. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={item.imageUrl} alt={item.imageAlt} loading="lazy" className="size-full object-cover" />
  </>;
}

function RecommendationCard({ item }: { item: PublicTripRecommendation }) {
  const Icon = item.kind === "stay" ? BedDouble : item.kind === "package" ? PackageCheck : item.kind === "motorbike" ? Bike : Sparkles;
  return <article><Card className="overflow-hidden">
    <div className="relative aspect-[16/9] bg-gradient-to-br from-pine-soft to-mist"><RecommendationImage item={item} /><Badge className="absolute left-3 top-3 bg-white/95 text-pine shadow"><Icon size={14} aria-hidden="true" />{item.kindLabel}</Badge></div>
    <div className="p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.1em] text-copper-strong">{item.context}</p><h3 className="mt-2 text-2xl font-bold text-pine">{item.name}</h3>
      <div className="mt-4 grid gap-2 rounded-2xl bg-mist p-4"><p className="text-xl font-bold text-pine">{item.price.label}</p><p className="text-sm font-semibold text-ink">{item.availability.label}</p><p className="text-xs leading-5 text-muted">{item.confirmation.label}</p></div>
      <section className="mt-5" aria-label="Vì sao phù hợp"><h4 className="flex items-center gap-2 text-sm font-bold text-pine"><SearchCheck size={17} className="text-trip-teal" aria-hidden="true" />Vì sao được gợi ý</h4><ul className="mt-2 grid gap-2 text-sm leading-6 text-ink">{item.reasons.map((reason) => <li key={reason} className="flex gap-2"><Check className="mt-1 shrink-0 text-success" size={15} aria-hidden="true" /><span>{reason}</span></li>)}</ul></section>
      {item.tradeOffs.length || item.unknownFacts.length ? <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-label="Thông tin cần lưu ý"><h4 className="flex items-center gap-2 text-sm font-bold text-warning"><CircleHelp size={17} aria-hidden="true" />Thông tin cần lưu ý</h4><ul className="mt-2 grid gap-1 text-xs leading-5 text-muted">{[...item.tradeOffs, ...item.unknownFacts].map((fact) => <li key={fact}>• {fact}</li>)}</ul></section> : null}
      {item.verificationLabels.length ? <div className="mt-4 flex flex-wrap gap-2">{item.verificationLabels.map((label) => <Badge key={label} className="text-success"><ShieldCheck size={13} aria-hidden="true" />{label}</Badge>)}</div> : null}
      <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">{item.actions.map((action, index) => <Link key={`${action.label}:${action.href}`} href={action.href} target={action.external ? "_blank" : undefined} rel={action.external ? "noreferrer" : undefined} className={buttonVariants({ variant: index === 0 ? "accent" : "secondary", size: "lg", className: "min-h-12 w-full sm:w-auto" })}>{action.label}<ArrowRight size={17} aria-hidden="true" /></Link>)}</div>
    </div>
  </Card></article>;
}

function Results({ parsed, candidateSet, resolution }: { parsed: ParsedTripFinderState; candidateSet: TripFinderCandidateSet; resolution: TripFinderResolution }) {
  const { intent } = parsed;
  return <main className="bg-cream pb-16">
    <section className="trip-detail-hero px-4 py-10 text-white sm:px-6 sm:py-14"><div className="mx-auto max-w-6xl"><Badge className="bg-white/12 text-white">GỢI Ý CÓ GIẢI THÍCH</Badge><h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">Lựa chọn phù hợp với chuyến đi của bạn</h1><p className="mt-4 max-w-3xl leading-7 text-white/80">{intent.checkIn} → {intent.checkOut} · {intent.adults} người lớn · {intent.children} trẻ em · {intent.rooms} phòng. Kết quả chỉ dùng dữ liệu đang có và không phải xác nhận đặt chỗ.</p><div className="mt-6 flex flex-wrap gap-3"><Link href={buildTripFinderUrl(intent, { step: 1 })} className={buttonVariants({ variant: "secondary", size: "lg", className: "bg-white text-pine" })}><ArrowLeft size={17} aria-hidden="true" />Sửa lựa chọn</Link><Link href={PUBLIC_ROUTES.stay} className="inline-flex min-h-12 items-center font-bold text-white">Xem toàn bộ phòng →</Link></div></div></section>
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      {candidateSet.status === "partial" ? <p role="status" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-warning">Một nguồn dữ liệu đang tạm lỗi. Các gợi ý bên dưới chỉ dùng những nguồn đã tải được và không lấp chỗ trống bằng dữ liệu mẫu.</p> : null}
      {resolution.recommendations.length ? <div className="grid gap-10">{resolution.groups.map((group) => <section key={group.key} aria-labelledby={`group-${group.key}`}><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-pine-soft text-pine">{group.key === "best" ? <Check size={20} /> : group.key === "consider" ? <SearchCheck size={20} /> : <CircleHelp size={20} />}</span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-copper-strong">{group.items.length} lựa chọn</p><h2 id={`group-${group.key}`} className="text-2xl font-bold text-pine sm:text-3xl">{group.label}</h2></div></div><div className="grid gap-5 lg:grid-cols-2">{group.items.map((item) => <RecommendationCard key={item.id} item={item} />)}</div></section>)}</div> : <Card className="p-6 text-center sm:p-10"><SearchCheck className="mx-auto text-copper" size={46} strokeWidth={1.5} aria-hidden="true" /><h2 className="mt-4 text-3xl font-bold text-pine">Chưa có lựa chọn đủ dữ liệu cho yêu cầu này</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-muted">{candidateSet.status === "empty" ? "Các nguồn công khai hiện chưa có phòng, gói hoặc xe để so sánh. Chúng tôi không tạo ứng viên, giá hay tình trạng mẫu." : candidateSet.status === "unconfigured" ? "Nguồn dữ liệu công khai chưa được cấu hình. Trip Finder vẫn giữ nguyên lựa chọn của bạn nhưng không dựng kết quả thay thế." : "Không có ứng viên vượt qua các điều kiện chắc chắn hiện có."}</p>{resolution.relaxationOptions.length ? <div className="mx-auto mt-6 max-w-2xl rounded-2xl bg-mist p-4 text-left"><h3 className="font-bold text-pine">Bạn có thể chủ động thử</h3><ul className="mt-2 grid gap-2 text-sm leading-6 text-muted">{resolution.relaxationOptions.map((option) => <li key={option}>• {option}</li>)}</ul></div> : null}<div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href={buildTripFinderUrl(intent, { step: 1 })} className={buttonVariants({ size: "lg" })}>Đổi lựa chọn</Link><Link href={PUBLIC_ROUTES.stay} className={buttonVariants({ variant: "secondary", size: "lg" })}>Xem Lưu trú</Link></div></Card>}
      <section className="mt-10 grid gap-3 rounded-3xl border border-line bg-white p-5 text-sm sm:grid-cols-3"><p className="flex gap-2"><BedDouble className="shrink-0 text-copper" size={18} aria-hidden="true" /><span><strong className="block text-pine">Lưu trú</strong>{candidateSet.sources.stay === "ready" ? "Đã đọc dữ liệu công khai" : "Chưa có dữ liệu công khai"}</span></p><p className="flex gap-2"><PackageCheck className="shrink-0 text-copper" size={18} aria-hidden="true" /><span><strong className="block text-pine">Gói dịch vụ</strong>{candidateSet.sources.packages === "ready" ? "Đã đọc dữ liệu công khai" : "Chưa có dữ liệu công khai"}</span></p><p className="flex gap-2"><Bike className="shrink-0 text-copper" size={18} aria-hidden="true" /><span><strong className="block text-pine">Xe máy</strong>{candidateSet.sources.motorbike === "ready" ? "Đã đọc dữ liệu công khai" : "Chưa có dữ liệu công khai"}</span></p></section>
    </div>
  </main>;
}

function Landing({ intent }: { intent: TripFinderIntent }) {
  return <main className="bg-cream"><section className="trip-detail-hero px-4 py-12 text-white sm:px-6 sm:py-20"><div className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"><div><Badge className="bg-white/12 text-white">GỢI Ý THEO NHU CẦU · GIẢI THÍCH RÕ</Badge><h1 className="mt-5 text-4xl font-bold leading-tight sm:text-6xl">Tìm chuyến đi dựa trên điều bạn thật sự cần.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">Trả lời vài câu hỏi ngắn. Hệ thống đối chiếu phòng, gói và xe máy đang có; nói rõ lý do phù hợp, điểm phải đánh đổi và dữ liệu chưa biết.</p><Link href={buildTripFinderUrl(intent, { step: 1 })} className={buttonVariants({ variant: "secondary", size: "lg", className: "mt-7 min-h-14 bg-white px-7 text-pine" })}>BẮT ĐẦU<ArrowRight size={19} aria-hidden="true" /></Link><p className="mt-3 text-xs text-white/65">Không cần tài khoản · lựa chọn được lưu trong đường dẫn để bạn chia sẻ.</p></div><Card className="border-white/20 bg-white/10 p-5 text-white backdrop-blur-sm sm:p-7"><SearchCheck size={38} className="text-trip-sunrise" aria-hidden="true" /><h2 className="mt-4 text-2xl font-bold">Phù hợp nhu cầu, đúng với dữ liệu đang có.</h2><div className="mt-5 grid gap-4 text-sm leading-6 text-white/80"><p className="flex gap-3"><Users className="shrink-0 text-trip-sunrise" size={20} aria-hidden="true" />Sức chứa, ngày và yêu cầu đường vào là điều kiện thực tế.</p><p className="flex gap-3"><CloudSun className="shrink-0 text-trip-sunrise" size={20} aria-hidden="true" />Cloud View, chất lượng và thẩm định chỉ được dùng khi còn hiệu lực.</p><p className="flex gap-3"><Route className="shrink-0 text-trip-sunrise" size={20} aria-hidden="true" />“Chưa xác nhận” luôn khác “Không”.</p><p className="flex gap-3"><SearchCheck className="shrink-0 text-trip-sunrise" size={20} aria-hidden="true" />Nhu cầu và dữ liệu thực tế quyết định thứ tự gợi ý.</p></div></Card></div></section>
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><ShieldCheck className="text-copper" aria-hidden="true" /><h2 className="mt-3 text-lg font-bold text-pine">Chỉ dữ liệu thật</h2><p className="mt-2 text-sm leading-6 text-muted">Không tạo giá, tình trạng phòng, điểm tin cậy hay ứng viên mẫu.</p></Card><Card className="p-5"><Sparkles className="text-copper" aria-hidden="true" /><h2 className="mt-3 text-lg font-bold text-pine">Giải thích được</h2><p className="mt-2 text-sm leading-6 text-muted">Mỗi gợi ý có lý do, điều cần lưu ý và bước tiếp theo.</p></Card><Card className="p-5"><CircleHelp className="text-copper" aria-hidden="true" /><h2 className="mt-3 text-lg font-bold text-pine">Không tự nới điều kiện</h2><p className="mt-2 text-sm leading-6 text-muted">Nếu chưa có kết quả, bạn tự chọn điều muốn thay đổi.</p></Card></div></section></main>;
}

export function TripFinderExperience({ parsed, candidateSet, resolution }: {
  parsed: ParsedTripFinderState;
  candidateSet?: TripFinderCandidateSet;
  resolution?: TripFinderResolution;
}) {
  if (parsed.showResults && candidateSet && resolution) return <Results parsed={parsed} candidateSet={candidateSet} resolution={resolution} />;
  if (parsed.step === 0) return <Landing intent={parsed.intent} />;
  return <main className="min-h-[calc(100dvh-4.5rem)] bg-cream">
    {parsed.issues.length ? <div role="alert" className="mx-auto max-w-3xl px-4 pt-5 sm:px-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-danger">{parsed.issues.join(" ")}</div></div> : null}
    {parsed.step === 1 ? <DateGuestStep intent={parsed.intent} /> : parsed.step === 2 ? <StyleStep intent={parsed.intent} /> : parsed.step === 3 ? <ViewStep intent={parsed.intent} /> : parsed.step === 4 ? <AccessTrustStep intent={parsed.intent} /> : <ServicesBudgetStep intent={parsed.intent} />}
  </main>;
}
