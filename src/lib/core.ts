export type HydrationLog = {
  id: string;
  amountMl: number;
  drinkType: "water" | "coffee" | "tea" | "other";
  loggedAt: string;
};

export type SupplementLog = {
  id: string;
  name: string;
  amount: number;
  unit: "g" | "mg" | "capsule";
  loggedAt: string;
  status?: "taken" | "skipped";
};

export type Supplement = {
  id: string;
  name: string;
  defaultAmount: number;
  unit: "g" | "mg" | "capsule";
  reminderHour?: number;
  active: boolean;
};

export type BodyMetric = {
  id: string;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  bodyFatPercent?: number;
  waistCm?: number;
};

export type QuickAmount = {
  id: string;
  category: "hydration" | "supplement";
  label: string;
  amount: number;
  unit: "ml" | "g";
  pinned: boolean;
  uses: number;
};

export type WorkoutSet = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetWeightKg: number;
  targetReps: number;
  actualWeightKg: number;
  actualReps: number;
  rpe?: number;
  completedAt?: string;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightKg: number;
  restSeconds: number;
  lastSession: string;
};

export type Recommendation = {
  title: string;
  reason: string;
  source: "rule" | "ai-assisted";
  action: "increase" | "hold" | "deload";
  nextWeightKg: number;
};

export type AchievementStatus = {
  code: string;
  name: string;
  status: "active" | "locked" | "lost";
  progress: number;
  target: number;
  streakMonths: number;
};

export const todayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export function hydrationTotal(logs: HydrationLog[], date = new Date()): number {
  const key = todayKey(date);
  return logs
    .filter((log) => log.loggedAt.slice(0, 10) === key)
    .reduce((sum, log) => sum + log.amountMl, 0);
}

export function hydrationPercent(totalMl: number, targetMl: number): number {
  if (targetMl <= 0) return 0;
  return Math.min(100, Math.round((totalMl / targetMl) * 100));
}

export function expectedHydrationByNow(
  targetMl: number,
  wakeHour: number,
  sleepHour: number,
  now = new Date()
): number {
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const activeHours = Math.max(1, sleepHour - wakeHour);
  const elapsed = Math.min(activeHours, Math.max(0, currentHour - wakeHour));
  return Math.round((targetMl / activeHours) * elapsed);
}

export function hydrationPaceStatus(totalMl: number, expectedMl: number): "ahead" | "on-pace" | "behind" {
  const threshold = 250;
  if (totalMl + threshold < expectedMl) return "behind";
  if (totalMl > expectedMl + threshold) return "ahead";
  return "on-pace";
}

export function shouldSendHydrationReminder(params: {
  totalMl: number;
  expectedMl: number;
  lastLogAt?: string;
  now?: Date;
  quietHours: { start: number; end: number };
}): boolean {
  const now = params.now ?? new Date();
  const hour = now.getHours();
  const inQuietHours =
    params.quietHours.start > params.quietHours.end
      ? hour >= params.quietHours.start || hour < params.quietHours.end
      : hour >= params.quietHours.start && hour < params.quietHours.end;

  if (inQuietHours || params.totalMl >= params.expectedMl - 250) return false;
  if (!params.lastLogAt) return true;

  const minutesSinceLastLog = (now.getTime() - new Date(params.lastLogAt).getTime()) / 60000;
  return minutesSinceLastLog >= 75;
}

export function upsertQuickAmount(amounts: QuickAmount[], next: Omit<QuickAmount, "id" | "uses">): QuickAmount[] {
  const existing = amounts.find(
    (amount) => amount.category === next.category && amount.amount === next.amount && amount.unit === next.unit
  );

  if (existing) {
    return amounts.map((amount) =>
      amount.id === existing.id ? { ...amount, pinned: amount.pinned || next.pinned, uses: amount.uses + 1 } : amount
    );
  }

  return [
    ...amounts,
    {
      ...next,
      id: cryptoSafeId(),
      uses: 1
    }
  ];
}

export function visibleQuickAmounts(amounts: QuickAmount[], category: QuickAmount["category"], limit = 4): QuickAmount[] {
  return amounts
    .filter((amount) => amount.category === category && amount.pinned)
    .sort((a, b) => b.uses - a.uses || a.amount - b.amount)
    .slice(0, limit);
}

export function progressiveOverloadRecommendation(params: {
  exerciseName: string;
  targetWeightKg: number;
  targetRepsMax: number;
  recentSets: Pick<WorkoutSet, "actualWeightKg" | "actualReps" | "rpe">[];
  incrementKg?: number;
}): Recommendation {
  const increment = params.incrementKg ?? 2.5;
  const allHitTopReps =
    params.recentSets.length > 0 &&
    params.recentSets.every((set) => set.actualReps >= params.targetRepsMax && set.actualWeightKg >= params.targetWeightKg);
  const failedBadly = params.recentSets.some((set) => set.actualReps <= Math.max(1, params.targetRepsMax - 4));
  const veryHard = params.recentSets.some((set) => (set.rpe ?? 8) >= 10);

  if (allHitTopReps && !veryHard) {
    return {
      title: `Tăng ${params.exerciseName} lên ${params.targetWeightKg + increment}kg`,
      reason: "Bạn đã đạt top reps ở toàn bộ set gần nhất, phù hợp double progression.",
      source: "rule",
      action: "increase",
      nextWeightKg: params.targetWeightKg + increment
    };
  }

  if (failedBadly || veryHard) {
    const nextWeight = Math.max(0, params.targetWeightKg * 0.9);
    return {
      title: `Giảm tải ${params.exerciseName}`,
      reason: "Set gần nhất quá nặng hoặc hụt reps sâu; nên deload để giữ kỹ thuật.",
      source: "rule",
      action: "deload",
      nextWeightKg: Math.round(nextWeight * 2) / 2
    };
  }

  return {
    title: `Giữ mức ${params.targetWeightKg}kg`,
    reason: "Bạn đang trong vùng tiến bộ, tiếp tục gom thêm reps trước khi tăng tải.",
    source: "rule",
    action: "hold",
    nextWeightKg: params.targetWeightKg
  };
}

export function estimatedOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function latestBodyMetric(metrics: BodyMetric[]): BodyMetric | undefined {
  return [...metrics].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
}

export function bodyWeightDelta(metrics: BodyMetric[]): number {
  const sorted = [...metrics].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  if (sorted.length < 2) return 0;
  return Math.round((sorted[sorted.length - 1].weightKg - sorted[0].weightKg) * 10) / 10;
}

export function exportAppData(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function readinessScore(input: { energy: number; sleepQuality: number; soreness: number; stress: number }): number {
  const clamp = (value: number) => Math.min(5, Math.max(1, value));
  const positive = clamp(input.energy) + clamp(input.sleepQuality);
  const inverse = 6 - clamp(input.soreness) + (6 - clamp(input.stress));
  return Math.round(((positive + inverse) / 20) * 100);
}

export type SyncQueueItem = {
  id: string;
  type: string;
  status: "pending" | "synced" | "failed";
  createdAt: string;
  payload: unknown;
};

export function enqueueSync(queue: SyncQueueItem[], item: Omit<SyncQueueItem, "id" | "status" | "createdAt">): SyncQueueItem[] {
  return [
    {
      ...item,
      id: cryptoSafeId(),
      status: "pending",
      createdAt: new Date().toISOString()
    },
    ...queue
  ];
}

export function markSyncQueue(queue: SyncQueueItem[], status: SyncQueueItem["status"]): SyncQueueItem[] {
  return queue.map((item) => (item.status === "pending" ? { ...item, status } : item));
}

export function monthlyAchievements(params: {
  hydrationGoalDays: number;
  hydrationTargetDays: number;
  volumeChangePercent: number;
  previousHydrationStreak?: number;
  previousVolumeStreak?: number;
}): AchievementStatus[] {
  const hydrationActive = params.hydrationGoalDays >= params.hydrationTargetDays;
  const volumeActive = params.volumeChangePercent >= 3;

  return [
    {
      code: "monthly_hydration",
      name: "Hydration Elite",
      status: hydrationActive ? "active" : "locked",
      progress: params.hydrationGoalDays,
      target: params.hydrationTargetDays,
      streakMonths: hydrationActive ? (params.previousHydrationStreak ?? 0) + 1 : 0
    },
    {
      code: "volume_progression",
      name: "Volume Climber",
      status: volumeActive ? "active" : "locked",
      progress: Math.max(0, Math.round(params.volumeChangePercent)),
      target: 3,
      streakMonths: volumeActive ? (params.previousVolumeStreak ?? 0) + 1 : 0
    }
  ];
}

export function shouldSendCreatineReminder(params: {
  logs: SupplementLog[];
  scheduledHour: number;
  remindBeforeMinutes: number;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  const today = todayKey(now);
  const loggedToday = params.logs.some((log) => log.name.toLowerCase() === "creatine" && log.loggedAt.startsWith(today));
  if (loggedToday) return false;

  const reminderTime = new Date(now);
  reminderTime.setHours(params.scheduledHour, 0, 0, 0);
  reminderTime.setMinutes(reminderTime.getMinutes() - params.remindBeforeMinutes);

  return now >= reminderTime;
}

export function cryptoSafeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
