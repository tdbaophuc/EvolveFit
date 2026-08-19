export type HydrationLog = {
  id: string;
  amountMl: number;
  drinkType: "water" | "coffee" | "tea" | "electrolyte" | "protein" | "other";
  loggedAt: string;
};

export type DrinkModule = {
  id: HydrationLog["drinkType"] | "creatine";
  name: string;
  category: "water" | "drink" | "supplement";
  unit: "ml" | "g";
  active: boolean;
  goal: number;
  color: "hydration" | "supplement" | "neutral";
  icon: "water" | "coffee" | "tea" | "electrolyte" | "protein" | "creatine" | "other";
  hydrationFactor?: number;
  reminderEnabled: boolean;
};

export type SupplementLog = {
  id: string;
  supplementId?: string;
  name: string;
  amount: number;
  unit: "g" | "mg" | "capsule";
  loggedAt: string;
  status?: "taken" | "skipped";
  skippedReason?: string;
};

export type Supplement = {
  id: string;
  name: string;
  defaultAmount: number;
  unit: "g" | "mg" | "capsule";
  reminderHour?: number;
  scheduleHours?: number[];
  active: boolean;
};

export type BodyMetric = {
  id: string;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  bodyFatPercent?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  note?: string;
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

export type ReminderMode = "fixed" | "interval";

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

export const defaultDrinkModules: DrinkModule[] = [
  {
    id: "water",
    name: "Water",
    category: "water",
    unit: "ml",
    active: true,
    goal: 2500,
    color: "hydration",
    icon: "water",
    hydrationFactor: 1,
    reminderEnabled: true
  },
  {
    id: "creatine",
    name: "Creatine",
    category: "supplement",
    unit: "g",
    active: true,
    goal: 5,
    color: "supplement",
    icon: "creatine",
    reminderEnabled: true
  },
  {
    id: "coffee",
    name: "Coffee",
    category: "drink",
    unit: "ml",
    active: false,
    goal: 0,
    color: "neutral",
    icon: "coffee",
    hydrationFactor: 0.8,
    reminderEnabled: false
  },
  {
    id: "tea",
    name: "Tea",
    category: "drink",
    unit: "ml",
    active: false,
    goal: 0,
    color: "neutral",
    icon: "tea",
    hydrationFactor: 0.9,
    reminderEnabled: false
  },
  {
    id: "electrolyte",
    name: "Electrolyte",
    category: "drink",
    unit: "ml",
    active: false,
    goal: 0,
    color: "hydration",
    icon: "electrolyte",
    hydrationFactor: 1,
    reminderEnabled: false
  },
  {
    id: "protein",
    name: "Protein shake",
    category: "drink",
    unit: "ml",
    active: false,
    goal: 0,
    color: "neutral",
    icon: "protein",
    hydrationFactor: 0.7,
    reminderEnabled: false
  }
];

export function normalizeDrinkModules(modules: DrinkModule[] | undefined, waterTargetMl = 2500, creatineGoalG = 5): DrinkModule[] {
  const existing = modules ?? [];
  return defaultDrinkModules.map((fallback) => {
    const current = existing.find((module) => module.id === fallback.id);
    const goal = fallback.id === "water" ? waterTargetMl : fallback.id === "creatine" ? creatineGoalG : fallback.goal;
    return {
      ...fallback,
      ...current,
      active: fallback.id === "water" ? true : (current?.active ?? fallback.active),
      goal: fallback.id === "water" || fallback.id === "creatine" ? goal : (current?.goal ?? goal),
      reminderEnabled: current?.reminderEnabled ?? fallback.reminderEnabled
    };
  });
}

export function isDrinkModuleActive(modules: DrinkModule[], id: DrinkModule["id"]): boolean {
  if (id === "water") return true;
  return modules.find((module) => module.id === id)?.active ?? false;
}

export function activeDrinkModules(modules: DrinkModule[]): DrinkModule[] {
  return normalizeDrinkModules(modules).filter((module) => module.active);
}

export function hydrationContribution(log: HydrationLog, modules: DrinkModule[]): number {
  const drinkModule = normalizeDrinkModules(modules).find((item) => item.id === log.drinkType);
  if (!drinkModule || !drinkModule.active) return 0;
  return Math.round(log.amountMl * (drinkModule.hydrationFactor ?? 0));
}

export function visibleHydrationLogs(logs: HydrationLog[], modules: DrinkModule[], includeInactiveHistory = false): HydrationLog[] {
  if (includeInactiveHistory) return logs;
  const normalized = normalizeDrinkModules(modules);
  return logs.filter((log) => isDrinkModuleActive(normalized, log.drinkType));
}

export function hydrationTotal(logs: HydrationLog[], date = new Date(), modules: DrinkModule[] = defaultDrinkModules): number {
  const key = todayKey(date);
  return logs
    .filter((log) => log.loggedAt.slice(0, 10) === key)
    .reduce((sum, log) => sum + hydrationContribution(log, modules), 0);
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

export function isInQuietHours(now: Date, quietHours: { start: number; end: number }): boolean {
  if (quietHours.start < 0 || quietHours.end < 0 || quietHours.start === quietHours.end) return false;
  const hour = now.getHours();
  return quietHours.start > quietHours.end
    ? hour >= quietHours.start || hour < quietHours.end
    : hour >= quietHours.start && hour < quietHours.end;
}

export function isSnoozed(snoozeUntil: string | undefined, now = new Date()): boolean {
  return Boolean(snoozeUntil && new Date(snoozeUntil).getTime() > now.getTime());
}

function minutesSince(iso: string | undefined, now: Date): number | undefined {
  if (!iso) return undefined;
  return (now.getTime() - new Date(iso).getTime()) / 60000;
}

function scheduledDateForHour(now: Date, hour: number, minuteOffset = 0): Date {
  const scheduled = new Date(now);
  scheduled.setHours(hour, 0, 0, 0);
  scheduled.setMinutes(scheduled.getMinutes() + minuteOffset);
  return scheduled;
}

function fixedReminderDue(params: {
  times: number[];
  now: Date;
  lastReminderAt?: string;
  minuteOffset?: number;
}): boolean {
  const today = todayKey(params.now);
  const lastReminderAt = params.lastReminderAt ? new Date(params.lastReminderAt) : undefined;
  return params.times.some((hour) => {
    const scheduled = scheduledDateForHour(params.now, hour, params.minuteOffset);
    if (scheduled.toISOString().slice(0, 10) !== today || params.now < scheduled) return false;
    return !lastReminderAt || lastReminderAt < scheduled;
  });
}

export function suggestedWaterTargetMl(weightKg: number, workoutDaysPerWeek = 0): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 2500;
  const base = weightKg * 35;
  const trainingBump = Math.min(500, Math.max(0, workoutDaysPerWeek) * 75);
  return Math.round((base + trainingBump) / 50) * 50;
}

export function suggestedRoutineTemplate(workoutDaysPerWeek: number): "ppl" | "upper-lower" | "full-body" {
  if (workoutDaysPerWeek >= 5) return "ppl";
  if (workoutDaysPerWeek >= 4) return "upper-lower";
  return "full-body";
}

export function shouldSendHydrationReminder(params: {
  totalMl: number;
  expectedMl: number;
  lastLogAt?: string;
  lastReminderAt?: string;
  now?: Date;
  quietHours: { start: number; end: number };
  enabled?: boolean;
  mode?: ReminderMode;
  times?: number[];
  intervalHours?: number;
  snoozeUntil?: string;
  quietHoursEnabled?: boolean;
}): boolean {
  if (params.enabled === false) return false;
  const now = params.now ?? new Date();
  if (isSnoozed(params.snoozeUntil, now)) return false;
  if (params.quietHoursEnabled !== false && isInQuietHours(now, params.quietHours)) return false;
  if (params.totalMl >= params.expectedMl - 250) return false;

  const mode = params.mode ?? "interval";
  const intervalHours = Math.max(1, params.intervalHours ?? 1.25);
  const minutesSinceLastLog = minutesSince(params.lastLogAt, now);
  const minutesSinceLastReminder = minutesSince(params.lastReminderAt, now);
  if (minutesSinceLastLog !== undefined && minutesSinceLastLog < intervalHours * 60) return false;

  if (mode === "fixed") {
    return fixedReminderDue({ times: params.times?.length ? params.times : [9, 11, 13, 15, 17, 19, 21], now, lastReminderAt: params.lastReminderAt });
  }

  if (minutesSinceLastReminder !== undefined && minutesSinceLastReminder < intervalHours * 60) return false;
  return true;
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

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  const escape = (value: unknown) => {
    const text = value === undefined || value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
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
  scheduleHours?: number[];
  remindBeforeMinutes: number;
  lastReminderAt?: string;
  now?: Date;
  enabled?: boolean;
  mode?: ReminderMode;
  intervalHours?: number;
  snoozeUntil?: string;
  quietHours?: { start: number; end: number };
  quietHoursEnabled?: boolean;
}): boolean {
  if (params.enabled === false) return false;
  const now = params.now ?? new Date();
  if (isSnoozed(params.snoozeUntil, now)) return false;
  if (params.quietHours && params.quietHoursEnabled !== false && isInQuietHours(now, params.quietHours)) return false;
  const today = todayKey(now);
  const loggedToday = params.logs.some((log) => log.name.toLowerCase() === "creatine" && log.loggedAt.startsWith(today));
  if (loggedToday) return false;

  const mode = params.mode ?? "fixed";
  if (mode === "interval") {
    const intervalHours = Math.max(1, params.intervalHours ?? 24);
    const minutesSinceLastReminder = minutesSince(params.lastReminderAt, now);
    if (minutesSinceLastReminder !== undefined && minutesSinceLastReminder < intervalHours * 60) return false;
    return true;
  }

  return fixedReminderDue({
    times: params.scheduleHours?.length ? params.scheduleHours : [params.scheduledHour],
    now,
    lastReminderAt: params.lastReminderAt,
    minuteOffset: -params.remindBeforeMinutes
  });
}

export function cryptoSafeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
