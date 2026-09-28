import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";

describe("Fastify API contract", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ ...process.env, CRON_SECRET: "cron-test", API_CORS_ORIGIN: "http://localhost:5173", ADMIN_BOOTSTRAP_EMAILS: "admin@example.com" });
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

  it("keeps auth session, local sign-in, sign-up validation, recovery, export, delete, and OAuth errors", async () => {
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
    expect(signUp.json()).toMatchObject({ ok: false, error: "Validation failed", errorCode: "validation_failed", details: expect.any(Array) });

    expect((await app.inject({ method: "POST", url: "/api/auth/refresh", payload: {} })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/api/auth/refresh", payload: { refreshToken: "local-refresh" } })).json()).toMatchObject({
      ok: true,
      data: { email: "api-contract@example.com" }
    });
    expect((await app.inject({ method: "POST", url: "/api/auth/password/forgot", payload: { email: "api-contract@example.com" } })).json()).toMatchObject({
      ok: true,
      data: { sent: true, mode: "local" }
    });
    expect((await app.inject({ method: "POST", url: "/api/auth/password/reset", payload: { accessToken: "reset-token", password: "secret123" } })).json()).toMatchObject({
      ok: true,
      data: { updated: true }
    });
    expect((await app.inject("/api/account/export")).json()).toMatchObject({ ok: true, data: { metadata: { schemaVersion: 2 }, data: { profile: expect.any(Object) } } });
    expect((await app.inject({ method: "DELETE", url: "/api/auth/account" })).json()).toMatchObject({
      ok: true,
      data: { dataDeleted: true }
    });

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

    const exercise = (await app.inject({
      method: "POST",
      url: "/api/exercises",
      payload: { name: "API Curl", primaryMuscles: ["Biceps"], cues: ["Elbows quiet"], tags: ["arms"] }
    })).json();
    expect((await app.inject("/api/exercises")).json()).toMatchObject({ ok: true });
    const marketplace = (await app.inject("/api/exercises/marketplace?query=row&equipment=dumbbell&pageSize=5")).json();
    expect(marketplace).toMatchObject({ ok: true, data: { page: 1, pageSize: 5, total: expect.any(Number) } });
    expect(marketplace.data.items.some((item: { id: string }) => item.id === "market-single-arm-db-row")).toBe(true);
    expect((await app.inject("/api/exercises/marketplace/single-arm-dumbbell-row")).json()).toMatchObject({
      ok: true,
      data: { id: "market-single-arm-db-row", catalogSource: "marketplace", status: "published" }
    });
    expect((await app.inject("/api/exercises/marketplace/single-arm-dumbbell-row/substitutions?equipment=dumbbell")).json()).toMatchObject({
      ok: true,
      data: { substitutions: expect.any(Array) }
    });
    const cloned = (await app.inject({
      method: "POST",
      url: "/api/exercises/marketplace/single-arm-dumbbell-row/clone",
      payload: { name: "API Row Custom" }
    })).json();
    expect(cloned).toMatchObject({ ok: true, data: { name: "API Row Custom", catalogSource: "custom", builtIn: false } });
    expect((await app.inject({ method: "PATCH", url: `/api/exercises/${exercise.data.id}`, payload: { notes: "ported" } })).json()).toMatchObject({
      ok: true,
      data: { notes: "ported", primaryMuscles: ["Biceps"] }
    });

    const routine = (await app.inject({ method: "POST", url: "/api/routines", payload: { name: "API Routine", days: [] } })).json();
    expect((await app.inject("/api/routines")).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: "PATCH", url: `/api/routines/${routine.data.id}`, payload: { name: "API Routine 2" } })).json()).toMatchObject({
      ok: true,
      data: { name: "API Routine 2" }
    });
    const defaultRoutineDayId = (await app.inject("/api/routines")).json().data[0].days[0].id;
    expect((await app.inject({
      method: "POST",
      url: "/api/exercises/marketplace/single-arm-dumbbell-row/add-to-routine",
      payload: { workoutDayId: defaultRoutineDayId }
    })).json()).toMatchObject({ ok: true, data: { exercise: { definitionId: "market-single-arm-db-row" } } });

    const routineTemplates = (await app.inject("/api/routine-templates?goal=strength&equipment=barbell&sort=compatibility")).json();
    expect(routineTemplates).toMatchObject({ ok: true, data: { items: expect.any(Array), total: expect.any(Number) } });
    expect(routineTemplates.data.items.some((item: { slug: string }) => item.slug === "upper-lower-strength-4d")).toBe(true);
    expect((await app.inject("/api/routine-templates/upper-lower-strength-4d")).json()).toMatchObject({
      ok: true,
      data: { slug: "upper-lower-strength-4d", compatibility: { score: expect.any(Number) } }
    });
    expect((await app.inject({
      method: "POST",
      url: "/api/routine-templates/upper-lower-strength-4d/preview",
      payload: { routineName: "API Strength Preview" }
    })).json()).toMatchObject({ ok: true, data: { routine: { name: "API Strength Preview", daysPerWeek: 4 } } });
    const appliedTemplate = (await app.inject({
      method: "POST",
      url: "/api/routine-templates/upper-lower-strength-4d/apply",
      payload: { routineName: "API Strength", idempotencyKey: "api-contract-template" }
    })).json();
    expect(appliedTemplate).toMatchObject({ ok: true, data: { applied: true, routine: { name: "API Strength", daysPerWeek: 4 } } });
    expect((await app.inject({
      method: "POST",
      url: "/api/routine-templates/upper-lower-strength-4d/apply",
      payload: { routineName: "API Strength retry", idempotencyKey: "api-contract-template" }
    })).json()).toMatchObject({ ok: true, data: { applied: false, idempotent: true, routine: { id: appliedTemplate.data.routine.id } } });
    expect((await app.inject({
      method: "POST",
      url: "/api/routine-templates/upper-lower-strength-4d/feedback",
      payload: { decision: "accepted", favorite: true, feedback: "works" }
    })).json()).toMatchObject({ ok: true, data: { templateId: "template-upper-lower-strength-4d", favorite: true } });
    expect((await app.inject({ method: "PATCH", url: "/api/exercises/marketplace/single-arm-dumbbell-row", payload: { notes: "bad" } })).statusCode).toBe(404);
    expect((await app.inject({ method: "DELETE", url: `/api/exercises/${exercise.data.id}` })).json()).toMatchObject({ ok: true });
    expect((await app.inject({ method: "DELETE", url: `/api/routines/${routine.data.id}` })).json()).toMatchObject({ ok: true });
  });

  it("protects admin roles, content governance, support lookup, and audit logs", async () => {
    await app.inject({ method: "POST", url: "/api/auth/sign-in", payload: { email: "plain-user@example.com", mode: "local" } });
    expect((await app.inject("/api/admin/dashboard")).statusCode).toBe(401);

    await app.inject({ method: "POST", url: "/api/auth/sign-in", payload: { email: "admin@example.com", mode: "local" } });
    expect((await app.inject("/api/admin/dashboard")).json()).toMatchObject({
      ok: true,
      data: { actor: { roles: ["super-admin"] }, summary: { marketplaceExercises: expect.any(Number), routineTemplates: expect.any(Number) } }
    });

    expect((await app.inject({
      method: "POST",
      url: "/api/admin/roles",
      payload: { email: "content@example.com", role: "content-admin" }
    })).json()).toMatchObject({ ok: true, data: { email: "content@example.com", role: "content-admin" } });
    expect((await app.inject({
      method: "POST",
      url: "/api/admin/roles",
      payload: { email: "support@example.com", role: "support" }
    })).json()).toMatchObject({ ok: true, data: { email: "support@example.com", role: "support" } });

    await app.inject({ method: "POST", url: "/api/auth/sign-in", payload: { email: "content@example.com", mode: "local" } });
    const createdExercise = (await app.inject({
      method: "POST",
      url: "/api/admin/exercises",
      payload: { name: "Admin Landmine Press", muscleGroup: "Shoulders", equipment: "barbell", movementPattern: "push", status: "draft" }
    })).json();
    expect(createdExercise).toMatchObject({ ok: true, data: { name: "Admin Landmine Press", catalogSource: "marketplace", status: "draft" } });
    expect((await app.inject({
      method: "PATCH",
      url: `/api/admin/exercises/${createdExercise.data.id}`,
      payload: { status: "published" }
    })).json()).toMatchObject({ ok: true, data: { status: "published" } });
    expect((await app.inject({
      method: "POST",
      url: "/api/admin/roles",
      payload: { email: "bad@example.com", role: "support" }
    })).statusCode).toBe(403);

    await app.inject({ method: "POST", url: "/api/auth/sign-in", payload: { email: "support@example.com", mode: "local" } });
    expect((await app.inject("/api/admin/users?query=support")).json()).toMatchObject({ ok: true, data: { redacted: true, items: expect.any(Array) } });
    expect((await app.inject({ method: "POST", url: "/api/admin/exercises", payload: { name: "Nope" } })).statusCode).toBe(403);

    await app.inject({ method: "POST", url: "/api/auth/sign-in", payload: { email: "admin@example.com", mode: "local" } });
    const audit = (await app.inject("/api/admin/audit-logs?resourceType=exercise")).json();
    expect(audit).toMatchObject({ ok: true, data: { total: expect.any(Number), items: expect.any(Array) } });
    expect(audit.data.items.some((item: { action: string }) => item.action === "admin.exercise.create")).toBe(true);
  });

  it("keeps workouts, progression, sync, achievements, leaderboards, coach, notifications, and cron", async () => {
    const today = (await app.inject("/api/workouts/today")).json();
    expect(today).toMatchObject({ ok: true });
    expect((await app.inject({ method: "POST", url: "/api/workouts/planner/preview", payload: { goal: "muscle", daysPerWeek: 3, equipment: ["dumbbell", "bodyweight"] } })).json()).toMatchObject({
      ok: true,
      data: { routine: { daysPerWeek: 3 }, rationale: expect.any(Array) }
    });
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

    const partialSync = (await app.inject({
      method: "POST",
      url: "/api/sync/batch",
      payload: {
        items: [
          { id: "bad-item", idempotencyKey: "idem-bad", type: "unknown.type", payload: {} },
          {
            id: "offline-hydration-2",
            idempotencyKey: "idem-hydration-2",
            type: "hydration.log",
            payload: { id: "offline-hydration-2", amountMl: 350, drinkType: "water", loggedAt: "2026-09-04T00:02:00.000Z" }
          }
        ]
      }
    })).json();
    expect(partialSync.data.results).toMatchObject([{ status: "failed" }, { status: "synced" }]);

    const routineForConflict = (await app.inject({ method: "POST", url: "/api/routines", payload: { name: "Conflict Routine", days: [] } })).json();
    const staleBase = routineForConflict.data.updatedAt;
    await app.inject({ method: "PATCH", url: `/api/routines/${routineForConflict.data.id}`, payload: { name: "Server Routine" } });
    const routineConflict = (await app.inject({
      method: "POST",
      url: "/api/sync/batch",
      payload: {
        items: [
          {
            id: "routine-conflict",
            idempotencyKey: "idem-routine-conflict",
            type: "routine.update",
            payload: { routineId: routineForConflict.data.id, patch: { name: "Offline Routine" }, baseUpdatedAt: staleBase }
          }
        ]
      }
    })).json();
    expect(routineConflict.data.results[0]).toMatchObject({ status: "conflict" });
    const routineConfirm = (await app.inject({
      method: "POST",
      url: "/api/sync/batch",
      payload: {
        items: [
          {
            id: "routine-conflict",
            idempotencyKey: "idem-routine-conflict",
            type: "routine.update",
            payload: { routineId: routineForConflict.data.id, patch: { name: "Offline Routine" }, baseUpdatedAt: staleBase, conflictResolution: "confirm" }
          }
        ]
      }
    })).json();
    expect(routineConfirm.data.results[0]).toMatchObject({ status: "synced", data: { name: "Offline Routine" } });
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

  it("hardens validation, rate limits, cron auth, and CORS contracts", async () => {
    const invalidHydration = await app.inject({ method: "POST", url: "/api/hydration/log", payload: { amountMl: -1 } });
    expect(invalidHydration.statusCode).toBe(400);
    expect(invalidHydration.json()).toMatchObject({
      ok: false,
      error: "Validation failed",
      errorCode: "validation_failed",
      requestId: expect.any(String),
      details: expect.arrayContaining([expect.objectContaining({ field: "body.amountMl" })])
    });

    const cron = await app.inject({ method: "POST", url: "/api/cron/creatine-reminders", headers: { authorization: "Bearer wrong" } });
    expect(cron.statusCode).toBe(401);
    expect(cron.json()).toMatchObject({ ok: false, errorCode: "unauthorized", requestId: expect.any(String) });

    const limitedApp = await buildApp({ API_RATE_LIMIT_PUBLIC_MAX: "1", API_RATE_LIMIT_PUBLIC_WINDOW_MS: "60000" });
    await limitedApp.ready();
    expect((await limitedApp.inject("/api/health")).statusCode).toBe(200);
    const limited = await limitedApp.inject("/api/health");
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toMatchObject({ ok: false, errorCode: "rate_limit_exceeded", details: { group: "public" } });
    await limitedApp.close();

    const corsApp = await buildApp({ API_CORS_ORIGIN: "https://allowed.example" });
    await corsApp.ready();
    const allowed = await corsApp.inject({
      method: "OPTIONS",
      url: "/api/health",
      headers: { origin: "https://allowed.example", "access-control-request-method": "GET" }
    });
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://allowed.example");
    const denied = await corsApp.inject({
      method: "OPTIONS",
      url: "/api/health",
      headers: { origin: "https://evil.example", "access-control-request-method": "GET" }
    });
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    await corsApp.close();
  });
});
