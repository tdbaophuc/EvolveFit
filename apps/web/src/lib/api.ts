import {
  buildProgressReports,
  createWorkoutSession,
  cryptoSafeId,
  finishWorkoutSession,
  hydrationTotal,
  normalizeDrinkModules,
  pauseWorkoutSession,
  progressiveOverloadRecommendation,
  resumeWorkoutSession,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  expectedHydrationByNow,
  isWorkingVolumeSet,
  type HydrationLog,
  type ExerciseDefinition,
  type Friend,
  type RecommendationDecision,
  type RecommendationHistoryItem,
  type Routine,
  type SessionExerciseQueueItem,
  type SupplementLog,
  type SocialPrivacySettings,
  type SharedPost,
  type WorkoutSession,
  type WorkoutSet
} from "@evolvefit/shared";
import { aiCoachRecommendation } from "./integrations";
import { getVapidPublicKey, isWebPushConfigured, sendWebPush, type PushPayload } from "./push";
import { initialState } from "@evolvefit/shared";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const serverState = structuredClone(initialState);
type StoredNotificationSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
  localProfileId: string;
  platform?: string;
  createdAt: string;
};

const notificationSubscriptions: StoredNotificationSubscription[] = [];
let leaderboardVisible = serverState.profile.leaderboardPublic;
const idempotencyResults = new Map<string, ApiResult<unknown>>();

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(error: string): ApiResult<T> {
  return { ok: false, error };
}

export async function readJson<T>(request: Request): Promise<T | undefined> {
  try {
    return (await request.json()) as T;
  } catch {
    return undefined;
  }
}

export function getHydrationToday(date = new Date()) {
  const drinkModules = normalizeDrinkModules(serverState.drinkModules, serverState.profile.waterTargetMl, serverState.profile.creatineAmountG);
  const totalMl = hydrationTotal(serverState.hydrationLogs, date, drinkModules);
  const expectedMl = expectedHydrationByNow(
    serverState.profile.waterTargetMl,
    serverState.profile.wakeHour,
    serverState.profile.sleepHour,
    date
  );

  return ok({
    logs: serverState.hydrationLogs.filter((log) => log.loggedAt.startsWith(date.toISOString().slice(0, 10))),
    totalMl,
    targetMl: serverState.profile.waterTargetMl,
    expectedMl
  });
}

export function logHydration(amountMl: number): ApiResult<HydrationLog> {
  if (!Number.isFinite(amountMl) || amountMl <= 0) return fail("amountMl must be a positive number");

  const log: HydrationLog = {
    id: cryptoSafeId(),
    amountMl,
    drinkType: "water",
    loggedAt: new Date().toISOString()
  };
  serverState.hydrationLogs.push(log);
  return ok(log);
}

export function patchHydrationLog(id: string, amountMl: number): ApiResult<HydrationLog> {
  const log = serverState.hydrationLogs.find((item) => item.id === id);
  if (!log) return fail("hydration log not found");
  if (!Number.isFinite(amountMl) || amountMl <= 0) return fail("amountMl must be a positive number");
  log.amountMl = amountMl;
  return ok(log);
}

export function deleteHydrationLog(id: string): ApiResult<{ id: string }> {
  const index = serverState.hydrationLogs.findIndex((item) => item.id === id);
  if (index < 0) return fail("hydration log not found");
  serverState.hydrationLogs.splice(index, 1);
  return ok({ id });
}

export function listSupplements() {
  return ok(serverState.supplements);
}

export function createSupplement(input: { name: string; defaultAmount: number; unit?: "g" | "mg" | "capsule" }) {
  if (!input.name.trim()) return fail("name is required");
  if (!Number.isFinite(input.defaultAmount) || input.defaultAmount <= 0) return fail("defaultAmount must be positive");

  const supplement = {
    id: cryptoSafeId(),
    name: input.name.trim(),
    defaultAmount: input.defaultAmount,
    unit: input.unit ?? "g",
    scheduleHours: [],
    active: true
  };
  serverState.supplements.push(supplement);
  return ok(supplement);
}

export function logSupplement(input: { name: string; amount: number; unit?: "g" | "mg" | "capsule"; supplementId?: string; status?: "taken" | "skipped"; skippedReason?: string }): ApiResult<SupplementLog> {
  if (!input.name.trim()) return fail("name is required");
  if (input.status !== "skipped" && (!Number.isFinite(input.amount) || input.amount <= 0)) return fail("amount must be positive");

  const log: SupplementLog = {
    id: cryptoSafeId(),
    supplementId: input.supplementId,
    name: input.name.trim(),
    amount: input.amount,
    unit: input.unit ?? "g",
    loggedAt: new Date().toISOString(),
    status: input.status ?? "taken",
    skippedReason: input.skippedReason
  };
  serverState.supplementLogs.push(log);
  return ok(log);
}

export function updateSupplementReminder(id: string, reminderHour: number) {
  const supplement = serverState.supplements.find((item) => item.id === id);
  if (!supplement) return fail("supplement not found");
  if (!Number.isInteger(reminderHour) || reminderHour < 0 || reminderHour > 23) return fail("reminderHour must be 0-23");
  supplement.reminderHour = reminderHour;
  return ok(supplement);
}

export function updateSupplement(id: string, input: { name?: string; defaultAmount?: number; reminderHour?: number; scheduleHours?: number[]; active?: boolean }) {
  const supplement = serverState.supplements.find((item) => item.id === id);
  if (!supplement) return fail("supplement not found");
  if (input.name !== undefined && !input.name.trim()) return fail("name is required");
  if (input.defaultAmount !== undefined && (!Number.isFinite(input.defaultAmount) || input.defaultAmount <= 0)) {
    return fail("defaultAmount must be positive");
  }
  if (input.reminderHour !== undefined && (!Number.isInteger(input.reminderHour) || input.reminderHour < 0 || input.reminderHour > 23)) {
    return fail("reminderHour must be 0-23");
  }
  if (input.scheduleHours !== undefined && input.scheduleHours.some((hour) => !Number.isInteger(hour) || hour < 0 || hour > 23)) {
    return fail("scheduleHours must be 0-23");
  }

  Object.assign(supplement, {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.defaultAmount !== undefined ? { defaultAmount: input.defaultAmount } : {}),
    ...(input.reminderHour !== undefined ? { reminderHour: input.reminderHour } : {}),
    ...(input.scheduleHours !== undefined ? { scheduleHours: [...new Set(input.scheduleHours)].sort((a, b) => a - b) } : {}),
    ...(input.active !== undefined ? { active: input.active } : {})
  });
  return ok(supplement);
}

export function getWorkoutToday() {
  return ok({
    routineName: "Push Day",
    exercises: serverState.workoutExercises,
    sets: serverState.workoutSets
  });
}

export function listRoutines() {
  return ok(serverState.routines);
}

export function createRoutine(input: Partial<Routine>): ApiResult<Routine> {
  if (!input.name?.trim()) return fail("name is required");
  const now = new Date().toISOString();
  const routine: Routine = {
    id: input.id ?? cryptoSafeId(),
    name: input.name.trim(),
    daysPerWeek: input.daysPerWeek ?? input.days?.length ?? 1,
    days: input.days ?? [],
    createdAt: input.createdAt ?? now,
    updatedAt: now
  };
  serverState.routines.push(routine);
  return ok(routine);
}

export function updateRoutine(
  id: string,
  input: Partial<Routine> & { baseUpdatedAt?: string; conflictResolution?: "confirm" }
): ApiResult<Routine | { conflict: true; local: Partial<Routine>; remote: Routine; message: string }> {
  const routine = serverState.routines.find((item) => item.id === id);
  if (!routine) return fail("routine not found");
  if (input.baseUpdatedAt && routine.updatedAt !== input.baseUpdatedAt && input.conflictResolution !== "confirm") {
    return ok({ conflict: true, local: input, remote: routine, message: "Routine changed on server. Preview and confirm before overwriting." });
  }
  if (input.name !== undefined && !input.name.trim()) return fail("name is required");
  Object.assign(routine, {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.daysPerWeek !== undefined ? { daysPerWeek: input.daysPerWeek } : {}),
    ...(input.days !== undefined ? { days: input.days } : {}),
    updatedAt: nextUpdatedAt(routine.updatedAt)
  });
  return ok(routine);
}

function nextUpdatedAt(previous?: string): string {
  const now = Date.now();
  const previousMs = previous ? new Date(previous).getTime() : 0;
  return new Date(Math.max(now, previousMs + 1)).toISOString();
}

export function deleteRoutine(id: string): ApiResult<{ id: string }> {
  const index = serverState.routines.findIndex((item) => item.id === id);
  if (index < 0) return fail("routine not found");
  serverState.routines.splice(index, 1);
  if (serverState.activeRoutineId === id) serverState.activeRoutineId = serverState.routines[0]?.id ?? "";
  return ok({ id });
}

export function listExercises() {
  return ok(serverState.exerciseLibrary);
}

export function createExercise(input: Partial<ExerciseDefinition>): ApiResult<ExerciseDefinition> {
  if (!input.name?.trim()) return fail("name is required");
  const exercise: ExerciseDefinition = {
    id: input.id ?? cryptoSafeId(),
    name: input.name.trim(),
    muscleGroup: input.muscleGroup?.trim() || "General",
    equipment: input.equipment ?? "other",
    movementPattern: input.movementPattern ?? "isolation",
    builtIn: input.builtIn ?? false,
    notes: input.notes
  };
  serverState.exerciseLibrary.push(exercise);
  return ok(exercise);
}

export function updateExercise(id: string, input: Partial<ExerciseDefinition>): ApiResult<ExerciseDefinition> {
  const exercise = serverState.exerciseLibrary.find((item) => item.id === id);
  if (!exercise) return fail("exercise not found");
  if (input.name !== undefined && !input.name.trim()) return fail("name is required");
  Object.assign(exercise, {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.muscleGroup !== undefined ? { muscleGroup: input.muscleGroup.trim() || exercise.muscleGroup } : {}),
    ...(input.equipment !== undefined ? { equipment: input.equipment } : {}),
    ...(input.movementPattern !== undefined ? { movementPattern: input.movementPattern } : {}),
    ...(input.builtIn !== undefined ? { builtIn: input.builtIn } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {})
  });
  return ok(exercise);
}

export function deleteExercise(id: string): ApiResult<{ id: string }> {
  const index = serverState.exerciseLibrary.findIndex((item) => item.id === id);
  if (index < 0) return fail("exercise not found");
  serverState.exerciseLibrary.splice(index, 1);
  return ok({ id });
}

export function startWorkoutSession(input: {
  routineId?: string;
  workoutDayId?: string;
  sessionName?: string;
  sessionExerciseOrder?: string[];
}): ApiResult<WorkoutSession> {
  const routine = serverState.routines.find((item) => item.id === input.routineId) ?? serverState.routines[0];
  const day = routine?.days.find((item) => item.id === input.workoutDayId) ?? routine?.days[0];
  const order = input.sessionExerciseOrder?.length
    ? input.sessionExerciseOrder
    : day?.exercises.map((exercise) => exercise.id) ?? serverState.workoutExercises.map((exercise) => exercise.id);
  const session = createWorkoutSession({
    routineId: routine?.id ?? input.routineId ?? serverState.activeRoutineId,
    workoutDayId: day?.id ?? input.workoutDayId ?? serverState.selectedWorkoutDayId,
    sessionName: input.sessionName ?? day?.name ?? "Workout Session",
    sessionExerciseOrder: order
  });
  serverState.workoutSessions.push(session);
  serverState.activeWorkoutSessionId = session.id;
  return ok(session);
}

export function finishWorkoutSessionById(id: string) {
  return updateWorkoutSessionStatus(id, "finish");
}

export function pauseWorkoutSessionById(id: string) {
  return updateWorkoutSessionStatus(id, "pause");
}

export function resumeWorkoutSessionById(id: string) {
  return updateWorkoutSessionStatus(id, "resume");
}

function updateWorkoutSessionStatus(id: string, action: "finish" | "pause" | "resume"): ApiResult<WorkoutSession> {
  const index = serverState.workoutSessions.findIndex((item) => item.id === id);
  if (index < 0) return fail("workout session not found");
  const current = serverState.workoutSessions[index];
  const next =
    action === "finish"
      ? finishWorkoutSession(current)
      : action === "pause"
        ? pauseWorkoutSession(current)
        : resumeWorkoutSession(current);
  serverState.workoutSessions[index] = next;
  if (action === "finish") serverState.activeWorkoutSessionId = undefined;
  if (action === "resume") serverState.activeWorkoutSessionId = id;
  return ok(next);
}

export function logWorkoutSet(input: Omit<WorkoutSet, "id" | "completedAt">): ApiResult<WorkoutSet> {
  if (!input.exerciseId || !input.exerciseName) return fail("exercise is required");
  const set: WorkoutSet = { ...input, id: cryptoSafeId(), completedAt: new Date().toISOString() };
  serverState.workoutSets.push(set);
  return ok(set);
}

export function createWorkoutSet(input: WorkoutSet | Omit<WorkoutSet, "id" | "completedAt">): ApiResult<WorkoutSet> {
  if (!input.exerciseId || !input.exerciseName) return fail("exercise is required");
  const set: WorkoutSet = {
    ...input,
    id: "id" in input && input.id ? input.id : cryptoSafeId(),
    completedAt: "completedAt" in input && input.completedAt ? input.completedAt : new Date().toISOString()
  };
  const existingIndex = serverState.workoutSets.findIndex((item) => item.id === set.id);
  if (existingIndex >= 0) serverState.workoutSets[existingIndex] = lastWriteWinsWorkoutSet(serverState.workoutSets[existingIndex], set);
  else serverState.workoutSets.push(set);
  return ok(serverState.workoutSets.find((item) => item.id === set.id) ?? set);
}

export function updateWorkoutSet(id: string, patch: Partial<WorkoutSet>): ApiResult<WorkoutSet> {
  const index = serverState.workoutSets.findIndex((item) => item.id === id);
  if (index < 0) return fail("workout set not found");
  const next = { ...serverState.workoutSets[index], ...patch, id };
  serverState.workoutSets[index] = lastWriteWinsWorkoutSet(serverState.workoutSets[index], next);
  return ok(serverState.workoutSets[index]);
}

export function deleteWorkoutSet(id: string): ApiResult<{ id: string }> {
  const index = serverState.workoutSets.findIndex((item) => item.id === id);
  if (index < 0) return fail("workout set not found");
  serverState.workoutSets.splice(index, 1);
  return ok({ id });
}

export function reorderWorkoutSession(id: string, queue: SessionExerciseQueueItem[]): ApiResult<WorkoutSession> {
  const index = serverState.workoutSessions.findIndex((item) => item.id === id);
  if (index < 0) return fail("workout session not found");
  if (!Array.isArray(queue) || queue.some((item) => !item.exerciseId || !["queued", "completed", "parked"].includes(item.status))) {
    return fail("queue must contain valid exercise items");
  }
  const next = { ...serverState.workoutSessions[index], exerciseQueue: queue, sessionExerciseOrder: queue.map((item) => item.exerciseId) };
  serverState.workoutSessions[index] = next;
  return ok(next);
}

export type SyncBatchItem = {
  id?: string;
  type: string;
  payload: unknown;
  idempotencyKey?: string;
};

export type SyncBatchResult = {
  id: string;
  type: string;
  status: "synced" | "conflict" | "failed";
  data?: unknown;
  error?: string;
  conflict?: { kind: "routine"; local: unknown; remote: unknown; message: string };
};

export function syncBatch(input: { items?: SyncBatchItem[]; idempotencyKey?: string }): ApiResult<{ results: SyncBatchResult[] }> {
  if (!Array.isArray(input.items)) return fail("items must be an array");
  const results = input.items.map((item, index) => {
    const key = item.idempotencyKey ?? `${input.idempotencyKey ?? "batch"}:${item.id ?? index}:${item.type}`;
    const cached = idempotencyResults.get(key);
    if (cached && !isConfirmingConflict(item.payload)) return syncResultFromApiResult(item, cached);
    const result = applySyncItem(item);
    idempotencyResults.set(key, result);
    return syncResultFromApiResult(item, result);
  });
  return ok({ results });
}

function isConfirmingConflict(payload: unknown): boolean {
  return Boolean(payload && typeof payload === "object" && (payload as { conflictResolution?: string }).conflictResolution === "confirm");
}

function syncResultFromApiResult(item: SyncBatchItem, result: ApiResult<unknown>): SyncBatchResult {
  if (!result.ok) return { id: item.id ?? item.idempotencyKey ?? item.type, type: item.type, status: "failed", error: result.error };
  const data = result.data as { conflict?: true; local?: unknown; remote?: unknown; message?: string };
  if (data && data.conflict) {
    return {
      id: item.id ?? item.idempotencyKey ?? item.type,
      type: item.type,
      status: "conflict",
      conflict: { kind: "routine", local: data.local, remote: data.remote, message: data.message ?? "Routine conflict" }
    };
  }
  return { id: item.id ?? item.idempotencyKey ?? item.type, type: item.type, status: "synced", data: result.data };
}

function applySyncItem(item: SyncBatchItem): ApiResult<unknown> {
  const payload = item.payload as Record<string, unknown>;
  if (item.type === "hydration.log") return upsertHydrationLog(payload as HydrationLog);
  if (item.type === "hydration.patch") {
    if (payload.amountMl !== undefined) return upsertHydrationLog(payload as HydrationLog);
    const current = serverState.hydrationLogs.find((log) => log.id === payload.id);
    if (!current) return fail("hydration log not found");
    return upsertHydrationLog({
      ...current,
      amountMl: Math.max(50, current.amountMl + Number(payload.deltaMl ?? 0)),
      loggedAt: new Date().toISOString()
    });
  }
  if (item.type === "hydration.delete") return deleteHydrationLog(String(payload.id ?? ""));
  if (item.type === "supplement.log" || item.type === "supplement.skip") return upsertSupplementLog(payload as SupplementLog);
  if (item.type === "workout.set.create" || item.type === "workout.set.skip") return createWorkoutSet(payload as WorkoutSet);
  if (item.type === "workout.set.patch") return updateWorkoutSet(String(payload.id ?? ""), payload.patch as Partial<WorkoutSet>);
  if (item.type === "workout.set.delete") return deleteWorkoutSet(String(payload.id ?? ""));
  if (item.type === "workout.session.start") {
    const session = payload as WorkoutSession;
    if (serverState.workoutSessions.some((existing) => existing.id === session.id)) return ok(session);
    serverState.workoutSessions.push(session);
    return ok(session);
  }
  if (item.type === "workout.session.finish") return finishWorkoutSessionById(String(payload.id ?? ""));
  if (item.type === "workout.session.pause") return pauseWorkoutSessionById(String(payload.id ?? ""));
  if (item.type === "workout.session.resume") return resumeWorkoutSessionById(String(payload.id ?? ""));
  if (item.type === "workout.session.reorder") return reorderWorkoutSession(String(payload.sessionId ?? ""), payload.queue as SessionExerciseQueueItem[]);
  if (item.type === "routine.create") return createRoutine(payload as Partial<Routine>);
  if (item.type === "routine.update" || item.type === "routine.saveSessionOrder") {
    return updateRoutine(String(payload.routineId ?? payload.id ?? ""), {
      ...(payload.routine as Partial<Routine> | undefined),
      ...(payload.patch as Partial<Routine> | undefined),
      baseUpdatedAt: payload.baseUpdatedAt as string | undefined,
      conflictResolution: payload.conflictResolution as "confirm" | undefined
    });
  }
  if (item.type === "routine.delete") return deleteRoutine(String(payload.id ?? payload.routineId ?? ""));
  if (item.type === "exercise.create") return createExercise(payload as Partial<ExerciseDefinition>);
  if (item.type === "exercise.update") return updateExercise(String(payload.id ?? ""), payload.patch as Partial<ExerciseDefinition>);
  if (item.type === "exercise.delete") return deleteExercise(String(payload.id ?? ""));
  if (item.type === "social.privacy.update") {
    serverState.socialPrivacy = { ...serverState.socialPrivacy, ...(payload as Partial<SocialPrivacySettings>) };
    return ok(serverState.socialPrivacy);
  }
  if (item.type === "social.friend.add") {
    const friend = payload as Friend;
    if (!serverState.friends.some((item) => item.id === friend.id)) serverState.friends.push(friend);
    return ok(friend);
  }
  if (item.type === "social.friend.update") {
    const index = serverState.friends.findIndex((friend) => friend.id === payload.id);
    if (index < 0) return fail("friend not found");
    serverState.friends[index] = { ...serverState.friends[index], ...(payload.patch as Partial<Friend>) };
    return ok(serverState.friends[index]);
  }
  if (item.type === "social.share.publish") {
    const post = payload as SharedPost;
    if (!serverState.sharedPosts.some((item) => item.id === post.id)) serverState.sharedPosts.unshift(post);
    return ok(post);
  }
  return fail(`unsupported sync type: ${item.type}`);
}

function upsertHydrationLog(log: HydrationLog): ApiResult<HydrationLog> {
  if (!log.id || !Number.isFinite(log.amountMl) || log.amountMl <= 0) return fail("hydration log is invalid");
  const index = serverState.hydrationLogs.findIndex((item) => item.id === log.id);
  if (index < 0) serverState.hydrationLogs.push(log);
  else if ((log.loggedAt ?? "") >= (serverState.hydrationLogs[index].loggedAt ?? "")) serverState.hydrationLogs[index] = log;
  return ok(serverState.hydrationLogs.find((item) => item.id === log.id) ?? log);
}

function upsertSupplementLog(log: SupplementLog): ApiResult<SupplementLog> {
  if (!log.id || !log.name) return fail("supplement log is invalid");
  const index = serverState.supplementLogs.findIndex((item) => item.id === log.id);
  if (index < 0) serverState.supplementLogs.push(log);
  else if ((log.loggedAt ?? "") >= (serverState.supplementLogs[index].loggedAt ?? "")) serverState.supplementLogs[index] = log;
  return ok(serverState.supplementLogs.find((item) => item.id === log.id) ?? log);
}

function lastWriteWinsWorkoutSet(current: WorkoutSet, next: WorkoutSet): WorkoutSet {
  return (next.completedAt ?? "") >= (current.completedAt ?? "") ? next : current;
}

export function recalculateProgression(exerciseId: string) {
  const exercise = serverState.workoutExercises.find((item) => item.id === exerciseId);
  if (!exercise) return fail("exercise not found");

  const recentSets = serverState.workoutSets.filter((set) => set.exerciseId === exerciseId && isWorkingVolumeSet(set)).slice(-exercise.targetSets);
  return ok(
    progressiveOverloadRecommendation({
      exerciseName: exercise.name,
      targetWeightKg: exercise.targetWeightKg,
      targetRepsMax: exercise.targetRepsMax,
      recentSets: recentSets.length
        ? recentSets
        : [{ actualWeightKg: exercise.targetWeightKg, actualReps: exercise.targetRepsMin, rpe: 8 }]
    })
  );
}

export async function coachRecommend() {
  const exercise = serverState.workoutExercises[serverState.activeExerciseIndex] ?? serverState.workoutExercises[0];
  const recentSets = serverState.workoutSets.filter((set) => set.exerciseId === exercise.id && isWorkingVolumeSet(set)).slice(-exercise.targetSets);
  const recommendation = await aiCoachRecommendation({
    exerciseName: exercise.name,
    targetWeightKg: exercise.targetWeightKg,
    targetRepsMax: exercise.targetRepsMax,
    recentSets,
    recoveryNote: "Local readiness score and soreness can be injected here."
  });
  const historyItem: RecommendationHistoryItem = {
    ...recommendation,
    id: cryptoSafeId(),
    generatedAt: new Date().toISOString(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    status: "pending"
  };
  serverState.recommendationHistory = [historyItem, ...serverState.recommendationHistory].slice(0, 50);
  return ok({ recommendation: historyItem, history: serverState.recommendationHistory });
}

export function coachRecommendationFeedback(input: {
  recommendationId: string;
  decision: RecommendationDecision["decision"];
  feedback?: string;
}) {
  const item = serverState.recommendationHistory.find((recommendation) => recommendation.id === input.recommendationId);
  if (!item) return fail("recommendation not found");
  item.status = input.decision;
  item.feedback = input.feedback;
  const decision: RecommendationDecision = {
    id: cryptoSafeId(),
    recommendationId: item.id,
    title: item.title,
    source: item.source,
    action: item.action,
    nextWeightKg: item.nextWeightKg,
    decision: input.decision,
    reason: item.reason,
    feedback: input.feedback,
    decidedAt: new Date().toISOString()
  };
  serverState.recommendationDecisions = [decision, ...serverState.recommendationDecisions].slice(0, 100);
  return ok({ recommendation: item, decision, history: serverState.recommendationHistory });
}

export function hydrationReminderEvents(date = new Date()) {
  const drinkModules = normalizeDrinkModules(serverState.drinkModules, serverState.profile.waterTargetMl, serverState.profile.creatineAmountG);
  const expectedMl = expectedHydrationByNow(
    serverState.profile.waterTargetMl,
    serverState.profile.wakeHour,
    serverState.profile.sleepHour,
    date
  );
  const totalMl = hydrationTotal(serverState.hydrationLogs, date, drinkModules);
  const lastLogAt = serverState.hydrationLogs.at(-1)?.loggedAt;
  const shouldSend = shouldSendHydrationReminder({
    totalMl,
    expectedMl,
    lastLogAt,
    lastReminderAt: serverState.notificationSettings.lastHydrationReminderAt,
    now: date,
    quietHours: { start: serverState.notificationSettings.quietHoursStart, end: serverState.notificationSettings.quietHoursEnd },
    quietHoursEnabled: serverState.notificationSettings.quietHoursEnabled,
    mode: serverState.notificationSettings.hydrationMode,
    times: serverState.notificationSettings.hydrationTimes,
    intervalHours: serverState.notificationSettings.hydrationIntervalHours,
    snoozeUntil: serverState.notificationSettings.snoozeUntil,
    enabled: serverState.notificationSettings.hydrationEnabled
  });

  return ok({
    shouldSend,
    event: shouldSend
      ? {
          type: "hydration_reminder",
          title: "Uống nước nào",
          body: `Bạn đang ở ${totalMl}/${serverState.profile.waterTargetMl}ml hôm nay.`,
          actions: ["Log 250ml", "Snooze"]
        }
      : null
  });
}

export async function sendHydrationReminderEvents(date = new Date()) {
  const result = hydrationReminderEvents(date);
  if (!result.ok || !result.data.event) return ok({ sent: 0, skipped: true, reason: "no-event" });
  serverState.notificationSettings.lastHydrationReminderAt = date.toISOString();
  const payload = notificationPayload(result.data.event.title, result.data.event.body, "hydration-reminder", [
    { action: "log-water-250", title: "Log 250ml" },
    { action: "snooze", title: "Snooze" }
  ]);
  return sendToSubscriptions(payload);
}

export function creatineReminderEvents(date = new Date()) {
  const shouldSend = shouldSendCreatineReminder({
    logs: serverState.supplementLogs,
    scheduledHour: serverState.profile.creatineHour,
    scheduleHours: serverState.notificationSettings.creatineTimes,
    remindBeforeMinutes: serverState.profile.remindBeforeMinutes,
    lastReminderAt: serverState.notificationSettings.lastCreatineReminderAt,
    now: date,
    quietHours: { start: serverState.notificationSettings.quietHoursStart, end: serverState.notificationSettings.quietHoursEnd },
    quietHoursEnabled: serverState.notificationSettings.quietHoursEnabled,
    mode: serverState.notificationSettings.creatineMode,
    intervalHours: serverState.notificationSettings.creatineIntervalHours,
    snoozeUntil: serverState.notificationSettings.snoozeUntil,
    enabled: serverState.notificationSettings.creatineEnabled
  });

  return ok({
    shouldSend,
    event: shouldSend
      ? {
          type: "creatine_reminder",
          title: "Creatine sắp tới giờ",
          body: `Ghi nhận ${serverState.profile.creatineAmountG}g nếu bạn đã uống.`,
          actions: [`Log ${serverState.profile.creatineAmountG}g`, "Snooze"]
        }
      : null
  });
}

export async function sendCreatineReminderEvents(date = new Date()) {
  const result = creatineReminderEvents(date);
  if (!result.ok || !result.data.event) return ok({ sent: 0, skipped: true, reason: "no-event" });
  serverState.notificationSettings.lastCreatineReminderAt = date.toISOString();
  const payload = notificationPayload(result.data.event.title, result.data.event.body, "creatine-reminder", [
    { action: "log-creatine", title: `Log ${serverState.profile.creatineAmountG}g` },
    { action: "snooze", title: "Snooze" }
  ]);
  return sendToSubscriptions(payload);
}

export function notificationConfig(env: NodeJS.ProcessEnv = process.env) {
  return ok({
    vapidPublicKey: getVapidPublicKey(env),
    configured: isWebPushConfigured(env),
    browserEnv: Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    fallbackMode: isWebPushConfigured(env) ? "web-push" : "in-app"
  });
}

export function notificationStatus(localProfileId = serverState.profile.email || "local-profile", env: NodeJS.ProcessEnv = process.env) {
  return ok({
    configured: isWebPushConfigured(env),
    fallbackMode: isWebPushConfigured(env) ? "web-push" : "in-app",
    subscriptionCount: notificationSubscriptions.filter((subscription) => subscription.localProfileId === localProfileId).length
  });
}

export function subscribeNotifications(input: {
  endpoint?: string;
  p256dh?: string;
  auth?: string;
  keys?: { p256dh?: string; auth?: string };
  userId?: string;
  localProfileId?: string;
  platform?: string;
}) {
  const p256dh = input.p256dh ?? input.keys?.p256dh;
  const auth = input.auth ?? input.keys?.auth;
  if (!input.endpoint || !p256dh || !auth) return fail("endpoint, p256dh, and auth are required");
  const existing = notificationSubscriptions.find((subscription) => subscription.endpoint === input.endpoint);
  if (existing) {
    Object.assign(existing, {
      p256dh,
      auth,
      userId: input.userId ?? existing.userId,
      localProfileId: input.localProfileId ?? existing.localProfileId,
      platform: input.platform ?? existing.platform
    });
    return ok(existing);
  }
  const subscription = {
    endpoint: input.endpoint,
    p256dh,
    auth,
    userId: input.userId,
    localProfileId: input.localProfileId ?? serverState.profile.email ?? "local-profile",
    platform: input.platform,
    createdAt: new Date().toISOString()
  };
  notificationSubscriptions.push(subscription);
  return ok(subscription);
}

export function unsubscribeNotifications(endpoint: string) {
  const index = notificationSubscriptions.findIndex((subscription) => subscription.endpoint === endpoint);
  if (index < 0) return fail("subscription not found");
  notificationSubscriptions.splice(index, 1);
  return ok({ endpoint });
}

export async function sendTestNotification(input: { endpoint?: string; localProfileId?: string }) {
  const payload = notificationPayload("EvolveFit test", "Web Push is ready for this profile.", "test-notification", [
    { action: "log-water-250", title: "Log 250ml" },
    { action: "snooze", title: "Snooze" }
  ]);
  return sendToSubscriptions(payload, input);
}

async function sendToSubscriptions(payload: PushPayload, filter: { endpoint?: string; localProfileId?: string } = {}) {
  let sent = 0;
  let missingEnv = 0;
  const failed: string[] = [];
  const targets = notificationSubscriptions.filter((subscription) => {
    if (filter.endpoint && subscription.endpoint !== filter.endpoint) return false;
    if (filter.localProfileId && subscription.localProfileId !== filter.localProfileId) return false;
    return true;
  });

  if (!targets.length) return ok({ sent, missingEnv, failed, fallback: "in-app", reason: "no-subscriptions" });

  for (const subscription of targets) {
    try {
      const result = await sendWebPush(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth }
        },
        payload
      );
      if (result === "sent") sent += 1;
      if (result === "missing-env") missingEnv += 1;
    } catch {
      failed.push(subscription.endpoint);
    }
  }

  return ok({ sent, missingEnv, failed, fallback: sent > 0 ? null : "in-app" });
}

function notificationPayload(
  title: string,
  body: string,
  tag: string,
  actions: { action: string; title: string }[]
): PushPayload {
  return { title, body, tag, icon: "/icon.svg", data: { url: "/" }, actions } as PushPayload;
}

export function getAchievementsAndLeaderboard() {
  const reports = buildProgressReports({
    hydrationLogs: serverState.hydrationLogs,
    waterTargetMl: serverState.profile.waterTargetMl,
    workoutSessions: serverState.workoutSessions,
    workoutSets: serverState.workoutSets,
    workoutExercises: serverState.workoutExercises,
    hydrationEnabled: true,
    workoutEnabled: serverState.workoutExercises.length > 0,
    volumeEnabled: serverState.workoutExercises.length > 0
  });
  const achievements = reports.monthly.badges.filter((achievement) => achievement.status !== "disabled");

  return ok({
    achievements,
    leaderboardVisible,
    leaderboard: [
      { rank: 1, displayName: "Minh", score: 96, badgeStreakMonths: 4 },
      { rank: 2, displayName: serverState.profile.name, score: 91, badgeStreakMonths: 3 },
      { rank: 3, displayName: "An", score: 88, badgeStreakMonths: 2 }
    ]
  });
}

export function recalculateAchievements() {
  return getAchievementsAndLeaderboard();
}

export async function sendMonthlyAchievementEvents() {
  const result = recalculateAchievements();
  if (!result.ok) return result;
  const activeAchievements = result.data.achievements.filter((achievement) => achievement.status === "active");
  if (!activeAchievements.length) return ok({ sent: 0, skipped: true, reason: "no-achievements" });
  const payload = notificationPayload(
    "Monthly achievements ready",
    `${activeAchievements.length} achievement${activeAchievements.length === 1 ? "" : "s"} active this month.`,
    "monthly-achievements",
    [{ action: "open-progress", title: "View progress" }]
  );
  return sendToSubscriptions(payload);
}

export function updateLeaderboardVisibility(isPublic: boolean) {
  leaderboardVisible = isPublic;
  serverState.profile.leaderboardPublic = isPublic;
  return ok({ isPublic });
}
