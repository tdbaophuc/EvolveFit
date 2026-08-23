import type { ExerciseDefinition, HydrationLog, Routine, SessionExerciseQueueItem, Supplement, SupplementLog, WorkoutSession, WorkoutSet } from "./core";
import type { AuthMode, AuthSession } from "./auth";
import type { IntegrationStatus } from "./integrations";
import type { SyncBatchItem, SyncBatchResult } from "./api";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export class EvolveFitApiClient {
  constructor(private readonly baseUrl = "") {}

  async session(): Promise<ApiResult<AuthSession>> {
    return this.get("/api/auth/session");
  }

  async signIn(input: { email: string; password?: string; mode?: AuthMode }): Promise<ApiResult<AuthSession>> {
    return this.post("/api/auth/sign-in", input);
  }

  async signUp(input: { email: string; password: string }): Promise<ApiResult<AuthSession>> {
    return this.post("/api/auth/sign-up", input);
  }

  async signOut(): Promise<ApiResult<AuthSession>> {
    return this.post("/api/auth/sign-out", {});
  }

  async hydrationToday(): Promise<ApiResult<{ logs: HydrationLog[]; totalMl: number; targetMl: number; expectedMl: number }>> {
    return this.get("/api/hydration/today");
  }

  async logHydration(amountMl: number): Promise<ApiResult<HydrationLog>> {
    return this.post("/api/hydration/log", { amountMl });
  }

  async updateHydrationLog(id: string, amountMl: number): Promise<ApiResult<HydrationLog>> {
    return this.patch(`/api/hydration/log/${id}`, { amountMl });
  }

  async deleteHydrationLog(id: string): Promise<ApiResult<{ id: string }>> {
    return this.delete(`/api/hydration/log/${id}`);
  }

  async supplements(): Promise<ApiResult<Supplement[]>> {
    return this.get("/api/supplements");
  }

  async createSupplement(input: { name: string; defaultAmount: number; unit?: Supplement["unit"] }): Promise<ApiResult<Supplement>> {
    return this.post("/api/supplements", input);
  }

  async logSupplement(input: {
    supplementId?: string;
    name: string;
    amount: number;
    unit?: SupplementLog["unit"];
    status?: SupplementLog["status"];
    skippedReason?: string;
  }): Promise<ApiResult<SupplementLog>> {
    return this.post("/api/supplements/log", input);
  }

  async updateSupplementReminder(id: string, reminderHour: number): Promise<ApiResult<Supplement>> {
    return this.patch(`/api/supplements/${id}/reminder`, { reminderHour });
  }

  async updateSupplement(
    id: string,
    input: Partial<Pick<Supplement, "name" | "defaultAmount" | "reminderHour" | "scheduleHours" | "active">>
  ): Promise<ApiResult<Supplement>> {
    return this.patch(`/api/supplements/${id}/reminder`, input);
  }

  async workoutToday(): Promise<ApiResult<{ routineName: string; exercises: unknown[]; sets: WorkoutSet[] }>> {
    return this.get("/api/workouts/today");
  }

  async routines(): Promise<ApiResult<Routine[]>> {
    return this.get("/api/routines");
  }

  async createRoutine(input: Partial<Routine>): Promise<ApiResult<Routine>> {
    return this.post("/api/routines", input);
  }

  async updateRoutine(
    id: string,
    input: Partial<Routine> & { baseUpdatedAt?: string; conflictResolution?: "confirm" }
  ): Promise<ApiResult<Routine | { conflict: true; local: Partial<Routine>; remote: Routine; message: string }>> {
    return this.patch(`/api/routines/${id}`, input);
  }

  async deleteRoutine(id: string): Promise<ApiResult<{ id: string }>> {
    return this.delete(`/api/routines/${id}`);
  }

  async exercises(): Promise<ApiResult<ExerciseDefinition[]>> {
    return this.get("/api/exercises");
  }

  async createExercise(input: Partial<ExerciseDefinition>): Promise<ApiResult<ExerciseDefinition>> {
    return this.post("/api/exercises", input);
  }

  async updateExercise(id: string, input: Partial<ExerciseDefinition>): Promise<ApiResult<ExerciseDefinition>> {
    return this.patch(`/api/exercises/${id}`, input);
  }

  async deleteExercise(id: string): Promise<ApiResult<{ id: string }>> {
    return this.delete(`/api/exercises/${id}`);
  }

  async startWorkoutSession(input: {
    routineId?: string;
    workoutDayId?: string;
    sessionName?: string;
    sessionExerciseOrder?: string[];
  }): Promise<ApiResult<WorkoutSession>> {
    return this.post("/api/workouts/sessions", input);
  }

  async finishWorkoutSession(id: string): Promise<ApiResult<WorkoutSession>> {
    return this.post(`/api/workouts/sessions/${id}/finish`, {});
  }

  async pauseWorkoutSession(id: string): Promise<ApiResult<WorkoutSession>> {
    return this.post(`/api/workouts/sessions/${id}/pause`, {});
  }

  async resumeWorkoutSession(id: string): Promise<ApiResult<WorkoutSession>> {
    return this.post(`/api/workouts/sessions/${id}/resume`, {});
  }

  async reorderWorkoutSession(id: string, queue: SessionExerciseQueueItem[]): Promise<ApiResult<WorkoutSession>> {
    return this.post(`/api/workouts/sessions/${id}/reorder`, { queue });
  }

  async logWorkoutSet(input: Omit<WorkoutSet, "id" | "completedAt">): Promise<ApiResult<WorkoutSet>> {
    return this.post("/api/workouts/sets", input);
  }

  async updateWorkoutSet(id: string, input: Partial<WorkoutSet>): Promise<ApiResult<WorkoutSet>> {
    return this.patch(`/api/workouts/sets/${id}`, input);
  }

  async deleteWorkoutSet(id: string): Promise<ApiResult<{ id: string }>> {
    return this.delete(`/api/workouts/sets/${id}`);
  }

  async syncBatch(input: { items: SyncBatchItem[]; idempotencyKey?: string }): Promise<ApiResult<{ results: SyncBatchResult[] }>> {
    return this.post("/api/sync/batch", input);
  }

  async coachRecommend(): Promise<ApiResult<unknown>> {
    return this.post("/api/coach/recommend", {});
  }

  async achievements(): Promise<ApiResult<unknown>> {
    return this.get("/api/achievements/me");
  }

  async recalculateAchievements(): Promise<ApiResult<unknown>> {
    return this.post("/api/achievements/recalculate", {});
  }

  async setLeaderboardVisibility(isPublic: boolean): Promise<ApiResult<{ isPublic: boolean }>> {
    return this.patch("/api/leaderboards/visibility", { isPublic });
  }

  async integrationStatus(): Promise<ApiResult<IntegrationStatus>> {
    return this.get("/api/integrations/status");
  }

  async health(): Promise<ApiResult<unknown>> {
    return this.get("/api/health");
  }

  async verifySupabase(): Promise<ApiResult<unknown>> {
    return this.get("/api/supabase/verify");
  }

  private async get<T>(path: string): Promise<T> {
    return this.request(path, { method: "GET" });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request(path, { method: "POST", body: JSON.stringify(body) });
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request(path, { method: "PATCH", body: JSON.stringify(body) });
  }

  private async delete<T>(path: string): Promise<T> {
    return this.request(path, { method: "DELETE" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
    return (await response.json()) as T;
  }
}
