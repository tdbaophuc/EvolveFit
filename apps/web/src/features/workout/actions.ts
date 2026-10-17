import {
  completeSessionExercise,
  createWorkoutSession,
  cryptoSafeId,
  detectWorkoutSetPrs,
  enqueueSync,
  finishWorkoutSession,
  nextSupersetExerciseIndex,
  normalizeWorkoutSessionQueue,
  parkSessionExercise,
  pauseWorkoutSession,
  reorderSessionExerciseQueue,
  resumeWorkoutSession,
  routineExercisesToWorkoutExercises,
  saveSessionExerciseOrderToRoutine,
  type AppState,
  type WorkoutSession,
  type WorkoutSet
} from "@evolvefit/shared";
import { commit, commitSynced, currentState, notify, withUndo } from "@/lib/store/app-store";
import { nextOpenQueueIndex, selectWorkout } from "./selectors";
import { workoutUi } from "./ui-store";

let prBadgeTimer: ReturnType<typeof setTimeout> | undefined;

function context() {
  const state = currentState();
  return { state, ...selectWorkout(state, new Date()) };
}

function replaceSession(state: AppState, session: WorkoutSession): WorkoutSession[] {
  return state.workoutSessions.map((item) => (item.id === session.id ? session : item));
}

function remainingRestSeconds(restEndsAt: string | undefined) {
  return restEndsAt ? Math.max(0, Math.ceil((new Date(restEndsAt).getTime() - Date.now()) / 1000)) : 0;
}

export function startWorkout() {
  const { state, activeRoutine, activeWorkoutDay } = context();
  if (!state.workoutExercises.length) {
    notify("Thêm hoặc nhập bài tập trước khi bắt đầu buổi tập.");
    return;
  }
  const session = createWorkoutSession({
    routineId: activeRoutine?.id ?? state.activeRoutineId,
    workoutDayId: activeWorkoutDay?.id ?? state.selectedWorkoutDayId,
    sessionName: activeWorkoutDay?.name ?? "Buổi tập",
    sessionExerciseOrder: state.workoutExercises.map((exercise) => exercise.id)
  });
  workoutUi().patch({ mode: "live", restPausedSeconds: null, restNotifiedFor: null });
  commit(
    {
      ...state,
      workoutSessions: [...state.workoutSessions, session],
      activeWorkoutSessionId: session.id,
      activeExerciseIndex: 0,
      restEndsAt: undefined,
      syncQueue: enqueueSync(state.syncQueue, { type: "workout.session.start", payload: session })
    },
    "Bắt đầu buổi tập"
  );
}

export function finishWorkout() {
  const { state, activeWorkoutSession } = context();
  workoutUi().patch({ restPausedSeconds: null });
  if (activeWorkoutSession) {
    const finished = finishWorkoutSession(activeWorkoutSession);
    commitSynced(
      { ...state, workoutSessions: replaceSession(state, finished), activeWorkoutSessionId: undefined, restEndsAt: undefined },
      "workout.session.finish",
      finished,
      "Đã kết thúc buổi tập"
    );
  }
  workoutUi().patch({ mode: "finished" });
}

export function backToPlan() {
  workoutUi().patch({ mode: "plan" });
}

function commitWorkoutSet(completed: WorkoutSet, label: string, message: string) {
  const { state, activeWorkoutSession, activeExercise, completedSetsForActive, activeSessionExercises, currentSessionSets } = context();
  const prs = detectWorkoutSetPrs(state.workoutSets, completed);
  const commitMessage = prs.length ? `PR mới: ${prs.map((pr) => pr.label).join(", ")}` : message;
  const countsTowardTarget = (completed.setType ?? "working") !== "warmup";
  const finishedExercise = countsTowardTarget && completedSetsForActive.length + 1 >= activeExercise.targetSets;
  const completedSession = activeWorkoutSession && finishedExercise ? completeSessionExercise(activeWorkoutSession, activeExercise.id) : activeWorkoutSession;
  const supersetIndex =
    countsTowardTarget && !finishedExercise
      ? nextSupersetExerciseIndex({
          exercises: activeWorkoutSession ? activeSessionExercises : state.workoutExercises,
          currentIndex: state.activeExerciseIndex,
          sets: currentSessionSets.concat(completed)
        })
      : undefined;
  const nextExerciseIndex =
    completedSession && finishedExercise ? nextOpenQueueIndex(completedSession.exerciseQueue, state.activeExerciseIndex) : (supersetIndex ?? state.activeExerciseIndex);
  const shouldFinishSession = Boolean(completedSession && finishedExercise && nextExerciseIndex < 0);
  const restEndsAt = new Date(Date.now() + activeExercise.restSeconds * 1000).toISOString();

  workoutUi().patch({
    ...(shouldFinishSession ? { mode: "finished" as const } : {}),
    restPausedSeconds: null,
    restNotifiedFor: null,
    nowMs: Date.now(),
    livePrBadges: prs
  });
  if (prs.length) {
    clearTimeout(prBadgeTimer);
    prBadgeTimer = setTimeout(() => workoutUi().patch({ livePrBadges: [] }), 8000);
  }

  const finishedSession = shouldFinishSession && completedSession ? finishWorkoutSession(completedSession) : undefined;
  withUndo(
    {
      ...state,
      workoutSets: [...state.workoutSets, completed],
      workoutSessions: finishedSession
        ? replaceSession(state, finishedSession)
        : completedSession
          ? replaceSession(state, completedSession)
          : state.workoutSessions,
      activeWorkoutSessionId: finishedSession ? undefined : state.activeWorkoutSessionId,
      activeExerciseIndex: Math.max(0, nextExerciseIndex),
      restEndsAt: finishedSession ? undefined : restEndsAt,
      syncQueue: enqueueSync(state.syncQueue, { type: label === "skip set" ? "workout.set.skip" : "workout.set.create", payload: completed })
    },
    label,
    commitMessage
  );
}

export function completeSet() {
  const { state, activeWorkoutSession, activeExercise, completedSetsForActive } = context();
  if (!state.workoutExercises.length) {
    notify("Thêm hoặc nhập bài tập trước khi ghi set.");
    return;
  }
  if (!activeWorkoutSession) {
    startWorkout();
    return;
  }
  const { setType, setWeight, setReps, setRpe } = workoutUi();
  commitWorkoutSet(
    {
      id: cryptoSafeId(),
      sessionId: activeWorkoutSession.id,
      exerciseId: activeExercise.id,
      exerciseName: activeExercise.name,
      targetWeightKg: activeExercise.targetWeightKg,
      targetReps: activeExercise.targetRepsMin,
      setType,
      actualWeightKg: setWeight,
      actualReps: setReps,
      rpe: setRpe,
      completedAt: new Date().toISOString()
    },
    "set",
    `Hoàn thành ${setType} set ${completedSetsForActive.length + 1}`
  );
}

export function skipCurrentSet() {
  const { state, activeWorkoutSession, activeExercise, completedSetsForActive } = context();
  if (!state.workoutExercises.length) return;
  if (!activeWorkoutSession) {
    startWorkout();
    return;
  }
  commitWorkoutSet(
    {
      id: cryptoSafeId(),
      sessionId: activeWorkoutSession.id,
      exerciseId: activeExercise.id,
      exerciseName: activeExercise.name,
      targetWeightKg: activeExercise.targetWeightKg,
      targetReps: activeExercise.targetRepsMin,
      setType: "working",
      actualWeightKg: activeExercise.targetWeightKg,
      actualReps: 0,
      completedAt: new Date().toISOString()
    },
    "skip set",
    `Đã bỏ qua set ${completedSetsForActive.length + 1}`
  );
}

export function updateWorkoutSet(id: string, patch: Partial<WorkoutSet>) {
  const state = currentState();
  withUndo(
    {
      ...state,
      workoutSets: state.workoutSets.map((set) => (set.id === id ? { ...set, ...patch } : set)),
      syncQueue: enqueueSync(state.syncQueue, { type: "workout.set.patch", payload: { id, patch } })
    },
    "edit set",
    "Đã cập nhật set"
  );
}

export function deleteWorkoutSet(id: string) {
  const state = currentState();
  withUndo(
    { ...state, workoutSets: state.workoutSets.filter((set) => set.id !== id), syncQueue: enqueueSync(state.syncQueue, { type: "workout.set.delete", payload: { id } }) },
    "delete set",
    "Đã xóa set"
  );
}

export function selectWorkoutExercise(id: string) {
  const { state, activeWorkoutSession, activeSessionQueue } = context();
  const index = activeWorkoutSession ? activeSessionQueue.findIndex((item) => item.exerciseId === id) : state.workoutExercises.findIndex((exercise) => exercise.id === id);
  if (index < 0) return;
  commitSynced({ ...state, activeExerciseIndex: index }, "workout.session.selectExercise", { id }, "Đã chọn bài tập");
}

export function skipActiveExercise() {
  const { state, activeWorkoutSession, activeExercise } = context();
  if (!activeWorkoutSession) {
    const nextIndex = Math.min(state.activeExerciseIndex + 1, state.workoutExercises.length - 1);
    commitSynced({ ...state, activeExerciseIndex: nextIndex }, "workout.session.skipExercise", { from: activeExercise.id }, "Đã bỏ qua bài tập");
    return;
  }
  const parked = parkSessionExercise(activeWorkoutSession, activeExercise.id);
  const nextIndex = Math.min(state.activeExerciseIndex, Math.max(0, parked.exerciseQueue.length - 1));
  commitSynced(
    { ...state, workoutSessions: replaceSession(state, parked), activeExerciseIndex: nextIndex },
    "workout.session.skipExercise",
    { sessionId: activeWorkoutSession.id, from: activeExercise.id, queue: parked.exerciseQueue },
    "Đã bỏ qua bài tập"
  );
}

export function reorderSessionExercise(id: string, direction: -1 | 1) {
  const { state, activeWorkoutSession, activeExercise } = context();
  if (!activeWorkoutSession) return;
  const reordered = reorderSessionExerciseQueue(activeWorkoutSession, id, direction);
  const activeIndex = reordered.exerciseQueue.findIndex((item) => item.exerciseId === activeExercise.id);
  commitSynced(
    { ...state, workoutSessions: replaceSession(state, reordered), activeExerciseIndex: Math.max(0, activeIndex) },
    "workout.session.reorder",
    { sessionId: activeWorkoutSession.id, queue: reordered.exerciseQueue },
    "Đã cập nhật hàng đợi buổi tập"
  );
}

export function saveWorkoutOrderToRoutine() {
  const { state, activeRoutine, activeWorkoutSession } = context();
  if (!activeRoutine || !activeWorkoutSession) return;
  const normalizedSession = normalizeWorkoutSessionQueue(activeWorkoutSession);
  const updatedRoutine = saveSessionExerciseOrderToRoutine(activeRoutine, activeWorkoutSession.workoutDayId, normalizedSession.exerciseQueue);
  const updatedDay = updatedRoutine.days.find((day) => day.id === activeWorkoutSession.workoutDayId);
  commitSynced(
    {
      ...state,
      activeTemplate: "custom",
      routines: state.routines.map((routine) => (routine.id === updatedRoutine.id ? updatedRoutine : routine)),
      workoutExercises: updatedDay ? routineExercisesToWorkoutExercises(updatedDay.exercises) : state.workoutExercises
    },
    "routine.saveSessionOrder",
    { routineId: updatedRoutine.id, workoutDayId: activeWorkoutSession.workoutDayId, queue: normalizedSession.exerciseQueue },
    "Đã lưu thứ tự buổi tập vào lịch"
  );
}

// --- Rest timer -----------------------------------------------------------------------------------

export function pauseRestTimer() {
  const { state, activeWorkoutSession } = context();
  if (state.restEndsAt) workoutUi().patch({ restPausedSeconds: remainingRestSeconds(state.restEndsAt) });
  if (activeWorkoutSession) {
    const paused = pauseWorkoutSession(activeWorkoutSession);
    commitSynced({ ...state, workoutSessions: replaceSession(state, paused) }, "workout.session.pause", paused, "Đã tạm dừng buổi tập");
  }
}

export function resumeRestTimer() {
  const { state, activeWorkoutSession } = context();
  const { restPausedSeconds } = workoutUi();
  if (!activeWorkoutSession && restPausedSeconds === null) return;
  workoutUi().patch({ restNotifiedFor: null });
  const nextState = {
    ...state,
    workoutSessions: activeWorkoutSession ? replaceSession(state, resumeWorkoutSession(activeWorkoutSession)) : state.workoutSessions,
    restEndsAt: restPausedSeconds !== null ? new Date(Date.now() + restPausedSeconds * 1000).toISOString() : state.restEndsAt
  };
  if (activeWorkoutSession) commitSynced(nextState, "workout.session.resume", resumeWorkoutSession(activeWorkoutSession), "Đã tiếp tục buổi tập");
  else commit(nextState, "Đã tiếp tục đồng hồ nghỉ");
  workoutUi().patch({ restPausedSeconds: null, nowMs: Date.now() });
}

export function adjustRestTimer(deltaSeconds: number) {
  const { restPausedSeconds } = workoutUi();
  if (restPausedSeconds !== null) {
    workoutUi().patch({ restPausedSeconds: Math.max(0, restPausedSeconds + deltaSeconds) });
    return;
  }
  const nextRemaining = Math.max(0, remainingRestSeconds(currentState().restEndsAt) + deltaSeconds);
  workoutUi().patch({ restNotifiedFor: null });
  commit((state) => ({ ...state, restEndsAt: nextRemaining ? new Date(Date.now() + nextRemaining * 1000).toISOString() : undefined }), "Đã chỉnh thời gian nghỉ");
  workoutUi().patch({ nowMs: Date.now() });
}

export function resetRestTimer() {
  const { activeExercise } = context();
  workoutUi().patch({ restPausedSeconds: null, restNotifiedFor: null });
  commit((state) => ({ ...state, restEndsAt: new Date(Date.now() + activeExercise.restSeconds * 1000).toISOString() }), "Đã đặt lại thời gian nghỉ");
  workoutUi().patch({ nowMs: Date.now() });
}
