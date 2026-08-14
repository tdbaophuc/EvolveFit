import type { HydrationLog, QuickAmount, SupplementLog, WorkoutExercise, WorkoutSet } from "./core";

export type AppState = {
  profile: {
    name: string;
    timezone: string;
    waterTargetMl: number;
    wakeHour: number;
    sleepHour: number;
    creatineAmountG: number;
    creatineHour: number;
    remindBeforeMinutes: number;
    leaderboardPublic: boolean;
  };
  hydrationLogs: HydrationLog[];
  supplementLogs: SupplementLog[];
  quickAmounts: QuickAmount[];
  workoutExercises: WorkoutExercise[];
  workoutSets: WorkoutSet[];
  activeExerciseIndex: number;
  restEndsAt?: string;
  undo?: {
    label: string;
    state: Omit<AppState, "undo">;
  };
};

const now = new Date();
const today = now.toISOString().slice(0, 10);

export const initialState: AppState = {
  profile: {
    name: "Phúc",
    timezone: "Asia/Saigon",
    waterTargetMl: 2500,
    wakeHour: 6,
    sleepHour: 23,
    creatineAmountG: 5,
    creatineHour: 17,
    remindBeforeMinutes: 15,
    leaderboardPublic: false
  },
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
  workoutExercises: [
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
  workoutSets: [],
  activeExerciseIndex: 0
};
