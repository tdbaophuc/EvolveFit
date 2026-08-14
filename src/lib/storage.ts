import { initialState, type AppState } from "./seed";

const key = "evolvefit-state-v1";

export function loadState(): AppState {
  if (typeof window === "undefined") return initialState;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...initialState,
      ...parsed,
      profile: { ...initialState.profile, ...parsed.profile },
      hydrationLogs: parsed.hydrationLogs ?? initialState.hydrationLogs,
      supplements: parsed.supplements ?? initialState.supplements,
      supplementLogs: parsed.supplementLogs ?? initialState.supplementLogs,
      quickAmounts: parsed.quickAmounts ?? initialState.quickAmounts,
      workoutExercises: parsed.workoutExercises ?? initialState.workoutExercises,
      workoutSets: parsed.workoutSets ?? initialState.workoutSets,
      bodyMetrics: parsed.bodyMetrics ?? initialState.bodyMetrics
    };
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(state));
}

export function resetState(): AppState {
  if (typeof window !== "undefined") window.localStorage.removeItem(key);
  return initialState;
}
