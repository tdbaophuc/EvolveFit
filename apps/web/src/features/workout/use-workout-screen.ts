"use client";

import { useEffect, useState, type ComponentProps } from "react";
import {
  filterExerciseLibrary,
  isUserOwnedExercise,
  listMarketplaceExercises,
  listRoutineTemplates,
  previewRoutineTemplateApply,
  type EquipmentType,
  type MovementPattern,
  type RoutineImportPreview,
  type RoutineTemplate,
  type RoutineTemplatePreview,
  type WorkoutPlannerPreview
} from "@evolvefit/shared";
import type { WorkoutView } from "@/app/_features/workout/workout-view";
import { notify, useAppStore } from "@/lib/store/app-store";
import { useMarketplaceCatalog, useRoutineTemplateCatalog } from "../catalog/queries";
import * as library from "../library/actions";
import * as routines from "../routines/actions";
import * as workout from "./actions";
import { selectWorkout } from "./selectors";
import { restSecondsRemaining, useWorkoutUi, type WakeLockStatus } from "./ui-store";

type WorkoutScreenProps = Omit<ComponentProps<typeof WorkoutView>, "section">;
type WakeLockSentinelLike = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

/** Keeps the screen awake while the workout screen is open (where supported). */
function useWakeLock(enabled: boolean) {
  const patch = useWorkoutUi((store) => store.patch);
  useEffect(() => {
    if (!enabled) {
      patch({ wakeLockStatus: "unknown" });
      return;
    }
    const wakeLockNavigator = navigator as NavigatorWithWakeLock;
    if (!wakeLockNavigator.wakeLock) {
      patch({ wakeLockStatus: "unsupported" });
      return;
    }
    let lock: WakeLockSentinelLike | undefined;
    let status: WakeLockStatus = "unknown";
    wakeLockNavigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        lock = sentinel;
        status = "active";
        patch({ wakeLockStatus: status });
      })
      .catch(() => patch({ wakeLockStatus: "failed" }));
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, [enabled, patch]);
}

export function useWorkoutScreen(section: ComponentProps<typeof WorkoutView>["section"]): WorkoutScreenProps {
  const state = useAppStore((store) => store.state);
  const ui = useWorkoutUi();
  useWakeLock(section === "workout");

  const [newExerciseName, setNewExerciseName] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState("all");
  const [libraryEquipmentFilter, setLibraryEquipmentFilter] = useState("all");
  const [libraryDifficultyFilter, setLibraryDifficultyFilter] = useState("all");
  const [libraryTagFilter, setLibraryTagFilter] = useState("all");
  const [selectedMarketplaceExerciseId, setSelectedMarketplaceExerciseId] = useState<string | null>(null);
  const [newLibraryExerciseName, setNewLibraryExerciseName] = useState("");
  const [newLibraryMuscleGroup, setNewLibraryMuscleGroup] = useState("Ngực");
  const [newLibraryEquipment, setNewLibraryEquipment] = useState<EquipmentType>("cable");
  const [newLibraryPattern, setNewLibraryPattern] = useState<MovementPattern>("isolation");
  const [routineTemplateSearch, setRoutineTemplateSearch] = useState("");
  const [routineTemplateGoalFilter, setRoutineTemplateGoalFilter] = useState<"all" | RoutineTemplate["targetGoal"]>("all");
  const [routineTemplateEquipmentFilter, setRoutineTemplateEquipmentFilter] = useState<"all" | EquipmentType>("all");
  const [selectedRoutineTemplateId, setSelectedRoutineTemplateId] = useState<string | null>(null);
  const [routineTemplatePreview, setRoutineTemplatePreview] = useState<RoutineTemplatePreview | null>(null);
  const [routineImportPreview, setRoutineImportPreview] = useState<RoutineImportPreview | null>(null);
  const [workoutPlannerPreview, setWorkoutPlannerPreview] = useState<WorkoutPlannerPreview | null>(null);

  const now = new Date();
  const context = selectWorkout(state, now);
  const profileForTemplates = {
    trainingGoal: state.profile.trainingGoal,
    experienceLevel: state.profile.experienceLevel,
    availableEquipment: state.profile.availableEquipment
  };
  const libraryFilters = {
    query: librarySearch,
    muscleGroup: libraryMuscleFilter,
    equipment: libraryEquipmentFilter,
    difficulty: libraryDifficultyFilter,
    tag: libraryTagFilter
  };
  const filteredExerciseLibrary = filterExerciseLibrary(state.exerciseLibrary, { ...libraryFilters, includeArchived: false });
  // Shared admin-curated catalog from the API; the built-in copy is shown until it loads and when offline.
  const marketplace = useMarketplaceCatalog(libraryFilters, listMarketplaceExercises(state.exerciseLibrary, libraryFilters));
  const marketplaceExercises = marketplace.items;
  const selectedMarketplaceExercise = selectedMarketplaceExerciseId
    ? (marketplaceExercises.find((exercise) => exercise.id === selectedMarketplaceExerciseId) ?? null)
    : (marketplaceExercises[0] ?? null);
  const templateFilters = { query: routineTemplateSearch, goal: routineTemplateGoalFilter, equipment: routineTemplateEquipmentFilter };
  const templates = useRoutineTemplateCatalog(templateFilters, state.routineTemplatesMarketplace);
  // The server already applied the filters; rank by this user's profile (the server only knows its own copy).
  const routineTemplateCatalog = listRoutineTemplates(templates.items, {
    ...templateFilters,
    status: "published",
    sort: "compatibility",
    profile: profileForTemplates
  });
  const selectedRoutineTemplate = selectedRoutineTemplateId
    ? (routineTemplateCatalog.find((template) => template.id === selectedRoutineTemplateId) ?? null)
    : (routineTemplateCatalog[0] ?? null);
  const activeRoutineTemplatePreview =
    routineTemplatePreview && selectedRoutineTemplate && routineTemplatePreview.template.id === selectedRoutineTemplate.id
      ? routineTemplatePreview
      : selectedRoutineTemplate
        ? previewRoutineTemplateApply(selectedRoutineTemplate, profileForTemplates)
        : null;

  return {
    state,
    activeRoutine: context.activeRoutine,
    activeWorkoutDay: context.activeWorkoutDay,
    activeWorkoutSession: context.activeWorkoutSession,
    sessionQueue: context.activeSessionQueue,
    currentSessionSets: context.currentSessionSets,
    filteredExerciseLibrary,
    marketplaceExercises,
    customExerciseLibrary: filteredExerciseLibrary.filter(isUserOwnedExercise),
    selectedMarketplaceExercise,
    selectMarketplaceExercise: setSelectedMarketplaceExerciseId,
    activeExercise: context.activeExercise,
    completedSets: context.completedSetsForActive,
    allSetsForActive: context.allSetsForActive,
    livePrBadges: ui.livePrBadges,
    plateSettings: state.plateSettings,
    setWeight: ui.setWeight,
    setSetWeight: (setWeight: number) => ui.patch({ setWeight }),
    setReps: ui.setReps,
    setSetReps: (setReps: number) => ui.patch({ setReps }),
    setRpe: ui.setRpe,
    setSetRpe: (setRpe: number) => ui.patch({ setRpe }),
    setType: ui.setType,
    setSetType: (setType) => ui.patch({ setType }),
    mode: ui.mode,
    startWorkout: workout.startWorkout,
    finishWorkout: workout.finishWorkout,
    backToPlan: workout.backToPlan,
    completeSet: workout.completeSet,
    selectExercise: workout.selectWorkoutExercise,
    skipExercise: workout.skipActiveExercise,
    restSeconds: restSecondsRemaining(state.restEndsAt, ui.restPausedSeconds, ui.nowMs),
    restPaused: ui.restPausedSeconds !== null || context.activeWorkoutSession?.status === "paused",
    pauseRestTimer: workout.pauseRestTimer,
    resumeRestTimer: workout.resumeRestTimer,
    adjustRestTimer: workout.adjustRestTimer,
    resetRestTimer: workout.resetRestTimer,
    skipCurrentSet: workout.skipCurrentSet,
    updateWorkoutSet: workout.updateWorkoutSet,
    deleteWorkoutSet: workout.deleteWorkoutSet,
    librarySearch,
    setLibrarySearch,
    libraryMuscleFilter,
    setLibraryMuscleFilter,
    libraryEquipmentFilter,
    setLibraryEquipmentFilter,
    libraryDifficultyFilter,
    setLibraryDifficultyFilter,
    libraryTagFilter,
    setLibraryTagFilter,
    newLibraryExerciseName,
    setNewLibraryExerciseName,
    newLibraryMuscleGroup,
    setNewLibraryMuscleGroup,
    newLibraryEquipment,
    setNewLibraryEquipment,
    newLibraryPattern,
    setNewLibraryPattern,
    newExerciseName,
    setNewExerciseName,
    addExercise: () => {
      routines.addExercise(newExerciseName);
      setNewExerciseName("");
    },
    routineImportPreview,
    previewRoutineImport: (file: File) => {
      void routines.parseRoutineImportFile(file).then(setRoutineImportPreview);
    },
    downloadRoutineSampleXlsx: routines.downloadRoutineSampleXlsx,
    confirmRoutineImport: (mode: "replace" | "append") => {
      if (routineImportPreview && routines.confirmRoutineImport(routineImportPreview, mode)) setRoutineImportPreview(null);
    },
    clearRoutineImport: () => setRoutineImportPreview(null),
    workoutPlannerPreview,
    previewWorkoutPlanner: () => {
      setWorkoutPlannerPreview(routines.buildPlannerPreview());
      notify("Coach Planner V2 đã tạo bản xem trước");
    },
    applyWorkoutPlanner: () => {
      if (!workoutPlannerPreview) return;
      routines.applyWorkoutPlanner(workoutPlannerPreview);
      setWorkoutPlannerPreview(null);
    },
    clearWorkoutPlanner: () => setWorkoutPlannerPreview(null),
    deleteExercise: routines.deleteExercise,
    moveExercise: routines.moveExercise,
    reorderSessionExercise: workout.reorderSessionExercise,
    saveWorkoutOrderToRoutine: workout.saveWorkoutOrderToRoutine,
    applyTemplate: routines.applyTemplate,
    updateExerciseTarget: routines.updateExerciseTarget,
    updateRoutineName: routines.updateRoutineName,
    selectWorkoutDay: routines.selectWorkoutDay,
    updateWorkoutDay: routines.updateWorkoutDay,
    addWorkoutDay: routines.addWorkoutDay,
    deleteWorkoutDay: routines.deleteWorkoutDay,
    addExerciseFromLibrary: library.addExerciseFromLibrary,
    cloneExerciseFromMarketplace: library.cloneExerciseFromMarketplace,
    addCustomExerciseDefinition: () => {
      library.addCustomExerciseDefinition({
        name: newLibraryExerciseName,
        muscleGroup: newLibraryMuscleGroup,
        equipment: newLibraryEquipment,
        movementPattern: newLibraryPattern
      });
      setNewLibraryExerciseName("");
    },
    updateExerciseDefinition: library.updateExerciseDefinition,
    deleteExerciseDefinition: library.deleteExerciseDefinition,
    routineTemplateCatalog,
    selectedRoutineTemplate,
    routineTemplatePreview: activeRoutineTemplatePreview,
    routineTemplateSearch,
    setRoutineTemplateSearch,
    routineTemplateGoalFilter,
    setRoutineTemplateGoalFilter,
    routineTemplateEquipmentFilter,
    setRoutineTemplateEquipmentFilter,
    selectRoutineTemplate: setSelectedRoutineTemplateId,
    previewRoutineTemplate: (template: RoutineTemplate) => {
      setSelectedRoutineTemplateId(template.id);
      setRoutineTemplatePreview(routines.buildRoutineTemplatePreview(template));
      notify(`Đã tạo preview ${template.name}`);
    },
    applyRoutineMarketplaceTemplate: (template: RoutineTemplate, customize?: boolean) => {
      routines.applyRoutineMarketplaceTemplate(template, customize);
      setRoutineTemplatePreview(null);
    },
    wakeLockStatus: ui.wakeLockStatus
  };
}
