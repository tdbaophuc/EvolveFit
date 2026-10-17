import { evolveFitApiClient, type ApiFailure } from "@/lib/api-client";
import { commit, currentAccount } from "@/lib/store/app-store";
import { authState } from "../auth/store";
import { syncSelectedDay } from "../routines/actions";
import { cloudStateFrom, mergePulledState } from "./merge";

const minPullIntervalMs = 60_000;
let lastPullAt = 0;
let pulling = false;

export function isUnauthorized(failure: ApiFailure): boolean {
  return failure.status === 401 || failure.errorCode === "unauthorized";
}

export function markSessionExpired() {
  if (currentAccount()) authState().patch({ sessionExpired: true });
}

/** Refreshes the signed-in account's local cache with data saved from other devices. */
export async function pullFromCloud(options: { force?: boolean } = {}): Promise<void> {
  const account = currentAccount();
  const auth = authState();
  if (!account || auth.sessionExpired || auth.cloudMergePreview || pulling) return;
  if (!options.force && Date.now() - lastPullAt < minPullIntervalMs) return;

  pulling = true;
  const epoch = auth.epoch;
  try {
    const result = await evolveFitApiClient.exportAccount();
    lastPullAt = Date.now();
    // Signed out / switched account while the request was in flight.
    if (epoch !== authState().epoch || account !== currentAccount()) return;
    if (!result.ok) {
      if (isUnauthorized(result)) markSessionExpired();
      return;
    }
    const cloud = cloudStateFrom(result.data);
    if (!cloud) return; // malformed export: never let it crash or corrupt local data
    commit((state) => {
      const merged = mergePulledState(state, cloud);
      // Keep the plan/day consistent with merged routines, but never disturb a live session.
      return state.activeWorkoutSessionId ? merged : syncSelectedDay(merged);
    });
  } finally {
    pulling = false;
  }
}

/** Test helper: forget the throttle window. */
export function resetPullThrottle() {
  lastPullAt = 0;
  pulling = false;
}
