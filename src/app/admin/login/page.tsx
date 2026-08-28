import { House } from "lucide-react";
import { loginAction } from "@/features/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const messages: Record<string, string> = {
  invalid: "Email hoặc mật khẩu chưa hợp lệ.",
  credentials: "Thông tin đăng nhập không đúng.",
  forbidden: "Tài khoản chưa có role admin/staff.",
  config: "Supabase dành riêng cho Stay chưa được cấu hình.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = (await searchParams).error;
  const configured = isSupabaseConfigured();

  return (
    <main className="grid min-h-dvh place-items-center bg-pine px-4 py-8">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-pine text-white">
            <House aria-hidden="true" />
          </span>
          <div>
            <p className="font-display font-bold tracking-[0.08em] text-pine">TÀ XÙA STAY</p>
            <p className="text-sm text-muted">Admin / staff</p>
          </div>
        </div>
        <h1 className="mt-7 font-display text-3xl font-bold text-ink">Đăng nhập quản trị</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Dùng tài khoản Supabase Auth của Stay đã được gán role trong app metadata.
        </p>
        {error && messages[error] ? (
          <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-danger" role="alert">
            {messages[error]}
          </p>
        ) : null}
        {!configured ? (
          <p className="mt-4 rounded-2xl bg-copper/10 p-3 text-sm leading-6 text-copper-strong" role="status">
            Chưa có kết nối Supabase Stay. Hãy cấu hình các biến trong `.env.example` trước khi
            đăng nhập.
          </p>
        ) : null}
        <form action={loginAction} className="mt-6 grid gap-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Mật khẩu" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </Field>
          <Button type="submit" size="lg" disabled={!configured}>
            Đăng nhập
          </Button>
        </form>
      </Card>
    </main>
  );
}
