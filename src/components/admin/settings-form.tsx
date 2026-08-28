import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSiteSettingsAction } from "@/features/settings/actions";
import type { PublicSiteSettings } from "@/features/settings/types";

export function SettingsForm({ settings }: { settings: PublicSiteSettings }) {
  return (
    <form action={saveSiteSettingsAction} className="grid gap-5 pb-24">
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Thương hiệu và hero</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Nội dung công khai cơ bản; không nhập khóa bí mật hoặc dữ liệu khách hàng.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tên website" htmlFor="site_name">
            <Input
              id="site_name"
              name="site_name"
              defaultValue={settings.site_name}
              minLength={2}
              maxLength={80}
              required
            />
          </Field>
          <Field label="Tagline" htmlFor="tagline">
            <Input
              id="tagline"
              name="tagline"
              defaultValue={settings.tagline}
              minLength={2}
              maxLength={160}
              required
            />
          </Field>
        </div>
        <Field label="Tiêu đề hero" htmlFor="hero_title">
          <Input
            id="hero_title"
            name="hero_title"
            defaultValue={settings.hero_title}
            minLength={2}
            maxLength={120}
            required
          />
        </Field>
        <Field label="Mô tả hero" htmlFor="hero_subtitle">
          <Textarea
            id="hero_subtitle"
            name="hero_subtitle"
            defaultValue={settings.hero_subtitle}
            minLength={10}
            maxLength={300}
            required
          />
        </Field>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Liên hệ</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Chỉ thông tin được phép hiển thị công khai trên website.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Hotline" htmlFor="hotline">
            <Input
              id="hotline"
              name="hotline"
              type="tel"
              defaultValue={settings.hotline ?? ""}
              maxLength={30}
              placeholder="Ví dụ: 09xx xxx xxx"
            />
          </Field>
          <Field label="Địa chỉ" htmlFor="address">
            <Input
              id="address"
              name="address"
              defaultValue={settings.address ?? ""}
              maxLength={300}
              placeholder="Tà Xùa, Bắc Yên, Sơn La"
            />
          </Field>
        </div>
        <Field label="Google Maps URL" htmlFor="google_maps_url" hint="Chỉ chấp nhận URL HTTPS.">
          <Input
            id="google_maps_url"
            name="google_maps_url"
            type="url"
            inputMode="url"
            defaultValue={settings.google_maps_url ?? ""}
            maxLength={2048}
            placeholder="https://maps.google.com/..."
          />
        </Field>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Kênh mạng xã hội</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Để trống kênh chưa sử dụng.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Zalo URL" htmlFor="zalo_url">
            <Input
              id="zalo_url"
              name="zalo_url"
              type="url"
              inputMode="url"
              defaultValue={settings.zalo_url ?? ""}
              maxLength={2048}
              placeholder="https://zalo.me/..."
            />
          </Field>
          <Field label="Facebook URL" htmlFor="facebook_url">
            <Input
              id="facebook_url"
              name="facebook_url"
              type="url"
              inputMode="url"
              defaultValue={settings.facebook_url ?? ""}
              maxLength={2048}
              placeholder="https://facebook.com/..."
            />
          </Field>
          <Field label="TikTok URL" htmlFor="tiktok_url">
            <Input
              id="tiktok_url"
              name="tiktok_url"
              type="url"
              inputMode="url"
              defaultValue={settings.tiktok_url ?? ""}
              maxLength={2048}
              placeholder="https://tiktok.com/@..."
            />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Thông báo công khai</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Banner chỉ xuất hiện khi vừa bật hiển thị vừa có nội dung.
          </p>
        </div>
        <Field label="Nội dung" htmlFor="announcement">
          <Textarea
            id="announcement"
            name="announcement"
            defaultValue={settings.announcement ?? ""}
            maxLength={300}
          />
        </Field>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-pine-soft px-4 text-sm font-bold text-pine">
          <input
            name="announcement_enabled"
            type="checkbox"
            defaultChecked={settings.announcement_enabled}
            className="size-5 accent-pine"
          />
          Hiển thị thông báo trên trang chủ
        </label>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl justify-end">
          <SubmitButton label="Lưu cấu hình" />
        </div>
      </div>
    </form>
  );
}
