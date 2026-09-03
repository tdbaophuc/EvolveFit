import { describe, expect, it } from "vitest";
import { GET as healthGet } from "./health/route";
import { GET as sessionGet } from "./auth/session/route";
import { POST as signInPost } from "./auth/sign-in/route";
import { POST as signOutPost } from "./auth/sign-out/route";
import { POST as hydrationPost } from "./hydration/log/route";
import { DELETE as hydrationDelete, PATCH as hydrationPatch } from "./hydration/log/[id]/route";
import { POST as exercisePost, GET as exercisesGet } from "./exercises/route";
import { DELETE as exerciseDelete, PATCH as exercisePatch } from "./exercises/[id]/route";
import { POST as routinePost, GET as routinesGet } from "./routines/route";
import { DELETE as routineDelete, PATCH as routinePatch } from "./routines/[id]/route";
import { POST as sessionPost } from "./workouts/sessions/route";
import { POST as sessionFinishPost } from "./workouts/sessions/[id]/finish/route";
import { POST as sessionPausePost } from "./workouts/sessions/[id]/pause/route";
import { POST as sessionReorderPost } from "./workouts/sessions/[id]/reorder/route";
import { POST as sessionResumePost } from "./workouts/sessions/[id]/resume/route";
import { POST as syncPost } from "./sync/batch/route";

type ApiResult<T = unknown> = { ok: true; data: T; requestId?: string } | { ok: false; error: string; requestId?: string };

function jsonRequest(path: string, body: unknown, headers?: HeadersInit) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body: JSON.stringify(body)
  });
}

function patchRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function params<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

describe("API route contract regression", () => {
  it("keeps health request id and integration status shape", async () => {
    const response = await healthGet(new Request("http://localhost/api/health", { headers: { "x-request-id": "req_contract" } }));
    const payload = (await response.json()) as ApiResult<{ status: string; integrations: unknown }>;

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req_contract");
    expect(payload.ok).toBe(true);
    expect(payload.ok && payload.data).toMatchObject({ app: "evolvefit", runtime: "nextjs" });
    expect(payload).toMatchObject({ requestId: "req_contract" });
  });

  it("keeps auth session, local sign-in, and sign-out response contracts", async () => {
    const sessionResponse = await sessionGet(new Request("http://localhost/api/auth/session", { headers: { "x-request-id": "req_session" } }));
    const sessionPayload = (await sessionResponse.json()) as ApiResult<{ email: string; mode: string }>;
    expect(sessionPayload.ok && sessionPayload.data).toHaveProperty("email");
    expect(sessionPayload).toMatchObject({ requestId: "req_session" });

    const signInResponse = await signInPost(jsonRequest("/api/auth/sign-in", { email: "contract@example.com", mode: "local" }));
    const signInPayload = (await signInResponse.json()) as ApiResult<{ email: string; mode: string }>;
    expect(signInResponse.status).toBe(200);
    expect(signInPayload.ok && signInPayload.data).toMatchObject({ email: "contract@example.com", mode: "local" });

    const signOutResponse = await signOutPost();
    const signOutPayload = (await signOutResponse.json()) as ApiResult<{ email: string; mode: string }>;
    expect(signOutPayload).toEqual({ ok: true, data: { mode: "local", email: "local@evolvefit.app" } });
  });

  it("keeps hydration create, patch, delete, and validation contracts", async () => {
    const invalidResponse = await hydrationPost(jsonRequest("/api/hydration/log", { amountMl: 0 }));
    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toEqual({ ok: false, error: "amountMl must be a positive number" });

    const createResponse = await hydrationPost(jsonRequest("/api/hydration/log", { amountMl: 375 }));
    const createPayload = (await createResponse.json()) as ApiResult<{ id: string; amountMl: number }>;
    expect(createResponse.status).toBe(200);
    expect(createPayload.ok && createPayload.data.amountMl).toBe(375);
    if (!createPayload.ok) return;

    const patchResponse = await hydrationPatch(patchRequest(`/api/hydration/log/${createPayload.data.id}`, { amountMl: 425 }), params({ id: createPayload.data.id }));
    const patchPayload = (await patchResponse.json()) as ApiResult<{ amountMl: number }>;
    expect(patchPayload.ok && patchPayload.data.amountMl).toBe(425);

    const deleteResponse = await hydrationDelete(new Request(`http://localhost/api/hydration/log/${createPayload.data.id}`, { method: "DELETE" }), params({ id: createPayload.data.id }));
    await expect(deleteResponse.json()).resolves.toEqual({ ok: true, data: { id: createPayload.data.id } });
  });

  it("keeps routine and exercise CRUD route contracts", async () => {
    const exerciseResponse = await exercisePost(
      jsonRequest("/api/exercises", { name: "Contract Curl", muscleGroup: "Arms", equipment: "dumbbell", movementPattern: "isolation" })
    );
    const exercisePayload = (await exerciseResponse.json()) as ApiResult<{ id: string; notes?: string }>;
    expect(exercisePayload.ok).toBe(true);
    if (!exercisePayload.ok) return;

    const exercisePatchResponse = await exercisePatch(
      patchRequest(`/api/exercises/${exercisePayload.data.id}`, { notes: "route contract" }),
      params({ id: exercisePayload.data.id })
    );
    const exercisePatchPayload = (await exercisePatchResponse.json()) as ApiResult<{ notes?: string }>;
    expect(exercisePatchPayload.ok && exercisePatchPayload.data.notes).toBe("route contract");
    await expect(exercisesGet().json()).resolves.toMatchObject({ ok: true });

    const routineResponse = await routinePost(jsonRequest("/api/routines", { name: "Contract Routine", daysPerWeek: 1, days: [] }));
    const routinePayload = (await routineResponse.json()) as ApiResult<{ id: string; updatedAt: string; name: string }>;
    expect(routinePayload.ok).toBe(true);
    if (!routinePayload.ok) return;

    const routinePatchResponse = await routinePatch(
      patchRequest(`/api/routines/${routinePayload.data.id}`, { name: "Contract Routine 2", baseUpdatedAt: routinePayload.data.updatedAt }),
      params({ id: routinePayload.data.id })
    );
    const routinePatchPayload = (await routinePatchResponse.json()) as ApiResult<{ name: string }>;
    expect(routinePatchPayload.ok && routinePatchPayload.data.name).toBe("Contract Routine 2");
    await expect(routinesGet().json()).resolves.toMatchObject({ ok: true });

    await expect(exerciseDelete(new Request(`http://localhost/api/exercises/${exercisePayload.data.id}`), params({ id: exercisePayload.data.id })).then((response) => response.json())).resolves.toEqual({
      ok: true,
      data: { id: exercisePayload.data.id }
    });
    await expect(routineDelete(new Request(`http://localhost/api/routines/${routinePayload.data.id}`), params({ id: routinePayload.data.id })).then((response) => response.json())).resolves.toEqual({
      ok: true,
      data: { id: routinePayload.data.id }
    });
  });

  it("keeps workout session lifecycle and reorder contracts", async () => {
    const startResponse = await sessionPost(
      jsonRequest("/api/workouts/sessions", { sessionName: "Contract Session", sessionExerciseOrder: ["contract-ex-1", "contract-ex-2"] })
    );
    const startPayload = (await startResponse.json()) as ApiResult<{ id: string; sessionExerciseOrder: string[]; status: string }>;
    expect(startPayload.ok).toBe(true);
    if (!startPayload.ok) return;

    await expect(sessionPausePost(new Request(`http://localhost/api/workouts/sessions/${startPayload.data.id}/pause`), params({ id: startPayload.data.id })).then((response) => response.json())).resolves.toMatchObject({
      ok: true,
      data: { status: "paused" }
    });
    await expect(sessionResumePost(new Request(`http://localhost/api/workouts/sessions/${startPayload.data.id}/resume`), params({ id: startPayload.data.id })).then((response) => response.json())).resolves.toMatchObject({
      ok: true,
      data: { status: "active" }
    });

    const reorderResponse = await sessionReorderPost(
      jsonRequest(`/api/workouts/sessions/${startPayload.data.id}/reorder`, {
        queue: [
          { exerciseId: "contract-ex-2", status: "queued" },
          { exerciseId: "contract-ex-1", status: "parked" }
        ]
      }),
      params({ id: startPayload.data.id })
    );
    const reorderPayload = (await reorderResponse.json()) as ApiResult<{ sessionExerciseOrder: string[] }>;
    expect(reorderPayload.ok && reorderPayload.data.sessionExerciseOrder).toEqual(["contract-ex-2", "contract-ex-1"]);

    await expect(sessionFinishPost(new Request(`http://localhost/api/workouts/sessions/${startPayload.data.id}/finish`), params({ id: startPayload.data.id })).then((response) => response.json())).resolves.toMatchObject({
      ok: true,
      data: { status: "finished" }
    });
  });

  it("keeps sync batch validation and idempotency contracts", async () => {
    const invalidResponse = await syncPost(jsonRequest("/api/sync/batch", { items: "bad" }));
    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toEqual({ ok: false, error: "items must be an array" });

    const body = {
      idempotencyKey: "route-contract-batch",
      items: [
        {
          id: "route-contract-set",
          type: "workout.set.create",
          idempotencyKey: "route-contract-set-key",
          payload: {
            id: "route-contract-set",
            sessionId: "route-contract-session",
            exerciseId: "route-contract-ex",
            exerciseName: "Contract Press",
            targetWeightKg: 40,
            targetReps: 8,
            actualWeightKg: 40,
            actualReps: 8,
            completedAt: "2026-09-03T00:00:00.000Z"
          }
        }
      ]
    };

    const firstPayload = await syncPost(jsonRequest("/api/sync/batch", body)).then((response) => response.json());
    const secondPayload = await syncPost(jsonRequest("/api/sync/batch", { ...body, items: [{ ...body.items[0], payload: { id: "route-contract-set" } }] })).then((response) => response.json());
    expect(firstPayload).toEqual(secondPayload);
    expect(firstPayload).toMatchObject({ ok: true, data: { results: [{ status: "synced" }] } });
  });
});
