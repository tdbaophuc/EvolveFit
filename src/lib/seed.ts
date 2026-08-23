import {
  builtInExerciseDefinitions,
  defaultDrinkModules,
  defaultPlateSettings,
  migrateWorkoutExercisesToRoutine,
  type BodyMetric,
  type DrinkModule,
  type ExerciseDefinition,
  type HydrationLog,
  type QuickAmount,
  type PlateSettings,
  type ReminderMode,
  type Routine,
  type Supplement,
  type SupplementLog,
  type SyncQueueItem,
  type WorkoutExercise,
  type WorkoutSession,
  type WorkoutSet
} from "./core";

export type AppState = {
  profile: {
    name: string;
    email: string;
    authMode: "local" | "email" | "google";
    timezone: string;
    onboardingCompleted: boolean;
    unitWeight: "kg" | "lb";
    unitVolume: "ml" | "oz";
    bodyWeightKg: number;
    goalWeightKg?: number;
    goalBodyFatPercent?: number;
    heightCm: number;
    waterTargetMl: number;
    wakeHour: number;
    sleepHour: number;
    workoutDays: string[];
    creatineAmountG: number;
    creatineHour: number;
    remindBeforeMinutes: number;
    leaderboardPublic: boolean;
  };
  recovery: {
    energy: number;
    sleepQuality: number;
    soreness: number;
    stress: number;
    note: string;
  };
  notificationSettings: {
    hydrationEnabled: boolean;
    creatineEnabled: boolean;
    hydrationMode: ReminderMode;
    hydrationTimes: number[];
    hydrationIntervalHours: number;
    creatineMode: ReminderMode;
    creatineTimes: number[];
    creatineIntervalHours: number;
    quietHoursEnabled: boolean;
    quietHoursStart: number;
    quietHoursEnd: number;
    inAppFallbackEnabled: boolean;
    snoozeUntil?: string;
    lastHydrationReminderAt?: string;
    lastCreatineReminderAt?: string;
  };
  plateSettings: PlateSettings;
  hydrationLogs: HydrationLog[];
  drinkModules: DrinkModule[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  quickAmounts: QuickAmount[];
  routines: Routine[];
  activeRoutineId: string;
  selectedWorkoutDayId: string;
  exerciseLibrary: ExerciseDefinition[];
  workoutExercises: WorkoutExercise[];
  workoutSessions: WorkoutSession[];
  activeWorkoutSessionId?: string;
  workoutSets: WorkoutSet[];
  bodyMetrics: BodyMetric[];
  activeTemplate: "ppl" | "upper-lower" | "full-body" | "custom";
  activeExerciseIndex: number;
  recommendationDecisions: {
    id: string;
    title: string;
    decision: "accepted" | "rejected";
    reason?: string;
    decidedAt: string;
  }[];
  syncQueue: SyncQueueItem[];
  restEndsAt?: string;
  undo?: {
    label: string;
    state: Omit<AppState, "undo">;
  };
};

const now = new Date();
const today = now.toISOString().slice(0, 10);

export const routineTemplates: Record<AppState["activeTemplate"], WorkoutExercise[]> = {
  ppl: [
    {
      id: "ex1",
      name: "Incline Bench Press",
      muscleGroup: "Chest",
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 10,
      targetWeightKg: 42.5,
      restSeconds: 90,
      lastSession: "42.5kg x 8, 8, 7 - RPE 8"
    },
    {
      id: "ex2",
      name: "Seated Shoulder Press",
      muscleGroup: "Shoulders",
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 10,
      targetWeightKg: 24,
      restSeconds: 90,
      lastSession: "22kg x 10, 10, 9 - RPE 8"
    },
    {
      id: "ex3",
      name: "Cable Triceps Pushdown",
      muscleGroup: "Triceps",
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 12,
      targetWeightKg: 31,
      restSeconds: 60,
      lastSession: "31kg x 12, 11, 10 - RPE 9"
    }
  ],
  "upper-lower": [
    {
      id: "ex-ul-1",
      name: "Barbell Bench Press",
      muscleGroup: "Upper",
      targetSets: 4,
      targetRepsMin: 6,
      targetRepsMax: 8,
      targetWeightKg: 60,
      restSeconds: 120,
      lastSession: "57.5kg x 8, 8, 7"
    },
    {
      id: "ex-ul-2",
      name: "Chest Supported Row",
      muscleGroup: "Upper",
      targetSets: 4,
      targetRepsMin: 8,
      targetRepsMax: 10,
      targetWeightKg: 40,
      restSeconds: 90,
      lastSession: "40kg x 9, 8, 8"
    },
    {
      id: "ex-ul-3",
      name: "Romanian Deadlift",
      muscleGroup: "Lower",
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 10,
      targetWeightKg: 70,
      restSeconds: 120,
      lastSession: "70kg x 8, 8, 8"
    }
  ],
  "full-body": [
    {
      id: "ex-fb-1",
      name: "Goblet Squat",
      muscleGroup: "Legs",
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 12,
      targetWeightKg: 24,
      restSeconds: 75,
      lastSession: "24kg x 12, 12, 10"
    },
    {
      id: "ex-fb-2",
      name: "Push-up",
      muscleGroup: "Chest",
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 15,
      targetWeightKg: 0,
      restSeconds: 60,
      lastSession: "Bodyweight x 14, 12, 10"
    },
    {
      id: "ex-fb-3",
      name: "Lat Pulldown",
      muscleGroup: "Back",
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 12,
      targetWeightKg: 45,
      restSeconds: 75,
      lastSession: "45kg x 11, 10, 10"
    }
  ],
  custom: []
};

const defaultRoutine = migrateWorkoutExercisesToRoutine(routineTemplates.ppl, {
  routineId: "routine-ppl",
  name: "Push/Pull/Legs",
  day: "Mon",
  dayName: "Push Day",
  now
});

export const initialState: AppState = {
  profile: {
    name: "Phúc",
    email: "phuc@example.com",
    authMode: "local",
    timezone: "Asia/Saigon",
    onboardingCompleted: false,
    unitWeight: "kg",
    unitVolume: "ml",
    bodyWeightKg: 72,
    goalWeightKg: 70,
    goalBodyFatPercent: 15,
    heightCm: 174,
    waterTargetMl: 2500,
    wakeHour: 6,
    sleepHour: 23,
    workoutDays: ["Mon", "Wed", "Fri"],
    creatineAmountG: 5,
    creatineHour: 17,
    remindBeforeMinutes: 15,
    leaderboardPublic: false
  },
  recovery: {
    energy: 4,
    sleepQuality: 4,
    soreness: 2,
    stress: 2,
    note: "Ngủ ổn, hơi mỏi ngực."
  },
  notificationSettings: {
    hydrationEnabled: true,
    creatineEnabled: true,
    hydrationMode: "interval",
    hydrationTimes: [9, 11, 13, 15, 17, 19, 21],
    hydrationIntervalHours: 2,
    creatineMode: "fixed",
    creatineTimes: [17],
    creatineIntervalHours: 24,
    quietHoursEnabled: true,
    quietHoursStart: 23,
    quietHoursEnd: 6,
    inAppFallbackEnabled: true
  },
  plateSettings: defaultPlateSettings,
  drinkModules: defaultDrinkModules.map((module) =>
    module.id === "water"
      ? { ...module, goal: 2500 }
      : module.id === "creatine"
        ? { ...module, goal: 5 }
        : module
  ),
  supplements: [
    { id: "sup1", name: "Creatine", defaultAmount: 5, unit: "g", reminderHour: 17, scheduleHours: [17], active: true }
  ],
  hydrationLogs: [
    { id: "h1", amountMl: 500, drinkType: "water", loggedAt: `${today}T08:10:00.000Z` },
    { id: "h2", amountMl: 250, drinkType: "water", loggedAt: `${today}T10:35:00.000Z` },
    { id: "h3", amountMl: 500, drinkType: "water", loggedAt: `${today}T13:20:00.000Z` }
  ],
  supplementLogs: [],
  quickAmounts: [
    { id: "qa1", category: "hydration", label: "+250ml", amount: 250, unit: "ml", pinned: true, uses: 8 },
    { id: "qa2", category: "hydration", label: "+500ml", amount: 500, unit: "ml", pinned: true, uses: 12 },
    { id: "qa3", category: "hydration", label: "+750ml", amount: 750, unit: "ml", pinned: true, uses: 4 },
    { id: "qa4", category: "supplement", label: "5g", amount: 5, unit: "g", pinned: true, uses: 9 }
  ],
  routines: [defaultRoutine],
  activeRoutineId: defaultRoutine.id,
  selectedWorkoutDayId: defaultRoutine.days[0].id,
  exerciseLibrary: builtInExerciseDefinitions,
  workoutExercises: routineTemplates.ppl,
  workoutSessions: [],
  activeWorkoutSessionId: undefined,
  workoutSets: [],
  bodyMetrics: [
    { id: "bm1", measuredAt: `${today}T07:00:00.000Z`, weightKg: 72.4, heightCm: 174, bodyFatPercent: 18, waistCm: 82 },
    { id: "bm2", measuredAt: `${today}T07:05:00.000Z`, weightKg: 72.1, heightCm: 174, bodyFatPercent: 17.8, waistCm: 81.5 }
  ],
  activeTemplate: "ppl",
  activeExerciseIndex: 0,
  recommendationDecisions: [],
  syncQueue: []
};
