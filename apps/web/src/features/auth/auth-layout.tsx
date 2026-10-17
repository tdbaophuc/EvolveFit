"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";

/** Frame for /sign-in, /sign-up, /forgot-password and /reset-password (outside the app shell and onboarding gate). */
export function AuthLayout({ children }: { children: ReactNode }) {
  // Load persisted state (direct visit) and render the forms only afterwards, so prefilled values are ready
  // before the user can type (no async prefill racing with typing).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!useAppStore.getState().hydrated) useAppStore.getState().hydrate();
    setReady(true);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 bg-background px-4 py-6 font-sans text-foreground">
      <div className="flex items-center justify-between">
        <Link href="/today" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground no-underline hover:text-foreground">
          <ArrowLeft size={16} /> Về ứng dụng
        </Link>
        <span className="text-base font-semibold text-primary">EvolveFit</span>
      </div>
      {ready && children}
    </main>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="grid gap-1">
      <h1 className="m-0 text-2xl font-semibold leading-8">{title}</h1>
      {description && <p className="m-0 text-[15px] leading-6 text-muted-foreground">{description}</p>}
    </header>
  );
}
