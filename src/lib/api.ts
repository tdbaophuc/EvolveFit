import {
  cryptoSafeId,
  buildProgressReports,
  hydrationTotal,
  normalizeDrinkModules,
  progressiveOverloadRecommendation,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  expectedHydrationByNow,
  isWorkingVolumeSet,
  type HydrationLog,
  type SupplementLog,
  type WorkoutSet
} from "./core";
import { aiCoachRecommendation } from "./integrations";
import { getVapidPublicKey, isWebPushConfigured, sendWebPush, type PushPayload } from "./push";
import { initialState } from "./seed";

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

export function logWorkoutSet(input: Omit<WorkoutSet, "id" | "completedAt">): ApiResult<WorkoutSet> {
  if (!input.exerciseId || !input.exerciseName) return fail("exercise is required");
  const set: WorkoutSet = { ...input, id: cryptoSafeId(), completedAt: new Date().toISOString() };
  serverState.workoutSets.push(set);
  return ok(set);
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
  return ok(
    await aiCoachRecommendation({
      exerciseName: exercise.name,
      targetWeightKg: exercise.targetWeightKg,
      targetRepsMax: exercise.targetRepsMax,
      recentSets: recentSets.length
        ? recentSets
        : [{ actualWeightKg: exercise.targetWeightKg, actualReps: exercise.targetRepsMin, rpe: 8 }],
      recoveryNote: "Local readiness score and soreness can be injected here."
    })
  );
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
