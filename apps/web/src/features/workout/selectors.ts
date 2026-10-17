import {
  coachV2Recommendation,
  isWorkingVolumeSet,
  normalizeWorkoutSessionQueue,
  selectedWorkoutDay,
  type AppState,
  type RecommendationHistoryItem,
  type SessionExerciseQueueItem,
  type WorkoutExercise
} from "@evolvefit/shared";

const emptyExercise: WorkoutExercise = {
  id: "empty-exercise",
  name: "No exercise selected",
  muscleGroup: "Routine",
  targetSets: 1,
  targetRepsMin: 1,
  targetRepsMax: 1,
  targetWeightKg: 0,
  restSeconds: 60,
  lastSession: "Import or add an exercise to start."
};

/** Active routine/day/session and the exercise currently being trained. */
export function selectWorkout(state: AppState, now: Date) {
  const activeRoutine = state.routines.find((routine) => routine.id === state.activeRoutineId) ?? state.routines[0];
  const activeWorkoutDay =
    activeRoutine?.days.find((day) => day.id === state.selectedWorkoutDayId) ?? selectedWorkoutDay(activeRoutine, now) ?? activeRoutine?.days[0];
  const activeWorkoutSession = state.workoutSessions.find((session) => session.id === state.activeWorkoutSessionId);
  const currentSessionSets = activeWorkoutSession ? state.workoutSets.filter((set) => set.sessionId === activeWorkoutSession.id) : [];
  const activeSessionQueue: SessionExerciseQueueItem[] = activeWorkoutSession
    ? normalizeWorkoutSessionQueue(activeWorkoutSession).exerciseQueue
    : state.workoutExercises.map((exercise) => ({ exerciseId: exercise.id, status: "queued" as const }));
  const activeSessionExercises = activeSessionQueue.flatMap((item) => {
    const exercise = state.workoutExercises.find((entry) => entry.id === item.exerciseId);
    return exercise ? [exercise] : [];
  });
  const activeQueueItem =
    activeSessionQueue[state.activeExerciseIndex] ?? activeSessionQueue.find((item) => item.status !== "completed") ?? activeSessionQueue[0];
  const activeExercise =
    (activeWorkoutSession && activeQueueItem
      ? state.workoutExercises.find((exercise) => exercise.id === activeQueueItem.exerciseId)
      : state.workoutExercises[state.activeExerciseIndex]) ??
    state.workoutExercises[0] ??
    emptyExercise;
  const completedSetsForActive = currentSessionSets.filter((set) => set.exerciseId === activeExercise.id && (set.setType ?? "working") !== "warmup");
  const allSetsForActive = currentSessionSets.filter((set) => set.exerciseId === activeExercise.id);
  const latestWorkoutSession = state.workoutSessions.filter((session) => session.status === "finished").at(-1);
  const latestWorkoutDate = latestWorkoutSession?.endedAt ?? latestWorkoutSession?.startedAt;
  const latestWorkoutFinishedToday = latestWorkoutDate?.slice(0, 10) === now.toISOString().slice(0, 10);
  const workoutProgressPercent = activeWorkoutSession
    ? Math.round((activeSessionQueue.filter((item) => item.status === "completed").length / Math.max(activeSessionQueue.length, 1)) * 100)
    : latestWorkoutFinishedToday
      ? 100
      : 0;

  return {
    activeRoutine,
    activeWorkoutDay,
    activeWorkoutSession,
    currentSessionSets,
    activeSessionQueue,
    activeSessionExercises,
    activeExercise,
    completedSetsForActive,
    allSetsForActive,
    latestWorkoutSession,
    workoutProgressPercent
  };
}

/** Rule-first coach recommendation for the active exercise. */
export function selectActiveRecommendation(state: AppState, now: Date): RecommendationHistoryItem {
  const { activeExercise } = selectWorkout(state, now);
  const recentSets = state.workoutSets.filter((set) => set.exerciseId === activeExercise.id && isWorkingVolumeSet(set)).slice(-activeExercise.targetSets);
  return {
    ...coachV2Recommendation({
      exercise: activeExercise,
      recentSets,
      allSets: state.workoutSets,
      workoutSessions: state.workoutSessions,
      readiness: state.recovery,
      availableEquipment: state.profile.availableEquipment,
      exerciseLibrary: state.exerciseLibrary
    }),
    id: `local-${activeExercise.id}`,
    generatedAt: now.toISOString(),
    exerciseId: activeExercise.id,
    exerciseName: activeExercise.name,
    status: state.recommendationHistory.find((item) => item.exerciseId === activeExercise.id)?.status ?? "pending"
  };
}

export function nextOpenQueueIndex(queue: SessionExerciseQueueItem[], currentIndex: number): number {
  const afterCurrent = queue.findIndex((item, index) => index > currentIndex && item.status !== "completed");
  if (afterCurrent >= 0) return afterCurrent;
  return queue.findIndex((item) => item.status !== "completed");
}
