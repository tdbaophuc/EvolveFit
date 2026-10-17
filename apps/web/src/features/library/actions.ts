import {
  cloneMarketplaceExerciseToCustom,
  createCustomExerciseDefinition,
  cryptoSafeId,
  isUserOwnedExercise,
  normalizeExerciseDefinition,
  type EquipmentType,
  type ExerciseDefinition,
  type MovementPattern,
  type WorkoutExercise
} from "@evolvefit/shared";
import { commitSynced, currentState } from "@/lib/store/app-store";
import { routineExerciseFromWorkout, updateActiveWorkoutDay } from "../routines/actions";

/** Exercise library actions: add catalog exercises to the plan and manage the user's own exercises. */

export function addExerciseFromLibrary(definition: ExerciseDefinition) {
  const normalized = normalizeExerciseDefinition(definition);
  const exercise: WorkoutExercise = {
    id: cryptoSafeId(),
    name: normalized.name,
    muscleGroup: normalized.muscleGroup,
    targetSets: 3,
    targetRepsMin: normalized.movementPattern === "core" ? 30 : 8,
    targetRepsMax: normalized.movementPattern === "core" ? 60 : 12,
    targetWeightKg: normalized.equipment === "bodyweight" ? 0 : 20,
    restSeconds: normalized.movementPattern === "isolation" || normalized.movementPattern === "core" ? 60 : 90,
    lastSession:
      normalized.catalogSource === "marketplace" ? "Thêm từ marketplace" : normalized.builtIn ? "Sao chép từ thư viện có sẵn" : "Bài tập tùy chỉnh trong thư viện"
  };
  updateActiveWorkoutDay(
    (day) => ({ ...day, exercises: [...day.exercises, routineExerciseFromWorkout(exercise, day.exercises.length, normalized.id)] }),
    `Đã thêm ${normalized.name}`
  );
}

export function cloneExerciseFromMarketplace(definition: ExerciseDefinition) {
  const state = currentState();
  const custom = cloneMarketplaceExerciseToCustom(definition);
  commitSynced({ ...state, exerciseLibrary: [...state.exerciseLibrary, custom] }, "exercise.create", custom, `Đã tạo bản tùy chỉnh ${custom.name}`);
}

export function addCustomExerciseDefinition(input: { name: string; muscleGroup: string; equipment: EquipmentType; movementPattern: MovementPattern }) {
  const state = currentState();
  const exercise = createCustomExerciseDefinition(input);
  commitSynced({ ...state, exerciseLibrary: [...state.exerciseLibrary, exercise] }, "exercise.create", exercise, `Đã tạo ${exercise.name}`);
}

export function updateExerciseDefinition(id: string, patch: Partial<ExerciseDefinition>) {
  const state = currentState();
  const target = state.exerciseLibrary.find((exercise) => exercise.id === id);
  if (!target || !isUserOwnedExercise(target)) return;
  commitSynced(
    { ...state, exerciseLibrary: state.exerciseLibrary.map((exercise) => (exercise.id === id ? { ...exercise, ...patch, builtIn: false, catalogSource: "custom" } : exercise)) },
    "exercise.update",
    { id, patch },
    "Đã cập nhật bài tùy chỉnh"
  );
}

export function deleteExerciseDefinition(id: string) {
  const state = currentState();
  const target = state.exerciseLibrary.find((exercise) => exercise.id === id);
  if (!target || !isUserOwnedExercise(target)) return;
  commitSynced({ ...state, exerciseLibrary: state.exerciseLibrary.filter((exercise) => exercise.id !== id) }, "exercise.delete", { id }, "Đã xóa bài tùy chỉnh");
}
