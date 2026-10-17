"use client";

import React from "react";
import { HydrationDetailView } from "@/app/_features/hydration/hydration-detail";
import { ProgressView } from "@/app/_features/progress/progress-view";
import { SettingsView } from "@/app/_features/settings/settings-view";
import { WorkoutView } from "@/app/_features/workout/workout-view";
import { useHydrationScreen } from "../hydration/use-hydration-screen";
import { useProgressScreen } from "../progress/use-progress-screen";
import { useSettingsScreen } from "../settings/use-settings-screen";
import { useWorkoutScreen } from "../workout/use-workout-screen";

export { TodayScreen } from "../today/today-screen";

export function HydrationScreen() {
  return <HydrationDetailView {...useHydrationScreen()} />;
}

export function WorkoutScreen({ section }: { section: "workout" | "routines" | "library" }) {
  return <WorkoutView {...useWorkoutScreen(section)} section={section} />;
}

export function ProgressScreen() {
  return <ProgressView {...useProgressScreen()} />;
}

export function SettingsScreen() {
  return <SettingsView {...useSettingsScreen()} />;
}
