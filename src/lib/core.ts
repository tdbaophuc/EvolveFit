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
  sessionId?: string;
  exerciseId: string;
  exerciseName: string;
  setType?: WorkoutSetType;
  targetWeightKg: number;
  targetReps: number;
  actualWeightKg: number;
  actualReps: number;
  rpe?: number;
  completedAt?: string;
};

export type WorkoutSetType = "warmup" | "working" | "drop" | "failure";

export type WarmUpSetSuggestion = {
  setType: "warmup";
  weightKg: number;
  reps: number;
  percent: number;
};

export type PlateSettings = {
  barbellDefault: "20kg" | "15kg" | "custom";
  customBarbellKg: number;
  plateInventoryKg: number[];
};

export type PlateCalculation = {
  targetWeightKg: number;
  barbellKg: number;
  loadableWeightKg: number;
  perSideWeightKg: number;
  platesPerSide: { weightKg: number; count: number }[];
  matchedWeightKg: number;
  remainderKg: number;
};

export type WorkoutSetPr = {
  type: "maxWeight" | "maxReps" | "estimatedOneRepMax" | "volume";
  label: string;
  previous: number;
  next: number;
};

export type WorkoutSessionStatus = "active" | "paused" | "finished" | "cancelled";
export type SessionExerciseQueueStatus = "queued" | "completed" | "parked";

export type SessionExerciseQueueItem = {
  exerciseId: string;
  status: SessionExerciseQueueStatus;
};

export type WorkoutSession = {
  id: string;
  routineId: string;
  workoutDayId: string;
  sessionName: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  status: WorkoutSessionStatus;
  sessionExerciseOrder: string[];
  exerciseQueue: SessionExerciseQueueItem[];
};

export type WorkoutExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  supersetGroup?: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightKg: number;
  restSeconds: number;
  lastSession: string;
};

export type EquipmentType = "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "kettlebell" | "other";

export type MovementPattern =
  | "push"
  | "pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "carry"
  | "isolation"
  | "core";

export type ExerciseDefinition = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: EquipmentType;
  movementPattern: MovementPattern;
  builtIn: boolean;
  notes?: string;
};

export type RoutineExercise = WorkoutExercise & {
  definitionId?: string;
  order: number;
};

export type WorkoutDay = {
  id: string;
  name: string;
  day: string;
  order: number;
  exercises: RoutineExercise[];
};

export type Routine = {
  id: string;
  name: string;
  daysPerWeek: number;
  days: WorkoutDay[];
  createdAt: string;
  updatedAt: string;
};

export type RoutineImportRow = WorkoutExercise & {
  sourceLine: number;
  session: string;
  day: string;
  note: string;
};

export type RoutineImportPreview = {
  fileName: string;
  rows: RoutineImportRow[];
  errors: string[];
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
  status: "active" | "locked" | "lost" | "disabled";
  progress: number;
  target: number;
  streakMonths: number;
  condition?: string;
};

export type PeriodProgress = {
  days: number;
  averageMl: number;
  goalHitRate: number;
  hitDays: number;
};

export type VolumeBucket = {
  label: string;
  volumeKg: number;
};

export type ExercisePr = {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  maxReps: number;
  estimatedOneRepMaxKg: number;
  volumePrKg: number;
};

export type E1RmTrendPoint = {
  date: string;
  exerciseId: string;
  exerciseName: string;
  estimatedOneRepMaxKg: number;
};

export type ProgressDashboard = {
  hydration7: PeriodProgress;
  hydration30: PeriodProgress;
  creatineConsistency?: {
    days: number;
    takenDays: number;
    consistencyRate: number;
  };
  workoutCount7: number;
  workoutCount30: number;
  weeklyVolume: VolumeBucket[];
  volumeByMuscleGroup: VolumeBucket[];
  e1RmTrend: E1RmTrendPoint[];
  prs: ExercisePr[];
};

export type ReportTrend = {
  hydrationAverageMl: number;
  goalHitRate: number;
  workoutCount: number;
  totalVolumeKg: number;
};

export type ProgressReport = {
  label: string;
  period: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  hydrationAverageMl: number;
  hydrationGoalHitRate: number;
  hydrationHitDays: number;
  workoutCount: number;
  totalVolumeKg: number;
  prs: ExercisePr[];
  badges: AchievementStatus[];
  trendVsPrevious: ReportTrend;
};

export type ProgressReports = {
  weekly: ProgressReport;
  monthly: ProgressReport;
};

export type WeightUnit = "kg" | "lb";
export type BodyMetricRangeDays = 7 | 30 | 90;

export type BodyMetricValidationInput = {
  weightKg: number;
  bodyFatPercent?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
};

export type BodyMetricChartPoint = {
  date: string;
  weight: number;
  smoothedWeight: number;
  bodyFatPercent?: number;
  smoothedBodyFatPercent?: number;
};

export type BodyMetricChartDataset = {
  rangeDays: BodyMetricRangeDays;
  unit: WeightUnit;
  weightGoal?: number;
  bodyFatGoal?: number;
  points: BodyMetricChartPoint[];
  hasWeightData: boolean;
  hasBodyFatData: boolean;
};

export const todayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const builtInExerciseDefinitions: ExerciseDefinition[] = [
  { id: "lib-bench-press", name: "Barbell Bench Press", muscleGroup: "Chest", equipment: "barbell", movementPattern: "push", builtIn: true },
  { id: "lib-incline-db-press", name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "dumbbell", movementPattern: "push", builtIn: true },
  { id: "lib-push-up", name: "Push-up", muscleGroup: "Chest", equipment: "bodyweight", movementPattern: "push", builtIn: true },
  { id: "lib-row", name: "Chest Supported Row", muscleGroup: "Back", equipment: "machine", movementPattern: "pull", builtIn: true },
  { id: "lib-lat-pulldown", name: "Lat Pulldown", muscleGroup: "Back", equipment: "cable", movementPattern: "pull", builtIn: true },
  { id: "lib-pull-up", name: "Pull-up", muscleGroup: "Back", equipment: "bodyweight", movementPattern: "pull", builtIn: true },
  { id: "lib-squat", name: "Back Squat", muscleGroup: "Legs", equipment: "barbell", movementPattern: "squat", builtIn: true },
  { id: "lib-rdl", name: "Romanian Deadlift", muscleGroup: "Legs", equipment: "barbell", movementPattern: "hinge", builtIn: true },
  { id: "lib-leg-press", name: "Leg Press", muscleGroup: "Legs", equipment: "machine", movementPattern: "squat", builtIn: true },
  { id: "lib-shoulder-press", name: "Seated Shoulder Press", muscleGroup: "Shoulders", equipment: "dumbbell", movementPattern: "push", builtIn: true },
  { id: "lib-lateral-raise", name: "Lateral Raise", muscleGroup: "Shoulders", equipment: "dumbbell", movementPattern: "isolation", builtIn: true },
  { id: "lib-curl", name: "Dumbbell Curl", muscleGroup: "Arms", equipment: "dumbbell", movementPattern: "isolation", builtIn: true },
  { id: "lib-triceps-pushdown", name: "Cable Triceps Pushdown", muscleGroup: "Arms", equipment: "cable", movementPattern: "isolation", builtIn: true },
  { id: "lib-plank", name: "Plank", muscleGroup: "Core", equipment: "bodyweight", movementPattern: "core", builtIn: true },
  { id: "lib-cable-crunch", name: "Cable Crunch", muscleGroup: "Core", equipment: "cable", movementPattern: "core", builtIn: true }
];

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

export const defaultPlateSettings: PlateSettings = {
  barbellDefault: "20kg",
  customBarbellKg: 20,
  plateInventoryKg: [25, 20, 15, 10, 5, 2.5, 1.25]
};

export function barbellWeightKg(settings: PlateSettings): number {
  if (settings.barbellDefault === "15kg") return 15;
  if (settings.barbellDefault === "custom") return Number.isFinite(settings.customBarbellKg) ? Math.max(0, settings.customBarbellKg) : 0;
  return 20;
}

export function normalizePlateInventory(plates: number[] | undefined): number[] {
  const normalized = (plates?.length ? plates : defaultPlateSettings.plateInventoryKg)
    .filter((plate) => Number.isFinite(plate) && plate > 0)
    .map((plate) => round(plate, 2))
    .filter((plate, index, list) => list.indexOf(plate) === index)
    .sort((a, b) => b - a);
  return normalized.length ? normalized : defaultPlateSettings.plateInventoryKg;
}

export function calculatePlatesPerSide(targetWeightKg: number, settings: PlateSettings): PlateCalculation {
  const barbellKg = barbellWeightKg(settings);
  const loadableWeightKg = Math.max(0, targetWeightKg - barbellKg);
  let remainingPerSide = loadableWeightKg / 2;
  const platesPerSide: PlateCalculation["platesPerSide"] = [];

  for (const weightKg of normalizePlateInventory(settings.plateInventoryKg)) {
    const count = Math.floor((remainingPerSide + 0.0001) / weightKg);
    if (!count) continue;
    platesPerSide.push({ weightKg, count });
    remainingPerSide = round(remainingPerSide - weightKg * count, 2);
  }

  const matchedPerSide = platesPerSide.reduce((sum, plate) => sum + plate.weightKg * plate.count, 0);
  const matchedWeightKg = round(barbellKg + matchedPerSide * 2, 2);
  return {
    targetWeightKg,
    barbellKg,
    loadableWeightKg: round(loadableWeightKg, 2),
    perSideWeightKg: round(loadableWeightKg / 2, 2),
    platesPerSide,
    matchedWeightKg,
    remainderKg: round(Math.max(0, targetWeightKg - matchedWeightKg), 2)
  };
}

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

export function workoutExerciseToRoutineExercise(exercise: WorkoutExercise, order: number): RoutineExercise {
  return {
    ...exercise,
    order
  };
}

export function routineExercisesToWorkoutExercises(exercises: RoutineExercise[]): WorkoutExercise[] {
  return [...exercises]
    .sort((a, b) => a.order - b.order)
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      supersetGroup: exercise.supersetGroup,
      targetSets: exercise.targetSets,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      targetWeightKg: exercise.targetWeightKg,
      restSeconds: exercise.restSeconds,
      lastSession: exercise.lastSession
    }));
}

export function migrateWorkoutExercisesToRoutine(
  exercises: WorkoutExercise[],
  options: { routineId?: string; name?: string; day?: string; dayName?: string; now?: Date } = {}
): Routine {
  const nowIso = (options.now ?? new Date()).toISOString();
  return {
    id: options.routineId ?? "routine-local",
    name: options.name ?? "Current Routine",
    daysPerWeek: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    days: [
      {
        id: `${options.routineId ?? "routine-local"}-day-1`,
        name: options.dayName ?? "Day 1",
        day: options.day ?? "Mon",
        order: 0,
        exercises: exercises.map((exercise, index) => workoutExerciseToRoutineExercise(exercise, index))
      }
    ]
  };
}

export function selectedWorkoutDay(routine: Routine | undefined, date = new Date()): WorkoutDay | undefined {
  if (!routine?.days.length) return undefined;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  return routine.days.find((day) => day.day === weekday) ?? [...routine.days].sort((a, b) => a.order - b.order)[0];
}

export function filterExerciseLibrary(
  exercises: ExerciseDefinition[],
  filters: { query?: string; muscleGroup?: string; equipment?: string; movementPattern?: string }
): ExerciseDefinition[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return exercises
    .filter((exercise) => !query || exercise.name.toLowerCase().includes(query) || exercise.muscleGroup.toLowerCase().includes(query))
    .filter((exercise) => !filters.muscleGroup || filters.muscleGroup === "all" || exercise.muscleGroup === filters.muscleGroup)
    .filter((exercise) => !filters.equipment || filters.equipment === "all" || exercise.equipment === filters.equipment)
    .filter((exercise) => !filters.movementPattern || filters.movementPattern === "all" || exercise.movementPattern === filters.movementPattern)
    .sort((a, b) => Number(b.builtIn) - Number(a.builtIn) || a.muscleGroup.localeCompare(b.muscleGroup) || a.name.localeCompare(b.name));
}

export function createCustomExerciseDefinition(input: {
  name: string;
  muscleGroup: string;
  equipment: EquipmentType;
  movementPattern: MovementPattern;
  notes?: string;
}): ExerciseDefinition {
  return {
    id: cryptoSafeId(),
    name: input.name.trim() || "Custom Exercise",
    muscleGroup: input.muscleGroup.trim() || "Custom",
    equipment: input.equipment,
    movementPattern: input.movementPattern,
    notes: input.notes,
    builtIn: false
  };
}

export function workoutSessionDurationSeconds(session: Pick<WorkoutSession, "startedAt" | "endedAt">, now = new Date()): number {
  const end = session.endedAt ? new Date(session.endedAt) : now;
  return Math.max(0, Math.round((end.getTime() - new Date(session.startedAt).getTime()) / 1000));
}

export function createWorkoutSession(input: {
  routineId: string;
  workoutDayId: string;
  sessionName: string;
  sessionExerciseOrder: string[];
  now?: Date;
}): WorkoutSession {
  const startedAt = (input.now ?? new Date()).toISOString();
  return {
    id: cryptoSafeId(),
    routineId: input.routineId,
    workoutDayId: input.workoutDayId,
    sessionName: input.sessionName,
    startedAt,
    durationSeconds: 0,
    status: "active",
    sessionExerciseOrder: input.sessionExerciseOrder,
    exerciseQueue: input.sessionExerciseOrder.map((exerciseId) => ({ exerciseId, status: "queued" }))
  };
}

export function warmUpSetSuggestions(params: {
  workingWeightKg: number;
  workingReps: number;
  incrementKg?: number;
}): WarmUpSetSuggestion[] {
  if (!Number.isFinite(params.workingWeightKg) || params.workingWeightKg <= 0) return [];
  const increment = params.incrementKg ?? 2.5;
  const roundToIncrement = (weight: number) => Math.max(0, Math.round(weight / increment) * increment);
  const workingReps = Math.max(1, Math.round(params.workingReps));
  const tiers =
    params.workingWeightKg >= 80
      ? [
          { percent: 0.4, reps: Math.min(8, workingReps) },
          { percent: 0.6, reps: Math.min(5, workingReps) },
          { percent: 0.8, reps: Math.min(3, workingReps) }
        ]
      : params.workingWeightKg >= 40
        ? [
            { percent: 0.5, reps: Math.min(6, workingReps) },
            { percent: 0.75, reps: Math.min(3, workingReps) }
          ]
        : [{ percent: 0.6, reps: Math.min(5, workingReps) }];

  const seen = new Set<number>();
  return tiers.flatMap((tier) => {
    const weightKg = roundToIncrement(params.workingWeightKg * tier.percent);
    if (weightKg <= 0 || weightKg >= params.workingWeightKg || seen.has(weightKg)) return [];
    seen.add(weightKg);
    return [{ setType: "warmup" as const, weightKg, reps: tier.reps, percent: Math.round(tier.percent * 100) }];
  });
}

export function isWorkingVolumeSet(set: WorkoutSet): boolean {
  const setType = set.setType ?? "working";
  return set.actualReps > 0 && set.actualWeightKg >= 0 && setType !== "warmup";
}

export function countsTowardTargetSets(set: WorkoutSet): boolean {
  return (set.setType ?? "working") !== "warmup";
}

export function workingSetVolumeKg(sets: WorkoutSet[]): number {
  return round(sets.filter(isWorkingVolumeSet).reduce((sum, set) => sum + set.actualWeightKg * set.actualReps, 0));
}

export function nextSupersetExerciseIndex(params: {
  exercises: WorkoutExercise[];
  currentIndex: number;
  sets: WorkoutSet[];
}): number | undefined {
  const current = params.exercises[params.currentIndex];
  if (!current?.supersetGroup) return undefined;
  const groupIndexes = params.exercises
    .map((exercise, index) => ({ exercise, index }))
    .filter(({ exercise }) => exercise.supersetGroup === current.supersetGroup);
  if (groupIndexes.length < 2) return undefined;

  const completedCount = (exerciseId: string) =>
    params.sets.filter((set) => set.exerciseId === exerciseId && countsTowardTargetSets(set)).length;
  const currentCount = completedCount(current.id);
  const currentGroupPosition = groupIndexes.findIndex(({ index }) => index === params.currentIndex);

  for (let offset = 1; offset <= groupIndexes.length; offset += 1) {
    const candidate = groupIndexes[(currentGroupPosition + offset) % groupIndexes.length];
    const count = completedCount(candidate.exercise.id);
    if (count < candidate.exercise.targetSets && count <= currentCount) return candidate.index;
  }

  return undefined;
}

function sessionOrderFromQueue(queue: SessionExerciseQueueItem[]): string[] {
  return queue.map((item) => item.exerciseId);
}

export function normalizeWorkoutSessionQueue(session: WorkoutSession): WorkoutSession {
  if (session.exerciseQueue?.length) {
    return { ...session, sessionExerciseOrder: sessionOrderFromQueue(session.exerciseQueue) };
  }
  const exerciseQueue = session.sessionExerciseOrder.map((exerciseId) => ({ exerciseId, status: "queued" as const }));
  return { ...session, exerciseQueue };
}

export function reorderSessionExerciseQueue(session: WorkoutSession, exerciseId: string, direction: -1 | 1): WorkoutSession {
  const normalized = normalizeWorkoutSessionQueue(session);
  const index = normalized.exerciseQueue.findIndex((item) => item.exerciseId === exerciseId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= normalized.exerciseQueue.length) return normalized;
  const exerciseQueue = [...normalized.exerciseQueue];
  [exerciseQueue[index], exerciseQueue[nextIndex]] = [exerciseQueue[nextIndex], exerciseQueue[index]];
  return { ...normalized, exerciseQueue, sessionExerciseOrder: sessionOrderFromQueue(exerciseQueue) };
}

export function parkSessionExercise(session: WorkoutSession, exerciseId: string): WorkoutSession {
  const normalized = normalizeWorkoutSessionQueue(session);
  const item = normalized.exerciseQueue.find((entry) => entry.exerciseId === exerciseId);
  if (!item || item.status === "completed") return normalized;
  const exerciseQueue = [
    ...normalized.exerciseQueue.filter((entry) => entry.exerciseId !== exerciseId),
    { ...item, status: "parked" as const }
  ];
  return { ...normalized, exerciseQueue, sessionExerciseOrder: sessionOrderFromQueue(exerciseQueue) };
}

export function completeSessionExercise(session: WorkoutSession, exerciseId: string): WorkoutSession {
  const normalized = normalizeWorkoutSessionQueue(session);
  const exerciseQueue = normalized.exerciseQueue.map((item) =>
    item.exerciseId === exerciseId ? { ...item, status: "completed" as const } : item
  );
  return { ...normalized, exerciseQueue, sessionExerciseOrder: sessionOrderFromQueue(exerciseQueue) };
}

export function saveSessionExerciseOrderToRoutine(routine: Routine, workoutDayId: string, queue: SessionExerciseQueueItem[]): Routine {
  const order = queue.map((item) => item.exerciseId);
  return {
    ...routine,
    updatedAt: new Date().toISOString(),
    days: routine.days.map((day) => {
      if (day.id !== workoutDayId) return day;
      const byId = new Map(day.exercises.map((exercise) => [exercise.id, exercise]));
      const ordered = order.flatMap((exerciseId) => {
        const exercise = byId.get(exerciseId);
        return exercise ? [exercise] : [];
      });
      const missing = day.exercises.filter((exercise) => !order.includes(exercise.id));
      return {
        ...day,
        exercises: [...ordered, ...missing].map((exercise, index) => ({ ...exercise, order: index }))
      };
    })
  };
}

export function finishWorkoutSession(session: WorkoutSession, now = new Date()): WorkoutSession {
  const endedAt = now.toISOString();
  return {
    ...session,
    endedAt,
    durationSeconds: workoutSessionDurationSeconds({ ...session, endedAt }),
    status: "finished"
  };
}

export function pauseWorkoutSession(session: WorkoutSession, now = new Date()): WorkoutSession {
  return {
    ...session,
    durationSeconds: workoutSessionDurationSeconds(session, now),
    status: "paused"
  };
}

export function resumeWorkoutSession(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    status: "active"
  };
}

export function migrateLegacyWorkoutSession(params: {
  sets: WorkoutSet[];
  routineId: string;
  workoutDayId: string;
  sessionName: string;
  now?: Date;
}): { sessions: WorkoutSession[]; sets: WorkoutSet[] } {
  if (!params.sets.length || params.sets.every((set) => set.sessionId)) return { sessions: [], sets: params.sets };
  const completedTimes = params.sets.map((set) => set.completedAt).filter(Boolean).sort() as string[];
  const startedAt = completedTimes[0] ?? (params.now ?? new Date()).toISOString();
  const endedAt = completedTimes[completedTimes.length - 1] ?? startedAt;
  const session: WorkoutSession = {
    id: "session-legacy",
    routineId: params.routineId,
    workoutDayId: params.workoutDayId,
    sessionName: `${params.sessionName} (legacy)`,
    startedAt,
    endedAt,
    durationSeconds: workoutSessionDurationSeconds({ startedAt, endedAt }),
    status: "finished",
    sessionExerciseOrder: Array.from(new Set(params.sets.map((set) => set.exerciseId))),
    exerciseQueue: Array.from(new Set(params.sets.map((set) => set.exerciseId))).map((exerciseId) => ({
      exerciseId,
      status: "completed"
    }))
  };
  return {
    sessions: [session],
    sets: params.sets.map((set) => ({ ...set, sessionId: set.sessionId ?? session.id }))
  };
}

export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const routineColumnAliases = {
  session: ["session", "session name", "buoi", "buoi tap", "phien", "lich"],
  day: ["day", "workout day", "ngay", "thu", "ngay tap"],
  exercise: ["exercise", "exercise name", "name", "bai tap", "ten bai tap"],
  muscleGroup: ["muscle group", "muscle", "group", "nhom co"],
  sets: ["sets", "set", "so set", "so sets"],
  repsMin: ["reps min", "rep min", "min reps", "reps from", "rep toi thieu", "reps toi thieu"],
  repsMax: ["reps max", "rep max", "max reps", "reps", "reps to", "rep toi da", "reps toi da"],
  weight: ["weight", "weight kg", "kg", "target weight", "muc ta", "ta", "trong luong"],
  restSeconds: ["rest seconds", "rest", "rest sec", "nghi giay", "thoi gian nghi"],
  supersetGroup: ["superset", "superset group", "group set", "nhom superset"],
  note: ["note", "notes", "ghi chu"]
} satisfies Record<string, string[]>;

function routineHeaderIndexes(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const findHeader = (aliases: string[]) => aliases.map(normalizeHeader).map((name) => normalized.indexOf(name)).find((index) => index >= 0) ?? -1;
  return {
    session: findHeader(routineColumnAliases.session),
    day: findHeader(routineColumnAliases.day),
    exercise: findHeader(routineColumnAliases.exercise),
    muscleGroup: findHeader(routineColumnAliases.muscleGroup),
    sets: findHeader(routineColumnAliases.sets),
    repsMin: findHeader(routineColumnAliases.repsMin),
    repsMax: findHeader(routineColumnAliases.repsMax),
    weight: findHeader(routineColumnAliases.weight),
    restSeconds: findHeader(routineColumnAliases.restSeconds),
    supersetGroup: findHeader(routineColumnAliases.supersetGroup),
    note: findHeader(routineColumnAliases.note)
  };
}

export function rowsToRoutineCsv(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === undefined || cell === null ? "" : String(cell);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(",")
    )
    .join("\n");
}

export function parseRoutineCsv(text: string, fileName: string): RoutineImportPreview {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errors: string[] = [];
  if (lines.length < 2) return { fileName, rows: [], errors: ["CSV needs a header row and at least one exercise row."] };

  const headers = splitCsvLine(lines[0]);
  const indexes = routineHeaderIndexes(headers);
  const requiredColumns: [keyof typeof indexes, string][] = [
    ["session", "session"],
    ["day", "day"],
    ["exercise", "exercise"],
    ["muscleGroup", "muscle group"],
    ["sets", "sets"],
    ["repsMin", "reps min"],
    ["repsMax", "reps max"],
    ["weight", "weight"],
    ["restSeconds", "rest seconds"]
  ];

  requiredColumns.forEach(([key, label]) => {
    if (indexes[key] < 0) errors.push(`Missing required column: ${label}.`);
  });
  if (errors.length) return { fileName, rows: [], errors };

  const numberAt = (cells: string[], index: number) => Number(cells[index]);
  const textAt = (cells: string[], index: number) => (index >= 0 && cells[index] ? cells[index].trim() : "");
  const seen = new Set<string>();

  const rows = lines.slice(1).flatMap<RoutineImportRow>((line, index) => {
    const sourceLine = index + 2;
    const cells = splitCsvLine(line);
    const session = textAt(cells, indexes.session);
    const day = textAt(cells, indexes.day);
    const name = textAt(cells, indexes.exercise);
    const muscleGroup = textAt(cells, indexes.muscleGroup);
    const targetSets = numberAt(cells, indexes.sets);
    const targetRepsMin = numberAt(cells, indexes.repsMin);
    const targetRepsMax = numberAt(cells, indexes.repsMax);
    const targetWeightKg = numberAt(cells, indexes.weight);
    const restSeconds = numberAt(cells, indexes.restSeconds);
    const supersetGroup = textAt(cells, indexes.supersetGroup);
    const note = textAt(cells, indexes.note);
    const duplicateKey = `${normalizeHeader(session)}::${normalizeHeader(name)}`;
    const duplicated = Boolean(session && name && seen.has(duplicateKey));

    if (!session) errors.push(`Line ${sourceLine}, column session: value is required.`);
    if (!day) errors.push(`Line ${sourceLine}, column day: value is required.`);
    if (!name) errors.push(`Line ${sourceLine}, column exercise: value is required.`);
    if (!muscleGroup) errors.push(`Line ${sourceLine}, column muscle group: value is required.`);
    if (!Number.isInteger(targetSets) || targetSets < 1) errors.push(`Line ${sourceLine}, column sets: must be a positive integer.`);
    if (!Number.isFinite(targetRepsMin) || targetRepsMin < 1) errors.push(`Line ${sourceLine}, column reps min: must be positive.`);
    if (!Number.isFinite(targetRepsMax) || targetRepsMax < 1) errors.push(`Line ${sourceLine}, column reps max: must be positive.`);
    if (Number.isFinite(targetRepsMin) && Number.isFinite(targetRepsMax) && targetRepsMin > targetRepsMax) {
      errors.push(`Line ${sourceLine}, column reps min: must be less than or equal to reps max.`);
    }
    if (!Number.isFinite(targetWeightKg) || targetWeightKg < 0) errors.push(`Line ${sourceLine}, column weight: must be zero or positive.`);
    if (!Number.isFinite(restSeconds) || restSeconds < 15) errors.push(`Line ${sourceLine}, column rest seconds: must be at least 15.`);
    if (duplicated) errors.push(`Line ${sourceLine}, column exercise: duplicate exercise "${name}" in session "${session}".`);
    if (session && name) seen.add(duplicateKey);

    const valid =
      session &&
      day &&
      name &&
      muscleGroup &&
      Number.isInteger(targetSets) &&
      targetSets >= 1 &&
      Number.isFinite(targetRepsMin) &&
      Number.isFinite(targetRepsMax) &&
      targetRepsMin >= 1 &&
      targetRepsMax >= 1 &&
      targetRepsMin <= targetRepsMax &&
      Number.isFinite(targetWeightKg) &&
      targetWeightKg >= 0 &&
      Number.isFinite(restSeconds) &&
      restSeconds >= 15 &&
      !duplicated;

    if (!valid) return [];

    return [
      {
        id: `import-${sourceLine}-${cryptoSafeId()}`,
        sourceLine,
        session,
        day,
        name,
        muscleGroup,
        targetSets,
        targetRepsMin,
        targetRepsMax,
        targetWeightKg,
        restSeconds,
        supersetGroup: supersetGroup || undefined,
        note,
        lastSession: note || `${session} - ${day}`
      }
    ];
  });

  return { fileName, rows, errors };
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

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function rollingDateKeys(days: number, now = new Date()): string[] {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Array.from({ length: days }, (_, index) => dateOnly(addDays(end, index - days + 1)));
}

function weekLabel(dateKeyValue: string): string {
  const date = new Date(`${dateKeyValue}T00:00:00.000Z`);
  const day = date.getUTCDay() || 7;
  const monday = addDays(date, 1 - day);
  return dateOnly(monday);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange(now = new Date(), offsetMonths = 0): { start: Date; end: Date; days: number; label: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths + 1, 0));
  return {
    start,
    end,
    days: end.getUTCDate(),
    label: monthKey(start)
  };
}

function dateRangeKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= last) {
    keys.push(dateOnly(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

function isoDateInRange(value: string | undefined, start: Date, end: Date): boolean {
  if (!value) return false;
  const key = value.slice(0, 10);
  return key >= dateOnly(start) && key <= dateOnly(end);
}

function trendDelta(next: number, previous: number): number {
  return round(next - previous);
}

export function hydrationPeriodProgress(logs: HydrationLog[], targetMl: number, days: number, now = new Date()): PeriodProgress {
  const keys = rollingDateKeys(days, now);
  const totals = new Map(keys.map((key) => [key, 0]));
  logs.forEach((log) => {
    const key = log.loggedAt.slice(0, 10);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + log.amountMl);
  });
  const values = [...totals.values()];
  const hitDays = values.filter((total) => total >= targetMl).length;
  return {
    days,
    averageMl: round(values.reduce((sum, total) => sum + total, 0) / days),
    goalHitRate: round((hitDays / days) * 100),
    hitDays
  };
}

export function creatineConsistency(
  logs: SupplementLog[],
  enabled: boolean,
  days = 30,
  now = new Date()
): ProgressDashboard["creatineConsistency"] {
  if (!enabled) return undefined;
  const keys = new Set(rollingDateKeys(days, now));
  const takenDays = new Set(
    logs
      .filter((log) => log.name.toLowerCase() === "creatine" && log.status !== "skipped" && keys.has(log.loggedAt.slice(0, 10)))
      .map((log) => log.loggedAt.slice(0, 10))
  );
  return {
    days,
    takenDays: takenDays.size,
    consistencyRate: round((takenDays.size / days) * 100)
  };
}

function workingWorkoutSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter(isWorkingVolumeSet);
}

export function exercisePersonalRecords(sets: WorkoutSet[]): ExercisePr[] {
  const byExercise = workingWorkoutSets(sets).reduce<Map<string, WorkoutSet[]>>((map, set) => {
    map.set(set.exerciseId, [...(map.get(set.exerciseId) ?? []), set]);
    return map;
  }, new Map());

  return [...byExercise.entries()]
    .map(([exerciseId, exerciseSets]) => {
      const maxWeight = Math.max(...exerciseSets.map((set) => set.actualWeightKg));
      const maxReps = Math.max(...exerciseSets.map((set) => set.actualReps));
      const e1rm = Math.max(...exerciseSets.map((set) => estimatedOneRepMax(set.actualWeightKg, set.actualReps)));
      const volumePr = Math.max(...exerciseSets.map((set) => set.actualWeightKg * set.actualReps));
      return {
        exerciseId,
        exerciseName: exerciseSets[0]?.exerciseName ?? exerciseId,
        maxWeightKg: round(maxWeight, 1),
        maxReps,
        estimatedOneRepMaxKg: round(e1rm, 1),
        volumePrKg: round(volumePr)
      };
    })
    .sort((a, b) => b.estimatedOneRepMaxKg - a.estimatedOneRepMaxKg || a.exerciseName.localeCompare(b.exerciseName));
}

export function detectWorkoutSetPrs(previousSets: WorkoutSet[], nextSet: WorkoutSet): WorkoutSetPr[] {
  if (nextSet.actualReps <= 0 || nextSet.actualWeightKg < 0) return [];
  const previous = workingWorkoutSets(previousSets).filter((set) => set.exerciseId === nextSet.exerciseId);
  const nextE1Rm = round(estimatedOneRepMax(nextSet.actualWeightKg, nextSet.actualReps), 1);
  const nextVolume = round(nextSet.actualWeightKg * nextSet.actualReps);
  const previousMaxWeight = previous.length ? Math.max(...previous.map((set) => set.actualWeightKg)) : 0;
  const previousMaxReps = previous.length ? Math.max(...previous.map((set) => set.actualReps)) : 0;
  const previousE1Rm = previous.length ? round(Math.max(...previous.map((set) => estimatedOneRepMax(set.actualWeightKg, set.actualReps))), 1) : 0;
  const previousVolume = previous.length ? round(Math.max(...previous.map((set) => set.actualWeightKg * set.actualReps))) : 0;
  const prs: WorkoutSetPr[] = [];

  if (nextSet.actualWeightKg > previousMaxWeight) prs.push({ type: "maxWeight", label: "Weight PR", previous: previousMaxWeight, next: nextSet.actualWeightKg });
  if (nextSet.actualReps > previousMaxReps) prs.push({ type: "maxReps", label: "Rep PR", previous: previousMaxReps, next: nextSet.actualReps });
  if (nextE1Rm > previousE1Rm) prs.push({ type: "estimatedOneRepMax", label: "e1RM PR", previous: previousE1Rm, next: nextE1Rm });
  if (nextVolume > previousVolume) prs.push({ type: "volume", label: "Volume PR", previous: previousVolume, next: nextVolume });

  return prs;
}

export function e1RmTrendByExercise(sets: WorkoutSet[], mainExerciseLimit = 3): E1RmTrendPoint[] {
  const workingSets = workingWorkoutSets(sets);
  const volumeByExercise = workingSets.reduce<Map<string, number>>((map, set) => {
    map.set(set.exerciseId, (map.get(set.exerciseId) ?? 0) + set.actualWeightKg * set.actualReps);
    return map;
  }, new Map());
  const mainExerciseIds = [...volumeByExercise.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, mainExerciseLimit)
    .map(([exerciseId]) => exerciseId);
  const bestByExerciseDate = workingSets.reduce<Map<string, E1RmTrendPoint>>((map, set) => {
    const date = (set.completedAt ?? new Date().toISOString()).slice(0, 10);
    if (!mainExerciseIds.includes(set.exerciseId)) return map;
    const key = `${set.exerciseId}:${date}`;
    const estimated = estimatedOneRepMax(set.actualWeightKg, set.actualReps);
    const current = map.get(key);
    if (!current || estimated > current.estimatedOneRepMaxKg) {
      map.set(key, {
        date,
        exerciseId: set.exerciseId,
        exerciseName: set.exerciseName,
        estimatedOneRepMaxKg: round(estimated, 1)
      });
    }
    return map;
  }, new Map());
  return [...bestByExerciseDate.values()].sort((a, b) => a.date.localeCompare(b.date) || a.exerciseName.localeCompare(b.exerciseName));
}

export function buildProgressDashboard(params: {
  hydrationLogs: HydrationLog[];
  waterTargetMl: number;
  supplementLogs: SupplementLog[];
  creatineEnabled: boolean;
  workoutSessions: WorkoutSession[];
  workoutSets: WorkoutSet[];
  workoutExercises: WorkoutExercise[];
  now?: Date;
}): ProgressDashboard {
  const now = params.now ?? new Date();
  const dayKeys7 = new Set(rollingDateKeys(7, now));
  const dayKeys30 = new Set(rollingDateKeys(30, now));
  const activeSessions = params.workoutSessions.filter((session) => session.status !== "cancelled");
  const workingSets = workingWorkoutSets(params.workoutSets);
  const exerciseMuscles = new Map(params.workoutExercises.map((exercise) => [exercise.id, exercise.muscleGroup]));

  const weeklyVolume = workingSets.reduce<Map<string, number>>((map, set) => {
    const key = weekLabel((set.completedAt ?? new Date().toISOString()).slice(0, 10));
    map.set(key, (map.get(key) ?? 0) + set.actualWeightKg * set.actualReps);
    return map;
  }, new Map());

  const volumeByMuscleGroup = workingSets.reduce<Map<string, number>>((map, set) => {
    const muscle = exerciseMuscles.get(set.exerciseId) ?? set.exerciseName;
    map.set(muscle, (map.get(muscle) ?? 0) + set.actualWeightKg * set.actualReps);
    return map;
  }, new Map());

  return {
    hydration7: hydrationPeriodProgress(params.hydrationLogs, params.waterTargetMl, 7, now),
    hydration30: hydrationPeriodProgress(params.hydrationLogs, params.waterTargetMl, 30, now),
    creatineConsistency: creatineConsistency(params.supplementLogs, params.creatineEnabled, 30, now),
    workoutCount7: activeSessions.filter((session) => dayKeys7.has(session.startedAt.slice(0, 10))).length,
    workoutCount30: activeSessions.filter((session) => dayKeys30.has(session.startedAt.slice(0, 10))).length,
    weeklyVolume: [...weeklyVolume.entries()]
      .map(([label, volumeKg]) => ({ label, volumeKg: round(volumeKg) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    volumeByMuscleGroup: [...volumeByMuscleGroup.entries()]
      .map(([label, volumeKg]) => ({ label, volumeKg: round(volumeKg) }))
      .sort((a, b) => b.volumeKg - a.volumeKg || a.label.localeCompare(b.label)),
    e1RmTrend: e1RmTrendByExercise(params.workoutSets),
    prs: exercisePersonalRecords(params.workoutSets)
  };
}

function reportMetrics(params: {
  hydrationLogs: HydrationLog[];
  waterTargetMl: number;
  workoutSessions: WorkoutSession[];
  workoutSets: WorkoutSet[];
  start: Date;
  end: Date;
}) {
  const keys = dateRangeKeys(params.start, params.end);
  const keySet = new Set(keys);
  const hydrationTotals = new Map(keys.map((key) => [key, 0]));
  params.hydrationLogs.forEach((log) => {
    const key = log.loggedAt.slice(0, 10);
    if (hydrationTotals.has(key)) hydrationTotals.set(key, (hydrationTotals.get(key) ?? 0) + log.amountMl);
  });
  const hydrationValues = [...hydrationTotals.values()];
  const hydrationHitDays = hydrationValues.filter((total) => total >= params.waterTargetMl).length;
  const workoutSessions = params.workoutSessions.filter((session) => session.status !== "cancelled" && keySet.has(session.startedAt.slice(0, 10)));
  const workoutSets = params.workoutSets.filter((set) => isoDateInRange(set.completedAt, params.start, params.end));
  const totalVolumeKg = workingSetVolumeKg(workoutSets);

  return {
    hydrationAverageMl: round(hydrationValues.reduce((sum, total) => sum + total, 0) / Math.max(1, keys.length)),
    hydrationGoalHitRate: round((hydrationHitDays / Math.max(1, keys.length)) * 100),
    hydrationHitDays,
    workoutCount: workoutSessions.length,
    workoutSets,
    totalVolumeKg
  };
}

function reportTrend(current: ReturnType<typeof reportMetrics>, previous: ReturnType<typeof reportMetrics>): ReportTrend {
  return {
    hydrationAverageMl: trendDelta(current.hydrationAverageMl, previous.hydrationAverageMl),
    goalHitRate: trendDelta(current.hydrationGoalHitRate, previous.hydrationGoalHitRate),
    workoutCount: trendDelta(current.workoutCount, previous.workoutCount),
    totalVolumeKg: trendDelta(current.totalVolumeKg, previous.totalVolumeKg)
  };
}

function rollingMonthlyStreak(params: {
  now: Date;
  predicate: (range: { start: Date; end: Date; days: number; label: string }) => boolean;
  offsetBeforeCurrent?: number;
}): number {
  let streak = 0;
  for (let offset = params.offsetBeforeCurrent ?? -1; offset >= -24; offset -= 1) {
    const range = monthRange(params.now, offset);
    if (!params.predicate(range)) break;
    streak += 1;
  }
  return streak;
}

export function buildProgressReports(params: {
  hydrationLogs: HydrationLog[];
  waterTargetMl: number;
  workoutSessions: WorkoutSession[];
  workoutSets: WorkoutSet[];
  workoutExercises: WorkoutExercise[];
  hydrationEnabled?: boolean;
  workoutEnabled?: boolean;
  volumeEnabled?: boolean;
  monthlyHydrationTargetDays?: number;
  monthlyWorkoutTargetCount?: number;
  now?: Date;
}): ProgressReports {
  const now = params.now ?? new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekEnd = today;
  const weekStart = addDays(weekEnd, -6);
  const previousWeekEnd = addDays(weekStart, -1);
  const previousWeekStart = addDays(previousWeekEnd, -6);
  const currentMonth = monthRange(now, 0);
  const previousMonth = monthRange(now, -1);
  const monthlyHydrationTargetDays = params.monthlyHydrationTargetDays ?? Math.min(24, currentMonth.days);
  const monthlyWorkoutTargetCount = params.monthlyWorkoutTargetCount ?? 12;

  const weeklyMetrics = reportMetrics({ ...params, start: weekStart, end: weekEnd });
  const previousWeeklyMetrics = reportMetrics({ ...params, start: previousWeekStart, end: previousWeekEnd });
  const monthlyMetrics = reportMetrics({ ...params, start: currentMonth.start, end: currentMonth.end });
  const previousMonthlyMetrics = reportMetrics({ ...params, start: previousMonth.start, end: previousMonth.end });
  const previousMonthVolume = previousMonthlyMetrics.totalVolumeKg;
  const currentVolumeChangePercent = previousMonthVolume > 0 ? round(((monthlyMetrics.totalVolumeKg - previousMonthVolume) / previousMonthVolume) * 100) : 0;
  const previousPreviousMonth = monthRange(now, -2);

  const hydrationPredicate = (range: { start: Date; end: Date }) =>
    reportMetrics({ ...params, start: range.start, end: range.end }).hydrationHitDays >= monthlyHydrationTargetDays;
  const workoutPredicate = (range: { start: Date; end: Date }) =>
    reportMetrics({ ...params, start: range.start, end: range.end }).workoutCount >= monthlyWorkoutTargetCount;
  const volumePredicate = (range: { start: Date; end: Date }, previousRange: { start: Date; end: Date }) => {
    const current = reportMetrics({ ...params, start: range.start, end: range.end }).totalVolumeKg;
    const previous = reportMetrics({ ...params, start: previousRange.start, end: previousRange.end }).totalVolumeKg;
    return previous > 0 && ((current - previous) / previous) * 100 >= 3;
  };

  const previousHydrationActive = hydrationPredicate(previousMonth);
  const previousWorkoutActive = workoutPredicate(previousMonth);
  const previousVolumeActive = volumePredicate(previousMonth, previousPreviousMonth);
  const previousVolumeStreak = rollingMonthlyStreak({
    now,
    offsetBeforeCurrent: -1,
    predicate: (range) => volumePredicate(range, monthRange(new Date(`${range.label}-01T00:00:00.000Z`), -1))
  });

  const badges = monthlyAchievements({
    hydrationGoalDays: monthlyMetrics.hydrationHitDays,
    hydrationTargetDays: monthlyHydrationTargetDays,
    workoutCount: monthlyMetrics.workoutCount,
    workoutTargetCount: monthlyWorkoutTargetCount,
    volumeChangePercent: currentVolumeChangePercent,
    previousHydrationStreak: rollingMonthlyStreak({ now, predicate: hydrationPredicate }),
    previousWorkoutStreak: rollingMonthlyStreak({ now, predicate: workoutPredicate }),
    previousVolumeStreak,
    previousHydrationActive,
    previousWorkoutActive,
    previousVolumeActive,
    hydrationEnabled: params.hydrationEnabled,
    workoutEnabled: params.workoutEnabled,
    volumeEnabled: params.volumeEnabled
  });

  return {
    weekly: {
      label: "Last 7 days",
      period: "weekly",
      periodStart: dateOnly(weekStart),
      periodEnd: dateOnly(weekEnd),
      hydrationAverageMl: weeklyMetrics.hydrationAverageMl,
      hydrationGoalHitRate: weeklyMetrics.hydrationGoalHitRate,
      hydrationHitDays: weeklyMetrics.hydrationHitDays,
      workoutCount: weeklyMetrics.workoutCount,
      totalVolumeKg: weeklyMetrics.totalVolumeKg,
      prs: exercisePersonalRecords(weeklyMetrics.workoutSets),
      badges: [],
      trendVsPrevious: reportTrend(weeklyMetrics, previousWeeklyMetrics)
    },
    monthly: {
      label: currentMonth.label,
      period: "monthly",
      periodStart: dateOnly(currentMonth.start),
      periodEnd: dateOnly(currentMonth.end),
      hydrationAverageMl: monthlyMetrics.hydrationAverageMl,
      hydrationGoalHitRate: monthlyMetrics.hydrationGoalHitRate,
      hydrationHitDays: monthlyMetrics.hydrationHitDays,
      workoutCount: monthlyMetrics.workoutCount,
      totalVolumeKg: monthlyMetrics.totalVolumeKg,
      prs: exercisePersonalRecords(monthlyMetrics.workoutSets),
      badges,
      trendVsPrevious: reportTrend(monthlyMetrics, previousMonthlyMetrics)
    }
  };
}

export function latestBodyMetric(metrics: BodyMetric[]): BodyMetric | undefined {
  return [...metrics].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
}

export function bodyWeightDelta(metrics: BodyMetric[]): number {
  const sorted = [...metrics].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  if (sorted.length < 2) return 0;
  return Math.round((sorted[sorted.length - 1].weightKg - sorted[0].weightKg) * 10) / 10;
}

export function kgToLb(kg: number): number {
  return round(kg * 2.2046226218, 1);
}

export function lbToKg(lb: number): number {
  return round(lb / 2.2046226218, 1);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return unit === "lb" ? `${kgToLb(kg)}lb` : `${round(kg, 1)}kg`;
}

export function displayWeight(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kgToLb(kg) : round(kg, 1);
}

export function inputWeightToKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? lbToKg(value) : round(value, 1);
}

export function validateBodyMetric(input: BodyMetricValidationInput): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) errors.push("Weight must be greater than 0.");
  if (input.bodyFatPercent !== undefined && (!Number.isFinite(input.bodyFatPercent) || input.bodyFatPercent < 0 || input.bodyFatPercent > 70)) {
    errors.push("Body fat must be between 0 and 70%.");
  }
  const circumferenceFields: [keyof BodyMetricValidationInput, string][] = [
    ["waistCm", "Waist"],
    ["chestCm", "Chest"],
    ["armCm", "Arm"],
    ["thighCm", "Thigh"]
  ];
  circumferenceFields.forEach(([key, label]) => {
    const value = input[key];
    if (value !== undefined && (!Number.isFinite(value) || value <= 0 || value > 250)) {
      errors.push(`${label} must be between 1 and 250cm.`);
    }
  });
  return errors;
}

function movingAverage(values: number[], index: number, windowSize = 3): number {
  const start = Math.max(0, index - windowSize + 1);
  const windowValues = values.slice(start, index + 1);
  return round(windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length, 1);
}

export function buildBodyMetricChartDataset(params: {
  metrics: BodyMetric[];
  rangeDays: BodyMetricRangeDays;
  unit: WeightUnit;
  goalWeightKg?: number;
  goalBodyFatPercent?: number;
  now?: Date;
}): BodyMetricChartDataset {
  const end = new Date(params.now ?? new Date());
  const start = addDays(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())), -params.rangeDays + 1);
  const filtered = params.metrics
    .filter((metric) => new Date(metric.measuredAt) >= start && new Date(metric.measuredAt) <= end)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const weights = filtered.map((metric) => displayWeight(metric.weightKg, params.unit));
  const bodyFatValues = filtered.map((metric) => metric.bodyFatPercent).filter((value): value is number => value !== undefined);
  const points = filtered.map((metric, index) => {
    const bodyFatIndex = filtered.slice(0, index + 1).filter((item) => item.bodyFatPercent !== undefined).length - 1;
    const bodyFatPercent = metric.bodyFatPercent;
    return {
      date: metric.measuredAt.slice(0, 10),
      weight: displayWeight(metric.weightKg, params.unit),
      smoothedWeight: movingAverage(weights, index),
      bodyFatPercent,
      smoothedBodyFatPercent:
        bodyFatPercent !== undefined && bodyFatIndex >= 0 ? movingAverage(bodyFatValues, bodyFatIndex) : undefined
    };
  });
  return {
    rangeDays: params.rangeDays,
    unit: params.unit,
    weightGoal: params.goalWeightKg !== undefined ? displayWeight(params.goalWeightKg, params.unit) : undefined,
    bodyFatGoal: params.goalBodyFatPercent,
    points,
    hasWeightData: points.length > 0,
    hasBodyFatData: points.some((point) => point.bodyFatPercent !== undefined)
  };
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
  workoutCount?: number;
  workoutTargetCount?: number;
  previousWorkoutStreak?: number;
  hydrationEnabled?: boolean;
  workoutEnabled?: boolean;
  volumeEnabled?: boolean;
  previousHydrationActive?: boolean;
  previousWorkoutActive?: boolean;
  previousVolumeActive?: boolean;
}): AchievementStatus[] {
  const hydrationEnabled = params.hydrationEnabled !== false;
  const workoutEnabled = params.workoutEnabled !== false;
  const volumeEnabled = params.volumeEnabled !== false;
  const workoutTarget = params.workoutTargetCount ?? 12;
  const workoutCount = params.workoutCount ?? 0;
  const hydrationActive = params.hydrationGoalDays >= params.hydrationTargetDays;
  const workoutActive = workoutCount >= workoutTarget;
  const volumeActive = params.volumeChangePercent >= 3;
  const statusFor = (enabled: boolean, active: boolean, previousActive?: boolean): AchievementStatus["status"] => {
    if (!enabled) return "disabled";
    if (active) return "active";
    return previousActive ? "lost" : "locked";
  };

  return [
    {
      code: "monthly_hydration",
      name: "Hydration Elite",
      status: statusFor(hydrationEnabled, hydrationActive, params.previousHydrationActive),
      progress: params.hydrationGoalDays,
      target: params.hydrationTargetDays,
      streakMonths: hydrationEnabled && hydrationActive ? (params.previousHydrationStreak ?? 0) + 1 : 0,
      condition: `Hit hydration goal on ${params.hydrationTargetDays} days this month.`
    },
    {
      code: "workout_consistency",
      name: "Consistency Builder",
      status: statusFor(workoutEnabled, workoutActive, params.previousWorkoutActive),
      progress: workoutCount,
      target: workoutTarget,
      streakMonths: workoutEnabled && workoutActive ? (params.previousWorkoutStreak ?? 0) + 1 : 0,
      condition: `Finish ${workoutTarget} workouts this month.`
    },
    {
      code: "volume_progression",
      name: "Volume Climber",
      status: statusFor(volumeEnabled, volumeActive, params.previousVolumeActive),
      progress: Math.max(0, Math.round(params.volumeChangePercent)),
      target: 3,
      streakMonths: volumeEnabled && volumeActive ? (params.previousVolumeStreak ?? 0) + 1 : 0,
      condition: "Increase monthly working volume by at least 3% vs previous month."
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
