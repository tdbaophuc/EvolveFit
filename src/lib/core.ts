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
  targetWeightKg: number;
  targetReps: number;
  actualWeightKg: number;
  actualReps: number;
  rpe?: number;
  completedAt?: string;
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
  status: "active" | "locked" | "lost";
  progress: number;
  target: number;
  streakMonths: number;
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
