"use client";

import React, { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Droplets, Pill } from "lucide-react";
import { Button, EmptyState, Sheet } from "@/components/ui";
import { OnboardingPanel } from "@/app/_features/onboarding/onboarding-panel";
import { undo, useAppStore } from "@/lib/store/app-store";
import { MergeDecisionDialog } from "../auth/merge-dialog";
import { SessionExpiredBanner } from "../auth/session-banner";
import { useAuthStore } from "../auth/store";
import { logCreatine, logWater } from "../hydration/actions";
import { selectHydration } from "../hydration/selectors";
import { useOnboardingScreen } from "../onboarding/use-onboarding-screen";
import { syncStatusOf, useOnline } from "../sync/engine";
import { useWorkoutUi } from "../workout/ui-store";
import { useAppEffects } from "./app-effects";
import { useNavigate, type AppRoute } from "./navigation";
import { BottomNav, SyncPill, Toast, TopBar } from "./shell";

const routes: AppRoute[] = ["today", "hydration", "workout", "routines", "library", "progress", "settings"];

export function activeRouteFor(pathname: string | null): AppRoute {
  const segment = (pathname ?? "/").split("/")[1] as AppRoute;
  return routes.includes(segment) ? segment : "today";
}

function OnboardingScreen() {
  return <OnboardingPanel {...useOnboardingScreen()} />;
}

function RemindersSheet(props: { open: boolean; onClose: () => void; hydration: boolean; creatine: boolean; creatineAmount: number }) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title="Nhắc nhở" description="Những việc đến giờ làm hôm nay.">
      <div className="grid gap-3">
        {props.hydration && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-3">
            <span className="inline-flex items-center gap-2 text-[15px]">
              <Droplets size={18} className="text-secondary" aria-hidden /> Đến giờ uống nước
            </span>
            <Button size="sm" onClick={() => logWater(250)}>
              +250ml
            </Button>
          </div>
        )}
        {props.creatine && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 p-3">
            <span className="inline-flex items-center gap-2 text-[15px]">
              <Pill size={18} className="text-warning" aria-hidden /> Đến giờ creatine
            </span>
            <Button size="sm" onClick={() => logCreatine(props.creatineAmount)}>
              Đã uống
            </Button>
          </div>
        )}
        {!props.hydration && !props.creatine && <EmptyState title="Không có nhắc nhở" description="Bạn đã làm đủ những việc đến giờ." />}
      </div>
    </Sheet>
  );
}

/** Persistent app frame: mounted once by app/(app)/layout.tsx, pages render inside it. */
export function AppShell({ children }: { children: ReactNode }) {
  useAppEffects();
  const state = useAppStore((store) => store.state);
  const toast = useAppStore((store) => store.toast);
  const account = useAppStore((store) => store.account);
  const sessionExpired = useAuthStore((store) => store.sessionExpired);
  const workoutMode = useWorkoutUi((store) => store.mode);
  const online = useOnline();
  const navigate = useNavigate();
  const pathname = usePathname();
  const active = activeRouteFor(pathname);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const now = new Date();
  const { hydrationReminder, creatineReminder } = selectHydration(state, now);
  const onboarded = state.profile.onboardingCompleted;
  const syncStatus = syncStatusOf(state.syncQueue, online, { signedIn: Boolean(account), expired: sessionExpired });
  // During a live session the workout screen shows its own sticky action bar instead of the nav (spec 9.3).
  const showNavigation = onboarded && !(active === "workout" && workoutMode === "live");

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <TopBar
        now={now}
        hasReminder={hydrationReminder || creatineReminder}
        settingsActive={active === "settings"}
        onOpenSettings={() => navigate("settings")}
        onOpenReminders={() => setRemindersOpen(true)}
      />
      <SyncPill status={syncStatus} />
      <main className={showNavigation ? "mx-auto w-full max-w-md px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3" : "mx-auto w-full max-w-md px-4 pb-8 pt-3"}>
        <SessionExpiredBanner returnTo={pathname ?? "/today"} />
        {onboarded ? children : <OnboardingScreen />}
      </main>
      {showNavigation && <BottomNav active={active} onNavigate={navigate} />}
      <Toast message={toast} canUndo={Boolean(state.undo)} onUndo={undo} aboveNav={showNavigation} />
      <RemindersSheet
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        hydration={hydrationReminder}
        creatine={creatineReminder}
        creatineAmount={state.profile.creatineAmountG}
      />
      <MergeDecisionDialog />
    </div>
  );
}
