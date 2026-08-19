import { normalizeDrinkModules } from "./core";
import { initialState, type AppState } from "./seed";

const key = "evolvefit-state-v1";

export function loadState(): AppState {
  if (typeof window === "undefined") return initialState;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const profile = { ...initialState.profile, ...parsed.profile };
    return {
      ...initialState,
      ...parsed,
      profile,
      recovery: { ...initialState.recovery, ...parsed.recovery },
      notificationSettings: { ...initialState.notificationSettings, ...parsed.notificationSettings },
      hydrationLogs: parsed.hydrationLogs ?? initialState.hydrationLogs,
      drinkModules: normalizeDrinkModules(parsed.drinkModules, profile.waterTargetMl, profile.creatineAmountG),
      supplements: parsed.supplements ?? initialState.supplements,
      supplementLogs: parsed.supplementLogs ?? initialState.supplementLogs,
      quickAmounts: parsed.quickAmounts ?? initialState.quickAmounts,
      workoutExercises: parsed.workoutExercises ?? initialState.workoutExercises,
      workoutSets: parsed.workoutSets ?? initialState.workoutSets,
      bodyMetrics: parsed.bodyMetrics ?? initialState.bodyMetrics,
      activeTemplate: parsed.activeTemplate ?? initialState.activeTemplate,
      recommendationDecisions: parsed.recommendationDecisions ?? initialState.recommendationDecisions,
      syncQueue: parsed.syncQueue ?? initialState.syncQueue
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
