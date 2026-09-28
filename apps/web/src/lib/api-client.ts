import type {
  AppDataExport,
  ExerciseDefinition,
  HydrationLog,
  RecommendationDecision,
  RecommendationHistoryItem,
  Routine,
  RoutineTemplate,
  RoutineTemplatePreview,
  SessionExerciseQueueItem,
  Supplement,
  SupplementLog,
  WorkoutPlannerInput,
  WorkoutPlannerPreview,
  WorkoutSession,
  WorkoutSet
} from "@evolvefit/shared";

export type ApiResult<T> = { ok: true; data: T; requestId?: string } | { ok: false; error: string; requestId?: string };
export type AuthMode = "local" | "email" | "google";
export type AuthSession = {
  mode: AuthMode;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  oauthUrl?: string;
  emailVerified?: boolean;
  needsEmailVerification?: boolean;
};
export type IntegrationStatus = {
  supabase: "configured" | "missing-env";
  supabaseServiceRole: "configured" | "missing-env";
  ai: "configured" | "rule-fallback";
  webPush: "configured" | "missing-env";
  cronSecret: "configured" | "missing-env";
  healthPlatform: "native-bridge-required";
};
export type SyncBatchItem = {
  id?: string;
  type: string;
  payload: unknown;
  idempotencyKey?: string;
};
export type SyncBatchResult = {
  id: string;
  type: string;
  status: "synced" | "conflict" | "failed";
  data?: unknown;
  error?: string;
  conflict?: { kind: "routine"; local: unknown; remote: unknown; message: string };
};

export function evolveFitApiBaseUrl(envValue = process.env.NEXT_PUBLIC_API_BASE_URL): string {
  return (envValue ?? "").replace(/\/+$/, "");
}

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

  async refresh(input: { refreshToken?: string } = {}): Promise<ApiResult<AuthSession>> {
    return this.post("/api/auth/refresh", input);
  }

  async requestPasswordReset(input: { email: string; redirectTo?: string }): Promise<ApiResult<{ email: string; sent: boolean; mode: "supabase" | "local" }>> {
    return this.post("/api/auth/password/forgot", input);
  }

  async resetPassword(input: { accessToken: string; password: string }): Promise<ApiResult<{ updated: boolean }>> {
    return this.post("/api/auth/password/reset", input);
  }

  async exportAccount(): Promise<ApiResult<AppDataExport>> {
    return this.get("/api/account/export");
  }

  async deleteAccount(): Promise<ApiResult<{ email: string; dataDeleted: boolean; authDeleted: boolean; authDeletionMode: string; tables: string[] }>> {
    return this.delete("/api/auth/account");
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
    return this.put(`/api/supplements/${id}/reminder`, input);
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

  async marketplaceExercises(input: {
    query?: string;
    muscleGroup?: string;
    equipment?: string;
    movementPattern?: string;
    difficulty?: string;
    tag?: string;
    sort?: "name" | "muscle" | "difficulty";
    page?: number;
    pageSize?: number;
  } = {}): Promise<ApiResult<{ items: ExerciseDefinition[]; page: number; pageSize: number; total: number }>> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== "all") params.set(key, String(value));
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.get(`/api/exercises/marketplace${suffix}`);
  }

  async marketplaceExercise(idOrSlug: string): Promise<ApiResult<ExerciseDefinition>> {
    return this.get(`/api/exercises/marketplace/${idOrSlug}`);
  }

  async marketplaceExerciseSubstitutions(idOrSlug: string, input: { equipment?: string[]; limit?: number } = {}): Promise<ApiResult<{ exercise: ExerciseDefinition; substitutions: ExerciseDefinition[] }>> {
    const params = new URLSearchParams();
    if (input.equipment?.length) params.set("equipment", input.equipment.join(","));
    if (input.limit) params.set("limit", String(input.limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.get(`/api/exercises/marketplace/${idOrSlug}/substitutions${suffix}`);
  }

  async cloneMarketplaceExercise(idOrSlug: string, input: Partial<ExerciseDefinition> = {}): Promise<ApiResult<ExerciseDefinition>> {
    return this.post(`/api/exercises/marketplace/${idOrSlug}/clone`, input);
  }

  async addMarketplaceExerciseToRoutine(idOrSlug: string, input: { routineId?: string; workoutDayId?: string } = {}): Promise<ApiResult<{ routine: Routine; workoutDay: Routine["days"][number]; exercise: Routine["days"][number]["exercises"][number] }>> {
    return this.post(`/api/exercises/marketplace/${idOrSlug}/add-to-routine`, input);
  }

  async routineTemplates(input: {
    query?: string;
    goal?: "all" | "strength" | "muscle" | "fat-loss" | "health";
    daysPerWeek?: number | "all";
    equipment?: string;
    experienceLevel?: string;
    tag?: string;
    sort?: "name" | "goal" | "days" | "compatibility";
    page?: number;
    pageSize?: number;
  } = {}): Promise<ApiResult<{ items: (RoutineTemplate & { compatibility?: RoutineTemplatePreview["compatibility"] })[]; page: number; pageSize: number; total: number }>> {
    const params = new URLSearchParams();
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== "all") params.set(key, String(value));
    });
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.get(`/api/routine-templates${suffix}`);
  }

  async routineTemplate(idOrSlug: string): Promise<ApiResult<RoutineTemplate & { compatibility?: RoutineTemplatePreview["compatibility"] }>> {
    return this.get(`/api/routine-templates/${idOrSlug}`);
  }

  async previewRoutineTemplate(idOrSlug: string, input: { routineName?: string } = {}): Promise<ApiResult<RoutineTemplatePreview>> {
    return this.post(`/api/routine-templates/${idOrSlug}/preview`, input);
  }

  async applyRoutineTemplate(idOrSlug: string, input: { routineName?: string; idempotencyKey?: string } = {}): Promise<ApiResult<{ routine: Routine; template: RoutineTemplate; applied: boolean; idempotent: boolean }>> {
    return this.post(`/api/routine-templates/${idOrSlug}/apply`, input);
  }

  async cloneRoutineTemplate(idOrSlug: string, input: { routineName?: string } = {}): Promise<ApiResult<{ routine: Routine; template: RoutineTemplate }>> {
    return this.post(`/api/routine-templates/${idOrSlug}/clone`, input);
  }

  async routineTemplateFeedback(idOrSlug: string, input: { decision: "accepted" | "rejected"; favorite?: boolean; feedback?: string }): Promise<ApiResult<{ templateId: string; decision: "accepted" | "rejected"; favorite: boolean; decidedAt: string }>> {
    return this.post(`/api/routine-templates/${idOrSlug}/feedback`, input);
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

  async previewWorkoutPlanner(input: Partial<WorkoutPlannerInput>): Promise<ApiResult<WorkoutPlannerPreview>> {
    return this.post("/api/workouts/planner/preview", input);
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

  async coachRecommend(): Promise<ApiResult<{ recommendation: RecommendationHistoryItem; history: RecommendationHistoryItem[] }>> {
    return this.post("/api/coach/recommend", {});
  }

  async coachRecommendationFeedback(
    id: string,
    input: { decision: RecommendationDecision["decision"]; feedback?: string }
  ): Promise<ApiResult<{ recommendation: RecommendationHistoryItem; decision: RecommendationDecision; history: RecommendationHistoryItem[] }>> {
    return this.post(`/api/coach/recommendations/${id}/feedback`, input);
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

  async notificationConfig(localProfileId?: string): Promise<ApiResult<{ vapidPublicKey?: string; configured?: boolean; browserEnv?: boolean; fallbackMode?: string }>> {
    const query = localProfileId ? `?localProfileId=${encodeURIComponent(localProfileId)}` : "";
    return this.get(`/api/notifications/config${query}`);
  }

  async notificationStatus(localProfileId?: string): Promise<ApiResult<{ configured: boolean; fallbackMode: string; subscriptionCount: number }>> {
    const query = localProfileId ? `?localProfileId=${encodeURIComponent(localProfileId)}` : "";
    return this.get(`/api/notifications/status${query}`);
  }

  async subscribeNotifications(input: unknown): Promise<ApiResult<unknown>> {
    return this.post("/api/notifications/subscribe", input);
  }

  async unsubscribeNotifications(endpoint: string): Promise<ApiResult<{ endpoint: string }>> {
    return this.post("/api/notifications/unsubscribe", { endpoint });
  }

  async sendTestNotification(input: { endpoint?: string; localProfileId?: string }): Promise<ApiResult<{ sent?: number; missingEnv?: number; failed?: string[]; fallback?: string | null; reason?: string }>> {
    return this.post("/api/notifications/test", input);
  }

  async reportClientError(input: { message: string; digest?: string; stack?: string; path?: string; userAgent?: string }): Promise<ApiResult<{ requestId: string; reportedAt: string }>> {
    return this.post("/api/client-errors", input);
  }

  googleOAuthUrl(): string {
    return `${this.baseUrl}/api/auth/oauth/google`;
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

  private async put<T>(path: string, body: unknown): Promise<T> {
    return this.request(path, { method: "PUT", body: JSON.stringify(body) });
  }

  private async delete<T>(path: string): Promise<T> {
    return this.request(path, { method: "DELETE" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
    return (await response.json()) as T;
  }
}

export const evolveFitApiClient = new EvolveFitApiClient(evolveFitApiBaseUrl());
