"use client";

import { latestBodyMetric, type HydrationLog } from "@evolvefit/shared";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigate } from "../app/navigation";
import { logCreatine, logWater } from "../hydration/actions";
import { selectHydration } from "../hydration/selectors";
import { selectWorkout } from "../workout/selectors";

export type TodayScreenModel = {
  workout: { title: string; exerciseCount: number; progressPercent: number; inProgress: boolean; hasPlan: boolean };
  water: { total: number; target: number; percent: number; pace: "ahead" | "on-pace" | "behind" };
  creatine: { active: boolean; logged: boolean; amount: number };
  todayLogs: HydrationLog[];
  latestWeightKg?: number;
  startWorkout: () => void;
  openSchedule: () => void;
  openHydration: () => void;
  logWater: (amountMl: number) => void;
  logCreatine: () => void;
};

export function useTodayScreen(): TodayScreenModel {
  const state = useAppStore((store) => store.state);
  const navigate = useNavigate();
  const now = new Date();
  const hydration = selectHydration(state, now);
  const workout = selectWorkout(state, now);
  const today = now.toISOString().slice(0, 10);

  return {
    workout: {
      title: workout.activeWorkoutDay?.name ?? "Chưa có buổi tập hôm nay",
      exerciseCount: state.workoutExercises.length,
      progressPercent: workout.workoutProgressPercent,
      inProgress: Boolean(workout.activeWorkoutSession),
      hasPlan: state.workoutExercises.length > 0
    },
    water: { total: hydration.totalWater, target: state.profile.waterTargetMl, percent: hydration.percent, pace: hydration.pace },
    creatine: { active: hydration.creatineActive, logged: hydration.creatineLogged, amount: state.profile.creatineAmountG },
    todayLogs: hydration.activeHydrationLogs.filter((log) => log.loggedAt.startsWith(today)).reverse(),
    latestWeightKg: latestBodyMetric(state.bodyMetrics)?.weightKg,
    startWorkout: () => navigate("workout"),
    openSchedule: () => navigate("routines"),
    openHydration: () => navigate("hydration"),
    logWater: (amountMl) => logWater(amountMl, false, "water"),
    logCreatine: () => logCreatine(state.profile.creatineAmountG)
  };
}
