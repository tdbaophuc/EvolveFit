import { describe, expect, it, vi } from "vitest";
import { EvolveFitApiClient, evolveFitApiBaseUrl } from "./api-client";

describe("EvolveFitApiClient", () => {
  it("calls typed hydration endpoint", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { totalMl: 500 } }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolveFitApiClient("https://app.test");
    const result = await client.hydrationToday();

    expect(fetchMock).toHaveBeenCalledWith("https://app.test/api/hydration/today", expect.objectContaining({ method: "GET", credentials: "include" }));
    expect(result).toEqual({ ok: true, data: { totalMl: 500 } });
    vi.unstubAllGlobals();
  });

  it("normalizes API base URL from env", () => {
    expect(evolveFitApiBaseUrl("http://localhost:4000///")).toBe("http://localhost:4000");
    expect(evolveFitApiBaseUrl("")).toBe("");
  });

  it("posts leaderboard visibility", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { isPublic: true } }));
    vi.stubGlobal("fetch", fetchMock);

    await new EvolveFitApiClient().setLeaderboardVisibility(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leaderboards/visibility",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ isPublic: true }) })
    );
    vi.unstubAllGlobals();
  });

  it("posts auth sign in", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { mode: "email", email: "a@b.com" } }));
    vi.stubGlobal("fetch", fetchMock);

    await new EvolveFitApiClient().signIn({ email: "a@b.com", mode: "email" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-in",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "a@b.com", mode: "email" }) })
    );
    await new EvolveFitApiClient().signUp({ email: "a@b.com", password: "secret123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/sign-up",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "a@b.com", password: "secret123" }) })
    );
    vi.unstubAllGlobals();
  });

  it("supports auth session, recovery, account data, google OAuth URL, and error envelopes", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: false, error: "Unauthorized", requestId: "req_client" }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new EvolveFitApiClient("https://api.test");

    const session = await client.session();
    await client.refresh({ refreshToken: "refresh-token" });
    await client.requestPasswordReset({ email: "a@b.com", redirectTo: "https://app.test/reset" });
    await client.resetPassword({ accessToken: "reset-token", password: "secret123" });
    await client.exportAccount();
    await client.deleteAccount();
    await client.signOut();

    expect(session).toEqual({ ok: false, error: "Unauthorized", requestId: "req_client" });
    expect(client.googleOAuthUrl()).toBe("https://api.test/api/auth/oauth/google");
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/auth/session", expect.objectContaining({ method: "GET", credentials: "include" }));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/auth/refresh", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/auth/password/forgot", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/auth/password/reset", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/account/export", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/auth/account", expect.objectContaining({ method: "DELETE" }));
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/auth/sign-out", expect.objectContaining({ method: "POST", credentials: "include" }));
    vi.unstubAllGlobals();
  });

  it("supports health, Supabase verify, and supplement status contracts", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new EvolveFitApiClient();

    await client.health();
    await client.verifySupabase();
    await client.logSupplement({ supplementId: "sup1", name: "Creatine", amount: 0, status: "skipped", skippedReason: "late" });
    await client.updateSupplement("sup1", { scheduleHours: [8, 17], active: true });

    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/supabase/verify", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/supplements/log",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ supplementId: "sup1", name: "Creatine", amount: 0, status: "skipped", skippedReason: "late" })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/supplements/sup1/reminder", expect.objectContaining({ method: "PUT" }));
    vi.unstubAllGlobals();
  });

  it("supports notification and client error flows", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { sent: 1 } }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new EvolveFitApiClient("http://localhost:4000");

    await client.notificationConfig("profile@example.com");
    await client.notificationStatus("profile@example.com");
    await client.subscribeNotifications({ endpoint: "https://push.example", keys: { p256dh: "p", auth: "a" } });
    await client.unsubscribeNotifications("https://push.example");
    await client.sendTestNotification({ endpoint: "https://push.example", localProfileId: "profile@example.com" });
    await client.reportClientError({ message: "boom", path: "/" });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/notifications/config?localProfileId=profile%40example.com", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/notifications/status?localProfileId=profile%40example.com", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/notifications/subscribe", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/notifications/unsubscribe", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/notifications/test", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/client-errors", expect.objectContaining({ method: "POST" }));
    vi.unstubAllGlobals();
  });

  it("calls routine, exercise, workout session, set, reorder, and sync endpoints", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new EvolveFitApiClient();

    await client.createRoutine({ name: "Routine" });
    await client.updateRoutine("routine-1", { name: "Routine 2", baseUpdatedAt: "2026-08-23T00:00:00.000Z" });
    await client.deleteRoutine("routine-1");
    await client.createExercise({ name: "Curl", muscleGroup: "Arms", equipment: "dumbbell", movementPattern: "isolation" });
    await client.marketplaceExercises({ query: "row", equipment: "dumbbell", pageSize: 12 });
    await client.marketplaceExercise("single-arm-dumbbell-row");
    await client.marketplaceExerciseSubstitutions("single-arm-dumbbell-row", { equipment: ["dumbbell"], limit: 3 });
    await client.cloneMarketplaceExercise("single-arm-dumbbell-row", { name: "Row của tôi" });
    await client.addMarketplaceExerciseToRoutine("single-arm-dumbbell-row", { routineId: "routine-1", workoutDayId: "day-1" });
    await client.updateExercise("exercise-1", { notes: "strict" });
    await client.deleteExercise("exercise-1");
    await client.startWorkoutSession({ routineId: "routine-1", workoutDayId: "day-1", sessionExerciseOrder: ["ex1"] });
    await client.pauseWorkoutSession("session-1");
    await client.resumeWorkoutSession("session-1");
    await client.finishWorkoutSession("session-1");
    await client.reorderWorkoutSession("session-1", [{ exerciseId: "ex1", status: "queued" }]);
    await client.updateWorkoutSet("set-1", { actualReps: 9 });
    await client.deleteWorkoutSet("set-1");
    await client.syncBatch({ idempotencyKey: "queue-1", items: [{ type: "workout.set.delete", payload: { id: "set-1" } }] });

    expect(fetchMock).toHaveBeenCalledWith("/api/routines", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/routines/routine-1", expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/routines/routine-1", expect.objectContaining({ method: "DELETE" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/exercises", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/exercises/marketplace?query=row&equipment=dumbbell&pageSize=12", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/exercises/marketplace/single-arm-dumbbell-row", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/exercises/marketplace/single-arm-dumbbell-row/substitutions?equipment=dumbbell&limit=3", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/exercises/marketplace/single-arm-dumbbell-row/clone", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/exercises/marketplace/single-arm-dumbbell-row/add-to-routine", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/workouts/sessions/session-1/reorder", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/workouts/sets/set-1", expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/sync/batch", expect.objectContaining({ method: "POST" }));
    vi.unstubAllGlobals();
  });

  it("calls admin operations endpoints with query filters and mutation bodies", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new EvolveFitApiClient();

    await client.adminDashboard();
    await client.adminGovernanceHealth();
    await client.adminRoles();
    await client.adminWriteRole({ email: "support@example.com", role: "support" });
    await client.adminExercises({ query: "press", status: "published", pageSize: 25 });
    await client.adminCreateExercise({ name: "Press", muscleGroup: "Chest", equipment: "dumbbell", movementPattern: "push" });
    await client.adminUpdateExercise("exercise-1", { status: "archived" });
    await client.adminRoutineTemplates({ query: "strength", status: "draft", page: 2 });
    await client.adminCreateRoutineTemplate({ name: "Starter", targetGoal: "strength", daysPerWeek: 3 });
    await client.adminUpdateRoutineTemplate("template-1", { status: "published" });
    await client.adminFeedback();
    await client.adminUsers("support@example.com");
    await client.adminAuditLogs({ resourceType: "exercise", pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/dashboard", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/governance/health", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/roles", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/roles", expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "support@example.com", role: "support" }) }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/exercises?query=press&status=published&pageSize=25", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/exercises", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/exercises/exercise-1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "archived" }) }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/routine-templates?query=strength&status=draft&page=2", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/routine-templates", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/routine-templates/template-1", expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/feedback", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/users?query=support%40example.com", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/audit-logs?resourceType=exercise&pageSize=10", expect.objectContaining({ method: "GET" }));
    vi.unstubAllGlobals();
  });
});
