"use client";

import React, { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppChrome } from "@/app/_features/app-shell/app-chrome";
import type { AppSection } from "@/app/_features/app-shell/app-navigation";
import { OnboardingPanel } from "@/app/_features/onboarding/onboarding-panel";
import { undo, useAppStore } from "@/lib/store/app-store";
import { MergeDecisionDialog } from "../auth/merge-dialog";
import { SessionExpiredBanner } from "../auth/session-banner";
import { useAuthStore } from "../auth/store";
import { selectHydration } from "../hydration/selectors";
import { useOnboardingScreen } from "../onboarding/use-onboarding-screen";
import { syncStatusLabel, syncStatusOf, useOnline } from "../sync/engine";
import { useWorkoutUi } from "../workout/ui-store";
import { useAppEffects } from "./app-effects";
import { useNavigate, type AppRoute } from "./navigation";

const routes: AppRoute[] = ["today", "hydration", "workout", "routines", "library", "progress", "settings"];

export function activeRouteFor(pathname: string | null): AppRoute {
  const segment = (pathname ?? "/").split("/")[1] as AppRoute;
  return routes.includes(segment) ? segment : "today";
}

function OnboardingScreen() {
  return <OnboardingPanel {...useOnboardingScreen()} />;
}

/** Persistent app frame: mounted once by app/(app)/layout.tsx, pages render inside it. */
export function AppShell({ children }: { children: ReactNode }) {
  useAppEffects();
  const state = useAppStore((store) => store.state);
  const toast = useAppStore((store) => store.toast);
  const workoutMode = useWorkoutUi((store) => store.mode);
  const account = useAppStore((store) => store.account);
  const sessionExpired = useAuthStore((store) => store.sessionExpired);
  const online = useOnline();
  const navigate = useNavigate();
  const pathname = usePathname();
  const active = activeRouteFor(pathname);
  const now = new Date();
  const { hydrationReminder, creatineReminder } = selectHydration(state, now);
  const onboarded = state.profile.onboardingCompleted;
  const syncStatus = syncStatusOf(state.syncQueue, online, { signedIn: Boolean(account), expired: sessionExpired });

  return (
    <AppChrome
      active={active}
      hasReminder={hydrationReminder || creatineReminder}
      now={now}
      onNavigate={(section: AppSection) => navigate(section)}
      onUndo={undo}
      showNavigation={onboarded && !(active === "workout" && workoutMode === "live")}
      showUndo={Boolean(state.undo)}
      syncStatus={syncStatus}
      syncStatusLabel={syncStatusLabel(syncStatus)}
      timezone={state.profile.timezone}
      toast={toast}
    >
      <SessionExpiredBanner returnTo={pathname ?? "/today"} />
      {onboarded ? children : <OnboardingScreen />}
      <MergeDecisionDialog />
    </AppChrome>
  );
}
