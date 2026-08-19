import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  defaultDrinkModules,
  builtInExerciseDefinitions,
  createCustomExerciseDefinition,
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
  parseRoutineCsv,
  filterExerciseLibrary,
  migrateWorkoutExercisesToRoutine,
  readinessScore,
  enqueueSync,
  markSyncQueue,
  progressiveOverloadRecommendation,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  suggestedRoutineTemplate,
  suggestedWaterTargetMl,
  selectedWorkoutDay,
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

  it("honors fixed reminder slots and does not repeat the same slot", () => {
    const now = new Date(2026, 7, 14, 10, 5);
    const params = {
      totalMl: 300,
      expectedMl: 1200,
      now,
      quietHours: { start: 23, end: 6 },
      mode: "fixed" as const,
      times: [9, 10, 14],
      intervalHours: 2
    };

    expect(shouldSendHydrationReminder(params)).toBe(true);
    expect(shouldSendHydrationReminder({ ...params, lastReminderAt: new Date(2026, 7, 14, 10, 1).toISOString() })).toBe(false);
  });

  it("honors interval reminders, snooze and quiet-hour opt out", () => {
    const now = new Date(2026, 7, 14, 14, 0);
    const base = {
      totalMl: 300,
      expectedMl: 1500,
      now,
      quietHours: { start: 23, end: 6 },
      mode: "interval" as const,
      intervalHours: 2
    };

    expect(shouldSendHydrationReminder({ ...base, lastReminderAt: new Date(2026, 7, 14, 13, 0).toISOString() })).toBe(false);
    expect(shouldSendHydrationReminder({ ...base, snoozeUntil: new Date(2026, 7, 14, 14, 30).toISOString() })).toBe(false);
    expect(shouldSendHydrationReminder({ ...base, now: new Date(2026, 7, 14, 23, 30) })).toBe(false);
    expect(shouldSendHydrationReminder({ ...base, now: new Date(2026, 7, 14, 23, 30), quietHoursEnabled: false })).toBe(true);
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

describe("routine import parser", () => {
  it("parses the public sample CSV without errors and includes session/day", () => {
    const sample = readFileSync(join(process.cwd(), "public/samples/evolvefit-routine-template.csv"), "utf-8");
    const preview = parseRoutineCsv(sample, "evolvefit-routine-template.csv");

    expect(preview.errors).toEqual([]);
    expect(preview.rows).toHaveLength(6);
    expect(preview.rows[0]).toMatchObject({
      session: "Push Day",
      day: "Monday",
      name: "Incline Bench Press",
      muscleGroup: "Chest",
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 10,
      targetWeightKg: 42.5,
      restSeconds: 90
    });
  });

  it("supports Vietnamese and English column aliases", () => {
    const csv = [
      "Buổi tập,Ngày,Tên bài tập,Nhóm cơ,Số set,Rep tối thiểu,Rep tối đa,Tạ,Nghỉ giây,Ghi chú",
      "Push,T2,Incline Bench Press,Ngực,3,8,10,42.5,90,Tempo control"
    ].join("\n");
    const preview = parseRoutineCsv(csv, "alias.csv");

    expect(preview.errors).toEqual([]);
    expect(preview.rows[0]).toMatchObject({ session: "Push", day: "T2", name: "Incline Bench Press" });
  });

  it("reports missing required columns clearly", () => {
    const preview = parseRoutineCsv("session,day,exercise,sets,reps max\nPush,Monday,Bench,3,10", "missing.csv");

    expect(preview.rows).toEqual([]);
    expect(preview.errors).toContain("Missing required column: muscle group.");
    expect(preview.errors).toContain("Missing required column: reps min.");
    expect(preview.errors).toContain("Missing required column: weight.");
    expect(preview.errors).toContain("Missing required column: rest seconds.");
  });

  it("reports invalid row values with line and column context", () => {
    const csv = [
      "session,day,exercise,muscle group,sets,reps min,reps max,weight,rest seconds,note",
      "Push,Monday,,Chest,0,12,8,-1,5,Bad row"
    ].join("\n");
    const preview = parseRoutineCsv(csv, "invalid.csv");

    expect(preview.rows).toEqual([]);
    expect(preview.errors).toEqual(
      expect.arrayContaining([
        "Line 2, column exercise: value is required.",
        "Line 2, column sets: must be a positive integer.",
        "Line 2, column reps min: must be less than or equal to reps max.",
        "Line 2, column weight: must be zero or positive.",
        "Line 2, column rest seconds: must be at least 15."
      ])
    );
  });

  it("detects duplicate exercise in the same session", () => {
    const csv = [
      "session,day,exercise,muscle group,sets,reps min,reps max,weight,rest seconds,note",
      "Push,Monday,Bench Press,Chest,3,8,10,60,90,",
      "Push,Monday,Bench Press,Chest,3,8,10,60,90,",
      "Pull,Wednesday,Bench Press,Chest,3,8,10,60,90,"
    ].join("\n");
    const preview = parseRoutineCsv(csv, "duplicate.csv");

    expect(preview.rows).toHaveLength(2);
    expect(preview.errors).toContain('Line 3, column exercise: duplicate exercise "Bench Press" in session "Push".');
  });
});

describe("routine model and exercise library", () => {
  it("migrates legacy workout exercises into a routine without losing targets", () => {
    const legacy = [
      {
        id: "ex-1",
        name: "Bench Press",
        muscleGroup: "Chest",
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetWeightKg: 60,
        restSeconds: 90,
        lastSession: "60kg x 8"
      }
    ];
    const routine = migrateWorkoutExercisesToRoutine(legacy, { routineId: "r1", name: "Migrated", day: "Wed", dayName: "Upper" });

    expect(routine).toMatchObject({ id: "r1", name: "Migrated", daysPerWeek: 1 });
    expect(routine.days[0]).toMatchObject({ name: "Upper", day: "Wed" });
    expect(routine.days[0].exercises[0]).toMatchObject({ name: "Bench Press", targetWeightKg: 60, order: 0 });
  });

  it("selects the workout day matching the date weekday with fallback to first day", () => {
    const routine = migrateWorkoutExercisesToRoutine([], { routineId: "r2" });
    routine.days = [
      { id: "d1", name: "Push", day: "Mon", order: 0, exercises: [] },
      { id: "d2", name: "Pull", day: "Wed", order: 1, exercises: [] }
    ];

    expect(selectedWorkoutDay(routine, new Date("2026-08-19T08:00:00.000Z"))?.id).toBe("d2");
    expect(selectedWorkoutDay(routine, new Date("2026-08-20T08:00:00.000Z"))?.id).toBe("d1");
  });

  it("filters the exercise library by search, muscle and equipment", () => {
    const results = filterExerciseLibrary(builtInExerciseDefinitions, {
      query: "press",
      muscleGroup: "Chest",
      equipment: "barbell"
    });

    expect(results.map((exercise) => exercise.name)).toEqual(["Barbell Bench Press"]);
  });

  it("creates custom exercise definitions as editable non-built-in records", () => {
    const custom = createCustomExerciseDefinition({
      name: "Reverse Sled Drag",
      muscleGroup: "Legs",
      equipment: "other",
      movementPattern: "lunge"
    });

    expect(custom).toMatchObject({
      name: "Reverse Sled Drag",
      muscleGroup: "Legs",
      equipment: "other",
      movementPattern: "lunge",
      builtIn: false
    });
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

  it("does not remind for creatine when skipped today, snoozed, quiet, or fixed slot already reminded", () => {
    const now = new Date(2026, 7, 14, 16, 50);
    const base = {
      logs: [],
      scheduledHour: 17,
      scheduleHours: [17],
      remindBeforeMinutes: 15,
      now,
      quietHours: { start: 23, end: 6 },
      mode: "fixed" as const
    };

    expect(shouldSendCreatineReminder(base)).toBe(true);
    expect(
      shouldSendCreatineReminder({
        ...base,
        logs: [{ id: "skip-1", name: "Creatine", amount: 5, unit: "g", status: "skipped", loggedAt: "2026-08-14T08:00:00.000Z" }]
      })
    ).toBe(false);
    expect(shouldSendCreatineReminder({ ...base, snoozeUntil: new Date(2026, 7, 14, 17, 30).toISOString() })).toBe(false);
    expect(shouldSendCreatineReminder({ ...base, now: new Date(2026, 7, 14, 23, 30) })).toBe(false);
    expect(shouldSendCreatineReminder({ ...base, lastReminderAt: new Date(2026, 7, 14, 16, 46).toISOString() })).toBe(false);
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
