import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";

describe("Fastify API contract", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ ...process.env, CRON_SECRET: "cron-test", API_CORS_ORIGIN: "http://localhost:5173" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves health, integrations, OpenAPI, observability, and Supabase verify", async () => {
    const health = await app.inject({ method: "GET", url: "/api/health", headers: { "x-request-id": "req_api_contract" } });
    expect(health.statusCode).toBe(200);
    expect(health.headers["x-request-id"]).toBe("req_api_contract");
    expect(health.json()).toMatchObject({ ok: true, requestId: "req_api_contract", data: { app: "evolvefit", runtime: "nodejs-fastify" } });

    expect((await app.inject("/api/ready")).json()).toMatchObject({ ok: true, data: { ready: true, mode: "memory" } });
    expect((await app.inject("/api/integrations/status")).json()).toMatchObject({ ok: true });
    expect((await app.inject("/api/supabase/verify")).json()).toMatchObject({ ok: true });
    expect((await app.inject("/api/docs/openapi")).json()).toMatchObject({ openapi: "3.1.0", info: { title: "EvolveFit API V1" } });
    expect((await app.inject("/api/observability/logs")).json()).toMatchObject({ ok: true, data: { status: expect.any(String) } });
  });

  it("keeps auth session, local sign-in, sign-up validation, sign-out, and OAuth errors", async () => {
    expect((await app.inject("/api/auth/session")).json()).toMatchObject({ ok: true, data: { email: expect.any(String) } });

    const signIn = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in",
      payload: { email: "api-contract@example.com", mode: "local" }
    });
    expect(signIn.statusCode).toBe(200);
    expect(signIn.json()).toMatchObject({ ok: true, data: { email: "api-contract@example.com", mode: "local" } });

    const signUp = await app.inject({ method: "POST", url: "/api/auth/sign-up", payload: { email: "missing-password@example.com" } });
    expect(signUp.statusCode).toBe(400);
    expect(signUp.json()).toMatchObject({ ok: false, error: "email and password are required" });

    expect((await app.inject({ method: "POST", url: "/api/auth/sign-out" })).json()).toEqual({
      ok: true,
      data: { mode: "local", email: "local@evolvefit.app" }
    });
    expect((await app.inject("/api/auth/oauth/google")).statusCode).toBe(503);
    expect((await app.inject("/api/auth/callback")).statusCode).toBe(400);
  });

  it("keeps hydration, supplements, routines, and exercises contracts", async () => {
    expect((await app.inject("/api/hydration/today")).json()).toMatchObject({ ok: true, data: { logs: expect.any(Array) } });
    const hydration = await app.inject({ method: "POST", url: "/api/hydration/log", payload: { amountMl: 300 } });
    const hydrationPayload = hydration.json();
    expect(hydrationPayload).toMatchObject({ ok: true, data: { amountMl: 300 } });
    expect((await app.inject({ method: "PATCH", url: `/api/hydration/log/${hydrationPayload.data.id}`, payload: { amountMl: 425 } })).json()).toMatchObject({
      ok: true,
      data: { amountMl: 425 }
    });
    expect((await app.inject({ method: "DELETE", url: `/api/hydration/log/${hydrationPayload.data.id}` })).json()).toMatchObject({
      ok: true,
      data: { id: hydrationPayload.data.id }
    });

    const supplement = (await app.inject({ method: "POST", url: "/api/supplements", payload: { name: "Creatine API", defaultAmount: 5 } })).json();
    expect(supplement).toMatchObject({ ok: true, data: { name: "Creatine API" } });
    expect((await app.inject({ method: "POST", url: "/api/supplements/log", payload: { name: "Creatine API", amount: 5 } })).json()).toMatchObject({
      ok: true
    });
    expect((await app.inject({ method: "PATCH", url: `/api/supplements/${supplement.data.id}/reminder`, payload: { reminderHour: 9 } })).json()).toMatchObject({
      ok: true,
      data: { reminderHour: 9 }
    });

    const exercise = (await app.inject({ method: "POST", url: "/api/exercises", payload: { name: "API Curl" } })).json();
    expect((await app.inject("/api/exercises")).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: "PATCH", url: `/api/exercises/${exercise.data.id}`, payload: { notes: "ported" } })).json()).toMatchObject({
      ok: true,
      data: { notes: "ported" }
    });

    const routine = (await app.inject({ method: "POST", url: "/api/routines", payload: { name: "API Routine", days: [] } })).json();
    expect((await app.inject("/api/routines")).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: "PATCH", url: `/api/routines/${routine.data.id}`, payload: { name: "API Routine 2" } })).json()).toMatchObject({
      ok: true,
      data: { name: "API Routine 2" }
    });
    expect((await app.inject({ method: "DELETE", url: `/api/exercises/${exercise.data.id}` })).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: "DELETE", url: `/api/routines/${routine.data.id}` })).json()).toMatchObject({ ok: true });
  });

  it("keeps workouts, progression, sync, achievements, leaderboards, coach, notifications, and cron", async () => {
    const today = (await app.inject("/api/workouts/today")).json();
    expect(today).toMatchObject({ ok: true });
    const session = (await app.inject({ method: "POST", url: "/api/workouts/sessions", payload: { sessionName: "API Session" } })).json();
    expect(session).toMatchObject({ ok: true, data: { status: "active" } });
    expect((await app.inject({ method: "POST", url: `/api/workouts/sessions/${session.data.id}/pause` })).json()).toMatchObject({ ok: true, data: { status: "paused" } });
    expect((await app.inject({ method: "POST", url: `/api/workouts/sessions/${session.data.id}/resume` })).json()).toMatchObject({ ok: true, data: { status: "active" } });
    expect((await app.inject({ method: "POST", url: `/api/workouts/sessions/${session.data.id}/reorder`, payload: { queue: [{ exerciseId: "ex", status: "queued" }] } })).json()).toMatchObject({
      ok: true
    });
    expect((await app.inject({ method: "POST", url: `/api/workouts/sessions/${session.data.id}/finish` })).json()).toMatchObject({ ok: true, data: { status: "finished" } });

    const set = (await app.inject({
      method: "POST",
      url: "/api/workouts/sets",
      payload: { sessionId: session.data.id, exerciseId: "ex", exerciseName: "API Press", targetWeightKg: 40, targetReps: 8, actualWeightKg: 40, actualReps: 8 }
    })).json();
    expect(set).toMatchObject({ ok: true, data: { exerciseName: "API Press" } });
    expect((await app.inject({ method: "PATCH", url: `/api/workouts/sets/${set.data.id}`, payload: { actualReps: 9 } })).json()).toMatchObject({ ok: true, data: { actualReps: 9 } });
    expect((await app.inject({ method: "POST", url: "/api/progression/recalculate", payload: { exerciseId: today.data.exercises[0].id } })).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: "DELETE", url: `/api/workouts/sets/${set.data.id}` })).json()).toMatchObject({ ok: true });

    expect((await app.inject({ method: "POST", url: "/api/sync/batch", payload: { items: "bad" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/api/sync/batch", payload: { items: [] } })).json()).toMatchObject({ ok: true, data: { results: [] } });
    const syncOnce = (await app.inject({
      method: "POST",
      url: "/api/sync/batch",
      payload: {
        items: [
          {
            id: "offline-hydration",
            idempotencyKey: "idem-hydration",
            type: "hydration.log",
            payload: { id: "offline-hydration", amountMl: 250, drinkType: "water", loggedAt: "2026-09-04T00:00:00.000Z" }
          }
        ]
      }
    })).json();
    const syncDuplicate = (await app.inject({
      method: "POST",
      url: "/api/sync/batch",
      payload: {
        items: [
          {
            id: "offline-hydration",
            idempotencyKey: "idem-hydration",
            type: "hydration.log",
            payload: { id: "offline-hydration", amountMl: 999, drinkType: "water", loggedAt: "2026-09-04T00:01:00.000Z" }
          }
        ]
      }
    })).json();
    expect(syncDuplicate.data.results[0]).toEqual(syncOnce.data.results[0]);
    expect((await app.inject("/api/achievements/me")).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: "POST", url: "/api/achievements/recalculate" })).json()).toMatchObject({ ok: true });
    expect((await app.inject("/api/leaderboards")).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: "PATCH", url: "/api/leaderboards/visibility", payload: { isPublic: true } })).json()).toMatchObject({ ok: true, data: { isPublic: true } });

    const coach = (await app.inject({ method: "POST", url: "/api/coach/recommend", payload: {} })).json();
    expect(coach).toMatchObject({ ok: true, requestId: expect.any(String) });
    expect((await app.inject({ method: "POST", url: `/api/coach/recommendations/${coach.data.recommendation.id}/feedback`, payload: { decision: "accepted" } })).json()).toMatchObject({
      ok: true
    });

    expect((await app.inject("/api/notifications/config")).json()).toMatchObject({ ok: true, data: { configured: false, fallbackMode: "in-app" } });
    expect((await app.inject("/api/notifications/status?localProfileId=api")).json()).toMatchObject({ ok: true, data: { subscriptionCount: 0 } });
    expect((await app.inject({ method: "POST", url: "/api/notifications/subscribe", payload: { endpoint: "https://push.example/api", keys: { p256dh: "p", auth: "a" }, localProfileId: "api" } })).json()).toMatchObject({ ok: true });
    expect((await app.inject("/api/notifications/status?localProfileId=api")).json()).toMatchObject({ ok: true, data: { subscriptionCount: 1 } });
    expect((await app.inject({ method: "POST", url: "/api/notifications/test", payload: { localProfileId: "api" } })).json()).toMatchObject({ ok: true, data: { missingEnv: 1, fallback: "in-app" } });
    expect((await app.inject({ method: "POST", url: "/api/notifications/unsubscribe", payload: { endpoint: "https://push.example/api" } })).json()).toMatchObject({ ok: true });
    expect((await app.inject("/api/notifications/status?localProfileId=api")).json()).toMatchObject({ ok: true, data: { subscriptionCount: 0 } });

    expect((await app.inject({ method: "POST", url: "/api/cron/hydration-reminders" })).statusCode).toBe(401);
    const hydrationCron = (await app.inject({ method: "POST", url: "/api/cron/hydration-reminders", headers: { authorization: "Bearer cron-test" } })).json();
    expect(hydrationCron).toMatchObject({ ok: true, data: { cron: { status: "ran" } } });
    expect((await app.inject({ method: "POST", url: "/api/cron/hydration-reminders", headers: { "x-cron-secret": "cron-test" } })).json()).toMatchObject({
      ok: true,
      data: { skipped: true, reason: "already-processed", cron: { status: "skipped" } }
    });
    expect((await app.inject({ method: "POST", url: "/api/cron/creatine-reminders", headers: { authorization: "Bearer cron-test" } })).json()).toMatchObject({ ok: true, data: { cron: { status: "ran" } } });
    expect((await app.inject({ method: "POST", url: "/api/cron/monthly-achievements", headers: { authorization: "Bearer cron-test" } })).json()).toMatchObject({ ok: true, data: { cron: { status: "ran" } } });
  });
});
