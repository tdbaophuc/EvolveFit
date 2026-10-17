"use client";

import { useState, type ComponentProps } from "react";
import { latestBodyMetric } from "@evolvefit/shared";
import type { TodayOverview } from "@/app/_features/today/today-overview";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigate } from "../app/navigation";
import { logCreatine, logWater } from "../hydration/actions";
import { selectHydration } from "../hydration/selectors";
import { selectWorkout } from "../workout/selectors";

export function useTodayScreen(): ComponentProps<typeof TodayOverview> {
  const state = useAppStore((store) => store.state);
  const navigate = useNavigate();
  const [creatineAmount] = useState(5);
  const now = new Date();
  const hydration = selectHydration(state, now);
  const workout = selectWorkout(state, now);

  return {
    totalWater: hydration.totalWater,
    percent: hydration.percent,
    target: state.profile.waterTargetMl,
    pace: hydration.pace,
    creatineAmount,
    logCreatine,
    creatineLogged: hydration.creatineLogged,
    creatineActive: hydration.creatineActive,
    workoutName: workout.activeWorkoutDay?.name ?? "Buổi tập",
    workoutExerciseCount: state.workoutExercises.length,
    workoutProgressPercent: workout.workoutProgressPercent,
    logWater,
    setTab: (tab) => navigate(tab),
    recentLogs: hydration.activeHydrationLogs.slice(-3).reverse(),
    latestMetric: latestBodyMetric(state.bodyMetrics)
  };
}
