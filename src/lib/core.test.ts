import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  defaultDrinkModules,
  defaultHealthIntegrationSettings,
  defaultPlateSettings,
  defaultSocialPrivacySettings,
  builtInExerciseDefinitions,
  buildBadgeSharePreview,
  buildBodyMetricChartDataset,
  buildProgressDashboard,
  buildProgressReports,
  buildWorkoutSummarySharePreview,
  calculatePlatesPerSide,
  completeSessionExercise,
  createCustomExerciseDefinition,
  createWorkoutSession,
  expectedHydrationByNow,
  finishWorkoutSession,
  bodyWeightDelta,
  exportAppData,
  hydrationPaceStatus,
  hydrationPercent,
  hydrationTotal,
  canSyncHealthData,
  healthIntegrationPrivacyCopy,
  isWorkingVolumeSet,
  isDrinkModuleActive,
  monthlyAchievements,
  latestBodyMetric,
  kgToLb,
  lbToKg,
  normalizeDrinkModules,
  parseRoutineCsv,
  parkSessionExercise,
  privateFriendLeaderboard,
  publishSharePreview,
  requestHealthIntegrationPermission,
  filterExerciseLibrary,
  migrateWorkoutExercisesToRoutine,
  migrateLegacyWorkoutSession,
  nextSupersetExerciseIndex,
  reorderSessionExerciseQueue,
  revokeHealthIntegrationPermission,
  readinessScore,
  validateBodyMetric,
  enqueueSync,
  exercisePersonalRecords,
  detectWorkoutSetPrs,
  saveSessionExerciseOrderToRoutine,
  markSyncItemConflict,
  markSyncItemFailed,
  markSyncItemSynced,
  markSyncItemSyncing,
  markSyncQueue,
  progressiveOverloadRecommendation,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  suggestedRoutineTemplate,
  suggestedWaterTargetMl,
  selectedWorkoutDay,
  workoutSessionDurationSeconds,
  toCsv,
  upsertQuickAmount,
  visibleHydrationLogs,
  visibleQuickAmounts,
  warmUpSetSuggestions,
  workingSetVolumeKg
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
    expect(preview.rows[1]).toMatchObject({ name: "Seated Shoulder Press", supersetGroup: "A1" });
    expect(preview.rows[2]).toMatchObject({ name: "Cable Triceps Pushdown", supersetGroup: "A1" });
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

describe("workout session model", () => {
  it("calculates workout session duration from start to end", () => {
    expect(
      workoutSessionDurationSeconds(
        { startedAt: "2026-08-20T08:00:00.000Z", endedAt: "2026-08-20T08:45:30.000Z" },
        new Date("2026-08-20T09:00:00.000Z")
      )
    ).toBe(2730);
  });

  it("starts and finishes a workout session with exercise order", () => {
    const session = createWorkoutSession({
      routineId: "routine-1",
      workoutDayId: "day-1",
      sessionName: "Push Day",
      sessionExerciseOrder: ["bench", "press"],
      now: new Date("2026-08-20T08:00:00.000Z")
    });
    const finished = finishWorkoutSession(session, new Date("2026-08-20T09:15:00.000Z"));

    expect(session).toMatchObject({
      routineId: "routine-1",
      workoutDayId: "day-1",
      sessionName: "Push Day",
      status: "active",
      sessionExerciseOrder: ["bench", "press"]
    });
    expect(finished).toMatchObject({ status: "finished", durationSeconds: 4500, endedAt: "2026-08-20T09:15:00.000Z" });
  });

  it("reorders the session queue without mutating the source routine", () => {
    const routine = migrateWorkoutExercisesToRoutine(
      [
        {
          id: "bench",
          name: "Bench Press",
          muscleGroup: "Chest",
          targetSets: 3,
          targetRepsMin: 6,
          targetRepsMax: 8,
          targetWeightKg: 60,
          restSeconds: 120,
          lastSession: "60kg x 8"
        },
        {
          id: "row",
          name: "Row",
          muscleGroup: "Back",
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 10,
          targetWeightKg: 42.5,
          restSeconds: 90,
          lastSession: "42.5kg x 10"
        }
      ],
      { routineId: "routine-queue", dayName: "Upper" }
    );
    const session = createWorkoutSession({
      routineId: routine.id,
      workoutDayId: routine.days[0].id,
      sessionName: routine.days[0].name,
      sessionExerciseOrder: routine.days[0].exercises.map((exercise) => exercise.id)
    });

    const reordered = reorderSessionExerciseQueue(session, "row", -1);

    expect(reordered.exerciseQueue.map((item) => item.exerciseId)).toEqual(["row", "bench"]);
    expect(routine.days[0].exercises.map((exercise) => exercise.id)).toEqual(["bench", "row"]);
  });

  it("parks skipped exercise and allows returning before it is completed", () => {
    const session = createWorkoutSession({
      routineId: "routine-1",
      workoutDayId: "day-1",
      sessionName: "Push Day",
      sessionExerciseOrder: ["bench", "press", "triceps"]
    });

    const parked = parkSessionExercise(session, "bench");
    const returned = completeSessionExercise(parked, "bench");

    expect(parked.exerciseQueue.map((item) => `${item.exerciseId}:${item.status}`)).toEqual([
      "press:queued",
      "triceps:queued",
      "bench:parked"
    ]);
    expect(returned.exerciseQueue.find((item) => item.exerciseId === "bench")?.status).toBe("completed");
  });

  it("saves session queue order to the routine only when requested", () => {
    const routine = migrateWorkoutExercisesToRoutine(
      [
        {
          id: "bench",
          name: "Bench Press",
          muscleGroup: "Chest",
          targetSets: 3,
          targetRepsMin: 6,
          targetRepsMax: 8,
          targetWeightKg: 60,
          restSeconds: 120,
          lastSession: "60kg x 8"
        },
        {
          id: "press",
          name: "Shoulder Press",
          muscleGroup: "Shoulders",
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 10,
          targetWeightKg: 24,
          restSeconds: 90,
          lastSession: "24kg x 8"
        },
        {
          id: "triceps",
          name: "Triceps Pushdown",
          muscleGroup: "Arms",
          targetSets: 3,
          targetRepsMin: 10,
          targetRepsMax: 12,
          targetWeightKg: 31,
          restSeconds: 60,
          lastSession: "31kg x 12"
        }
      ],
      { routineId: "routine-save", dayName: "Push" }
    );
    const session = createWorkoutSession({
      routineId: routine.id,
      workoutDayId: routine.days[0].id,
      sessionName: "Push",
      sessionExerciseOrder: ["bench", "press", "triceps"]
    });
    const sessionOnly = reorderSessionExerciseQueue(session, "triceps", -1);
    const saved = saveSessionExerciseOrderToRoutine(routine, routine.days[0].id, sessionOnly.exerciseQueue);

    expect(routine.days[0].exercises.map((exercise) => exercise.id)).toEqual(["bench", "press", "triceps"]);
    expect(saved.days[0].exercises.map((exercise) => exercise.id)).toEqual(["bench", "triceps", "press"]);
    expect(saved.days[0].exercises.map((exercise) => exercise.order)).toEqual([0, 1, 2]);
  });

  it("migrates legacy workout sets into a finished legacy session", () => {
    const legacySets = [
      {
        id: "set-1",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 60,
        actualReps: 8,
        completedAt: "2026-08-20T08:10:00.000Z"
      },
      {
        id: "set-2",
        exerciseId: "row",
        exerciseName: "Row",
        targetWeightKg: 40,
        targetReps: 10,
        actualWeightKg: 40,
        actualReps: 10,
        completedAt: "2026-08-20T08:40:00.000Z"
      }
    ];
    const migrated = migrateLegacyWorkoutSession({
      sets: legacySets,
      routineId: "routine-1",
      workoutDayId: "day-1",
      sessionName: "Upper"
    });

    expect(migrated.sessions).toHaveLength(1);
    expect(migrated.sessions[0]).toMatchObject({ id: "session-legacy", status: "finished", sessionExerciseOrder: ["bench", "row"] });
    expect(migrated.sets.every((set) => set.sessionId === "session-legacy")).toBe(true);
  });
});

describe("progress dashboard aggregation", () => {
  it("counts working, drop and failure sets for volume while excluding warm-up and skipped sets", () => {
    const sets = [
      {
        id: "warm",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        setType: "warmup" as const,
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 30,
        actualReps: 6
      },
      {
        id: "legacy-working",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 60,
        actualReps: 8
      },
      {
        id: "drop",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        setType: "drop" as const,
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 45,
        actualReps: 10
      },
      {
        id: "failure",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        setType: "failure" as const,
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 50,
        actualReps: 9
      },
      {
        id: "skip",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        setType: "working" as const,
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 60,
        actualReps: 0
      }
    ];

    expect(sets.map(isWorkingVolumeSet)).toEqual([false, true, true, true, false]);
    expect(workingSetVolumeKg(sets)).toBe(1380);
    expect(exercisePersonalRecords(sets)).toEqual([
      {
        exerciseId: "bench",
        exerciseName: "Bench Press",
        maxWeightKg: 60,
        maxReps: 10,
        estimatedOneRepMaxKg: 76,
        volumePrKg: 480
      }
    ]);
  });

  it("suggests warm-up sets below working weight rounded to plate increments", () => {
    expect(warmUpSetSuggestions({ workingWeightKg: 100, workingReps: 8 })).toEqual([
      { setType: "warmup", weightKg: 40, reps: 8, percent: 40 },
      { setType: "warmup", weightKg: 60, reps: 5, percent: 60 },
      { setType: "warmup", weightKg: 80, reps: 3, percent: 80 }
    ]);
    expect(warmUpSetSuggestions({ workingWeightKg: 0, workingReps: 10 })).toEqual([]);
  });

  it("alternates through a superset group until each exercise reaches target sets", () => {
    const exercises = [
      {
        id: "curl",
        name: "Curl",
        muscleGroup: "Arms",
        supersetGroup: "A1",
        targetSets: 2,
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetWeightKg: 12,
        restSeconds: 45,
        lastSession: ""
      },
      {
        id: "pressdown",
        name: "Pressdown",
        muscleGroup: "Arms",
        supersetGroup: "A1",
        targetSets: 2,
        targetRepsMin: 10,
        targetRepsMax: 12,
        targetWeightKg: 25,
        restSeconds: 45,
        lastSession: ""
      },
      {
        id: "plank",
        name: "Plank",
        muscleGroup: "Core",
        targetSets: 2,
        targetRepsMin: 1,
        targetRepsMax: 1,
        targetWeightKg: 0,
        restSeconds: 45,
        lastSession: ""
      }
    ];

    expect(
      nextSupersetExerciseIndex({
        exercises,
        currentIndex: 0,
        sets: [
          {
            id: "curl-1",
            exerciseId: "curl",
            exerciseName: "Curl",
            targetWeightKg: 12,
            targetReps: 10,
            actualWeightKg: 12,
            actualReps: 10
          }
        ]
      })
    ).toBe(1);
    expect(
      nextSupersetExerciseIndex({
        exercises,
        currentIndex: 1,
        sets: [
          {
            id: "curl-1",
            exerciseId: "curl",
            exerciseName: "Curl",
            targetWeightKg: 12,
            targetReps: 10,
            actualWeightKg: 12,
            actualReps: 10
          },
          {
            id: "pressdown-1",
            exerciseId: "pressdown",
            exerciseName: "Pressdown",
            targetWeightKg: 25,
            targetReps: 10,
            actualWeightKg: 25,
            actualReps: 10
          }
        ]
      })
    ).toBe(0);
  });

  it("aggregates hydration, creatine, workout count, weekly volume and muscle volume", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    const dashboard = buildProgressDashboard({
      hydrationLogs: [
        { id: "h1", amountMl: 2500, drinkType: "water", loggedAt: "2026-08-20T08:00:00.000Z" },
        { id: "h2", amountMl: 1500, drinkType: "water", loggedAt: "2026-08-19T08:00:00.000Z" },
        { id: "h3", amountMl: 2500, drinkType: "water", loggedAt: "2026-08-01T08:00:00.000Z" }
      ],
      waterTargetMl: 2500,
      supplementLogs: [
        { id: "c1", name: "Creatine", amount: 5, unit: "g", status: "taken", loggedAt: "2026-08-20T08:00:00.000Z" },
        { id: "c2", name: "Creatine", amount: 5, unit: "g", status: "skipped", loggedAt: "2026-08-19T08:00:00.000Z" }
      ],
      creatineEnabled: true,
      workoutSessions: [
        {
          id: "s1",
          routineId: "r1",
          workoutDayId: "d1",
          sessionName: "Upper",
          startedAt: "2026-08-20T09:00:00.000Z",
          durationSeconds: 1800,
          status: "finished",
          sessionExerciseOrder: ["bench"],
          exerciseQueue: [{ exerciseId: "bench", status: "completed" }]
        },
        {
          id: "s2",
          routineId: "r1",
          workoutDayId: "d1",
          sessionName: "Upper",
          startedAt: "2026-08-02T09:00:00.000Z",
          durationSeconds: 1800,
          status: "finished",
          sessionExerciseOrder: ["row"],
          exerciseQueue: [{ exerciseId: "row", status: "completed" }]
        }
      ],
      workoutSets: [
        {
          id: "set-1",
          sessionId: "s1",
          exerciseId: "bench",
          exerciseName: "Bench Press",
          targetWeightKg: 60,
          targetReps: 8,
          actualWeightKg: 60,
          actualReps: 8,
          completedAt: "2026-08-20T09:10:00.000Z"
        },
        {
          id: "set-skip",
          sessionId: "s1",
          exerciseId: "bench",
          exerciseName: "Bench Press",
          targetWeightKg: 60,
          targetReps: 8,
          actualWeightKg: 60,
          actualReps: 0,
          completedAt: "2026-08-20T09:12:00.000Z"
        },
        {
          id: "set-warm",
          sessionId: "s1",
          exerciseId: "bench",
          exerciseName: "Bench Press",
          setType: "warmup",
          targetWeightKg: 60,
          targetReps: 8,
          actualWeightKg: 40,
          actualReps: 5,
          completedAt: "2026-08-20T09:08:00.000Z"
        },
        {
          id: "set-2",
          sessionId: "s2",
          exerciseId: "row",
          exerciseName: "Row",
          targetWeightKg: 40,
          targetReps: 10,
          actualWeightKg: 40,
          actualReps: 10,
          completedAt: "2026-08-02T09:10:00.000Z"
        }
      ],
      workoutExercises: [
        {
          id: "bench",
          name: "Bench Press",
          muscleGroup: "Chest",
          targetSets: 3,
          targetRepsMin: 6,
          targetRepsMax: 8,
          targetWeightKg: 60,
          restSeconds: 120,
          lastSession: ""
        },
        {
          id: "row",
          name: "Row",
          muscleGroup: "Back",
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 10,
          targetWeightKg: 40,
          restSeconds: 90,
          lastSession: ""
        }
      ],
      now
    });

    expect(dashboard.hydration7).toMatchObject({ averageMl: 571, hitDays: 1, goalHitRate: 14 });
    expect(dashboard.hydration30).toMatchObject({ hitDays: 2 });
    expect(dashboard.creatineConsistency).toMatchObject({ takenDays: 1, consistencyRate: 3 });
    expect(dashboard.workoutCount7).toBe(1);
    expect(dashboard.workoutCount30).toBe(2);
    expect(dashboard.weeklyVolume.reduce((sum, bucket) => sum + bucket.volumeKg, 0)).toBe(880);
    expect(dashboard.volumeByMuscleGroup).toEqual([
      { label: "Chest", volumeKg: 480 },
      { label: "Back", volumeKg: 400 }
    ]);
  });

  it("computes PRs and e1RM while excluding skipped sets", () => {
    const sets = [
      {
        id: "set-1",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 60,
        actualReps: 8,
        completedAt: "2026-08-18T09:00:00.000Z"
      },
      {
        id: "set-2",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 62.5,
        targetReps: 6,
        actualWeightKg: 62.5,
        actualReps: 6,
        completedAt: "2026-08-20T09:00:00.000Z"
      },
      {
        id: "set-skip",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 100,
        targetReps: 1,
        actualWeightKg: 100,
        actualReps: 0,
        completedAt: "2026-08-20T09:05:00.000Z"
      },
      {
        id: "set-warm",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        setType: "warmup" as const,
        targetWeightKg: 80,
        targetReps: 3,
        actualWeightKg: 80,
        actualReps: 3,
        completedAt: "2026-08-20T08:55:00.000Z"
      }
    ];

    expect(exercisePersonalRecords(sets)).toEqual([
      {
        exerciseId: "bench",
        exerciseName: "Bench Press",
        maxWeightKg: 62.5,
        maxReps: 8,
        estimatedOneRepMaxKg: 76,
        volumePrKg: 480
      }
    ]);
  });

  it("detects live PRs and ignores skipped sets", () => {
    const previous = [
      {
        id: "old",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 60,
        actualReps: 8,
        completedAt: "2026-08-18T09:00:00.000Z"
      },
      {
        id: "old-skip",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 100,
        targetReps: 1,
        actualWeightKg: 100,
        actualReps: 0,
        completedAt: "2026-08-19T09:00:00.000Z"
      },
      {
        id: "old-warm",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        setType: "warmup" as const,
        targetWeightKg: 90,
        targetReps: 2,
        actualWeightKg: 90,
        actualReps: 2,
        completedAt: "2026-08-19T08:55:00.000Z"
      }
    ];

    const prs = detectWorkoutSetPrs(previous, {
      id: "new",
      exerciseId: "bench",
      exerciseName: "Bench Press",
      targetWeightKg: 62.5,
      targetReps: 8,
      actualWeightKg: 62.5,
      actualReps: 8,
      completedAt: "2026-08-21T09:00:00.000Z"
    });

    expect(prs.map((pr) => pr.type)).toEqual(["maxWeight", "estimatedOneRepMax", "volume"]);
    expect(detectWorkoutSetPrs(previous, { ...previous[1], id: "skip-new" })).toEqual([]);
  });

  it("calculates plates per side from target weight and barbell settings", () => {
    expect(calculatePlatesPerSide(60, defaultPlateSettings)).toMatchObject({
      barbellKg: 20,
      perSideWeightKg: 20,
      platesPerSide: [{ weightKg: 20, count: 1 }],
      matchedWeightKg: 60,
      remainderKg: 0
    });

    expect(calculatePlatesPerSide(42.5, { barbellDefault: "15kg", customBarbellKg: 20, plateInventoryKg: [10, 5, 2.5, 1.25] }).platesPerSide).toEqual([
      { weightKg: 10, count: 1 },
      { weightKg: 2.5, count: 1 },
      { weightKg: 1.25, count: 1 }
    ]);
  });

  it("hides creatine consistency data when creatine is disabled", () => {
    const dashboard = buildProgressDashboard({
      hydrationLogs: [],
      waterTargetMl: 2500,
      supplementLogs: [{ id: "c1", name: "Creatine", amount: 5, unit: "g", status: "taken", loggedAt: "2026-08-20T08:00:00.000Z" }],
      creatineEnabled: false,
      workoutSessions: [],
      workoutSets: [],
      workoutExercises: [],
      now: new Date("2026-08-20T12:00:00.000Z")
    });

    expect(dashboard.creatineConsistency).toBeUndefined();
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
    expect(rec.source).toBe("rule");
    expect(rec.aiEligible).toBe(false);
    expect(rec.dataBasis.join(" ")).toContain("Bench");
    expect(rec.suggestedAction).toContain("52.5kg");
    expect(rec.guardrail).toContain("Training guidance only");
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
      workoutCount: 12,
      previousHydrationStreak: 2,
      previousWorkoutStreak: 1,
      previousVolumeStreak: 1
    });

    expect(badges[0]).toMatchObject({ status: "active", streakMonths: 3 });
    expect(badges[1]).toMatchObject({ code: "workout_consistency", status: "active", streakMonths: 2 });
    expect(badges[2]).toMatchObject({ status: "active", streakMonths: 2 });
  });

  it("marks lost and disabled badges without counting disabled streaks", () => {
    const badges = monthlyAchievements({
      hydrationGoalDays: 10,
      hydrationTargetDays: 24,
      workoutCount: 4,
      workoutTargetCount: 12,
      volumeChangePercent: 1,
      previousHydrationActive: true,
      previousWorkoutActive: true,
      previousVolumeActive: true,
      hydrationEnabled: false
    });

    expect(badges[0]).toMatchObject({ status: "disabled", streakMonths: 0 });
    expect(badges[1]).toMatchObject({ status: "lost" });
    expect(badges[2]).toMatchObject({ status: "lost" });
  });

  it("builds weekly and monthly reports with trends, PRs and challenge badges", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    const hydrationLogs = [
      ...Array.from({ length: 24 }, (_, index) => ({
        id: `h-aug-${index}`,
        amountMl: 2500,
        drinkType: "water" as const,
        loggedAt: `2026-08-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`
      })),
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `h-jul-${index}`,
        amountMl: 2500,
        drinkType: "water" as const,
        loggedAt: `2026-07-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`
      }))
    ];
    const workoutSessions = [
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `s-aug-${index}`,
        routineId: "r1",
        workoutDayId: "d1",
        sessionName: "Upper",
        startedAt: `2026-08-${String(index + 9).padStart(2, "0")}T09:00:00.000Z`,
        durationSeconds: 1800,
        status: "finished" as const,
        sessionExerciseOrder: ["bench"],
        exerciseQueue: [{ exerciseId: "bench", status: "completed" as const }]
      })),
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `s-jul-${index}`,
        routineId: "r1",
        workoutDayId: "d1",
        sessionName: "Upper",
        startedAt: `2026-07-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
        durationSeconds: 1800,
        status: "finished" as const,
        sessionExerciseOrder: ["bench"],
        exerciseQueue: [{ exerciseId: "bench", status: "completed" as const }]
      }))
    ];
    const workoutSets = [
      {
        id: "aug-heavy",
        sessionId: "s-aug-19",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 60,
        targetReps: 8,
        actualWeightKg: 60,
        actualReps: 10,
        completedAt: "2026-08-19T09:10:00.000Z"
      },
      {
        id: "aug-row",
        sessionId: "s-aug-18",
        exerciseId: "row",
        exerciseName: "Row",
        targetWeightKg: 45,
        targetReps: 10,
        actualWeightKg: 45,
        actualReps: 10,
        completedAt: "2026-08-18T09:10:00.000Z"
      },
      {
        id: "jul-bench",
        sessionId: "s-jul-10",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        targetWeightKg: 50,
        targetReps: 8,
        actualWeightKg: 50,
        actualReps: 10,
        completedAt: "2026-07-10T09:10:00.000Z"
      }
    ];

    const reports = buildProgressReports({
      hydrationLogs,
      waterTargetMl: 2500,
      workoutSessions,
      workoutSets,
      workoutExercises: [
        {
          id: "bench",
          name: "Bench Press",
          muscleGroup: "Chest",
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 10,
          targetWeightKg: 60,
          restSeconds: 120,
          lastSession: ""
        },
        {
          id: "row",
          name: "Row",
          muscleGroup: "Back",
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 10,
          targetWeightKg: 45,
          restSeconds: 90,
          lastSession: ""
        }
      ],
      now
    });

    expect(reports.weekly).toMatchObject({
      period: "weekly",
      hydrationAverageMl: 2500,
      hydrationGoalHitRate: 100,
      workoutCount: 7,
      totalVolumeKg: 1050
    });
    expect(reports.monthly).toMatchObject({
      period: "monthly",
      hydrationHitDays: 24,
      workoutCount: 12,
      totalVolumeKg: 1050
    });
    expect(reports.monthly.trendVsPrevious).toMatchObject({ workoutCount: 2, totalVolumeKg: 550 });
    expect(reports.monthly.prs.map((pr) => pr.exerciseName)).toEqual(["Bench Press", "Row"]);
    expect(reports.monthly.badges.map((badge) => [badge.code, badge.status])).toEqual([
      ["monthly_hydration", "active"],
      ["workout_consistency", "active"],
      ["volume_progression", "active"]
    ]);
  });

  it("keeps disabled module badges out of the visible report badge list", () => {
    const reports = buildProgressReports({
      hydrationLogs: [],
      waterTargetMl: 2500,
      workoutSessions: [],
      workoutSets: [],
      workoutExercises: [],
      hydrationEnabled: false,
      workoutEnabled: false,
      volumeEnabled: false,
      now: new Date("2026-08-20T12:00:00.000Z")
    });

    expect(reports.monthly.badges.every((badge) => badge.status === "disabled")).toBe(true);
    expect(reports.monthly.badges.filter((badge) => badge.status !== "disabled")).toEqual([]);
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

  it("converts weight between kg and lb", () => {
    expect(kgToLb(70)).toBe(154.3);
    expect(lbToKg(154.3)).toBe(70);
  });

  it("validates body metric fields", () => {
    expect(validateBodyMetric({ weightKg: 72, bodyFatPercent: 18, waistCm: 82, chestCm: 96, armCm: 34, thighCm: 56 })).toEqual([]);
    expect(validateBodyMetric({ weightKg: 0, bodyFatPercent: 80, waistCm: -1, chestCm: 300, armCm: 0, thighCm: Number.NaN })).toEqual([
      "Weight must be greater than 0.",
      "Body fat must be between 0 and 70%.",
      "Waist must be between 1 and 250cm.",
      "Chest must be between 1 and 250cm.",
      "Arm must be between 1 and 250cm.",
      "Thigh must be between 1 and 250cm."
    ]);
  });

  it("builds range-limited smoothed chart datasets with unit conversion and body-fat detection", () => {
    const dataset = buildBodyMetricChartDataset({
      rangeDays: 7,
      unit: "lb",
      goalWeightKg: 70,
      goalBodyFatPercent: 15,
      now: new Date("2026-08-20T12:00:00.000Z"),
      metrics: [
        { id: "old", measuredAt: "2026-07-01T07:00:00.000Z", weightKg: 80, heightCm: 174, bodyFatPercent: 20 },
        { id: "m1", measuredAt: "2026-08-18T07:00:00.000Z", weightKg: 72, heightCm: 174, bodyFatPercent: 18 },
        { id: "m2", measuredAt: "2026-08-19T07:00:00.000Z", weightKg: 71, heightCm: 174 },
        { id: "m3", measuredAt: "2026-08-20T07:00:00.000Z", weightKg: 70, heightCm: 174, bodyFatPercent: 17 }
      ]
    });

    expect(dataset.points.map((point) => point.date)).toEqual(["2026-08-18", "2026-08-19", "2026-08-20"]);
    expect(dataset.points[0]).toMatchObject({ weight: 158.7, smoothedWeight: 158.7, bodyFatPercent: 18, smoothedBodyFatPercent: 18 });
    expect(dataset.points[2]).toMatchObject({ weight: 154.3, smoothedWeight: 156.5, bodyFatPercent: 17, smoothedBodyFatPercent: 17.5 });
    expect(dataset).toMatchObject({ unit: "lb", weightGoal: 154.3, bodyFatGoal: 15, hasWeightData: true, hasBodyFatData: true });
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
    expect(queue[0].idempotencyKey).toBe(queue[0].id);
    expect(markSyncQueue(queue, "synced")[0].status).toBe("synced");
  });

  it("tracks per-item retry attempts, backoff, and routine conflicts", () => {
    const queue = enqueueSync([], { type: "routine.update", payload: { routineId: "r1" } });
    const syncing = markSyncItemSyncing(queue, queue[0].id);
    expect(syncing[0].status).toBe("syncing");
    const failed = markSyncItemFailed(syncing, queue[0].id, "network", new Date("2026-08-23T00:00:00.000Z"));
    expect(failed[0]).toMatchObject({ status: "failed", attempts: 1, lastError: "network" });
    expect(failed[0].nextRetryAt).toBe("2026-08-23T00:00:02.000Z");
    const conflicted = markSyncItemConflict(failed, queue[0].id, {
      kind: "routine",
      local: { name: "Local" },
      remote: { name: "Remote" },
      message: "Routine changed"
    });
    expect(conflicted[0].status).toBe("conflict");
    expect(markSyncItemSynced(conflicted, queue[0].id)[0].status).toBe("synced");
  });
});

describe("social privacy sharing", () => {
  it("keeps leaderboard and sharing disabled by default", () => {
    const privacy = defaultSocialPrivacySettings();
    expect(privacy).toMatchObject({
      friendLeaderboardEnabled: false,
      shareBadges: false,
      shareWorkoutSummaries: false,
      shareBodyMetrics: false,
      shareWorkoutDetails: false
    });
    expect(buildBadgeSharePreview({ badge: { name: "Hydration", status: "active", streakMonths: 2, progress: 20, target: 20 }, privacy })).toBeNull();
    expect(
      buildWorkoutSummarySharePreview({
        session: { sessionName: "Push Day", durationSeconds: 3600, status: "finished" },
        setCount: 9,
        totalVolumeKg: 4500,
        privacy
      })
    ).toBeNull();
  });

  it("redacts sensitive data unless the user explicitly opts in", () => {
    const privacy = { ...defaultSocialPrivacySettings(), shareBadges: true, shareWorkoutSummaries: true };
    const badge = buildBadgeSharePreview({
      badge: { name: "Workout consistency", status: "active", streakMonths: 3, progress: 12, target: 12 },
      privacy,
      now: new Date("2026-08-23T00:00:00.000Z")
    });
    const workout = buildWorkoutSummarySharePreview({
      session: { sessionName: "Push Day", durationSeconds: 4200, status: "finished" },
      setCount: 10,
      totalVolumeKg: 5000,
      privacy,
      now: new Date("2026-08-23T00:00:00.000Z")
    });

    expect(badge?.redactedFields).toEqual(expect.arrayContaining(["weight", "body fat", "exercise details", "email"]));
    expect(workout?.redactedFields).toEqual(expect.arrayContaining(["weight", "body fat", "exercise names", "set weights", "set reps", "RPE"]));
    expect(workout?.summary).not.toContain("Bench");
    const post = publishSharePreview(workout, privacy, new Date("2026-08-23T01:00:00.000Z"));
    expect(post).toMatchObject({ audience: "private-friends", kind: "workout-summary" });
  });

  it("shows only accepted friends in the private leaderboard after opt-in", () => {
    const leaderboard = privateFriendLeaderboard({
      profileName: "Phuc",
      enabled: true,
      myScore: 91,
      myBadgeStreakMonths: 3,
      friends: [
        { id: "1", displayName: "Minh", handle: "@minh", status: "accepted", score: 96, badgeStreakMonths: 4, addedAt: "2026-08-23T00:00:00.000Z" },
        { id: "2", displayName: "Blocked", handle: "@blocked", status: "blocked", score: 99, badgeStreakMonths: 9, addedAt: "2026-08-23T00:00:00.000Z" }
      ]
    });

    expect(leaderboard.visible).toBe(true);
    expect(leaderboard.entries.map((entry) => entry.displayName)).toEqual(["Minh", "Phuc"]);
  });
});

describe("health platform permissions", () => {
  it("keeps all health sync disabled by default", () => {
    const settings = defaultHealthIntegrationSettings();

    expect(settings).toMatchObject({
      provider: "health-connect",
      permissionStatus: "not_requested",
      selectedDataTypes: [],
      privacyAccepted: false,
      nativeBridgeAvailable: false
    });
    expect(canSyncHealthData(settings, "weight")).toBe(false);
    expect(healthIntegrationPrivacyCopy(settings)).toContain("never syncs health data in the background");
  });

  it("saves a web permission request without granting sync", () => {
    const requested = requestHealthIntegrationPermission(
      { ...defaultHealthIntegrationSettings(), privacyAccepted: true, unitMapping: { weight: "lb", hydration: "oz", workoutDistance: "mi" } },
      ["weight", "workout"],
      new Date("2026-08-23T00:00:00.000Z")
    );

    expect(requested.permissionStatus).toBe("requested");
    expect(requested.selectedDataTypes).toEqual(["weight", "workout"]);
    expect(requested.unitMapping).toEqual({ weight: "lb", hydration: "oz", workoutDistance: "mi" });
    expect(requested.lastPermissionRequestedAt).toBe("2026-08-23T00:00:00.000Z");
    expect(canSyncHealthData(requested, "weight")).toBe(false);
  });

  it("allows only explicitly selected categories after native permission is granted", () => {
    const granted = requestHealthIntegrationPermission(
      { ...defaultHealthIntegrationSettings(), privacyAccepted: true, nativeBridgeAvailable: true, provider: "apple-health" },
      ["hydration"],
      new Date("2026-08-23T00:00:00.000Z")
    );
    const revoked = revokeHealthIntegrationPermission(granted, new Date("2026-08-23T01:00:00.000Z"));

    expect(granted.permissionStatus).toBe("granted");
    expect(canSyncHealthData(granted, "hydration")).toBe(true);
    expect(canSyncHealthData(granted, "weight")).toBe(false);
    expect(revoked.selectedDataTypes).toEqual([]);
    expect(canSyncHealthData(revoked, "hydration")).toBe(false);
  });
});
