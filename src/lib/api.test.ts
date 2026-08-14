import { describe, expect, it } from "vitest";
import {
  createSupplement,
  deleteHydrationLog,
  getHydrationToday,
  hydrationReminderEvents,
  sendHydrationReminderEvents,
  coachRecommend,
  logHydration,
  logSupplement,
  recalculateAchievements,
  patchHydrationLog,
  subscribeNotifications,
  updateLeaderboardVisibility,
  unsubscribeNotifications
} from "./api";

describe("api service layer", () => {
  it("logs, patches, and deletes hydration entries", () => {
    const logged = logHydration(300);
    expect(logged.ok).toBe(true);
    if (!logged.ok) return;

    const patched = patchHydrationLog(logged.data.id, 450);
    expect(patched.ok && patched.data.amountMl).toBe(450);

    const today = getHydrationToday();
    expect(today.ok && today.data.logs.some((log) => log.id === logged.data.id)).toBe(true);

    const deleted = deleteHydrationLog(logged.data.id);
    expect(deleted.ok).toBe(true);
  });

  it("validates supplement creation and logging", () => {
    expect(createSupplement({ name: "", defaultAmount: 5 }).ok).toBe(false);
    const created = createSupplement({ name: "Omega-3", defaultAmount: 2 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const logged = logSupplement({ supplementId: created.data.id, name: "Omega-3", amount: 2 });
    expect(logged.ok).toBe(true);
    expect(logged.ok && logged.data.supplementId).toBe(created.data.id);
    expect(logSupplement({ supplementId: created.data.id, name: "Omega-3", amount: 0, status: "skipped", skippedReason: "late" }).ok).toBe(true);
  });

  it("recalculates achievements and toggles leaderboard visibility", () => {
    expect(recalculateAchievements().ok).toBe(true);
    const visibility = updateLeaderboardVisibility(true);
    expect(visibility).toEqual({ ok: true, data: { isPublic: true } });
  });

  it("stores and removes notification subscriptions", () => {
    const subscription = subscribeNotifications({ endpoint: "https://push.test/1", p256dh: "key", auth: "auth" });
    expect(subscription.ok).toBe(true);
    expect(unsubscribeNotifications("https://push.test/1").ok).toBe(true);
  });

  it("returns cron reminder event shape", () => {
    const result = hydrationReminderEvents(new Date(2026, 7, 14, 14, 0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("shouldSend");
    expect(result.data).toHaveProperty("event");
  });

  it("cron sender returns safe payload without VAPID env", async () => {
    const logged = logHydration(100);
    expect(logged.ok).toBe(true);
    const result = await sendHydrationReminderEvents(new Date(2026, 7, 14, 22, 0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("sent");
  });

  it("returns coach recommendation through AI fallback contract", async () => {
    const result = await coachRecommend();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveProperty("mode");
    expect(["rule-fallback", "gemini", "openai"]).toContain(result.data.mode);
  });
});
