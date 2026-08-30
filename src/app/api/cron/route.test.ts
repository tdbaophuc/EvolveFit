import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as creatinePost } from "./creatine-reminders/route";
import { POST as hydrationPost } from "./hydration-reminders/route";
import { POST as monthlyPost } from "./monthly-achievements/route";
import { sendCreatineReminderEvents, sendHydrationReminderEvents, sendMonthlyAchievementEvents } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  sendCreatineReminderEvents: vi.fn(async () => ({ ok: true, data: { sent: 1, kind: "creatine" } })),
  sendHydrationReminderEvents: vi.fn(async () => ({ ok: true, data: { sent: 1, kind: "hydration" } })),
  sendMonthlyAchievementEvents: vi.fn(async () => ({ ok: true, data: { sent: 1, kind: "monthly" } }))
}));

const mockedHydration = vi.mocked(sendHydrationReminderEvents);
const mockedCreatine = vi.mocked(sendCreatineReminderEvents);
const mockedMonthly = vi.mocked(sendMonthlyAchievementEvents);

function cronRequest(secret?: string) {
  return new Request("http://localhost/api/cron/hydration-reminders", {
    method: "POST",
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined
  });
}

describe("cron API routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("rejects cron calls when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await hydrationPost(cronRequest("secret"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "CRON_SECRET is not configured" });
    expect(mockedHydration).not.toHaveBeenCalled();
  });

  it("rejects cron calls without the matching bearer secret", async () => {
    vi.stubEnv("CRON_SECRET", "real-secret");

    const response = await creatinePost(cronRequest("wrong-secret"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    expect(mockedCreatine).not.toHaveBeenCalled();
  });

  it("runs all cron handlers with the matching bearer secret", async () => {
    vi.stubEnv("CRON_SECRET", "real-secret");

    const hydration = await hydrationPost(cronRequest("real-secret"));
    const creatine = await creatinePost(cronRequest("real-secret"));
    const monthly = await monthlyPost(cronRequest("real-secret"));

    await expect(hydration.json()).resolves.toEqual({ ok: true, data: { sent: 1, kind: "hydration" } });
    await expect(creatine.json()).resolves.toEqual({ ok: true, data: { sent: 1, kind: "creatine" } });
    await expect(monthly.json()).resolves.toEqual({ ok: true, data: { sent: 1, kind: "monthly" } });
    expect(mockedHydration).toHaveBeenCalledTimes(1);
    expect(mockedCreatine).toHaveBeenCalledTimes(1);
    expect(mockedMonthly).toHaveBeenCalledTimes(1);
  });
});
