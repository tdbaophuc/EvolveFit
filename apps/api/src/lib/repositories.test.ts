import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../app";
import { bearerTokenFromAuthorization, verifySupabaseJwt } from "./auth";
import { MemoryAppRepository, SupabaseAppRepository, type ApiUser } from "./repositories";

describe("backend repository boundary", () => {
  it("keeps memory state and sync idempotency isolated per user", async () => {
    const repository = new MemoryAppRepository();
    const userA: ApiUser = { id: "user-a", email: "a@example.com", mode: "demo" };
    const userB: ApiUser = { id: "user-b", email: "b@example.com", mode: "demo" };

    const stateA = await repository.loadUserState(userA);
    stateA.hydrationLogs.push({ id: "ha", amountMl: 250, drinkType: "water", loggedAt: "2026-09-04T00:00:00.000Z" });
    await repository.saveUserState(userA, stateA);

    expect((await repository.loadUserState(userA)).hydrationLogs.some((log) => log.id === "ha")).toBe(true);
    expect((await repository.loadUserState(userB)).hydrationLogs.some((log) => log.id === "ha")).toBe(false);

    await repository.saveSyncResult(userA, "idem-1", "hydration.log", { id: "sync-a", type: "hydration.log", status: "synced" });
    expect(await repository.getSyncResult(userA, "idem-1")).toMatchObject({ id: "sync-a", status: "synced" });
    expect(await repository.getSyncResult(userB, "idem-1")).toBeUndefined();

    const firstCron = await repository.runCronOnce(userA, "hydration-reminders:2026-09-04T08", "hydration-reminders", async () => ({ sent: 1 }));
    expect(firstCron).toMatchObject({ status: "ran", lockKey: "hydration-reminders:2026-09-04T08" });
    await expect(
      repository.runCronOnce(userA, "hydration-reminders:2026-09-04T08", "hydration-reminders", async () => ({ sent: 2 }))
    ).resolves.toMatchObject({ status: "skipped", reason: "already-processed" });
    await expect(
      repository.runCronOnce(userB, "hydration-reminders:2026-09-04T08", "hydration-reminders", async () => ({ sent: 2 }))
    ).resolves.toMatchObject({ status: "ran" });
  });

  it("scopes Supabase REST reads/writes by authenticated user id", async () => {
    const calls: { url: string; init: RequestInit; body?: unknown }[] = [];
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const request = input instanceof Request ? input : new Request(input);
      calls.push({
        url: request.url,
        init: { method: request.method, headers: Object.fromEntries(request.headers.entries()) },
        body: request.method === "POST" || request.method === "PATCH" ? await request.clone().json().catch(() => undefined) : undefined
      });
      if (request.url.includes("/rpc/evolvefit_acquire_notification_event_lock")) {
        return Response.json([{ acquired: true, event_id: "00000000-0000-4000-8000-000000000001", reason: null }]);
      }
      return request.method === "GET" ? Response.json([]) : new Response(null, { status: 204 });
    });
    const repository = new SupabaseAppRepository(
      { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" },
      fetchMock
    );
    const user: ApiUser = { id: "user-a", email: "a@example.com", accessToken: "jwt-a", mode: "supabase" };

    await repository.loadUserState(user);
    await repository.saveSyncResult(user, "idem-1", "hydration.log", { id: "item-1", type: "hydration.log", status: "synced" });
    await repository.runCronOnce(user, "monthly-achievements:2026-09", "monthly-achievements", async () => ({ sent: 0 }));

    const getUrls = calls.filter((call) => call.init.method === "GET").map((call) => call.url);
    expect(getUrls.length).toBeGreaterThan(5);
    expect(getUrls.every((url) => url.includes("user_id=eq.user-a"))).toBe(true);
    expect(calls.every((call) => (call.init.headers as Record<string, string>).authorization === "Bearer jwt-a")).toBe(true);
    expect(calls.some((call) => call.url.includes("sync_events?on_conflict=user_id,idempotency_key"))).toBe(true);
    expect(calls.some((call) => Array.isArray(call.body) && call.body[0]?.user_id === "user-a" && call.body[0]?.idempotency_key === "idem-1")).toBe(true);
    expect(calls.some((call) => call.url.includes("rpc/evolvefit_acquire_notification_event_lock"))).toBe(true);
    expect(calls.some((call) => call.url.includes("notification_events?on_conflict=user_id,lock_key"))).toBe(true);
    expect(calls.some((call) => Array.isArray(call.body) && call.body[0]?.user_id === "user-a" && call.body[0]?.lock_key === "monthly-achievements:2026-09")).toBe(true);
  });

  it("requires auth for data endpoints in Supabase mode but keeps health public", async () => {
    const app = await buildApp({
      API_DATA_MODE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
    });
    await app.ready();

    expect((await app.inject("/api/health")).statusCode).toBe(200);
    expect((await app.inject("/api/ready")).statusCode).toBe(503);
    const hydration = await app.inject("/api/hydration/today");
    expect(hydration.statusCode).toBe(401);
    expect(hydration.json()).toMatchObject({ ok: false, error: "Unauthorized" });

    await app.close();
  });

  it("verifies Supabase bearer JWTs through auth endpoint contract", async () => {
    expect(bearerTokenFromAuthorization("Bearer abc.def")).toBe("abc.def");
    const fetchMock = vi.fn(async () => Response.json({ id: "user-a", email: "a@example.com" }));

    await expect(
      verifySupabaseJwt({
        token: "jwt-a",
        env: { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" },
        fetchImpl: fetchMock
      })
    ).resolves.toEqual({ id: "user-a", email: "a@example.com" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/auth/v1/user",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer jwt-a", apikey: "anon" }) })
    );
  });
});
