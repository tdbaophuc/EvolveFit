import { initialState, type AppState } from "./seed";

const key = "evolvefit-state-v1";

export function loadState(): AppState {
  if (typeof window === "undefined") return initialState;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return initialState;
    return { ...initialState, ...JSON.parse(raw) };
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
