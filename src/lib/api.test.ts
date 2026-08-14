import { describe, expect, it } from "vitest";
import {
  createSupplement,
  deleteHydrationLog,
  getHydrationToday,
  hydrationReminderEvents,
  logHydration,
  logSupplement,
  patchHydrationLog,
  subscribeNotifications,
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
    expect(createSupplement({ name: "Omega-3", defaultAmount: 2 }).ok).toBe(true);
    expect(logSupplement({ name: "Omega-3", amount: 2 }).ok).toBe(true);
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
});
