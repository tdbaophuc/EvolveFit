import { mergeLocalDataIntoCloud, type AppState } from "@evolvefit/shared";

/**
 * Merges data pulled from the cloud into the local cache of the same account.
 *
 * Only resource collections the API persists are taken from the cloud; everything else (notification and
 * plate settings, drink modules, social settings, the pending sync queue and live-workout state) stays local,
 * because the server answers those with defaults. Items are merged by id and the fresher copy wins, so
 * pending local edits are never overwritten.
 *
 * Known limitation: a deletion made on another device does not remove the item here yet (union by id).
 */
export function mergePulledState(local: AppState, cloud: AppState): AppState {
  const merged = mergeLocalDataIntoCloud(local, cloud);
  return {
    ...local,
    hydrationLogs: merged.hydrationLogs,
    supplementLogs: merged.supplementLogs,
    workoutSets: merged.workoutSets,
    workoutSessions: merged.workoutSessions,
    routines: merged.routines,
    exerciseLibrary: merged.exerciseLibrary,
    bodyMetrics: merged.bodyMetrics,
    recommendationHistory: merged.recommendationHistory,
    recommendationDecisions: merged.recommendationDecisions
  };
}

/** Starts an account from cloud data while keeping the device's own preferences and onboarding status. */
export function adoptCloudState(local: AppState, cloud: AppState, profile: Pick<AppState["profile"], "email" | "authMode">, onboarded: boolean): AppState {
  return {
    ...cloud,
    profile: {
      ...cloud.profile,
      email: profile.email,
      authMode: profile.authMode,
      onboardingCompleted: onboarded || local.profile.onboardingCompleted || cloud.profile.onboardingCompleted
    },
    notificationSettings: local.notificationSettings,
    plateSettings: local.plateSettings,
    syncQueue: [],
    undo: undefined
  };
}
