import {
  builtInExerciseDefinitions,
  defaultHealthIntegrationSettings,
  defaultSocialPrivacySettings,
  migrateLegacyWorkoutSession,
  migrateWorkoutExercisesToRoutine,
  normalizeDrinkModules,
  normalizeHealthIntegrationSettings,
  normalizePlateInventory,
  normalizeWorkoutSessionQueue,
  routineExercisesToWorkoutExercises,
  selectedWorkoutDay
} from "./core";
import { initialState, type AppState } from "./seed";

export const appDataSchemaVersion = 2;
export const fallbackAppVersion = "0.1.0";

export type RestoreSection = "profile" | "hydration" | "workouts" | "bodyMetrics" | "settings";

export type AppDataExport = {
  metadata: {
    appVersion: string;
    exportedAt: string;
    schemaVersion: number;
    profileId: string;
    localProfileId: string;
  };
  data: AppState;
};

type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const restoreSections: RestoreSection[] = ["profile", "hydration", "workouts", "bodyMetrics", "settings"];

export function createAppDataExport(state: AppState, now = new Date(), appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? fallbackAppVersion): AppDataExport {
  const localProfileId = state.profile.email || "local-profile";
  return {
    metadata: {
      appVersion,
      exportedAt: now.toISOString(),
      schemaVersion: appDataSchemaVersion,
      profileId: state.profile.email || state.profile.name || "local-profile",
      localProfileId
    },
    data: { ...state, undo: undefined }
  };
}

export function stringifyAppDataExport(state: AppState, now = new Date(), appVersion?: string): string {
  return JSON.stringify(createAppDataExport(state, now, appVersion), null, 2);
}

export function parseImportedAppData(text: string): ValidationResult<AppState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["File không phải JSON hợp lệ."] };
  }
  return migrateImportedAppData(parsed);
}

export function migrateImportedAppData(input: unknown): ValidationResult<AppState> {
  if (!isRecord(input)) return { ok: false, errors: ["Dữ liệu nhập phải là một object JSON."] };

  const metadata = input.metadata;
  const envelope = isRecord(metadata) && "data" in input;
  if (envelope) {
    if (typeof metadata.schemaVersion !== "number") return { ok: false, errors: ["Thiếu phiên bản dữ liệu trong metadata.schemaVersion."] };
    if (metadata.schemaVersion > appDataSchemaVersion) return { ok: false, errors: ["Phiên bản dữ liệu xuất mới hơn phiên bản app hiện tại."] };
  }

  const candidate = envelope ? input.data : input;
  if (!isRecord(candidate)) return { ok: false, errors: ["Dữ liệu xuất phải là một object JSON."] };

  const errors = validateImportCandidate(candidate);
  if (errors.length) return { ok: false, errors };

  try {
    return { ok: true, data: normalizeImportedState(candidate as Partial<AppState>) };
  } catch {
    return { ok: false, errors: ["Export data could not be migrated safely."] };
  }
}

export function applySelectiveRestore(current: AppState, imported: AppState, sections: RestoreSection[]): AppState {
  const selected = new Set(sections);
  return {
    ...current,
    profile: selected.has("profile") ? imported.profile : current.profile,
    recovery: selected.has("settings") ? imported.recovery : current.recovery,
    notificationSettings: selected.has("settings") ? imported.notificationSettings : current.notificationSettings,
    plateSettings: selected.has("settings") ? imported.plateSettings : current.plateSettings,
    hydrationLogs: selected.has("hydration") ? imported.hydrationLogs : current.hydrationLogs,
    drinkModules: selected.has("settings") ? imported.drinkModules : current.drinkModules,
    supplements: selected.has("settings") ? imported.supplements : current.supplements,
    supplementLogs: selected.has("hydration") ? imported.supplementLogs : current.supplementLogs,
    quickAmounts: selected.has("settings") ? imported.quickAmounts : current.quickAmounts,
    routines: selected.has("workouts") ? imported.routines : current.routines,
    activeRoutineId: selected.has("workouts") ? imported.activeRoutineId : current.activeRoutineId,
    selectedWorkoutDayId: selected.has("workouts") ? imported.selectedWorkoutDayId : current.selectedWorkoutDayId,
    exerciseLibrary: selected.has("workouts") ? imported.exerciseLibrary : current.exerciseLibrary,
    workoutExercises: selected.has("workouts") ? imported.workoutExercises : current.workoutExercises,
    workoutSessions: selected.has("workouts") ? imported.workoutSessions : current.workoutSessions,
    activeWorkoutSessionId: selected.has("workouts") ? imported.activeWorkoutSessionId : current.activeWorkoutSessionId,
    workoutSets: selected.has("workouts") ? imported.workoutSets : current.workoutSets,
    bodyMetrics: selected.has("bodyMetrics") ? imported.bodyMetrics : current.bodyMetrics,
    activeTemplate: selected.has("workouts") ? imported.activeTemplate : current.activeTemplate,
    activeExerciseIndex: selected.has("workouts") ? imported.activeExerciseIndex : current.activeExerciseIndex,
    recommendationHistory: selected.has("workouts") ? imported.recommendationHistory : current.recommendationHistory,
    recommendationDecisions: selected.has("workouts") ? imported.recommendationDecisions : current.recommendationDecisions,
    friends: selected.has("settings") ? imported.friends : current.friends,
    healthIntegration: selected.has("settings") ? imported.healthIntegration : current.healthIntegration,
    socialPrivacy: selected.has("settings") ? imported.socialPrivacy : current.socialPrivacy,
    sharedPosts: selected.has("settings") ? imported.sharedPosts : current.sharedPosts,
    syncQueue: current.syncQueue,
    restEndsAt: undefined,
    undo: undefined
  };
}

export function deletePersonalData(state: AppState): AppState {
  return {
    ...state,
    profile: {
      ...initialState.profile,
      name: "",
      email: "",
      onboardingCompleted: false,
      leaderboardPublic: false
    },
    recovery: initialState.recovery,
    notificationSettings: initialState.notificationSettings,
    plateSettings: initialState.plateSettings,
    hydrationLogs: [],
    supplementLogs: [],
    workoutSets: [],
    workoutSessions: [],
    activeWorkoutSessionId: undefined,
    bodyMetrics: [],
    recommendationHistory: [],
    recommendationDecisions: [],
    friends: [],
    healthIntegration: defaultHealthIntegrationSettings(),
    socialPrivacy: defaultSocialPrivacySettings(),
    sharedPosts: [],
    syncQueue: [],
    restEndsAt: undefined,
    undo: undefined
  };
}

export function allRestoreSections(): RestoreSection[] {
  return [...restoreSections];
}

function normalizeImportedState(parsed: Partial<AppState>): AppState {
  const profile = { ...initialState.profile, ...parsed.profile };
  const legacyExercises = parsed.workoutExercises ?? initialState.workoutExercises;
  const routines = parsed.routines?.length
    ? parsed.routines
    : [migrateWorkoutExercisesToRoutine(legacyExercises, { routineId: "routine-migrated", name: "Migrated Routine" })];
  const activeRoutineId = parsed.activeRoutineId ?? routines[0]?.id ?? initialState.activeRoutineId;
  const activeRoutine = routines.find((routine) => routine.id === activeRoutineId) ?? routines[0];
  const selectedDay = activeRoutine?.days.find((day) => day.id === parsed.selectedWorkoutDayId) ?? selectedWorkoutDay(activeRoutine) ?? activeRoutine?.days[0];
  const workoutExercises = selectedDay ? routineExercisesToWorkoutExercises(selectedDay.exercises) : legacyExercises;
  const legacySessionMigration = migrateLegacyWorkoutSession({
    sets: parsed.workoutSets ?? initialState.workoutSets,
    routineId: activeRoutineId,
    workoutDayId: selectedDay?.id ?? initialState.selectedWorkoutDayId,
    sessionName: selectedDay?.name ?? "Legacy Workout"
  });
  const migratedSessions = legacySessionMigration.sessions.length
    ? [...(parsed.workoutSessions ?? []), ...legacySessionMigration.sessions]
    : (parsed.workoutSessions ?? initialState.workoutSessions);

  return {
    ...initialState,
    ...parsed,
    profile,
    recovery: { ...initialState.recovery, ...parsed.recovery },
    notificationSettings: { ...initialState.notificationSettings, ...parsed.notificationSettings },
    plateSettings: {
      ...initialState.plateSettings,
      ...parsed.plateSettings,
      plateInventoryKg: normalizePlateInventory(parsed.plateSettings?.plateInventoryKg)
    },
    hydrationLogs: parsed.hydrationLogs ?? initialState.hydrationLogs,
    drinkModules: normalizeDrinkModules(parsed.drinkModules, profile.waterTargetMl, profile.creatineAmountG),
    supplements: parsed.supplements ?? initialState.supplements,
    supplementLogs: parsed.supplementLogs ?? initialState.supplementLogs,
    quickAmounts: parsed.quickAmounts ?? initialState.quickAmounts,
    routines,
    activeRoutineId,
    selectedWorkoutDayId: selectedDay?.id ?? initialState.selectedWorkoutDayId,
    exerciseLibrary: [
      ...builtInExerciseDefinitions,
      ...((parsed.exerciseLibrary ?? initialState.exerciseLibrary).filter((exercise) => !exercise.builtIn))
    ],
    workoutExercises,
    workoutSessions: migratedSessions.map(normalizeWorkoutSessionQueue),
    activeWorkoutSessionId: parsed.activeWorkoutSessionId,
    workoutSets: legacySessionMigration.sets,
    bodyMetrics: parsed.bodyMetrics ?? initialState.bodyMetrics,
    activeTemplate: parsed.activeTemplate ?? initialState.activeTemplate,
    recommendationHistory: parsed.recommendationHistory ?? initialState.recommendationHistory,
    recommendationDecisions: parsed.recommendationDecisions ?? initialState.recommendationDecisions,
    friends: parsed.friends ?? initialState.friends,
    healthIntegration: normalizeHealthIntegrationSettings(parsed.healthIntegration),
    socialPrivacy: { ...defaultSocialPrivacySettings(), ...parsed.socialPrivacy },
    sharedPosts: parsed.sharedPosts ?? initialState.sharedPosts,
    syncQueue: parsed.syncQueue ?? initialState.syncQueue,
    undo: undefined
  };
}

function validateImportCandidate(candidate: Record<string, unknown>) {
  const errors: string[] = [];
  if ("profile" in candidate && !isRecord(candidate.profile)) errors.push("Hồ sơ phải là object hợp lệ.");
  if ("hydrationLogs" in candidate && !isHydrationLogs(candidate.hydrationLogs)) errors.push("Lịch sử nước phải gồm các log hợp lệ.");
  if ("supplementLogs" in candidate && !Array.isArray(candidate.supplementLogs)) errors.push("Lịch sử bổ sung phải là danh sách.");
  if ("workoutSets" in candidate && !isWorkoutSets(candidate.workoutSets)) errors.push("Set tập phải gồm các mục hợp lệ.");
  if ("workoutSessions" in candidate && !Array.isArray(candidate.workoutSessions)) errors.push("Buổi tập phải là danh sách.");
  if ("routines" in candidate && !isRoutines(candidate.routines)) errors.push("Lịch tập phải gồm các mục hợp lệ.");
  if ("bodyMetrics" in candidate && !isBodyMetrics(candidate.bodyMetrics)) errors.push("Chỉ số cơ thể phải gồm các mục hợp lệ.");
  if ("notificationSettings" in candidate && !isRecord(candidate.notificationSettings)) errors.push("Cài đặt thông báo phải là object hợp lệ.");
  if ("plateSettings" in candidate && !isPlateSettings(candidate.plateSettings)) errors.push("Cài đặt bộ tính đĩa tạ không hợp lệ.");
  if ("drinkModules" in candidate && !Array.isArray(candidate.drinkModules)) errors.push("Module thức uống phải là danh sách.");
  if ("supplements" in candidate && !Array.isArray(candidate.supplements)) errors.push("Bổ sung phải là danh sách.");
  if ("quickAmounts" in candidate && !Array.isArray(candidate.quickAmounts)) errors.push("Lượng uống nhanh phải là danh sách.");
  if ("healthIntegration" in candidate && !isRecord(candidate.healthIntegration)) errors.push("Cài đặt nền tảng sức khỏe phải là object hợp lệ.");
  return errors;
}

function isHydrationLogs(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.amountMl === "number" && typeof item.loggedAt === "string");
}

function isWorkoutSets(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.exerciseName === "string" && typeof item.actualWeightKg === "number" && typeof item.actualReps === "number");
}

function isRoutines(value: unknown): boolean {
  return Array.isArray(value) && value.every((routine) => isRecord(routine) && typeof routine.id === "string" && Array.isArray(routine.days));
}

function isPlateSettings(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if ("barbellDefault" in value && !["20kg", "15kg", "custom"].includes(String(value.barbellDefault))) return false;
  if ("customBarbellKg" in value && (typeof value.customBarbellKg !== "number" || !Number.isFinite(value.customBarbellKg))) return false;
  if ("plateInventoryKg" in value && (!Array.isArray(value.plateInventoryKg) || !value.plateInventoryKg.every((plate) => typeof plate === "number" && Number.isFinite(plate)))) return false;
  return true;
}

function isBodyMetrics(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === "string" && typeof item.measuredAt === "string" && typeof item.weightKg === "number" && typeof item.heightCm === "number");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
