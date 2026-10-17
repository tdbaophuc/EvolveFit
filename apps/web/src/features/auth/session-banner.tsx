"use client";

import React from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store/app-store";
import { useAuthStore } from "./store";
import { signInHref } from "./redirect";

/** Explains an expired session without losing data: changes stay queued until the user signs in again. */
export function SessionExpiredBanner({ returnTo }: { returnTo: string }) {
  const expired = useAuthStore((store) => store.sessionExpired);
  const email = useAppStore((store) => store.account);
  if (!expired || !email) return null;
  return (
    <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/40 bg-warning-soft px-3 py-2 text-sm leading-5 text-warning-foreground">
      <span>Phiên đăng nhập của {email} đã hết hạn. Thay đổi vẫn được lưu trên máy và sẽ đồng bộ sau khi bạn đăng nhập lại.</span>
      <Link href={signInHref(returnTo, email)} className="font-semibold text-warning-foreground underline">
        Đăng nhập lại
      </Link>
    </div>
  );
}
