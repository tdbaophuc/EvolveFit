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

  it("supports auth session, sign out, google OAuth URL, and error envelopes", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: false, error: "Unauthorized", requestId: "req_client" }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new EvolveFitApiClient("https://api.test");

    const session = await client.session();
    await client.signOut();

    expect(session).toEqual({ ok: false, error: "Unauthorized", requestId: "req_client" });
    expect(client.googleOAuthUrl()).toBe("https://api.test/api/auth/oauth/google");
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/auth/session", expect.objectContaining({ method: "GET", credentials: "include" }));
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
    expect(fetchMock).toHaveBeenCalledWith("/api/workouts/sessions/session-1/reorder", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/workouts/sets/set-1", expect.objectContaining({ method: "PATCH" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/sync/batch", expect.objectContaining({ method: "POST" }));
    vi.unstubAllGlobals();
  });
});
