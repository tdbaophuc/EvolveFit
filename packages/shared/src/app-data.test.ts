import { describe, expect, it } from "vitest";
import {
  cloneMarketplaceExerciseToCustom,
  marketplaceExerciseDefinitions,
  type ExerciseDefinition
} from "./core";
import {
  applySelectiveRestore,
  buildCloudMergePreview,
  buildLocalToCloudSyncItems,
  createAppDataExport,
  deletePersonalData,
  mergeLocalDataIntoCloud,
  migrateImportedAppData,
  parseImportedAppData,
  stringifyAppDataExport
} from "./app-data";
import { initialState } from "./seed";

describe("app data import/export", () => {
  it("exports JSON with privacy and schema metadata", () => {
    const exported = createAppDataExport(
      { ...initialState, profile: { ...initialState.profile, email: "local@example.com" } },
      new Date("2026-08-21T01:00:00.000Z"),
      "9.9.9"
    );

    expect(exported.metadata).toEqual({
      appVersion: "9.9.9",
      exportedAt: "2026-08-21T01:00:00.000Z",
      schemaVersion: 2,
      profileId: "local@example.com",
      localProfileId: "local@example.com"
    });
    expect(JSON.parse(stringifyAppDataExport(initialState))).toHaveProperty("metadata.schemaVersion", 2);
  });

  it("rejects invalid import schemas without producing state", () => {
    const invalid = parseImportedAppData(
      JSON.stringify({
        metadata: { schemaVersion: 2 },
        data: { hydrationLogs: [{ id: "bad", amountMl: "500", loggedAt: "2026-08-21T00:00:00.000Z" }] }
      })
    );

    expect(invalid.ok).toBe(false);
    expect(!invalid.ok && invalid.errors[0]).toContain("Lịch sử nước");

    const malformedRoutine = parseImportedAppData(JSON.stringify({ metadata: { schemaVersion: 2 }, data: { routines: [{ id: "broken" }] } }));
    expect(malformedRoutine.ok).toBe(false);
  });

  it("migrates legacy direct state exports", () => {
    const migrated = migrateImportedAppData({
      profile: { name: "Legacy", email: "legacy@example.com" },
      workoutExercises: initialState.workoutExercises,
      workoutSets: [
        {
          id: "set-1",
          exerciseId: "ex1",
          exerciseName: "Incline Bench Press",
          actualWeightKg: 40,
          actualReps: 8,
          rpe: 8,
          completedAt: "2026-08-21T00:00:00.000Z"
        }
      ]
    });

    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.data.profile.name).toBe("Legacy");
    expect(migrated.data.routines[0].days[0].exercises.length).toBeGreaterThan(0);
    expect(migrated.data.workoutSessions[0]).toMatchObject({ status: "finished" });
  });

  it("restores only selected sections", () => {
    const current = {
      ...initialState,
      profile: { ...initialState.profile, name: "Current" },
      hydrationLogs: [{ id: "current-water", amountMl: 100, drinkType: "water" as const, loggedAt: "2026-08-20T00:00:00.000Z" }],
      bodyMetrics: [{ id: "current-metric", measuredAt: "2026-08-20T00:00:00.000Z", weightKg: 70, heightCm: 174 }]
    };
    const imported = {
      ...initialState,
      profile: { ...initialState.profile, name: "Imported" },
      hydrationLogs: [{ id: "imported-water", amountMl: 500, drinkType: "water" as const, loggedAt: "2026-08-21T00:00:00.000Z" }],
      bodyMetrics: [{ id: "imported-metric", measuredAt: "2026-08-21T00:00:00.000Z", weightKg: 71, heightCm: 174 }]
    };

    const restored = applySelectiveRestore(current, imported, ["hydration"]);

    expect(restored.profile.name).toBe("Current");
    expect(restored.hydrationLogs[0].id).toBe("imported-water");
    expect(restored.bodyMetrics[0].id).toBe("current-metric");
  });

  it("deletes personal data separately from demo reset", () => {
    const deleted = deletePersonalData({
      ...initialState,
      profile: { ...initialState.profile, name: "Private", email: "private@example.com", leaderboardPublic: true },
      hydrationLogs: [{ id: "water", amountMl: 500, drinkType: "water", loggedAt: "2026-08-21T00:00:00.000Z" }],
      workoutSets: [
        {
          id: "set",
          exerciseId: "ex1",
          exerciseName: "Bench",
          actualWeightKg: 50,
          actualReps: 8,
          rpe: 8,
          completedAt: "2026-08-21T00:00:00.000Z"
        }
      ],
      bodyMetrics: [{ id: "metric", measuredAt: "2026-08-21T00:00:00.000Z", weightKg: 72, heightCm: 174 }]
    });

    expect(deleted.profile).toMatchObject({ name: "", email: "", leaderboardPublic: false });
    expect(deleted.hydrationLogs).toEqual([]);
    expect(deleted.workoutSets).toEqual([]);
    expect(deleted.bodyMetrics).toEqual([]);
    expect(deleted.routines.length).toBeGreaterThan(0);
  });

  it("previews and builds idempotent local-to-cloud merge items", () => {
    const local = {
      ...initialState,
      hydrationLogs: [{ id: "water-local", amountMl: 500, drinkType: "water" as const, loggedAt: "2026-08-21T00:00:00.000Z" }],
      workoutSets: [
        {
          id: "set-local",
          exerciseId: "ex1",
          exerciseName: "Bench",
          targetWeightKg: 50,
          targetReps: 8,
          actualWeightKg: 50,
          actualReps: 8,
          completedAt: "2026-08-21T00:00:00.000Z"
        }
      ]
    };
    const cloud = { ...initialState, routines: [{ ...initialState.routines[0], updatedAt: "2026-08-20T00:00:00.000Z" }] };

    const preview = buildCloudMergePreview(local, cloud);
    const items = buildLocalToCloudSyncItems(local, "merge-test");

    expect(preview).toMatchObject({ hasLocalData: true, hydrationLogs: 1, workoutSets: 1, routines: 1 });
    expect(preview.conflicts[0]).toContain("lịch tập");
    expect(items.some((item) => item.type === "hydration.log" && item.idempotencyKey === "merge-test:hydration.log:water-local")).toBe(true);
    expect(items.some((item) => item.type === "workout.set.create" && item.idempotencyKey === "merge-test:workout.set.create:set-local")).toBe(true);
  });

  it("treats marketplace catalog as public read-only and syncs only custom exercise copies", () => {
    const marketplace = marketplaceExerciseDefinitions[0];
    const custom = cloneMarketplaceExerciseToCustom(marketplace, { id: "custom-goblet", name: "Goblet Squat của tôi" });
    const local = {
      ...initialState,
      exerciseLibrary: [...initialState.exerciseLibrary, marketplace, custom]
    };
    const cloud = {
      ...initialState,
      exerciseLibrary: initialState.exerciseLibrary.filter((exercise: ExerciseDefinition) => exercise.id !== custom.id)
    };

    const preview = buildCloudMergePreview(local, cloud);
    const merged = mergeLocalDataIntoCloud(local, cloud);
    const items = buildLocalToCloudSyncItems(local, "marketplace-test");

    expect(preview.exercises).toBe(1);
    expect(merged.exerciseLibrary.some((exercise) => exercise.id === marketplace.id && exercise.catalogSource === "marketplace")).toBe(true);
    expect(merged.exerciseLibrary.some((exercise) => exercise.id === custom.id && exercise.catalogSource === "custom")).toBe(true);
    expect(items.some((item) => item.type === "exercise.create" && item.id === custom.id)).toBe(true);
    expect(items.some((item) => item.type === "exercise.create" && item.id === marketplace.id)).toBe(false);
  });

  it("merges local data into cloud state using newer records by id", () => {
    const cloud = {
      ...initialState,
      profile: { ...initialState.profile, name: "Cloud", waterTargetMl: 2000 },
      hydrationLogs: [{ id: "same-water", amountMl: 250, drinkType: "water" as const, loggedAt: "2026-08-20T00:00:00.000Z" }],
      bodyMetrics: []
    };
    const local = {
      ...initialState,
      profile: { ...initialState.profile, name: "Local", waterTargetMl: 2600 },
      hydrationLogs: [
        { id: "same-water", amountMl: 600, drinkType: "water" as const, loggedAt: "2026-08-21T00:00:00.000Z" },
        { id: "new-water", amountMl: 300, drinkType: "water" as const, loggedAt: "2026-08-21T01:00:00.000Z" }
      ],
      bodyMetrics: [{ id: "metric-local", measuredAt: "2026-08-21T00:00:00.000Z", weightKg: 72, heightCm: 174 }]
    };

    const merged = mergeLocalDataIntoCloud(local, cloud);

    expect(merged.profile).toMatchObject({ name: "Local", waterTargetMl: 2600 });
    expect(merged.hydrationLogs.find((log) => log.id === "same-water")?.amountMl).toBe(600);
    expect(merged.hydrationLogs.some((log) => log.id === "new-water")).toBe(true);
    expect(merged.bodyMetrics).toHaveLength(1);
  });
});
