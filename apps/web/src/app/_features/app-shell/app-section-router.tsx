"use client";

import React, { type ComponentProps } from "react";
import { HydrationDetailView } from "../hydration/hydration-detail";
import { OnboardingPanel } from "../onboarding/onboarding-panel";
import { ProgressView } from "../progress/progress-view";
import { SettingsView } from "../settings/settings-view";
import { TodayOverview } from "../today/today-overview";
import { WorkoutView } from "../workout/workout-view";

export type AppTab = "today" | "hydration" | "workout" | "routines" | "library" | "progress" | "settings";

type WorkoutSection = Extract<AppTab, "workout" | "routines" | "library">;

type AppSectionRouterProps = {
  hydrationProps: ComponentProps<typeof HydrationDetailView>;
  isOnboarded: boolean;
  onboardingProps: ComponentProps<typeof OnboardingPanel>;
  progressProps: ComponentProps<typeof ProgressView>;
  settingsProps: ComponentProps<typeof SettingsView>;
  tab: AppTab;
  todayProps: ComponentProps<typeof TodayOverview>;
  workoutProps: Omit<ComponentProps<typeof WorkoutView>, "section">;
};

function workoutSectionForTab(tab: WorkoutSection): ComponentProps<typeof WorkoutView>["section"] {
  if (tab === "routines") return "routines";
  if (tab === "library") return "library";
  return "workout";
}

export function AppSectionRouter(props: AppSectionRouterProps) {
  if (!props.isOnboarded) {
    return <OnboardingPanel {...props.onboardingProps} />;
  }

  if (props.tab === "today") return <TodayOverview {...props.todayProps} />;
  if (props.tab === "hydration") return <HydrationDetailView {...props.hydrationProps} />;
  if (props.tab === "progress") return <ProgressView {...props.progressProps} />;
  if (props.tab === "settings") return <SettingsView {...props.settingsProps} />;

  return <WorkoutView {...props.workoutProps} section={workoutSectionForTab(props.tab)} />;
}
