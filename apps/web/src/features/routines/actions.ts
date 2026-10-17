import {
  buildWorkoutPlannerPreview,
  cloneMarketplaceExerciseToCustom,
  createCustomExerciseDefinition,
  cryptoSafeId,
  isUserOwnedExercise,
  latestBodyMetric,
  migrateWorkoutExercisesToRoutine,
  normalizeExerciseDefinition,
  parseRoutineCsv,
  previewRoutineTemplateApply,
  routineExercisesToWorkoutExercises,
  routineFromMarketplaceTemplate,
  routineTemplates,
  rowsToRoutineCsv,
  type AppState,
  type EquipmentType,
  type ExerciseDefinition,
  type MovementPattern,
  type RoutineExercise,
  type RoutineImportPreview,
  type RoutineTemplate,
  type RoutineTemplatePreview,
  type WorkoutExercise,
  type WorkoutPlannerPreview
} from "@evolvefit/shared";
import { commit, commitSynced, currentState, notify } from "@/lib/store/app-store";
import { templateLabels } from "@/app/_features/workout/workout-labels";
import { selectWorkout } from "../workout/selectors";

type Routine = AppState["routines"][number];
type WorkoutDay = Routine["days"][number];

function routineExerciseFromWorkout(exercise: WorkoutExercise, order: number, definitionId?: string): RoutineExercise {
  return { ...exercise, definitionId, order };
}

function profileForTemplates(state: AppState) {
  return { trainingGoal: state.profile.trainingGoal, experienceLevel: state.profile.experienceLevel, availableEquipment: state.profile.availableEquipment };
}

/** Keeps the selected day and its exercise list consistent with the active routine. */
export function syncSelectedDay(nextState: AppState): AppState {
  const routine = nextState.routines.find((item) => item.id === nextState.activeRoutineId) ?? nextState.routines[0];
  const day = routine?.days.find((item) => item.id === nextState.selectedWorkoutDayId) ?? routine?.days[0];
  return {
    ...nextState,
    activeRoutineId: routine?.id ?? nextState.activeRoutineId,
    selectedWorkoutDayId: day?.id ?? nextState.selectedWorkoutDayId,
    workoutExercises: day ? routineExercisesToWorkoutExercises(day.exercises) : nextState.workoutExercises,
    activeExerciseIndex: Math.min(nextState.activeExerciseIndex, Math.max(0, (day?.exercises.length ?? 1) - 1))
  };
}

function updateActiveRoutine(patch: (routine: Routine) => Routine, label = "Đã cập nhật lịch tập") {
  const state = currentState();
  const { activeRoutine } = selectWorkout(state, new Date());
  if (!activeRoutine) return;
  const draft = { ...activeRoutine, days: activeRoutine.days.map((day) => ({ ...day, exercises: [...day.exercises] })) };
  const updatedRoutine = patch(draft);
  commitSynced(
    syncSelectedDay({
      ...state,
      activeTemplate: "custom",
      routines: state.routines.map((routine) => (routine.id === updatedRoutine.id ? { ...updatedRoutine, updatedAt: new Date().toISOString() } : routine))
    }),
    "routine.update",
    { routineId: updatedRoutine.id, routine: updatedRoutine, baseUpdatedAt: activeRoutine.updatedAt },
    label
  );
}

function updateActiveWorkoutDay(patch: (day: WorkoutDay) => WorkoutDay, label = "Đã cập nhật ngày tập") {
  const { activeWorkoutDay } = selectWorkout(currentState(), new Date());
  if (!activeWorkoutDay) return;
  updateActiveRoutine(
    (routine) => ({ ...routine, days: routine.days.map((day) => (day.id === activeWorkoutDay.id ? patch({ ...day, exercises: [...day.exercises] }) : day)) }),
    label
  );
}

export function addExercise(name: string) {
  const exercise: WorkoutExercise = {
    id: cryptoSafeId(),
    name: name.trim() || "Bài tập tùy chỉnh",
    muscleGroup: "Tùy chỉnh",
    targetSets: 3,
    targetRepsMin: 10,
    targetRepsMax: 12,
    targetWeightKg: 10,
    restSeconds: 60,
    lastSession: "Bài tập tùy chỉnh"
  };
  updateActiveWorkoutDay((day) => ({ ...day, exercises: [...day.exercises, routineExerciseFromWorkout(exercise, day.exercises.length)] }), `Đã thêm ${exercise.name}`);
}

export function deleteExercise(id: string) {
  updateActiveWorkoutDay(
    (day) => ({ ...day, exercises: day.exercises.filter((exercise) => exercise.id !== id).map((exercise, index) => ({ ...exercise, order: index })) }),
    "Đã xóa bài tập"
  );
}

export function updateExerciseTarget(id: string, patch: Partial<WorkoutExercise>) {
  updateActiveWorkoutDay(
    (day) => ({ ...day, exercises: day.exercises.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise)) }),
    "Đã cập nhật bài tập"
  );
}

export function moveExercise(id: string, direction: -1 | 1) {
  const { activeWorkoutDay } = selectWorkout(currentState(), new Date());
  if (!activeWorkoutDay) return;
  const ordered = [...activeWorkoutDay.exercises].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((exercise) => exercise.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
  const [item] = ordered.splice(index, 1);
  ordered.splice(nextIndex, 0, item);
  updateActiveWorkoutDay((day) => ({ ...day, exercises: ordered.map((exercise, order) => ({ ...exercise, order })) }), "Đã sắp xếp lịch tập");
}

export function updateRoutineName(name: string) {
  updateActiveRoutine((routine) => ({ ...routine, name: name || "Lịch tập chưa đặt tên" }), "Đã cập nhật tên lịch tập");
}

export function updateWorkoutDay(id: string, patch: Partial<WorkoutDay>) {
  updateActiveRoutine((routine) => ({ ...routine, days: routine.days.map((day) => (day.id === id ? { ...day, ...patch } : day)) }), "Đã cập nhật ngày tập");
}

export function addWorkoutDay() {
  updateActiveRoutine((routine) => {
    const day: WorkoutDay = {
      id: `day-${cryptoSafeId()}`,
      name: `Ngày ${routine.days.length + 1}`,
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][routine.days.length % 7],
      order: routine.days.length,
      exercises: []
    };
    return { ...routine, daysPerWeek: routine.days.length + 1, days: [...routine.days, day] };
  }, "Đã thêm ngày tập");
}

export function deleteWorkoutDay(id: string) {
  const state = currentState();
  const { activeRoutine } = selectWorkout(state, new Date());
  if (!activeRoutine || activeRoutine.days.length <= 1) return;
  const nextDays = activeRoutine.days.filter((day) => day.id !== id).map((day, index) => ({ ...day, order: index }));
  commitSynced(
    syncSelectedDay({
      ...state,
      routines: state.routines.map((routine) =>
        routine.id === activeRoutine.id ? { ...routine, daysPerWeek: nextDays.length, days: nextDays, updatedAt: new Date().toISOString() } : routine
      ),
      selectedWorkoutDayId: nextDays[0]?.id ?? state.selectedWorkoutDayId,
      activeExerciseIndex: 0
    }),
    "routine.day.delete",
    { id },
    "Đã xóa ngày tập"
  );
}

export function selectWorkoutDay(dayId: string) {
  const state = currentState();
  const { activeRoutine } = selectWorkout(state, new Date());
  const day = activeRoutine?.days.find((item) => item.id === dayId);
  if (!activeRoutine || !day) return;
  commitSynced(syncSelectedDay({ ...state, selectedWorkoutDayId: day.id, activeExerciseIndex: 0 }), "routine.day.select", { routineId: activeRoutine.id, dayId }, `Đã chọn ${day.name}`);
}

// --- Templates & planner ------------------------------------------------------------------------

function routineFromTemplate(template: Exclude<AppState["activeTemplate"], "custom">): Routine {
  const nowIso = new Date().toISOString();
  const exercise = (name: string, muscleGroup: string, order: number, targetWeightKg = 20): RoutineExercise => ({
    id: cryptoSafeId(),
    name,
    muscleGroup,
    targetSets: 3,
    targetRepsMin: 8,
    targetRepsMax: 12,
    targetWeightKg,
    restSeconds: 90,
    lastSession: "Bài tập từ mẫu",
    order
  });
  const day = (name: string, weekday: string, order: number, exercises: RoutineExercise[]): WorkoutDay => ({ id: `day-${cryptoSafeId()}`, name, day: weekday, order, exercises });
  const fromSeed = (items: WorkoutExercise[]) => items.map((item, index) => routineExerciseFromWorkout(item, index));
  const days =
    template === "ppl"
      ? [
          day("Ngày đẩy", "Mon", 0, fromSeed(routineTemplates.ppl)),
          day("Ngày kéo", "Wed", 1, [exercise("Chest Supported Row", "Lưng", 0, 40), exercise("Lat Pulldown", "Lưng", 1, 45), exercise("Dumbbell Curl", "Tay", 2, 12)]),
          day("Ngày chân", "Fri", 2, [exercise("Back Squat", "Chân", 0, 80), exercise("Romanian Deadlift", "Chân", 1, 70), exercise("Leg Press", "Chân", 2, 120)])
        ]
      : template === "upper-lower"
        ? [
            day("Ngày thân trên", "Mon", 0, fromSeed(routineTemplates["upper-lower"])),
            day("Ngày thân dưới", "Thu", 1, [exercise("Back Squat", "Chân", 0, 80), exercise("Romanian Deadlift", "Chân", 1, 70), exercise("Leg Press", "Chân", 2, 120)])
          ]
        : [
            day("Toàn thân A", "Mon", 0, fromSeed(routineTemplates["full-body"])),
            day("Toàn thân B", "Wed", 1, [exercise("Barbell Bench Press", "Ngực", 0, 60), exercise("Chest Supported Row", "Lưng", 1, 40), exercise("Back Squat", "Chân", 2, 80)]),
            day("Toàn thân C", "Fri", 2, [exercise("Seated Shoulder Press", "Vai", 0, 24), exercise("Lat Pulldown", "Lưng", 1, 45), exercise("Romanian Deadlift", "Chân", 2, 70)])
          ];
  return { id: `routine-${template}-${cryptoSafeId()}`, name: templateLabels[template], daysPerWeek: days.length, days, createdAt: nowIso, updatedAt: nowIso };
}

export function applyTemplate(template: AppState["activeTemplate"]) {
  const state = currentState();
  if (template === "custom") {
    commit({ ...state, activeTemplate: "custom" }, "Đã chuyển sang Tùy chỉnh");
    return;
  }
  const routine = routineFromTemplate(template);
  commitSynced(
    syncSelectedDay({
      ...state,
      activeTemplate: template,
      routines: [...state.routines, routine],
      activeRoutineId: routine.id,
      selectedWorkoutDayId: routine.days[0].id,
      workoutSets: [],
      activeExerciseIndex: 0
    }),
    "routine.create",
    routine,
    `Đã áp dụng mẫu ${templateLabels[template]}`
  );
}

export function buildRoutineTemplatePreview(template: RoutineTemplate): RoutineTemplatePreview {
  return previewRoutineTemplateApply(template, profileForTemplates(currentState()));
}

export function applyRoutineMarketplaceTemplate(template: RoutineTemplate, customize = false) {
  const state = currentState();
  const routine = routineFromMarketplaceTemplate(template, {
    id: `routine-template-${template.id}-${cryptoSafeId()}`,
    name: customize ? `${template.name} (custom)` : template.name
  });
  commitSynced(
    syncSelectedDay({
      ...state,
      activeTemplate: "custom",
      routines: [...state.routines, routine],
      activeRoutineId: routine.id,
      selectedWorkoutDayId: routine.days[0]?.id ?? state.selectedWorkoutDayId,
      workoutExercises: routine.days[0]?.exercises ?? state.workoutExercises,
      activeExerciseIndex: 0
    }),
    "routine.create",
    { ...routine, marketplaceTemplateId: template.id, marketplaceTemplateVersion: template.version, customize },
    customize ? `Đã tạo bản tùy biến từ ${template.name}` : `Đã áp dụng ${template.name}`
  );
}

export function buildPlannerPreview(): WorkoutPlannerPreview {
  const state = currentState();
  const { activeRoutine } = selectWorkout(state, new Date());
  const latestMetric = latestBodyMetric(state.bodyMetrics);
  return buildWorkoutPlannerPreview(
    {
      goal: state.profile.trainingGoal ?? "muscle",
      daysPerWeek: Math.max(1, state.profile.workoutDays.length || activeRoutine?.daysPerWeek || 3),
      equipment: state.profile.availableEquipment?.length ? state.profile.availableEquipment : ["bodyweight"],
      experienceLevel: state.profile.experienceLevel ?? "intermediate",
      minutesPerSession: 60,
      musclePriority: latestMetric?.bodyFatPercent && latestMetric.bodyFatPercent > 20 ? ["Legs", "Back"] : undefined
    },
    state.exerciseLibrary
  );
}

export function applyWorkoutPlanner(preview: WorkoutPlannerPreview) {
  const state = currentState();
  const routine = preview.routine;
  commitSynced(
    syncSelectedDay({
      ...state,
      activeTemplate: "custom",
      routines: [...state.routines, routine],
      activeRoutineId: routine.id,
      selectedWorkoutDayId: routine.days[0]?.id ?? state.selectedWorkoutDayId,
      activeExerciseIndex: 0
    }),
    "routine.create",
    routine,
    "Đã áp dụng Coach Planner V2"
  );
}

// --- CSV / XLSX import --------------------------------------------------------------------------

export async function downloadRoutineSampleXlsx() {
  try {
    const response = await fetch("/samples/evolvefit-routine-template.csv");
    const csv = await response.text();
    const XLSX = await import("xlsx");
    XLSX.writeFile(XLSX.read(csv, { type: "string" }), "evolvefit-routine-template.xlsx");
  } catch {
    notify("Không tải được file mẫu. Vui lòng thử lại.");
  }
}

export async function parseRoutineImportFile(file: File): Promise<RoutineImportPreview> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) return { fileName: file.name, rows: [], errors: ["File bảng tính không có sheet dữ liệu."] };
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], { header: 1, blankrows: false });
      return parseRoutineCsv(rowsToRoutineCsv(rows), file.name);
    } catch {
      return { fileName: file.name, rows: [], errors: ["Không đọc được file bảng tính đã chọn."] };
    }
  }
  try {
    return parseRoutineCsv(await file.text(), file.name);
  } catch {
    return { fileName: file.name, rows: [], errors: ["Không đọc được file đã chọn."] };
  }
}

export function confirmRoutineImport(preview: RoutineImportPreview, mode: "replace" | "append"): boolean {
  if (preview.errors.length || !preview.rows.length) return false;
  const state = currentState();
  const { activeRoutine } = selectWorkout(state, new Date());
  const importedDays = preview.rows.reduce<WorkoutDay[]>((days, row) => {
    const existingDay = days.find((day) => day.name === row.session && day.day === row.day);
    const exercise = routineExerciseFromWorkout(
      {
        id: row.id,
        name: row.name,
        muscleGroup: row.muscleGroup,
        targetSets: row.targetSets,
        targetRepsMin: row.targetRepsMin,
        targetRepsMax: row.targetRepsMax,
        targetWeightKg: row.targetWeightKg,
        restSeconds: row.restSeconds,
        lastSession: row.lastSession
      },
      existingDay?.exercises.length ?? 0
    );
    if (existingDay) {
      existingDay.exercises.push(exercise);
      return days;
    }
    return [...days, { id: `day-${cryptoSafeId()}`, name: row.session, day: row.day, order: days.length, exercises: [exercise] }];
  }, []);
  const baseRoutine = activeRoutine ?? migrateWorkoutExercisesToRoutine(state.workoutExercises);
  const days = mode === "replace" ? importedDays : [...baseRoutine.days, ...importedDays.map((day, index) => ({ ...day, order: baseRoutine.days.length + index }))];
  const updatedRoutine = { ...baseRoutine, daysPerWeek: days.length, days, updatedAt: new Date().toISOString() };
  commitSynced(
    syncSelectedDay({
      ...state,
      activeTemplate: "custom",
      routines: state.routines.some((routine) => routine.id === updatedRoutine.id)
        ? state.routines.map((routine) => (routine.id === updatedRoutine.id ? updatedRoutine : routine))
        : [...state.routines, updatedRoutine],
      activeRoutineId: updatedRoutine.id,
      selectedWorkoutDayId: days[0]?.id ?? state.selectedWorkoutDayId,
      workoutSets: [],
      activeExerciseIndex: 0
    }),
    "routine.update",
    { routineId: updatedRoutine.id, routine: updatedRoutine, baseUpdatedAt: baseRoutine.updatedAt, fileName: preview.fileName, mode },
    `Đã nhập ${preview.rows.length} bài tập`
  );
  return true;
}

// --- Exercise library -----------------------------------------------------------------------------

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
