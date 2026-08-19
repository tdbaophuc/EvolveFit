import { describe, expect, it, vi } from "vitest";
import { EvolveFitApiClient } from "./api-client";

describe("EvolveFitApiClient", () => {
  it("calls typed hydration endpoint", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { totalMl: 500 } }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new EvolveFitApiClient("https://app.test");
    const result = await client.hydrationToday();

    expect(fetchMock).toHaveBeenCalledWith("https://app.test/api/hydration/today", expect.objectContaining({ method: "GET" }));
    expect(result).toEqual({ ok: true, data: { totalMl: 500 } });
    vi.unstubAllGlobals();
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
    vi.unstubAllGlobals();
  });
});
