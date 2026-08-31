import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { PackageCommerceForm } from "@/components/admin/package-commerce-form";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminCmsMedia } from "@/features/cms/data";
import { getAdminDestinationOptions } from "@/features/destinations/data";
import { getAdminPackageBundle, getAdminPackagePreview, getAdminPackageSources } from "@/features/packages/data";
import { formatPackageVnd } from "@/features/packages/policy";
import { packageIdSchema, packageQuoteInputSchema } from "@/features/packages/schema";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EditPackagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminUser(["admin"], "/admin/packages?error=package-forbidden");
  const { id } = await params;
  if (!packageIdSchema.safeParse(id).success) notFound();
  const query = await searchParams;
  const [bundle, destinations, sources, media] = await Promise.all([getAdminPackageBundle(id), getAdminDestinationOptions(), getAdminPackageSources(), getAdminCmsMedia()]);
  if (!bundle) notFound();
  const quoteParsed = packageQuoteInputSchema.safeParse({
    check_in: first(query.check_in), check_out: first(query.check_out),
    adults: first(query.adults) ?? 2, children: first(query.children) ?? 0,
    rooms: first(query.rooms) ?? 1, selected_optional_component_keys: first(query.optional) ?? "",
  });
  const preview = quoteParsed.success ? await getAdminPackagePreview({ bundle, quoteInput: { package_id: id, ...quoteParsed.data } }) : null;
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <AdminPageHeader title={bundle.package.name} description="Kiểm tra giá bán, chi phí, tình trạng và xác nhận theo cùng một cấu hình trước khi công khai." />
    <FormFeedback saved={first(query.saved)} error={first(query.error)} />
    <Card className="mb-6 grid gap-4 p-5 sm:p-6"><div><h2 className="text-xl font-bold text-pine">Xem trước theo ngày</h2><p className="mt-1 text-sm leading-6 text-muted">Kết quả riêng tư có rule IDs và kinh tế; không xuất hiện trên public.</p></div><form method="get" className="grid gap-4 sm:grid-cols-5"><Field label="Nhận phòng" htmlFor="preview-in"><Input id="preview-in" name="check_in" type="date" defaultValue={first(query.check_in)} required /></Field><Field label="Trả phòng" htmlFor="preview-out"><Input id="preview-out" name="check_out" type="date" defaultValue={first(query.check_out)} required /></Field><Field label="Người lớn" htmlFor="preview-adults"><Input id="preview-adults" name="adults" type="number" min={1} max={100} defaultValue={first(query.adults) ?? 2} /></Field><Field label="Trẻ em" htmlFor="preview-children"><Input id="preview-children" name="children" type="number" min={0} max={100} defaultValue={first(query.children) ?? 0} /></Field><Field label="Số phòng" htmlFor="preview-rooms"><Input id="preview-rooms" name="rooms" type="number" min={1} max={100} defaultValue={first(query.rooms) ?? 1} /></Field><button className="min-h-12 rounded-full bg-pine px-5 font-bold text-white sm:col-span-5 sm:justify-self-end">Chạy resolver</button></form>
      {preview ? <div className="grid gap-4 rounded-3xl bg-mist/70 p-4 sm:grid-cols-4"><p><span className="text-sm text-muted">Giá bán gói</span><strong className="mt-1 block text-pine">{preview.public_quote.sell_price.total_vnd === null ? "Cần xác nhận giá" : formatPackageVnd(preview.public_quote.sell_price.total_vnd)}</strong></p><p><span className="text-sm text-muted">Tổng chi phí</span><strong className="mt-1 block text-pine">{preview.package_cost_vnd === null ? "Chưa đủ dữ liệu" : formatPackageVnd(preview.package_cost_vnd)}</strong></p><p><span className="text-sm text-muted">Đóng góp gộp</span><strong className="mt-1 block text-pine">{preview.gross_contribution_vnd === null ? "Chưa tính được" : formatPackageVnd(preview.gross_contribution_vnd)}</strong></p><p><span className="text-sm text-muted">Biên gộp</span><strong className="mt-1 block text-pine">{preview.gross_margin_bps === null ? "Chưa tính được" : `${(preview.gross_margin_bps / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`}</strong></p><div className="sm:col-span-4"><p className="text-xs leading-5 text-muted">Policy {preview.policy_version} · Không phải lợi nhuận ròng · Giá không đồng nghĩa tình trạng dịch vụ.</p>{preview.warnings.length ? <p className="mt-2 text-sm font-bold text-warning">Cảnh báo: {preview.warnings.join(", ")}</p> : null}</div></div> : null}
    </Card>
    <PackageCommerceForm packageValue={bundle.package} initialComponentValues={bundle.components} initialPriceRuleValues={bundle.priceRules} destinations={destinations} rooms={sources.rooms} motorbikes={sources.motorbikes} media={media} warnings={bundle.warnings} />
  </main>;
}
