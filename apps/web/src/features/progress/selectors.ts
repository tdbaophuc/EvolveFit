import {
  bodyWeightDelta,
  buildBadgeSharePreview,
  buildProgressDashboard,
  buildProgressReports,
  buildWorkoutSummarySharePreview,
  estimatedOneRepMax,
  isDrinkModuleActive,
  isWorkingVolumeSet,
  latestBodyMetric,
  normalizeDrinkModules,
  privateFriendLeaderboard,
  workingSetVolumeKg,
  type AppState,
  type WorkoutSet
} from "@evolvefit/shared";

export function selectProgress(state: AppState, now: Date) {
  const drinkModules = normalizeDrinkModules(state.drinkModules, state.profile.waterTargetMl, state.profile.creatineAmountG);
  const progressDashboard = buildProgressDashboard({
    hydrationLogs: state.hydrationLogs,
    waterTargetMl: state.profile.waterTargetMl,
    supplementLogs: state.supplementLogs,
    creatineEnabled: isDrinkModuleActive(drinkModules, "creatine"),
    workoutSessions: state.workoutSessions,
    workoutSets: state.workoutSets,
    workoutExercises: state.workoutExercises,
    now
  });
  const progressReports = buildProgressReports({
    hydrationLogs: state.hydrationLogs,
    waterTargetMl: state.profile.waterTargetMl,
    workoutSessions: state.workoutSessions,
    workoutSets: state.workoutSets,
    workoutExercises: state.workoutExercises,
    hydrationEnabled: isDrinkModuleActive(drinkModules, "water"),
    workoutEnabled: state.workoutExercises.length > 0,
    volumeEnabled: state.workoutExercises.length > 0,
    now
  });
  const achievements = progressReports.monthly.badges.filter((badge) => badge.status !== "disabled");
  const topBadge = achievements.find((badge) => badge.status === "active") ?? achievements[0];
  const socialLeaderboard = privateFriendLeaderboard({
    profileName: state.profile.name,
    friends: state.friends,
    enabled: state.socialPrivacy.friendLeaderboardEnabled,
    myScore: progressDashboard.hydration30.goalHitRate + progressDashboard.workoutCount30 * 5,
    myBadgeStreakMonths: Math.max(0, ...achievements.map((badge) => badge.streakMonths))
  });
  const latestWorkoutSession = state.workoutSessions.filter((session) => session.status === "finished").at(-1);
  const badgeSharePreview = topBadge ? buildBadgeSharePreview({ badge: topBadge, privacy: state.socialPrivacy }) : null;
  const workoutSummarySharePreview = latestWorkoutSession
    ? buildWorkoutSummarySharePreview({
        session: latestWorkoutSession,
        setCount: state.workoutSets.filter((set) => set.sessionId === latestWorkoutSession.id).length,
        totalVolumeKg: workingSetVolumeKg(state.workoutSets.filter((set) => set.sessionId === latestWorkoutSession.id)),
        privacy: state.socialPrivacy
      })
    : null;
  const bestSet = state.workoutSets.filter(isWorkingVolumeSet).reduce<WorkoutSet | undefined>(
    (best, set) => (!best || estimatedOneRepMax(set.actualWeightKg, set.actualReps) > estimatedOneRepMax(best.actualWeightKg, best.actualReps) ? set : best),
    undefined
  );

  return {
    progressDashboard,
    progressReports,
    achievements,
    socialLeaderboard,
    badgeSharePreview,
    workoutSummarySharePreview,
    bestSet,
    latestMetric: latestBodyMetric(state.bodyMetrics),
    weightDelta: bodyWeightDelta(state.bodyMetrics)
  };
}
