import { describe, expect, it } from "vitest";
import {
  createSupplement,
  deleteHydrationLog,
  getHydrationToday,
  hydrationReminderEvents,
  notificationConfig,
  notificationStatus,
  sendMonthlyAchievementEvents,
  sendTestNotification,
  sendHydrationReminderEvents,
  coachRecommend,
  createExercise,
  createRoutine,
  createWorkoutSet,
  deleteExercise,
  deleteRoutine,
  deleteWorkoutSet,
  finishWorkoutSessionById,
  logHydration,
  logSupplement,
  pauseWorkoutSessionById,
  recalculateAchievements,
  patchHydrationLog,
  reorderWorkoutSession,
  resumeWorkoutSessionById,
  startWorkoutSession,
  subscribeNotifications,
  syncBatch,
  updateExercise,
  updateLeaderboardVisibility,
  updateRoutine,
  updateWorkoutSet,
  unsubscribeNotifications
} from "./api";

describe("api service layer", () => {
  it("logs, patches, and deletes hydration entries", () => {
    const logged = logHydration(300);
    expect(logged.ok).toBe(true);
    if (!logged.ok) return;

    const patched = patchHydrationLog(logged.data.id, 450);
    expect(patched.ok && patched.data.amountMl).toBe(450);

    const today = getHydrationToday();
    expect(today.ok && today.data.logs.some((log) => log.id === logged.data.id)).toBe(true);

    const deleted = deleteHydrationLog(logged.data.id);
    expect(deleted.ok).toBe(true);
  });

  it("validates supplement creation and logging", () => {
    expect(createSupplement({ name: "", defaultAmount: 5 }).ok).toBe(false);
    const created = createSupplement({ name: "Omega-3", defaultAmount: 2 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const logged = logSupplement({ supplementId: created.data.id, name: "Omega-3", amount: 2 });
    expect(logged.ok).toBe(true);
    expect(logged.ok && logged.data.supplementId).toBe(created.data.id);
    expect(logSupplement({ supplementId: created.data.id, name: "Omega-3", amount: 0, status: "skipped", skippedReason: "late" }).ok).toBe(true);
  });

  it("recalculates achievements and toggles leaderboard visibility", () => {
    expect(recalculateAchievements().ok).toBe(true);
    const visibility = updateLeaderboardVisibility(true);
    expect(visibility).toEqual({ ok: true, data: { isPublic: true } });
  });

  it("stores and removes notification subscriptions", () => {
    const subscription = subscribeNotifications({ endpoint: "https://push.test/1", keys: { p256dh: "key", auth: "auth" }, localProfileId: "local-1" });
    expect(subscription.ok).toBe(true);
    expect(subscription.ok && subscription.data.localProfileId).toBe("local-1");
    const status = notificationStatus("local-1");
    expect(status.ok && status.data.subscriptionCount).toBe(1);
    expect(unsubscribeNotifications("https://push.test/1").ok).toBe(true);
  });

  it("reports notification config and test notification fallback", async () => {
    const config = notificationConfig({
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
      VAPID_SUBJECT: "mailto:test@example.com"
    });
    expect(config.ok && config.data).toMatchObject({ configured: true, fallbackMode: "web-push" });

    const result = await sendTestNotification({ localProfileId: "no-subscriptions" });
    expect(result.ok && result.data).toMatchObject({ sent: 0, fallback: "in-app", reason: "no-subscriptions" });
  });

  it("monthly achievement cron returns push fallback metadata without subscriptions", async () => {
    const result = await sendMonthlyAchievementEvents();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("sent");
  });

  it("returns cron reminder event shape", () => {
    const result = hydrationReminderEvents(new Date(2026, 7, 14, 14, 0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("shouldSend");
    expect(result.data).toHaveProperty("event");
  });

  it("cron sender returns safe payload without VAPID env", async () => {
    const logged = logHydration(100);
    expect(logged.ok).toBe(true);
    const result = await sendHydrationReminderEvents(new Date(2026, 7, 14, 22, 0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("sent");
  });

  it("returns coach recommendation through AI fallback contract", async () => {
    const result = await coachRecommend();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("mode");
    expect(["rule-fallback", "gemini", "openai"]).toContain(result.data.mode);
  });

  it("supports routine and exercise CRUD contracts", () => {
    const routine = createRoutine({ name: "API Routine", daysPerWeek: 1, days: [] });
    expect(routine.ok).toBe(true);
    if (!routine.ok) return;
    const updated = updateRoutine(routine.data.id, { name: "API Routine 2", baseUpdatedAt: routine.data.updatedAt });
    expect(updated.ok).toBe(true);
    expect(updated.ok && "name" in updated.data && updated.data.name).toBe("API Routine 2");

    const exercise = createExercise({ name: "API Curl", muscleGroup: "Arms", equipment: "dumbbell", movementPattern: "isolation" });
    expect(exercise.ok).toBe(true);
    if (!exercise.ok) return;
    expect(updateExercise(exercise.data.id, { notes: "strict form" }).ok).toBe(true);
    expect(deleteExercise(exercise.data.id).ok).toBe(true);
    expect(deleteRoutine(routine.data.id).ok).toBe(true);
  });

  it("starts, pauses, resumes, finishes, and reorders workout sessions", () => {
    const started = startWorkoutSession({ sessionName: "API Session", sessionExerciseOrder: ["ex1", "ex2"] });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(pauseWorkoutSessionById(started.data.id).ok).toBe(true);
    expect(resumeWorkoutSessionById(started.data.id).ok).toBe(true);
    const reordered = reorderWorkoutSession(started.data.id, [
      { exerciseId: "ex2", status: "queued" },
      { exerciseId: "ex1", status: "parked" }
    ]);
    expect(reordered.ok && reordered.data.sessionExerciseOrder).toEqual(["ex2", "ex1"]);
    const finished = finishWorkoutSessionById(started.data.id);
    expect(finished.ok && finished.data.status).toBe("finished");
  });

  it("creates, updates, and deletes workout sets", () => {
    const created = createWorkoutSet({
      id: "api-set-1",
      sessionId: "api-session",
      exerciseId: "ex1",
      exerciseName: "Incline Bench Press",
      targetWeightKg: 40,
      targetReps: 8,
      actualWeightKg: 40,
      actualReps: 8,
      completedAt: "2026-08-23T01:00:00.000Z"
    });
    expect(created.ok).toBe(true);
    const updated = updateWorkoutSet("api-set-1", { actualReps: 9, completedAt: "2026-08-23T01:01:00.000Z" });
    expect(updated.ok && updated.data.actualReps).toBe(9);
    expect(deleteWorkoutSet("api-set-1").ok).toBe(true);
  });

  it("sync batch is idempotent and reports routine conflicts for confirm flow", () => {
    const first = syncBatch({
      idempotencyKey: "batch-api-test",
      items: [
        {
          id: "sync-set",
          type: "workout.set.create",
          idempotencyKey: "sync-set-key",
          payload: {
            id: "sync-set",
            sessionId: "session-sync",
            exerciseId: "ex1",
            exerciseName: "Incline Bench Press",
            targetWeightKg: 40,
            targetReps: 8,
            actualWeightKg: 40,
            actualReps: 8,
            completedAt: "2026-08-23T02:00:00.000Z"
          }
        }
      ]
    });
    const second = syncBatch({
      idempotencyKey: "batch-api-test",
      items: [{ id: "sync-set", type: "workout.set.create", idempotencyKey: "sync-set-key", payload: { id: "sync-set" } }]
    });
    expect(first).toEqual(second);

    const routine = createRoutine({ name: "Conflict Routine", days: [] });
    expect(routine.ok).toBe(true);
    if (!routine.ok) return;
    const baseUpdatedAt = routine.data.updatedAt;
    const remote = updateRoutine(routine.data.id, { name: "Remote update", baseUpdatedAt });
    expect(remote.ok).toBe(true);
    const conflict = syncBatch({
      items: [
        {
          type: "routine.update",
          payload: { routineId: routine.data.id, routine: { name: "Local update" }, baseUpdatedAt }
        }
      ]
    });
    expect(conflict.ok && conflict.data.results[0].status).toBe("conflict");
    const confirmed = syncBatch({
      items: [
        {
          type: "routine.update",
          payload: { routineId: routine.data.id, routine: { name: "Local update" }, baseUpdatedAt, conflictResolution: "confirm" }
        }
      ]
    });
    expect(confirmed.ok && confirmed.data.results[0].status).toBe("synced");
  });
});
