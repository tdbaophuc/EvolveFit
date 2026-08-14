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
});
