"use client";

import React from "react";
import { Activity, Bell, BookOpen, CalendarCheck, CloudOff, Dumbbell, Home, RefreshCw, RotateCcw, TriangleAlert, User } from "lucide-react";
import { cn } from "@/components/ui";
import { formatDateVi, navLabels, syncPillLabel } from "@/lib/i18n/vi";
import type { SyncStatus } from "../sync/engine";
import type { AppRoute } from "./navigation";

const navItems: { id: Exclude<AppRoute, "hydration" | "settings">; icon: typeof Home }[] = [
  { id: "today", icon: Home },
  { id: "workout", icon: Dumbbell },
  { id: "routines", icon: CalendarCheck },
  { id: "library", icon: BookOpen },
  { id: "progress", icon: Activity }
];

/** 56px header: profile/settings on the left, date in the middle, reminders on the right. */
export function TopBar(props: { now: Date; hasReminder: boolean; onOpenSettings: () => void; onOpenReminders: () => void; settingsActive: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between gap-3 px-4">
        <button
          type="button"
          aria-label={navLabels.settings}
          aria-current={props.settingsActive ? "page" : undefined}
          onClick={props.onOpenSettings}
          className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-primary-soft text-primary-soft-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <User size={18} />
        </button>
        <p className="m-0 truncate text-sm font-medium capitalize text-muted-foreground">{formatDateVi(props.now)}</p>
        <button
          type="button"
          aria-label={props.hasReminder ? "Thông báo: có nhắc nhở mới" : "Thông báo"}
          onClick={props.onOpenReminders}
          className="relative flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Bell size={20} />
          {props.hasReminder && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-warning" />}
        </button>
      </div>
    </header>
  );
}

/** Shown under the header only when something needs attention (spec 7: no permanent sync pill). */
export function SyncPill({ status }: { status: SyncStatus }) {
  if (status !== "pending" && status !== "failed" && status !== "offline") return null;
  const Icon = status === "offline" ? CloudOff : status === "failed" ? TriangleAlert : RefreshCw;
  const tone = status === "failed" ? "border-destructive-border bg-destructive-soft text-destructive" : status === "offline" ? "border-border bg-muted text-muted-foreground" : "border-info/30 bg-info-soft text-info-foreground";
  return (
    <div className="mx-auto flex w-full max-w-md justify-center px-4 pt-2">
      <span role="status" className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", tone)}>
        <Icon size={14} aria-hidden /> {syncPillLabel[status]}
      </span>
    </div>
  );
}

/** Five core workflows; settings lives behind the avatar (spec 8). */
export function BottomNav(props: { active: AppRoute; onNavigate: (route: AppRoute) => void }) {
  return (
    <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur">
      <ul className="m-0 mx-auto grid w-full max-w-md list-none grid-cols-5 gap-1 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
        {navItems.map(({ id, icon: Icon }) => {
          const active = props.active === id || (id === "today" && props.active === "hydration");
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => props.onNavigate(id)}
                className={cn(
                  "flex h-14 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-0 text-xs font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  active ? "bg-primary-soft text-primary-soft-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={20} aria-hidden />
                <span>{navLabels[id]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Toast(props: { message: string | null; canUndo: boolean; onUndo: () => void; aboveNav: boolean }) {
  if (!props.message) return null;
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4", props.aboveNav ? "bottom-[calc(88px+env(safe-area-inset-bottom))]" : "bottom-[max(16px,env(safe-area-inset-bottom))]")}>
      <div role="status" aria-live="polite" className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm leading-5 text-background shadow-sheet">
        <span>{props.message}</span>
        {props.canUndo && (
          <button type="button" onClick={props.onUndo} className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border-0 bg-transparent px-2 py-1 font-semibold text-background underline-offset-2 hover:underline">
            <RotateCcw size={14} aria-hidden /> Hoàn tác
          </button>
        )}
      </div>
    </div>
  );
}
