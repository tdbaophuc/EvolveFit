import { create } from "zustand";
import type { WorkoutSetPr, WorkoutSetType } from "@evolvefit/shared";

export type WorkoutMode = "plan" | "live" | "finished";
export type WakeLockStatus = "unknown" | "unsupported" | "active" | "failed";

type WorkoutUiStore = {
  mode: WorkoutMode;
  restPausedSeconds: number | null;
  restNotifiedFor: string | null;
  nowMs: number;
  livePrBadges: WorkoutSetPr[];
  setWeight: number;
  setReps: number;
  setRpe: number;
  setType: WorkoutSetType;
  wakeLockStatus: WakeLockStatus;
  patch: (next: Partial<Omit<WorkoutUiStore, "patch" | "reset">>) => void;
  reset: () => void;
};

const defaults = {
  mode: "plan" as WorkoutMode,
  restPausedSeconds: null,
  restNotifiedFor: null,
  nowMs: Date.now(),
  livePrBadges: [],
  setWeight: 42.5,
  setReps: 8,
  setRpe: 8,
  setType: "working" as WorkoutSetType,
  wakeLockStatus: "unknown" as WakeLockStatus
};

/** In-memory UI state of the live workout; survives client-side navigation between tabs. */
export const useWorkoutUi = create<WorkoutUiStore>((set) => ({
  ...defaults,
  patch: (next) => set(next),
  reset: () => set({ ...defaults, nowMs: Date.now() })
}));

export function workoutUi() {
  return useWorkoutUi.getState();
}

export function restSecondsRemaining(restEndsAt: string | undefined, pausedSeconds: number | null, nowMs: number): number {
  if (pausedSeconds !== null) return pausedSeconds;
  if (!restEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(restEndsAt).getTime() - nowMs) / 1000));
}
