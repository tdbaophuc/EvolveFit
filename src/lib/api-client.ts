import type { HydrationLog, Supplement, SupplementLog, WorkoutSet } from "./core";
import type { IntegrationStatus } from "./integrations";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export class EvolveFitApiClient {
  constructor(private readonly baseUrl = "") {}

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

  async logSupplement(input: { name: string; amount: number; unit?: SupplementLog["unit"] }): Promise<ApiResult<SupplementLog>> {
    return this.post("/api/supplements/log", input);
  }

  async updateSupplementReminder(id: string, reminderHour: number): Promise<ApiResult<Supplement>> {
    return this.patch(`/api/supplements/${id}/reminder`, { reminderHour });
  }

  async workoutToday(): Promise<ApiResult<{ routineName: string; exercises: unknown[]; sets: WorkoutSet[] }>> {
    return this.get("/api/workouts/today");
  }

  async logWorkoutSet(input: Omit<WorkoutSet, "id" | "completedAt">): Promise<ApiResult<WorkoutSet>> {
    return this.post("/api/workouts/sets", input);
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
