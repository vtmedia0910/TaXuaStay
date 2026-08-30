"use client";

import { useState, useTransition } from "react";
import { Check, ImageIcon, Search, X } from "lucide-react";
import { CmsImage } from "@/components/cms/cms-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { searchCmsMediaAction } from "@/features/cms/actions";
import type { CmsMediaAsset, CmsMediaRole } from "@/features/cms/types";
import { CMS_MEDIA_ROLE_LABELS } from "@/features/cms/ui";

export function CmsMediaPicker({ name, label, value, current, initialMedia, allowedRoles }: {
  name: string;
  label: string;
  value: string | null;
  current?: CmsMediaAsset | null;
  initialMedia: CmsMediaAsset[];
  allowedRoles?: CmsMediaRole[];
}) {
  const initialRole = allowedRoles?.[0] ?? "all";
  const [selected, setSelected] = useState<CmsMediaAsset | null>(current ?? initialMedia.find((asset) => asset.id === value) ?? null);
  const [items, setItems] = useState(() => allowedRoles ? initialMedia.filter((asset) => allowedRoles.includes(asset.role)) : initialMedia);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeQuery, setActiveQuery] = useState("");
  const [activeRole, setActiveRole] = useState(initialRole);
  const [pending, startTransition] = useTransition();

  const runSearch = (query: string, role: string, nextPage = 1) => {
    startTransition(async () => {
      const result = await searchCmsMediaAction({ query, role, page: nextPage, pageSize: 24 });
      setItems(allowedRoles ? result.items.filter((asset) => allowedRoles.includes(asset.role)) : result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setActiveQuery(query);
      setActiveRole(role);
    });
  };

  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <p className="text-sm font-bold text-pine">{label}</p>
      {selected ? (
        <div className="grid gap-3 rounded-2xl border border-line bg-mist/50 p-3 sm:grid-cols-[8rem_1fr] sm:items-center">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-mist"><CmsImage media={selected} sizes="128px" /></div>
          <div><p className="font-bold text-pine">{selected.title}</p><p className="mt-1 text-sm text-muted">{CMS_MEDIA_ROLE_LABELS[selected.role]}</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => { setOpen(true); runSearch("", initialRole); }}>Thay ảnh</Button><Button type="button" size="sm" variant="ghost" onClick={() => setSelected(null)}>Xóa lựa chọn</Button></div></div>
        </div>
      ) : <button type="button" onClick={() => { setOpen(true); runSearch("", initialRole); }} className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-line bg-mist/40 p-4 font-bold text-pine hover:border-pine"><span className="inline-flex items-center gap-2"><ImageIcon size={20} /> Chọn từ thư viện</span></button>}
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-pine/55 p-3" role="dialog" aria-modal="true" aria-label={`Chọn ${label}`}>
          <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line p-4 sm:p-5"><div><h3 className="text-xl font-bold text-pine">Chọn từ thư viện media</h3><p className="text-sm text-muted">Tìm theo tên và vai trò ảnh.</p></div><Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Đóng"><X /></Button></div>
            <form
              className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_14rem_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                runSearch(String(form.get("query") ?? ""), String(form.get("role") ?? "all"));
              }}
            >
              <Input name="query" placeholder="Tìm theo tên ảnh…" />
              <Select name="role" defaultValue={initialRole}>{allowedRoles ? null : <option value="all">Tất cả vai trò</option>}{Object.entries(CMS_MEDIA_ROLE_LABELS).filter(([role]) => !allowedRoles || allowedRoles.includes(role as CmsMediaRole)).map(([role, roleLabel]) => <option key={role} value={role}>{roleLabel}</option>)}</Select>
              <Button type="submit" disabled={pending}><Search size={18} /> Tìm</Button>
            </form>
            <div className="overflow-y-auto p-4 sm:p-5">
              {items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((asset) => <button key={asset.id} type="button" onClick={() => { setSelected(asset); setOpen(false); }} className="overflow-hidden rounded-2xl border border-line bg-white text-left hover:border-pine focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-trip-sunrise/50"><div className="relative aspect-[4/3] bg-mist"><CmsImage media={asset} sizes="(min-width: 1024px) 220px, 45vw" /></div><div className="p-3"><p className="line-clamp-2 font-bold text-pine">{asset.title}</p><p className="mt-1 text-xs text-muted">{CMS_MEDIA_ROLE_LABELS[asset.role]}</p>{selected?.id === asset.id ? <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-success"><Check size={14} /> Đang chọn</p> : null}</div></button>)}</div> : <p className="rounded-2xl bg-mist p-5 text-center text-muted">Không tìm thấy ảnh phù hợp.</p>}
            </div>
            <div className="flex items-center justify-between border-t border-line p-4"><Button type="button" size="sm" variant="secondary" disabled={pending || page <= 1} onClick={() => runSearch(activeQuery, activeRole, page - 1)}>Trang trước</Button><span className="text-sm text-muted">Trang {page}/{totalPages}</span><Button type="button" size="sm" variant="secondary" disabled={pending || page >= totalPages} onClick={() => runSearch(activeQuery, activeRole, page + 1)}>Trang sau</Button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
