import { describe, expect, it } from "vitest";
import {
  defaultDrinkModules,
  expectedHydrationByNow,
  bodyWeightDelta,
  exportAppData,
  hydrationPaceStatus,
  hydrationPercent,
  hydrationTotal,
  isDrinkModuleActive,
  monthlyAchievements,
  latestBodyMetric,
  normalizeDrinkModules,
  readinessScore,
  enqueueSync,
  markSyncQueue,
  progressiveOverloadRecommendation,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  suggestedRoutineTemplate,
  suggestedWaterTargetMl,
  toCsv,
  upsertQuickAmount,
  visibleHydrationLogs,
  visibleQuickAmounts
} from "./core";

describe("hydration logic", () => {
  it("calculates daily total and percent", () => {
    const date = new Date("2026-08-14T12:00:00.000Z");
    const logs = [
      { id: "1", amountMl: 250, drinkType: "water" as const, loggedAt: "2026-08-14T07:00:00.000Z" },
      { id: "2", amountMl: 500, drinkType: "water" as const, loggedAt: "2026-08-14T09:00:00.000Z" },
      { id: "3", amountMl: 500, drinkType: "water" as const, loggedAt: "2026-08-13T09:00:00.000Z" }
    ];

    expect(hydrationTotal(logs, date)).toBe(750);
    expect(hydrationPercent(750, 2500)).toBe(30);
  });

  it("knows when the user is behind and should be reminded", () => {
    const now = new Date("2026-08-14T14:00:00.000Z");
    const expected = expectedHydrationByNow(2500, 6, 23, now);

    expect(hydrationPaceStatus(700, expected)).toBe("behind");
    expect(
      shouldSendHydrationReminder({
        totalMl: 700,
        expectedMl: expected,
        lastLogAt: "2026-08-14T10:00:00.000Z",
        now,
        quietHours: { start: 23, end: 6 }
      })
    ).toBe(true);
  });

  it("does not send reminders during quiet hours", () => {
    expect(
      shouldSendHydrationReminder({
        totalMl: 100,
        expectedMl: 1000,
        now: new Date(2026, 7, 14, 23, 30),
        quietHours: { start: 23, end: 6 }
      })
    ).toBe(false);
  });

  it("keeps water always active and filters inactive optional drink logs from visible history", () => {
    const modules = normalizeDrinkModules([
      { ...defaultDrinkModules[0], active: false },
      { ...defaultDrinkModules[2], active: false }
    ]);
    const logs = [
      { id: "1", amountMl: 500, drinkType: "water" as const, loggedAt: "2026-08-14T07:00:00.000Z" },
      { id: "2", amountMl: 300, drinkType: "coffee" as const, loggedAt: "2026-08-14T08:00:00.000Z" }
    ];

    expect(isDrinkModuleActive(modules, "water")).toBe(true);
    expect(visibleHydrationLogs(logs, modules).map((log) => log.drinkType)).toEqual(["water"]);
    expect(visibleHydrationLogs(logs, modules, true)).toHaveLength(2);
  });

  it("counts active optional drinks by hydration factor and ignores inactive drinks", () => {
    const date = new Date("2026-08-14T12:00:00.000Z");
    const logs = [
      { id: "1", amountMl: 500, drinkType: "water" as const, loggedAt: "2026-08-14T07:00:00.000Z" },
      { id: "2", amountMl: 500, drinkType: "coffee" as const, loggedAt: "2026-08-14T08:00:00.000Z" },
      { id: "3", amountMl: 500, drinkType: "tea" as const, loggedAt: "2026-08-14T09:00:00.000Z" }
    ];
    const modules = normalizeDrinkModules([
      { ...defaultDrinkModules[2], active: true, hydrationFactor: 0.8 },
      { ...defaultDrinkModules[3], active: false, hydrationFactor: 0.9 }
    ]);

    expect(hydrationTotal(logs, date, modules)).toBe(900);
  });

  it("does not send hydration reminders when the module reminder is disabled", () => {
    expect(
      shouldSendHydrationReminder({
        totalMl: 100,
        expectedMl: 1000,
        now: new Date("2026-08-14T14:00:00.000Z"),
        quietHours: { start: 23, end: 6 },
        enabled: false
      })
    ).toBe(false);
  });
});

describe("quick amount logic", () => {
  it("pins and sorts frequently used quick amounts", () => {
    const amounts = upsertQuickAmount(
      [
        { id: "a", category: "hydration" as const, label: "+250ml", amount: 250, unit: "ml" as const, pinned: true, uses: 2 },
        { id: "b", category: "hydration" as const, label: "+500ml", amount: 500, unit: "ml" as const, pinned: true, uses: 9 }
      ],
      { category: "hydration", label: "+250ml", amount: 250, unit: "ml", pinned: true }
    );

    expect(visibleQuickAmounts(amounts, "hydration", 2).map((item) => item.amount)).toEqual([500, 250]);
  });
});

describe("onboarding suggestions", () => {
  it("suggests water from body weight and training frequency", () => {
    expect(suggestedWaterTargetMl(72, 3)).toBe(2750);
    expect(suggestedWaterTargetMl(0, 3)).toBe(2500);
  });

  it("suggests a routine template from workout days", () => {
    expect(suggestedRoutineTemplate(2)).toBe("full-body");
    expect(suggestedRoutineTemplate(4)).toBe("upper-lower");
    expect(suggestedRoutineTemplate(6)).toBe("ppl");
  });
});

describe("supplement reminders", () => {
  it("reminds before scheduled creatine time if not logged", () => {
    expect(
      shouldSendCreatineReminder({
        logs: [],
        scheduledHour: 17,
        remindBeforeMinutes: 15,
        now: new Date("2026-08-14T16:45:00.000Z")
      })
    ).toBe(true);
  });

  it("does not remind after creatine was logged today", () => {
    expect(
      shouldSendCreatineReminder({
        logs: [{ id: "1", name: "Creatine", amount: 5, unit: "g", loggedAt: "2026-08-14T08:00:00.000Z" }],
        scheduledHour: 17,
        remindBeforeMinutes: 15,
        now: new Date("2026-08-14T16:45:00.000Z")
      })
    ).toBe(false);
  });

  it("does not remind when creatine module reminders are disabled", () => {
    expect(
      shouldSendCreatineReminder({
        logs: [],
        scheduledHour: 17,
        remindBeforeMinutes: 15,
        now: new Date("2026-08-14T16:45:00.000Z"),
        enabled: false
      })
    ).toBe(false);
  });
});

describe("progressive overload", () => {
  it("increases weight after all sets hit top reps", () => {
    const rec = progressiveOverloadRecommendation({
      exerciseName: "Bench",
      targetWeightKg: 50,
      targetRepsMax: 10,
      recentSets: [
        { actualWeightKg: 50, actualReps: 10, rpe: 8 },
        { actualWeightKg: 50, actualReps: 10, rpe: 8 }
      ]
    });

    expect(rec.action).toBe("increase");
    expect(rec.nextWeightKg).toBe(52.5);
  });

  it("deloads after very hard failed work", () => {
    const rec = progressiveOverloadRecommendation({
      exerciseName: "Squat",
      targetWeightKg: 100,
      targetRepsMax: 8,
      recentSets: [{ actualWeightKg: 100, actualReps: 3, rpe: 10 }]
    });

    expect(rec.action).toBe("deload");
    expect(rec.nextWeightKg).toBe(90);
  });
});

describe("monthly achievements", () => {
  it("activates monthly badges with rolling streaks", () => {
    const badges = monthlyAchievements({
      hydrationGoalDays: 24,
      hydrationTargetDays: 24,
      volumeChangePercent: 6,
      previousHydrationStreak: 2,
      previousVolumeStreak: 1
    });

    expect(badges[0]).toMatchObject({ status: "active", streakMonths: 3 });
    expect(badges[1]).toMatchObject({ status: "active", streakMonths: 2 });
  });
});

describe("body metrics and export", () => {
  it("finds latest body metric and weight delta", () => {
    const metrics = [
      { id: "1", measuredAt: "2026-08-01T07:00:00.000Z", weightKg: 73, heightCm: 174 },
      { id: "2", measuredAt: "2026-08-14T07:00:00.000Z", weightKg: 71.8, heightCm: 174 }
    ];

    expect(latestBodyMetric(metrics)?.weightKg).toBe(71.8);
    expect(bodyWeightDelta(metrics)).toBe(-1.2);
  });

  it("exports app data as readable json", () => {
    const exported = exportAppData({ hydrationLogs: [{ amountMl: 500 }] });

    expect(exported).toContain('"hydrationLogs"');
    expect(JSON.parse(exported).hydrationLogs[0].amountMl).toBe(500);
  });

  it("exports csv with escaped values", () => {
    expect(toCsv([{ name: "Water, cold", amount: 500 }])).toBe('name,amount\n"Water, cold",500');
  });
});

describe("readiness score", () => {
  it("scores high energy and low stress higher", () => {
    expect(readinessScore({ energy: 5, sleepQuality: 5, soreness: 1, stress: 1 })).toBe(100);
    expect(readinessScore({ energy: 1, sleepQuality: 1, soreness: 5, stress: 5 })).toBe(20);
  });
});

describe("offline sync queue", () => {
  it("enqueues pending work and marks it synced", () => {
    const queue = enqueueSync([], { type: "hydration.log", payload: { amountMl: 250 } });
    expect(queue[0]).toMatchObject({ type: "hydration.log", status: "pending" });
    expect(markSyncQueue(queue, "synced")[0].status).toBe("synced");
  });
});
