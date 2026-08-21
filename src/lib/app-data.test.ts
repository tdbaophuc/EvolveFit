import { describe, expect, it } from "vitest";
import {
  applySelectiveRestore,
  createAppDataExport,
  deletePersonalData,
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
    expect(!invalid.ok && invalid.errors[0]).toContain("hydrationLogs");

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
});
