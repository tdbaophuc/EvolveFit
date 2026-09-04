import type {
  AppState,
  BodyMetric,
  DrinkModule,
  ExerciseDefinition,
  HydrationLog,
  RecommendationHistoryItem,
  Routine,
  Supplement,
  SupplementLog,
  WorkoutSession,
  WorkoutSet
} from "@evolvefit/shared";
import { initialState } from "@evolvefit/shared";
import { createSupabaseRestRequest } from "./integrations";
import { cryptoSafeId } from "@evolvefit/shared";

export type ApiUser = {
  id: string;
  email: string;
  accessToken?: string;
  mode: "demo" | "supabase";
};

export type PersistedSyncResult = {
  id: string;
  type: string;
  status: "synced" | "conflict" | "failed";
  data?: unknown;
  error?: string;
  conflict?: { kind: "routine"; local: unknown; remote: unknown; message: string };
};

export type StoredNotificationSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId: string;
  localProfileId: string;
  platform?: string;
  createdAt: string;
};

export type AppRepository = {
  readonly mode: "memory" | "supabase";
  loadUserState(user: ApiUser): Promise<AppState>;
  saveUserState(user: ApiUser, state: AppState): Promise<void>;
  getSyncResult(user: ApiUser, key: string): Promise<PersistedSyncResult | undefined>;
  saveSyncResult(user: ApiUser, key: string, type: string, result: PersistedSyncResult): Promise<void>;
  listNotificationSubscriptions(user: ApiUser, filter?: { endpoint?: string; localProfileId?: string }): Promise<StoredNotificationSubscription[]>;
  upsertNotificationSubscription(user: ApiUser, subscription: StoredNotificationSubscription): Promise<StoredNotificationSubscription>;
  revokeNotificationSubscription(user: ApiUser, endpoint: string): Promise<{ endpoint: string }>;
};

export class MemoryAppRepository implements AppRepository {
  readonly mode = "memory" as const;
  private readonly states = new Map<string, AppState>();
  private readonly syncResults = new Map<string, PersistedSyncResult>();
  private readonly subscriptions = new Map<string, StoredNotificationSubscription>();

  async loadUserState(user: ApiUser): Promise<AppState> {
    const existing = this.states.get(user.id);
    if (existing) return structuredClone(existing);
    const seeded = seededStateForUser(user);
    this.states.set(user.id, seeded);
    return structuredClone(seeded);
  }

  async saveUserState(user: ApiUser, state: AppState): Promise<void> {
    this.states.set(user.id, structuredClone(state));
  }

  async getSyncResult(user: ApiUser, key: string): Promise<PersistedSyncResult | undefined> {
    const value = this.syncResults.get(syncKey(user, key));
    return value ? structuredClone(value) : undefined;
  }

  async saveSyncResult(user: ApiUser, key: string, _type: string, result: PersistedSyncResult): Promise<void> {
    this.syncResults.set(syncKey(user, key), structuredClone(result));
  }

  async listNotificationSubscriptions(user: ApiUser, filter: { endpoint?: string; localProfileId?: string } = {}): Promise<StoredNotificationSubscription[]> {
    return [...this.subscriptions.values()].filter((subscription) => {
      if (subscription.userId !== user.id) return false;
      if (filter.endpoint && subscription.endpoint !== filter.endpoint) return false;
      if (filter.localProfileId && subscription.localProfileId !== filter.localProfileId) return false;
      return true;
    });
  }

  async upsertNotificationSubscription(_user: ApiUser, subscription: StoredNotificationSubscription): Promise<StoredNotificationSubscription> {
    this.subscriptions.set(syncKey({ id: subscription.userId, email: subscription.localProfileId, mode: "demo" }, subscription.endpoint), structuredClone(subscription));
    return subscription;
  }

  async revokeNotificationSubscription(user: ApiUser, endpoint: string): Promise<{ endpoint: string }> {
    this.subscriptions.delete(syncKey(user, endpoint));
    return { endpoint };
  }
}

export class SupabaseAppRepository implements AppRepository {
  readonly mode = "supabase" as const;

  constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async loadUserState(user: ApiUser): Promise<AppState> {
    const [
      profiles,
      drinkModules,
      hydrationLogs,
      supplements,
      supplementLogs,
      exerciseLibrary,
      routines,
      workoutDays,
      routineExercises,
      workoutSessions,
      workoutSets,
      bodyMetrics,
      recommendations,
      leaderboardProfiles
    ] = await Promise.all([
      this.list<ProfileRow>(user, "profiles", "select=*"),
      this.list<DrinkModuleRow>(user, "drink_modules", "select=*"),
      this.list<HydrationLogRow>(user, "hydration_logs", "select=*&order=logged_at.asc"),
      this.list<SupplementRow>(user, "supplements", "select=*&order=created_at.asc"),
      this.list<SupplementLogRow>(user, "supplement_logs", "select=*&order=logged_at.asc"),
      this.list<ExerciseLibraryRow>(user, "exercise_library", "select=*&order=created_at.asc"),
      this.list<RoutineRow>(user, "routines", "select=*&order=created_at.asc"),
      this.list<WorkoutDayRow>(user, "workout_days", "select=*&order=order_index.asc"),
      this.list<RoutineExerciseRow>(user, "routine_exercises", "select=*&order=order_index.asc"),
      this.list<WorkoutSessionRow>(user, "workout_sessions", "select=*&order=started_at.asc"),
      this.list<WorkoutSetRow>(user, "workout_sets", "select=*&order=completed_at.asc"),
      this.list<BodyMetricRow>(user, "body_metrics", "select=*&order=measured_at.asc"),
      this.list<RecommendationRow>(user, "progression_recommendations", "select=*&order=created_at.desc"),
      this.list<LeaderboardProfileRow>(user, "leaderboard_profiles", "select=*")
    ]);

    return hydrateStateFromRows(user, {
      profile: profiles[0],
      drinkModules,
      hydrationLogs,
      supplements,
      supplementLogs,
      exerciseLibrary,
      routines,
      workoutDays,
      routineExercises,
      workoutSessions,
      workoutSets,
      bodyMetrics,
      recommendations,
      leaderboardProfile: leaderboardProfiles[0]
    });
  }

  async saveUserState(user: ApiUser, state: AppState): Promise<void> {
    await Promise.all([
      this.upsert(user, "profiles?on_conflict=user_id", [profileToRow(user.id, state)]),
      this.replaceUserRows(user, "drink_modules?on_conflict=user_id,drink_type", state.drinkModules.map((item) => drinkModuleToRow(user.id, item))),
      this.replaceUserRows(user, "hydration_logs", state.hydrationLogs.map((item) => hydrationLogToRow(user.id, item))),
      this.replaceUserRows(user, "supplements", state.supplements.map((item) => supplementToRow(user.id, item))),
      this.replaceUserRows(user, "supplement_logs", state.supplementLogs.map((item) => supplementLogToRow(user.id, item))),
      this.replaceUserRows(user, "exercise_library", state.exerciseLibrary.map((item) => exerciseToRow(user.id, item))),
      this.saveRoutines(user, state.routines),
      this.replaceUserRows(user, "workout_sessions", state.workoutSessions.map((item) => workoutSessionToRow(user.id, item))),
      this.replaceUserRows(user, "workout_sets", state.workoutSets.map((item) => workoutSetToRow(user.id, item))),
      this.replaceUserRows(user, "body_metrics", state.bodyMetrics.map((item) => bodyMetricToRow(user.id, item))),
      this.replaceUserRows(user, "progression_recommendations", state.recommendationHistory.map((item) => recommendationToRow(user.id, item))),
      this.upsert(user, "leaderboard_profiles?on_conflict=user_id", [leaderboardProfileToRow(user.id, state)])
    ]);
  }

  async getSyncResult(user: ApiUser, key: string): Promise<PersistedSyncResult | undefined> {
    const rows = await this.list<SyncEventRow>(user, `sync_events`, `select=*&idempotency_key=eq.${encodeURIComponent(key)}&limit=1`);
    const row = rows[0];
    if (!row) return undefined;
    return syncEventToResult(row);
  }

  async saveSyncResult(user: ApiUser, key: string, type: string, result: PersistedSyncResult): Promise<void> {
    await this.upsert(user, "sync_events?on_conflict=user_id,idempotency_key", [
      {
        id: cryptoSafeId(),
        user_id: user.id,
        idempotency_key: key,
        event_type: type,
        payload: result,
        status: result.status,
        error: result.error ?? null,
        processed_at: new Date().toISOString()
      }
    ]);
  }

  async listNotificationSubscriptions(user: ApiUser, filter: { endpoint?: string; localProfileId?: string } = {}): Promise<StoredNotificationSubscription[]> {
    const filters = [
      "select=*",
      "revoked_at=is.null",
      filter.endpoint ? `endpoint=eq.${encodeURIComponent(filter.endpoint)}` : "",
      filter.localProfileId ? `local_profile_id=eq.${encodeURIComponent(filter.localProfileId)}` : ""
    ].filter(Boolean).join("&");
    const rows = await this.list<PushSubscriptionRow>(user, "push_subscriptions", filters);
    return rows.map(pushSubscriptionFromRow);
  }

  async upsertNotificationSubscription(user: ApiUser, subscription: StoredNotificationSubscription): Promise<StoredNotificationSubscription> {
    await this.upsert(user, "push_subscriptions?on_conflict=user_id,endpoint", [pushSubscriptionToRow(user.id, subscription)]);
    return subscription;
  }

  async revokeNotificationSubscription(user: ApiUser, endpoint: string): Promise<{ endpoint: string }> {
    const response = await this.fetchImpl(
      createSupabaseRestRequest(
        `push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(endpoint)}`,
        { method: "PATCH", body: JSON.stringify({ revoked_at: new Date().toISOString() }) },
        this.env,
        user.accessToken
      )
    );
    if (!response.ok) throw new Error(`Supabase revoke push_subscriptions failed: ${response.status}`);
    return { endpoint };
  }

  private async saveRoutines(user: ApiUser, routines: Routine[]): Promise<void> {
    await this.replaceUserRows(user, "routine_exercises", []);
    await this.replaceUserRows(user, "routines", routines.map((item) => routineToRow(user.id, item)));
    await this.replaceUserRows(user, "workout_days", routines.flatMap((routine) => routine.days.map((day) => workoutDayToRow(user.id, routine.id, day))));
    await this.upsert(user, "routine_exercises", routines.flatMap((routine) => routine.days.flatMap((day) => day.exercises.map((exercise) => routineExerciseToRow(user.id, day.id, exercise)))));
  }

  private async replaceUserRows(user: ApiUser, table: string, rows: Record<string, unknown>[]): Promise<void> {
    await this.deleteUserRows(user, table.split("?")[0]);
    if (rows.length) await this.upsert(user, table, rows);
  }

  private async deleteUserRows(user: ApiUser, table: string): Promise<void> {
    const response = await this.fetchImpl(createSupabaseRestRequest(`${table}?user_id=eq.${user.id}`, { method: "DELETE" }, this.env, user.accessToken));
    if (!response.ok) throw new Error(`Supabase delete ${table} failed: ${response.status}`);
  }

  private async list<T>(user: ApiUser, table: string, query: string): Promise<T[]> {
    const response = await this.fetchImpl(createSupabaseRestRequest(`${table}?user_id=eq.${user.id}&${query}`, { method: "GET" }, this.env, user.accessToken));
    if (!response.ok) throw new Error(`Supabase list ${table} failed: ${response.status}`);
    return (await response.json()) as T[];
  }

  private async upsert(user: ApiUser, table: string, rows: Record<string, unknown>[]): Promise<void> {
    if (!rows.length) return;
    const response = await this.fetchImpl(
      createSupabaseRestRequest(table, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) }, this.env, user.accessToken)
    );
    if (!response.ok) throw new Error(`Supabase upsert ${table} failed: ${response.status}`);
  }
}

export function createAppRepository(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): AppRepository {
  return env.API_DATA_MODE === "supabase" ? new SupabaseAppRepository(env, fetchImpl) : new MemoryAppRepository();
}

export function demoUser(email = "phuc@example.com"): ApiUser {
  return { id: `demo:${email}`, email, mode: "demo" };
}

function seededStateForUser(user: ApiUser): AppState {
  const state = structuredClone(initialState);
  state.profile.email = user.email;
  state.profile.authMode = user.mode === "supabase" ? "email" : "local";
  if (user.mode === "supabase") {
    state.hydrationLogs = [];
    state.supplements = [];
    state.supplementLogs = [];
    state.quickAmounts = [];
    state.routines = [];
    state.activeRoutineId = "";
    state.selectedWorkoutDayId = "";
    state.exerciseLibrary = [];
    state.workoutExercises = [];
    state.workoutSessions = [];
    state.activeWorkoutSessionId = undefined;
    state.workoutSets = [];
    state.bodyMetrics = [];
    state.recommendationHistory = [];
    state.recommendationDecisions = [];
    state.friends = [];
    state.sharedPosts = [];
    state.syncQueue = [];
  }
  return state;
}

function hydrateStateFromRows(
  user: ApiUser,
  rows: {
    profile?: ProfileRow;
    drinkModules: DrinkModuleRow[];
    hydrationLogs: HydrationLogRow[];
    supplements: SupplementRow[];
    supplementLogs: SupplementLogRow[];
    exerciseLibrary: ExerciseLibraryRow[];
    routines: RoutineRow[];
    workoutDays: WorkoutDayRow[];
    routineExercises: RoutineExerciseRow[];
    workoutSessions: WorkoutSessionRow[];
    workoutSets: WorkoutSetRow[];
    bodyMetrics: BodyMetricRow[];
    recommendations: RecommendationRow[];
    leaderboardProfile?: LeaderboardProfileRow;
  }
): AppState {
  const state = seededStateForUser(user);
  if (rows.profile) {
    state.profile = {
      ...state.profile,
      name: rows.profile.display_name,
      email: user.email,
      authMode: user.mode === "supabase" ? "email" : "local",
      timezone: rows.profile.timezone,
      unitWeight: rows.profile.unit_weight === "lb" ? "lb" : "kg",
      unitVolume: rows.profile.unit_volume === "oz" ? "oz" : "ml",
      waterTargetMl: rows.profile.water_target_ml,
      wakeHour: rows.profile.wake_hour,
      sleepHour: rows.profile.sleep_hour,
      creatineAmountG: Number(rows.profile.creatine_amount_g),
      creatineHour: rows.profile.creatine_hour,
      remindBeforeMinutes: rows.profile.remind_before_minutes,
      leaderboardPublic: rows.profile.leaderboard_public
    };
  }
  if (rows.drinkModules.length) state.drinkModules = rows.drinkModules.map(drinkModuleFromRow);
  state.hydrationLogs = rows.hydrationLogs.map(hydrationLogFromRow);
  state.supplements = rows.supplements.map(supplementFromRow);
  state.supplementLogs = rows.supplementLogs.map(supplementLogFromRow);
  if (rows.exerciseLibrary.length) state.exerciseLibrary = rows.exerciseLibrary.map(exerciseFromRow);
  if (rows.routines.length) state.routines = rows.routines.map((routine) => routineFromRows(routine, rows.workoutDays, rows.routineExercises));
  if (state.routines[0]) {
    state.activeRoutineId = state.routines[0].id;
    state.selectedWorkoutDayId = state.routines[0].days[0]?.id ?? "";
    state.workoutExercises = state.routines[0].days[0]?.exercises ?? state.workoutExercises;
  }
  state.workoutSessions = rows.workoutSessions.map(workoutSessionFromRow);
  state.workoutSets = rows.workoutSets.map(workoutSetFromRow);
  state.bodyMetrics = rows.bodyMetrics.map(bodyMetricFromRow);
  state.recommendationHistory = rows.recommendations.map(recommendationFromRow);
  state.profile.leaderboardPublic = rows.leaderboardProfile?.is_public ?? state.profile.leaderboardPublic;
  return state;
}

type ProfileRow = Record<string, never> & {
  user_id: string;
  display_name: string;
  timezone: string;
  unit_weight: string;
  unit_volume: string;
  water_target_ml: number;
  wake_hour: number;
  sleep_hour: number;
  creatine_amount_g: number | string;
  creatine_hour: number;
  remind_before_minutes: number;
  leaderboard_public: boolean;
};
type DrinkModuleRow = { id: string; user_id: string; drink_type: string; name: string; category: string; unit: string; active: boolean; goal: number | string; hydration_factor: number | string; reminder_enabled: boolean };
type HydrationLogRow = { id: string; user_id: string; amount_ml: number; drink_type: HydrationLog["drinkType"]; logged_at: string };
type SupplementRow = { id: string; user_id: string; name: string; default_amount: number | string; unit: Supplement["unit"]; reminder_time?: string | null; schedule_rule?: { hours?: number[] } | null; active: boolean };
type SupplementLogRow = { id: string; user_id: string; supplement_id?: string | null; name: string; amount: number | string; unit: SupplementLog["unit"]; logged_at: string; status?: SupplementLog["status"]; skipped_reason?: string | null };
type ExerciseLibraryRow = { id: string; user_id: string; name: string; muscle_group: string; equipment: ExerciseDefinition["equipment"]; movement_pattern: ExerciseDefinition["movementPattern"]; built_in: boolean; notes?: string | null };
type RoutineRow = { id: string; user_id: string; name: string; days_per_week: number; created_at: string; updated_at?: string };
type WorkoutDayRow = { id: string; user_id: string; routine_id: string; name: string; weekday: string; order_index: number };
type RoutineExerciseRow = { id: string; user_id: string; workout_day_id: string; exercise_id?: string; order_index: number; target_sets: number; target_reps_min: number; target_reps_max: number; target_weight_kg: number | string; rest_seconds: number; progression_rule?: string; superset_group?: string | null; name?: string; muscle_group?: string };
type WorkoutSessionRow = { id: string; user_id: string; routine_day_id?: string | null; started_at: string; finished_at?: string | null; status: WorkoutSession["status"]; notes?: string | null };
type WorkoutSetRow = { id: string; user_id: string; session_id?: string | null; exercise_id?: string | null; exercise_name: string; set_index: number; target_weight_kg: number | string; target_reps: number; actual_weight_kg: number | string; actual_reps: number; rpe?: number | string | null; set_type?: WorkoutSet["setType"]; completed_at: string };
type BodyMetricRow = { id: string; user_id: string; measured_at: string; weight_kg: number | string; height_cm: number | string; body_fat_percent?: number | string | null; waist_cm?: number | string | null; chest_cm?: number | string | null; arm_cm?: number | string | null; thigh_cm?: number | string | null; note?: string | null };
type RecommendationRow = { id: string; user_id: string; exercise_id?: string | null; source: string; recommendation_json: RecommendationHistoryItem; reason: string; status: RecommendationHistoryItem["status"]; created_at: string; applied_at?: string | null };
type LeaderboardProfileRow = { id: string; user_id: string; display_name: string; score: number | string; badge_streak_months: number; is_public: boolean };
type SyncEventRow = { id: string; idempotency_key: string; event_type: string; payload: PersistedSyncResult; status: PersistedSyncResult["status"]; error?: string | null };
type PushSubscriptionRow = { user_id: string; endpoint: string; p256dh: string; auth: string; platform?: string | null; local_profile_id?: string | null; created_at: string };

function syncKey(user: ApiUser, key: string) {
  return `${user.id}:${key}`;
}

function profileToRow(userId: string, state: AppState) {
  return {
    user_id: userId,
    display_name: state.profile.name,
    timezone: state.profile.timezone,
    unit_weight: state.profile.unitWeight,
    unit_volume: state.profile.unitVolume,
    water_target_ml: state.profile.waterTargetMl,
    wake_hour: state.profile.wakeHour,
    sleep_hour: state.profile.sleepHour,
    creatine_amount_g: state.profile.creatineAmountG,
    creatine_hour: state.profile.creatineHour,
    remind_before_minutes: state.profile.remindBeforeMinutes,
    leaderboard_public: state.profile.leaderboardPublic
  };
}

function drinkModuleFromRow(row: DrinkModuleRow): DrinkModule {
  return {
    id: row.drink_type as DrinkModule["id"],
    name: row.name,
    category: row.category as DrinkModule["category"],
    unit: row.unit as DrinkModule["unit"],
    active: row.active,
    goal: Number(row.goal),
    color: row.category === "supplement" ? "supplement" : row.category === "water" ? "hydration" : "neutral",
    icon: row.drink_type as DrinkModule["icon"],
    hydrationFactor: Number(row.hydration_factor),
    reminderEnabled: row.reminder_enabled
  };
}

function drinkModuleToRow(userId: string, item: DrinkModule) {
  return { user_id: userId, drink_type: item.id, name: item.name, category: item.category, unit: item.unit, active: item.active, goal: item.goal, hydration_factor: item.hydrationFactor ?? 1, reminder_enabled: item.reminderEnabled };
}

function hydrationLogFromRow(row: HydrationLogRow): HydrationLog {
  return { id: row.id, amountMl: row.amount_ml, drinkType: row.drink_type, loggedAt: row.logged_at };
}

function hydrationLogToRow(userId: string, item: HydrationLog) {
  return { id: item.id, user_id: userId, amount_ml: item.amountMl, drink_type: item.drinkType, logged_at: item.loggedAt };
}

function supplementFromRow(row: SupplementRow): Supplement {
  return { id: row.id, name: row.name, defaultAmount: Number(row.default_amount), unit: row.unit, reminderHour: hourFromTime(row.reminder_time), scheduleHours: row.schedule_rule?.hours ?? [], active: row.active };
}

function supplementToRow(userId: string, item: Supplement) {
  return { id: item.id, user_id: userId, name: item.name, default_amount: item.defaultAmount, unit: item.unit, reminder_time: item.reminderHour === undefined ? null : `${String(item.reminderHour).padStart(2, "0")}:00:00`, schedule_rule: { hours: item.scheduleHours ?? [] }, active: item.active };
}

function supplementLogFromRow(row: SupplementLogRow): SupplementLog {
  return { id: row.id, supplementId: row.supplement_id ?? undefined, name: row.name, amount: Number(row.amount), unit: row.unit, loggedAt: row.logged_at, status: row.status, skippedReason: row.skipped_reason ?? undefined };
}

function supplementLogToRow(userId: string, item: SupplementLog) {
  return { id: item.id, user_id: userId, supplement_id: item.supplementId ?? null, name: item.name, amount: item.amount, unit: item.unit, logged_at: item.loggedAt, status: item.status ?? "taken", skipped_reason: item.skippedReason ?? null };
}

function exerciseFromRow(row: ExerciseLibraryRow): ExerciseDefinition {
  return { id: row.id, name: row.name, muscleGroup: row.muscle_group, equipment: row.equipment, movementPattern: row.movement_pattern, builtIn: row.built_in, notes: row.notes ?? undefined };
}

function exerciseToRow(userId: string, item: ExerciseDefinition) {
  return { id: item.id, user_id: userId, name: item.name, muscle_group: item.muscleGroup, equipment: item.equipment, movement_pattern: item.movementPattern, built_in: item.builtIn, notes: item.notes ?? null };
}

function routineFromRows(routine: RoutineRow, days: WorkoutDayRow[], exercises: RoutineExerciseRow[]): Routine {
  return {
    id: routine.id,
    name: routine.name,
    daysPerWeek: routine.days_per_week,
    createdAt: routine.created_at,
    updatedAt: routine.updated_at ?? routine.created_at,
    days: days
      .filter((day) => day.routine_id === routine.id)
      .map((day) => ({
        id: day.id,
        name: day.name,
        day: day.weekday,
        order: day.order_index,
        exercises: exercises
          .filter((exercise) => exercise.workout_day_id === day.id)
          .map((exercise) => ({
            id: exercise.id,
            definitionId: exercise.exercise_id,
            name: exercise.name ?? exercise.exercise_id ?? "Exercise",
            muscleGroup: exercise.muscle_group ?? "General",
            order: exercise.order_index,
            targetSets: exercise.target_sets,
            targetRepsMin: exercise.target_reps_min,
            targetRepsMax: exercise.target_reps_max,
            targetWeightKg: Number(exercise.target_weight_kg),
            restSeconds: exercise.rest_seconds,
            lastSession: "",
            supersetGroup: exercise.superset_group ?? undefined
          }))
      }))
  };
}

function routineToRow(userId: string, item: Routine) {
  return { id: item.id, user_id: userId, name: item.name, days_per_week: item.daysPerWeek, active: true, created_at: item.createdAt, updated_at: item.updatedAt };
}

function workoutDayToRow(userId: string, routineId: string, item: Routine["days"][number]) {
  return { id: item.id, user_id: userId, routine_id: routineId, name: item.name, weekday: item.day, order_index: item.order };
}

function routineExerciseToRow(userId: string, workoutDayId: string, item: Routine["days"][number]["exercises"][number]) {
  return { id: item.id, user_id: userId, workout_day_id: workoutDayId, exercise_id: null, name: item.name, muscle_group: item.muscleGroup, order_index: item.order, target_sets: item.targetSets, target_reps_min: item.targetRepsMin, target_reps_max: item.targetRepsMax, target_weight_kg: item.targetWeightKg, rest_seconds: item.restSeconds, superset_group: item.supersetGroup ?? null };
}

function workoutSessionFromRow(row: WorkoutSessionRow): WorkoutSession {
  return { id: row.id, routineId: "", workoutDayId: row.routine_day_id ?? "", sessionName: row.notes ?? "Workout Session", startedAt: row.started_at, endedAt: row.finished_at ?? undefined, durationSeconds: 0, status: row.status, sessionExerciseOrder: [], exerciseQueue: [] };
}

function workoutSessionToRow(userId: string, item: WorkoutSession) {
  return { id: item.id, user_id: userId, routine_day_id: item.workoutDayId || null, started_at: item.startedAt, finished_at: item.endedAt ?? null, status: item.status, notes: item.sessionName };
}

function workoutSetFromRow(row: WorkoutSetRow): WorkoutSet {
  return { id: row.id, sessionId: row.session_id ?? undefined, exerciseId: row.exercise_id ?? "", exerciseName: row.exercise_name, setType: row.set_type, targetWeightKg: Number(row.target_weight_kg), targetReps: row.target_reps, actualWeightKg: Number(row.actual_weight_kg), actualReps: row.actual_reps, rpe: row.rpe == null ? undefined : Number(row.rpe), completedAt: row.completed_at };
}

function workoutSetToRow(userId: string, item: WorkoutSet) {
  return { id: item.id, user_id: userId, session_id: item.sessionId ?? null, exercise_id: item.exerciseId || null, exercise_name: item.exerciseName, set_index: 0, target_weight_kg: item.targetWeightKg, target_reps: item.targetReps, actual_weight_kg: item.actualWeightKg, actual_reps: item.actualReps, rpe: item.rpe ?? null, set_type: item.setType ?? "working", completed_at: item.completedAt ?? new Date().toISOString() };
}

function bodyMetricFromRow(row: BodyMetricRow): BodyMetric {
  return { id: row.id, measuredAt: row.measured_at, weightKg: Number(row.weight_kg), heightCm: Number(row.height_cm), bodyFatPercent: row.body_fat_percent == null ? undefined : Number(row.body_fat_percent), waistCm: row.waist_cm == null ? undefined : Number(row.waist_cm), chestCm: row.chest_cm == null ? undefined : Number(row.chest_cm), armCm: row.arm_cm == null ? undefined : Number(row.arm_cm), thighCm: row.thigh_cm == null ? undefined : Number(row.thigh_cm), note: row.note ?? undefined };
}

function bodyMetricToRow(userId: string, item: BodyMetric) {
  return { id: item.id, user_id: userId, measured_at: item.measuredAt, weight_kg: item.weightKg, height_cm: item.heightCm, body_fat_percent: item.bodyFatPercent ?? null, waist_cm: item.waistCm ?? null, chest_cm: item.chestCm ?? null, arm_cm: item.armCm ?? null, thigh_cm: item.thighCm ?? null, note: item.note ?? null };
}

function recommendationFromRow(row: RecommendationRow): RecommendationHistoryItem {
  return { ...row.recommendation_json, id: row.id, generatedAt: row.created_at, exerciseId: row.exercise_id ?? row.recommendation_json.exerciseId, status: row.status };
}

function recommendationToRow(userId: string, item: RecommendationHistoryItem) {
  return { id: item.id, user_id: userId, exercise_id: item.exerciseId ?? null, source: item.source, recommendation_json: item, reason: item.reason, status: item.status, created_at: item.generatedAt, applied_at: item.status === "accepted" ? new Date().toISOString() : null };
}

function leaderboardProfileToRow(userId: string, state: AppState) {
  return { user_id: userId, display_name: state.profile.name, score: 91, badge_streak_months: 3, is_public: state.profile.leaderboardPublic };
}

function syncEventToResult(row: SyncEventRow): PersistedSyncResult {
  return row.payload ?? { id: row.id, type: row.event_type, status: row.status, error: row.error ?? undefined };
}

function pushSubscriptionFromRow(row: PushSubscriptionRow): StoredNotificationSubscription {
  return {
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userId: row.user_id,
    localProfileId: row.local_profile_id ?? row.user_id,
    platform: row.platform ?? undefined,
    createdAt: row.created_at
  };
}

function pushSubscriptionToRow(userId: string, subscription: StoredNotificationSubscription) {
  return {
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    platform: subscription.platform ?? null,
    local_profile_id: subscription.localProfileId,
    created_at: subscription.createdAt,
    revoked_at: null
  };
}

function hourFromTime(value?: string | null): number | undefined {
  if (!value) return undefined;
  const hour = Number(value.split(":")[0]);
  return Number.isInteger(hour) ? hour : undefined;
}
