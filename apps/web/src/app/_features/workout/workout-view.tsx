"use client";

import { Check, Dumbbell, Trophy } from "lucide-react";
import React, { useEffect, useState } from "react";
import type {
  AppState,
  EquipmentType,
  ExerciseDefinition,
  MovementPattern,
  PlateSettings,
  RoutineImportPreview,
  RoutineTemplate,
  RoutineTemplatePreview,
  SessionExerciseQueueItem,
  WorkoutExercise,
  WorkoutPlannerPreview,
  WorkoutSet,
  WorkoutSetPr,
  WorkoutSetType
} from "@evolvefit/shared";
import { WorkoutSafetyPanel } from "../../_components/workout-safety-panel";
import { ExerciseLibrarySection } from "../library/exercise-library-section";
import { RoutineEditorSection } from "../routines/routine-editor-section";
import { RoutineImportCard } from "../routines/routine-import-card";
import { RoutineTemplateMarketplace } from "../routines/routine-template-marketplace";
import { WeeklyScheduleCard } from "../routines/weekly-schedule-card";
import { WorkoutPlannerCard } from "../routines/workout-planner-card";
import { FinishedWorkoutSummary } from "./finished-workout-summary";
import { LivePlanTools } from "./live-plan-tools";
import { LiveSetControlsCard } from "./live-set-controls-card";
import { LiveSetProgressCard } from "./live-set-progress-card";
import { RestTimerCard } from "./rest-timer-card";
import { SessionQueueCard } from "./session-queue-card";
import { muscleGroupLabel, sessionStatusLabel } from "./workout-labels";
import { WorkoutSetHistoryCard } from "./workout-set-history-card";
export function WorkoutView(props: {
  section: "workout" | "routines" | "library";
  state: AppState;
  activeRoutine?: AppState["routines"][number];
  activeWorkoutDay?: AppState["routines"][number]["days"][number];
  activeWorkoutSession?: AppState["workoutSessions"][number];
  sessionQueue: SessionExerciseQueueItem[];
  currentSessionSets: WorkoutSet[];
  filteredExerciseLibrary: ExerciseDefinition[];
  marketplaceExercises: ExerciseDefinition[];
  customExerciseLibrary: ExerciseDefinition[];
  selectedMarketplaceExercise: ExerciseDefinition | null;
  selectMarketplaceExercise: (id: string) => void;
  activeExercise: AppState["workoutExercises"][number];
  completedSets: WorkoutSet[];
  allSetsForActive: WorkoutSet[];
  livePrBadges: WorkoutSetPr[];
  plateSettings: PlateSettings;
  setWeight: number;
  setSetWeight: (value: number) => void;
  setReps: number;
  setSetReps: (value: number) => void;
  setRpe: number;
  setSetRpe: (value: number) => void;
  setType: WorkoutSetType;
  setSetType: (value: WorkoutSetType) => void;
  mode: "plan" | "live" | "finished";
  startWorkout: () => void;
  finishWorkout: () => void;
  backToPlan: () => void;
  completeSet: () => void;
  selectExercise: (id: string) => void;
  skipExercise: () => void;
  restSeconds: number;
  restPaused: boolean;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  resetRestTimer: () => void;
  skipCurrentSet: () => void;
  updateWorkoutSet: (id: string, patch: Partial<WorkoutSet>) => void;
  deleteWorkoutSet: (id: string) => void;
  librarySearch: string;
  setLibrarySearch: (value: string) => void;
  libraryMuscleFilter: string;
  setLibraryMuscleFilter: (value: string) => void;
  libraryEquipmentFilter: string;
  setLibraryEquipmentFilter: (value: string) => void;
  libraryDifficultyFilter: string;
  setLibraryDifficultyFilter: (value: string) => void;
  libraryTagFilter: string;
  setLibraryTagFilter: (value: string) => void;
  newLibraryExerciseName: string;
  setNewLibraryExerciseName: (value: string) => void;
  newLibraryMuscleGroup: string;
  setNewLibraryMuscleGroup: (value: string) => void;
  newLibraryEquipment: EquipmentType;
  setNewLibraryEquipment: (value: EquipmentType) => void;
  newLibraryPattern: MovementPattern;
  setNewLibraryPattern: (value: MovementPattern) => void;
  newExerciseName: string;
  setNewExerciseName: (value: string) => void;
  addExercise: () => void;
  routineImportPreview: RoutineImportPreview | null;
  previewRoutineImport: (file: File) => void;
  downloadRoutineSampleXlsx: () => void;
  confirmRoutineImport: (mode: "replace" | "append") => void;
  clearRoutineImport: () => void;
  workoutPlannerPreview: WorkoutPlannerPreview | null;
  previewWorkoutPlanner: () => void;
  applyWorkoutPlanner: () => void;
  clearWorkoutPlanner: () => void;
  deleteExercise: (id: string) => void;
  moveExercise: (id: string, direction: -1 | 1) => void;
  reorderSessionExercise: (id: string, direction: -1 | 1) => void;
  saveWorkoutOrderToRoutine: () => void;
  applyTemplate: (template: AppState["activeTemplate"]) => void;
  updateExerciseTarget: (id: string, patch: Partial<WorkoutExercise>) => void;
  updateRoutineName: (name: string) => void;
  selectWorkoutDay: (id: string) => void;
  updateWorkoutDay: (id: string, patch: Partial<AppState["routines"][number]["days"][number]>) => void;
  addWorkoutDay: () => void;
  deleteWorkoutDay: (id: string) => void;
  addExerciseFromLibrary: (definition: ExerciseDefinition) => void;
  cloneExerciseFromMarketplace: (definition: ExerciseDefinition) => void;
  addCustomExerciseDefinition: () => void;
  updateExerciseDefinition: (id: string, patch: Partial<ExerciseDefinition>) => void;
  deleteExerciseDefinition: (id: string) => void;
  routineTemplateCatalog: RoutineTemplate[];
  selectedRoutineTemplate: RoutineTemplate | null;
  routineTemplatePreview: RoutineTemplatePreview | null;
  routineTemplateSearch: string;
  setRoutineTemplateSearch: (value: string) => void;
  routineTemplateGoalFilter: "all" | RoutineTemplate["targetGoal"];
  setRoutineTemplateGoalFilter: (value: "all" | RoutineTemplate["targetGoal"]) => void;
  routineTemplateEquipmentFilter: "all" | EquipmentType;
  setRoutineTemplateEquipmentFilter: (value: "all" | EquipmentType) => void;
  selectRoutineTemplate: (id: string) => void;
  previewRoutineTemplate: (template: RoutineTemplate) => void;
  applyRoutineMarketplaceTemplate: (template: RoutineTemplate, customize?: boolean) => void;
  wakeLockStatus: "unknown" | "unsupported" | "active" | "failed";
}) {
  const queuedCount = props.sessionQueue.filter((item) => item.status === "queued").length;
  const completedCount = props.sessionQueue.filter((item) => item.status === "completed").length;
  const parkedCount = props.sessionQueue.filter((item) => item.status === "parked").length;

  const [routineMode, setRoutineMode] = useState<"view" | "edit">("view");
  const [showAdvancedLibrary, setShowAdvancedLibrary] = useState(false);
  const [showLivePlanTools, setShowLivePlanTools] = useState(false);
  const [showSessionQueue, setShowSessionQueue] = useState(false);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(false);
  const [routinePanel, setRoutinePanel] = useState<"mine" | "templates" | "planner" | "import">("mine");

  useEffect(() => {
    if (parkedCount > 0) {
      setShowSessionQueue(true);
    }
  }, [parkedCount]);

  if (props.mode === "finished") {
    return (
      <FinishedWorkoutSummary
        currentSessionSets={props.currentSessionSets}
        startWorkout={props.startWorkout}
        backToPlan={props.backToPlan}
      />
    );
  }

  if (props.mode === "plan") {
    return (
      <div className={`stack workout-plan ${props.section}-section ${routineMode === "edit" ? "routine-editing" : "routine-reading"} ${showAdvancedLibrary ? "library-advanced-open" : ""}`}>
        {props.section === "workout" && (
          <>
            <section className="workout-start-card">
              <div>
                <p className="eyebrow">Chế độ kế hoạch</p>
                <h1>{props.activeWorkoutDay?.name ?? "Ngày tập"}</h1>
                <p>{props.activeRoutine?.name ?? "Lịch tập"} - {props.state.workoutExercises.length} bài trong ngày đã chọn</p>
              </div>
              <div className="action-icon workout-icon">
                <Dumbbell size={24} />
              </div>
              <button className="primary-button training-bg" onClick={props.startWorkout}>
                <Check size={18} /> Bắt đầu tập
              </button>
            </section>
            <WeeklyScheduleCard
              activeRoutine={props.activeRoutine}
              activeWorkoutDay={props.activeWorkoutDay}
              selectWorkoutDay={props.selectWorkoutDay}
            />
          </>
        )}

        {props.section === "routines" && (
          <>
            <section className="card routine-tabs-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Lịch tập</p>
                  <h2>Quản lý kế hoạch</h2>
                </div>
              </div>
              <nav className="segmented-control routine-tabs" aria-label="Nhóm lịch tập">
                <button className={routinePanel === "mine" ? "active" : ""} onClick={() => setRoutinePanel("mine")}>Lịch của tôi</button>
                <button className={routinePanel === "templates" ? "active" : ""} onClick={() => setRoutinePanel("templates")}>Template</button>
                <button className={routinePanel === "planner" ? "active" : ""} onClick={() => setRoutinePanel("planner")}>Planner</button>
                <button className={routinePanel === "import" ? "active" : ""} onClick={() => setRoutinePanel("import")}>Import</button>
              </nav>
            </section>

            {routinePanel === "mine" && (
              <>
                <WeeklyScheduleCard
                  activeRoutine={props.activeRoutine}
                  activeWorkoutDay={props.activeWorkoutDay}
                  selectWorkoutDay={props.selectWorkoutDay}
                />
                <RoutineEditorSection
                  state={props.state}
                  routineMode={routineMode}
                  setRoutineMode={setRoutineMode}
                  activeRoutine={props.activeRoutine}
                  activeWorkoutDay={props.activeWorkoutDay}
                  newExerciseName={props.newExerciseName}
                  setNewExerciseName={props.setNewExerciseName}
                  addExercise={props.addExercise}
                  deleteExercise={props.deleteExercise}
                  moveExercise={props.moveExercise}
                  applyTemplate={props.applyTemplate}
                  updateExerciseTarget={props.updateExerciseTarget}
                  updateRoutineName={props.updateRoutineName}
                  selectExercise={props.selectExercise}
                  selectWorkoutDay={props.selectWorkoutDay}
                  updateWorkoutDay={props.updateWorkoutDay}
                  addWorkoutDay={props.addWorkoutDay}
                  deleteWorkoutDay={props.deleteWorkoutDay}
                />
              </>
            )}

            {routinePanel === "templates" && (
              <RoutineTemplateMarketplace
                profile={props.state.profile}
                routineTemplateCatalog={props.routineTemplateCatalog}
                selectedRoutineTemplate={props.selectedRoutineTemplate}
                routineTemplatePreview={props.routineTemplatePreview}
                routineTemplateSearch={props.routineTemplateSearch}
                setRoutineTemplateSearch={props.setRoutineTemplateSearch}
                routineTemplateGoalFilter={props.routineTemplateGoalFilter}
                setRoutineTemplateGoalFilter={props.setRoutineTemplateGoalFilter}
                routineTemplateEquipmentFilter={props.routineTemplateEquipmentFilter}
                setRoutineTemplateEquipmentFilter={props.setRoutineTemplateEquipmentFilter}
                selectRoutineTemplate={props.selectRoutineTemplate}
                previewRoutineTemplate={props.previewRoutineTemplate}
                applyRoutineMarketplaceTemplate={props.applyRoutineMarketplaceTemplate}
              />
            )}

            {routinePanel === "planner" && (
              <WorkoutPlannerCard
                workoutPlannerPreview={props.workoutPlannerPreview}
                previewWorkoutPlanner={props.previewWorkoutPlanner}
                applyWorkoutPlanner={props.applyWorkoutPlanner}
                clearWorkoutPlanner={props.clearWorkoutPlanner}
              />
            )}

            {routinePanel === "import" && (
              <RoutineImportCard
                routineImportPreview={props.routineImportPreview}
                previewRoutineImport={props.previewRoutineImport}
                downloadRoutineSampleXlsx={props.downloadRoutineSampleXlsx}
                confirmRoutineImport={props.confirmRoutineImport}
                clearRoutineImport={props.clearRoutineImport}
              />
            )}
          </>
        )}

        {props.section === "library" && (
          <ExerciseLibrarySection
            showAdvancedLibrary={showAdvancedLibrary}
            setShowAdvancedLibrary={setShowAdvancedLibrary}
            marketplaceExercises={props.marketplaceExercises}
            customExerciseLibrary={props.customExerciseLibrary}
            selectedMarketplaceExercise={props.selectedMarketplaceExercise}
            selectMarketplaceExercise={props.selectMarketplaceExercise}
            addExerciseFromLibrary={props.addExerciseFromLibrary}
            cloneExerciseFromMarketplace={props.cloneExerciseFromMarketplace}
            updateExerciseDefinition={props.updateExerciseDefinition}
            deleteExerciseDefinition={props.deleteExerciseDefinition}
            addCustomExerciseDefinition={props.addCustomExerciseDefinition}
            librarySearch={props.librarySearch}
            setLibrarySearch={props.setLibrarySearch}
            libraryMuscleFilter={props.libraryMuscleFilter}
            setLibraryMuscleFilter={props.setLibraryMuscleFilter}
            libraryEquipmentFilter={props.libraryEquipmentFilter}
            setLibraryEquipmentFilter={props.setLibraryEquipmentFilter}
            libraryDifficultyFilter={props.libraryDifficultyFilter}
            setLibraryDifficultyFilter={props.setLibraryDifficultyFilter}
            libraryTagFilter={props.libraryTagFilter}
            setLibraryTagFilter={props.setLibraryTagFilter}
            newLibraryExerciseName={props.newLibraryExerciseName}
            setNewLibraryExerciseName={props.setNewLibraryExerciseName}
            newLibraryMuscleGroup={props.newLibraryMuscleGroup}
            setNewLibraryMuscleGroup={props.setNewLibraryMuscleGroup}
            newLibraryEquipment={props.newLibraryEquipment}
            setNewLibraryEquipment={props.setNewLibraryEquipment}
            newLibraryPattern={props.newLibraryPattern}
            setNewLibraryPattern={props.setNewLibraryPattern}
          />
        )}
      </div>
    );
  }

  return (
    <div className="stack workout-focus live-workout">
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Chế độ live</p>
            <h2>{props.activeWorkoutDay?.name ?? "Buổi tập"}</h2>
          </div>
          <Dumbbell size={22} />
        </div>
        <div className="queue-summary" aria-label="Tóm tắt buổi tập live">
          <span>{props.state.workoutExercises.length} bài</span>
          <span>{completedCount} hoàn tất</span>
          <span>{queuedCount} còn lại</span>
        </div>
        <button className="secondary-button disclosure-toggle" onClick={() => setShowLivePlanTools(!showLivePlanTools)} aria-expanded={showLivePlanTools}>
          {showLivePlanTools ? "Ẩn chỉnh lịch trong buổi" : "Chỉnh lịch / mục tiêu"}
        </button>
        {showLivePlanTools && (
          <LivePlanTools
            state={props.state}
            newExerciseName={props.newExerciseName}
            setNewExerciseName={props.setNewExerciseName}
            addExercise={props.addExercise}
            deleteExercise={props.deleteExercise}
            moveExercise={props.moveExercise}
            applyTemplate={props.applyTemplate}
            updateExerciseTarget={props.updateExerciseTarget}
          />
        )}
      </section>

      <section className="card workout-overview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{props.activeWorkoutDay?.name ?? "Buổi"} - Bài {props.state.activeExerciseIndex + 1}/{props.sessionQueue.length}</p>
            <h1>{props.activeExercise.name}</h1>
            <p>{muscleGroupLabel(props.activeExercise.muscleGroup)} • Mục tiêu {props.activeExercise.targetSets} x {props.activeExercise.targetRepsMin}-{props.activeExercise.targetRepsMax}</p>
          </div>
          <Dumbbell size={26} />
        </div>
        <div className="last-session">Lần trước: {props.activeExercise.lastSession}</div>
        {props.livePrBadges.length > 0 && (
          <div className="live-pr-banner" role="status" aria-label="Thông báo PR live">
            <Trophy size={18} />
            <strong>PR mới</strong>
            <span>{props.livePrBadges.map((pr) => `${pr.label} ${pr.next}${pr.type === "maxReps" ? " rep" : "kg"}`).join(" | ")}</span>
          </div>
        )}
      </section>

      <LiveSetProgressCard activeExercise={props.activeExercise} completedSets={props.completedSets} allSetsForActive={props.allSetsForActive} />

      <LiveSetControlsCard
        activeExercise={props.activeExercise}
        plateSettings={props.plateSettings}
        setType={props.setType}
        setSetType={props.setSetType}
        setWeight={props.setWeight}
        setSetWeight={props.setSetWeight}
        setReps={props.setReps}
        setSetReps={props.setSetReps}
        setRpe={props.setRpe}
        setSetRpe={props.setSetRpe}
      />

      <RestTimerCard
        restSeconds={props.restSeconds}
        restPaused={props.restPaused}
        resetRestTimer={props.resetRestTimer}
        adjustRestTimer={props.adjustRestTimer}
        pauseRestTimer={props.pauseRestTimer}
        resumeRestTimer={props.resumeRestTimer}
      />

      <WorkoutSafetyPanel
        skipCurrentSet={props.skipCurrentSet}
        skipExercise={props.skipExercise}
        finishWorkout={props.finishWorkout}
        hasActiveSession={Boolean(props.activeWorkoutSession)}
        undoAvailable={Boolean(props.state.undo)}
        wakeLockStatus={props.wakeLockStatus}
      />

      <SessionQueueCard
        state={props.state}
        sessionQueue={props.sessionQueue}
        activeExercise={props.activeExercise}
        activeWorkoutSession={props.activeWorkoutSession}
        showSessionQueue={showSessionQueue}
        setShowSessionQueue={setShowSessionQueue}
        selectExercise={props.selectExercise}
        reorderSessionExercise={props.reorderSessionExercise}
        saveWorkoutOrderToRoutine={props.saveWorkoutOrderToRoutine}
      />

      <WorkoutSetHistoryCard
        currentSessionSets={props.currentSessionSets}
        updateWorkoutSet={props.updateWorkoutSet}
        deleteWorkoutSet={props.deleteWorkoutSet}
      />

      <section className="card">
        <div className="section-heading">
          <h2>Lịch sử buổi tập</h2>
          <span className="sync-pill">{props.state.workoutSessions.length} buổi</span>
        </div>
        <button className="secondary-button disclosure-toggle" onClick={() => setShowWorkoutHistory(!showWorkoutHistory)} aria-expanded={showWorkoutHistory}>
          {showWorkoutHistory ? "Ẩn lịch sử buổi tập" : "Mở lịch sử buổi tập"}
        </button>
        {showWorkoutHistory && (
          <div className="timeline compact">
            {props.state.workoutSessions.length ? (
              props.state.workoutSessions
                .slice()
                .reverse()
                .map((session) => {
                  const setCount = props.state.workoutSets.filter((set) => set.sessionId === session.id).length;
                  return (
                    <div key={session.id}>
                      <span>{session.sessionName}</span>
                      <strong>{sessionStatusLabel(session.status)}</strong>
                      <em>{setCount} set - {Math.round(session.durationSeconds / 60)} phút</em>
                    </div>
                  );
                })
            ) : (
              <p>Chưa có buổi tập nào.</p>
            )}
          </div>
        )}
      </section>

      <button className="sticky-complete training-bg" onClick={props.completeSet}>
        <Check size={22} /> Hoàn thành set
      </button>
    </div>
  );
}



