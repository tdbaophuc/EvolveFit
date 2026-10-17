"use client";

import React, { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { initialState } from "@evolvefit/shared";
import { Button, FormField, IconButton, InlineNotice } from "@/components/ui";
import { useAppStore } from "@/lib/store/app-store";
import { requestPasswordReset, resetPassword, signInWithEmail, signUpWithEmail } from "./actions";
import { AuthHeading } from "./auth-layout";
import { recoveryTokenFromUrl, safeNextPath } from "./redirect";
import { useAuthStore } from "./store";

/** Email typed during onboarding (guest profile), used to prefill sign-in. */
function guestProfileEmail(): string {
  const { account, state } = useAppStore.getState();
  // Never prefill the sample profile's placeholder email.
  return account || state.profile.email === initialState.profile.email ? "" : state.profile.email;
}

const linkClass = "font-semibold text-primary no-underline hover:underline";

function usePasswordToggle() {
  const [visible, setVisible] = useState(false);
  const toggle = (
    <IconButton
      size="sm"
      label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      icon={visible ? <EyeOff size={18} /> : <Eye size={18} />}
      onClick={() => setVisible((value) => !value)}
    />
  );
  return { type: visible ? "text" : "password", toggle };
}

function SlowServerNotice() {
  const pending = useAuthStore((store) => store.pending);
  const slow = useAuthStore((store) => store.slow);
  if (!pending || !slow) return null;
  return <InlineNotice>Đang kết nối máy chủ… Lần đầu có thể mất tới 1 phút, vui lòng không tắt trang.</InlineNotice>;
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 rounded-xl border border-destructive-border bg-destructive-soft px-3 py-2 text-sm leading-5 text-destructive">
      {message}
    </p>
  );
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const pending = useAuthStore((store) => store.pending);
  const [email, setEmail] = useState(() => params.get("email") ?? guestProfileEmail());
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const passwordField = usePasswordToggle();
  const next = safeNextPath(params.get("next"));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const result = await signInWithEmail(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(next);
  }

  return (
    <>
      <AuthHeading title="Đăng nhập" description="Đồng bộ dữ liệu tập luyện giữa các thiết bị." />
      <form className="grid gap-4" onSubmit={submit} aria-label="Đăng nhập" noValidate>
        <FormField label="Email" type="email" name="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending !== null} required />
        <FormField
          label="Mật khẩu"
          type={passwordField.type}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending !== null}
          trailing={passwordField.toggle}
          required
        />
        <FormError message={error} />
        <Button type="submit" size="lg" fullWidth loading={pending === "sign-in"}>
          {pending === "sign-in" ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
        <SlowServerNotice />
      </form>
      <div className="grid gap-2 text-sm leading-5">
        <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className={linkClass}>
          Quên mật khẩu?
        </Link>
        <p className="m-0 text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className={linkClass}>
            Tạo tài khoản
          </Link>
        </p>
        <Link href="/today" className="text-muted-foreground no-underline hover:text-foreground">
          Tiếp tục không cần tài khoản (chỉ lưu trên máy này)
        </Link>
      </div>
    </>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const pending = useAuthStore((store) => store.pending);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifyEmail, setVerifyEmail] = useState(false);
  const passwordField = usePasswordToggle();
  const next = safeNextPath(params.get("next"));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const result = await signUpWithEmail(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.needsVerification) {
      setVerifyEmail(true);
      return;
    }
    router.replace(next);
  }

  if (verifyEmail) {
    return (
      <section className="grid gap-4" aria-live="polite">
        <MailCheck size={32} className="text-primary" />
        <AuthHeading title="Kiểm tra email của bạn" description={`Chúng tôi đã gửi liên kết xác minh tới ${email}. Mở liên kết rồi quay lại đăng nhập.`} />
        <Link href={`/sign-in?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`} className={linkClass}>
          Đến trang đăng nhập
        </Link>
      </section>
    );
  }

  return (
    <>
      <AuthHeading title="Tạo tài khoản" description="Dữ liệu sẽ được sao lưu và đồng bộ khi bạn đăng nhập." />
      <form className="grid gap-4" onSubmit={submit} aria-label="Tạo tài khoản" noValidate>
        <FormField label="Email" type="email" name="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending !== null} required />
        <FormField
          label="Mật khẩu"
          type={passwordField.type}
          name="new-password"
          autoComplete="new-password"
          hint="Ít nhất 8 ký tự."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending !== null}
          trailing={passwordField.toggle}
          required
        />
        <FormError message={error} />
        <Button type="submit" size="lg" fullWidth loading={pending === "sign-up"}>
          {pending === "sign-up" ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </Button>
        <SlowServerNotice />
      </form>
      <p className="m-0 text-sm leading-5 text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className={linkClass}>
          Đăng nhập
        </Link>
      </p>
    </>
  );
}

export function ForgotPasswordForm() {
  const params = useSearchParams();
  const pending = useAuthStore((store) => store.pending);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const result = await requestPasswordReset(email);
    if (!result.ok) setError(result.error);
    else setSent(result.message ?? "");
  }

  return (
    <>
      <AuthHeading title="Quên mật khẩu" description="Nhập email tài khoản, chúng tôi sẽ gửi liên kết đặt mật khẩu mới." />
      {sent ? (
        <InlineNotice tone="success">{sent}</InlineNotice>
      ) : (
        <form className="grid gap-4" onSubmit={submit} aria-label="Quên mật khẩu" noValidate>
          <FormField label="Email" type="email" name="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending !== null} required />
          <FormError message={error} />
          <Button type="submit" size="lg" fullWidth loading={pending === "reset-request"}>
            Gửi liên kết
          </Button>
          <SlowServerNotice />
        </form>
      )}
      <Link href="/sign-in" className={`${linkClass} text-sm`}>
        Quay lại đăng nhập
      </Link>
    </>
  );
}

export function ResetPasswordForm() {
  const pending = useAuthStore((store) => store.pending);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const passwordField = usePasswordToggle();

  useEffect(() => {
    setToken(recoveryTokenFromUrl(window.location.href));
    // Drop the token from the address bar so it is not kept in history or shared by accident.
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const result = await resetPassword(token ?? "", password);
    if (!result.ok) setError(result.error);
    else setDone(result.message ?? "");
  }

  if (token === undefined) return null;
  if (!token) {
    return (
      <>
        <AuthHeading title="Liên kết không hợp lệ" description="Liên kết đặt lại mật khẩu đã hết hạn hoặc không đúng. Hãy yêu cầu liên kết mới." />
        <Link href="/forgot-password" className={linkClass}>
          Gửi lại liên kết
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Đặt mật khẩu mới" />
      {done ? (
        <>
          <InlineNotice tone="success">{done}</InlineNotice>
          <Link href="/sign-in" className={linkClass}>
            Đăng nhập
          </Link>
        </>
      ) : (
        <form className="grid gap-4" onSubmit={submit} aria-label="Đặt mật khẩu mới" noValidate>
          <FormField
            label="Mật khẩu mới"
            type={passwordField.type}
            name="new-password"
            autoComplete="new-password"
            hint="Ít nhất 8 ký tự."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending !== null}
            trailing={passwordField.toggle}
            required
          />
          <FormError message={error} />
          <Button type="submit" size="lg" fullWidth loading={pending === "reset"}>
            Cập nhật mật khẩu
          </Button>
          <SlowServerNotice />
        </form>
      )}
    </>
  );
}
