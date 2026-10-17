import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { defaultExerciseCatalog, routineMarketplaceTemplates } from "@evolvefit/shared";
import { buildApp } from "../app";
import { createTestClient } from "../test-client";
import { SupabaseCatalogStore } from "./catalog-store";
import { SupabaseAppRepository } from "./repositories";

const supabaseEnv = {
  API_DATA_MODE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service-role"
};

describe("shared catalog (memory mode)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ ADMIN_BOOTSTRAP_EMAILS: "admin@example.com" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("publishes admin content to every user's catalog", async () => {
    const admin = createTestClient(app);
    await admin({ method: "POST", url: "/api/auth/sign-in", payload: { email: "admin@example.com", mode: "local" } });
    const created = (await admin({
      method: "POST",
      url: "/api/admin/exercises",
      payload: { name: "Catalog Landmine Row", muscleGroup: "Lưng", equipment: "barbell", movementPattern: "pull", status: "published" }
    })).json();
    expect(created).toMatchObject({ ok: true, data: { catalogSource: "marketplace", status: "published" } });

    // A different user (fresh state) sees the published exercise.
    const user = createTestClient(app);
    await user({ method: "POST", url: "/api/auth/sign-in", payload: { email: "member@example.com", mode: "local" } });
    const catalog = (await user("/api/exercises/marketplace?query=landmine&pageSize=50")).json();
    expect(catalog.data.items.map((item: { id: string }) => item.id)).toContain(created.data.id);

    // Drafts stay hidden from users but visible to admins.
    const draft = (await admin({ method: "POST", url: "/api/admin/exercises", payload: { name: "Draft Only Curl", status: "draft" } })).json();
    expect((await user("/api/exercises/marketplace?query=draft%20only")).json().data.items).toHaveLength(0);
    expect((await admin("/api/admin/exercises?query=draft%20only")).json().data.items.map((item: { id: string }) => item.id)).toContain(draft.data.id);
  });

  it("publishes admin routine templates to users", async () => {
    const admin = createTestClient(app);
    await admin({ method: "POST", url: "/api/auth/sign-in", payload: { email: "admin@example.com", mode: "local" } });
    const created = (await admin({
      method: "POST",
      url: "/api/admin/routine-templates",
      payload: { name: "Catalog Push Pull", status: "published", targetGoal: "strength", daysPerWeek: 2 }
    })).json();
    expect(created).toMatchObject({ ok: true, data: { status: "published" } });

    const user = createTestClient(app);
    await user({ method: "POST", url: "/api/auth/sign-in", payload: { email: "member2@example.com", mode: "local" } });
    const templates = (await user("/api/routine-templates?query=catalog%20push&pageSize=50")).json();
    expect(templates.data.items.map((item: { id: string }) => item.id)).toContain(created.data.id);
  });

  it("does not invent leaderboard entries", async () => {
    const user = createTestClient(app);
    const body = (await user("/api/leaderboards")).json();
    const names = body.data.leaderboard.map((entry: { displayName: string }) => entry.displayName);
    expect(names).not.toContain("Minh");
    expect(names).not.toContain("An");
    expect(body.data.leaderboard).toHaveLength(1);
  });
});

describe("shared catalog (Supabase mode)", () => {
  it("loads a user's own exercises and never stores catalog items as user rows", async () => {
    const writes: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      if (request.method !== "GET") {
        if (request.url.includes("exercise_library")) writes.push(await request.text());
        return new Response("[]", { status: 201 });
      }
      if (request.url.includes("exercise_library")) {
        return Response.json([{ id: "22222222-2222-4222-8222-222222222222", user_id: "u1", name: "My Curl", muscle_group: "Tay", equipment: "dumbbell", movement_pattern: "isolation", built_in: false, catalog_source: "custom", status: "published" }]);
      }
      return Response.json([]);
    }) as unknown as typeof fetch;
    const repository = new SupabaseAppRepository(supabaseEnv, fetchImpl);
    const user = { id: "u1", email: "u1@example.com", accessToken: "jwt", mode: "supabase" as const };
    const state = await repository.loadUserState(user);
    expect(state.exerciseLibrary.map((exercise) => exercise.name)).toContain("My Curl");

    await repository.saveUserState(user, { ...state, exerciseLibrary: [...state.exerciseLibrary, ...defaultExerciseCatalog] });
    const stored = writes.flatMap((body) => JSON.parse(body) as { catalog_source: string }[]);
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.every((row) => row.catalog_source === "custom")).toBe(true);
  });

  it("lets guests browse the catalog without signing in", async () => {
    const fetchMock = vi.fn(async () => Response.json([]));
    vi.stubGlobal("fetch", fetchMock);
    const app = await buildApp(supabaseEnv);
    await app.ready();
    const response = await app.inject("/api/exercises/marketplace?pageSize=5");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, data: { items: expect.any(Array), total: expect.any(Number) } });
    expect((await app.inject("/api/routine-templates")).statusCode).toBe(200);
    // Writes still require an account.
    expect((await app.inject("/api/hydration/today")).statusCode).toBe(401);
    await app.close();
    vi.unstubAllGlobals();
  });

  it("stores catalog exercises without an owner, keyed by external_id", async () => {
    const calls: { url: string; method: string; body?: string; prefer: string | null }[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      calls.push({ url: request.url, method: request.method, body: request.method === "GET" ? undefined : await request.text(), prefer: request.headers.get("prefer") });
      return request.method === "GET" ? Response.json([]) : new Response(null, { status: 201 });
    }) as unknown as typeof fetch;
    const store = new SupabaseCatalogStore(supabaseEnv, fetchImpl);

    await store.upsertExercise({ id: "market-test-row", name: "Test Row", muscleGroup: "Lưng", equipment: "cable", movementPattern: "pull", builtIn: true, createdBy: "admin@example.com" });
    const write = calls[0];
    expect(write.url).toContain("exercise_library?on_conflict=external_id");
    expect(write.prefer).toContain("resolution=merge-duplicates");
    const row = JSON.parse(write.body ?? "[]")[0];
    expect(row).toMatchObject({ external_id: "market-test-row", user_id: null, catalog_source: "marketplace", created_by: null });
    expect(row.id).toBeUndefined();
  });

  it("overlays saved catalog rows on the seed and maps template days/slots", async () => {
    const seedTemplate = routineMarketplaceTemplates[0];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = (input as Request).url;
      if (url.includes("exercise_library")) {
        return Response.json([{ id: "11111111-1111-4111-8111-111111111111", external_id: "market-new-row", user_id: null, name: "New Row", muscle_group: "Lưng", equipment: "cable", movement_pattern: "pull", built_in: true, catalog_source: "marketplace", status: "published" }]);
      }
      if (url.includes("routine_template_exercise_slots")) {
        return Response.json([{ id: `${seedTemplate.id}:d1:s1`, template_day_id: `${seedTemplate.id}:d1`, exercise_id: "e1", name: "Squat", muscle_group: "Chân", order_index: 0, target_sets: 3, target_reps_min: 5, target_reps_max: 8, target_weight_kg: "60", rest_seconds: 120, tempo: null, rpe: "8", note: null, substitutions: [] }]);
      }
      if (url.includes("routine_template_days")) {
        return Response.json([{ id: `${seedTemplate.id}:d1`, template_id: seedTemplate.id, name: "Day 1", weekday: "Mon", order_index: 0, estimated_minutes: 60, warmup: null, cooldown: null }]);
      }
      return Response.json([{ ...templateRowFor(seedTemplate.id), name: "Renamed by admin" }]);
    }) as unknown as typeof fetch;
    const snapshot = await new SupabaseCatalogStore(supabaseEnv, fetchImpl).snapshot();

    expect(snapshot.exercises.some((exercise) => exercise.id === "market-new-row")).toBe(true);
    const template = snapshot.templates.find((item) => item.id === seedTemplate.id);
    expect(template?.name).toBe("Renamed by admin");
    expect(template?.days[0]).toMatchObject({ id: "d1", exercises: [{ id: "s1", targetWeightKg: 60, rpe: 8 }] });
    expect(snapshot.templates.length).toBe(routineMarketplaceTemplates.length);
  });
});

function templateRowFor(id: string) {
  return {
    id,
    slug: id,
    name: "",
    summary: "",
    creator_name: "Admin",
    source: null,
    license: "EvolveFit original",
    target_goal: "strength",
    days_per_week: 1,
    minutes_per_session: 60,
    experience_level: "beginner",
    equipment: ["barbell"],
    muscle_priority: [],
    recovery_days: [],
    progression_notes: null,
    deload_notes: null,
    muscle_distribution: {},
    tags: [],
    status: "published",
    visibility: "public",
    version: 2,
    published_at: null,
    updated_at: "2026-10-17T00:00:00.000Z"
  };
}
