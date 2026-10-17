"use client";

import { Dumbbell, Trash2 } from "lucide-react";
import type { AppState, WorkoutExercise } from "@evolvefit/shared";
import React from "react";
import { ConfirmActionButton } from "../ui/confirm-action-button";
import { muscleGroupLabel, templateLabels, weekdays } from "../workout/workout-labels";

const text = {
  eyebrow: "L\u1ecbch \u0111ang d\u00f9ng",
  title: "Ch\u1ec9nh l\u1ecbch t\u1eadp",
  modeLabel: "Ch\u1ebf \u0111\u1ed9 l\u1ecbch t\u1eadp",
  routineName: "T\u00ean l\u1ecbch t\u1eadp",
  dayName: "T\u00ean bu\u1ed5i",
  day: "Ng\u00e0y",
  daysPerWeek: "Ng\u00e0y/tu\u1ea7n",
  routine: "L\u1ecbch t\u1eadp",
  noRoutine: "Ch\u01b0a c\u00f3 l\u1ecbch",
  currentDay: "Bu\u1ed5i \u0111ang xem",
  noDay: "Ch\u01b0a ch\u1ecdn bu\u1ed5i",
  exerciseCount: "S\u1ed1 b\u00e0i",
  workoutDays: "Ng\u00e0y t\u1eadp",
  addDay: "+ Ng\u00e0y",
  deleteDay: "X\u00f3a ng\u00e0y",
  confirmDelete: "X\u00e1c nh\u1eadn x\u00f3a",
  deleteWorkoutDay: "X\u00f3a ng\u00e0y t\u1eadp",
  templates: "M\u1eabu l\u1ecbch t\u1eadp",
  moveUp: "\u0110\u01b0a b\u00e0i t\u1eadp l\u00ean",
  moveDown: "\u0110\u01b0a b\u00e0i t\u1eadp xu\u1ed1ng",
  deleteExercise: "X\u00f3a b\u00e0i t\u1eadp",
  name: "T\u00ean",
  muscleGroup: "Nh\u00f3m c\u01a1",
  sets: "Set",
  minReps: "Rep t\u1ed1i thi\u1ec3u",
  maxReps: "Rep t\u1ed1i \u0111a",
  rest: "Ngh\u1ec9",
  superset: "Nh\u00f3m superset",
  previous: "L\u1ea7n tr\u01b0\u1edbc",
  newExerciseName: "T\u00ean b\u00e0i t\u1eadp m\u1edbi",
  addExercise: "Th\u00eam b\u00e0i"
};

export function RoutineEditorSection(props: {
  state: AppState;
  routineMode: "view" | "edit";
  setRoutineMode: (mode: "view" | "edit") => void;
  activeRoutine?: AppState["routines"][number];
  activeWorkoutDay?: AppState["routines"][number]["days"][number];
  newExerciseName: string;
  setNewExerciseName: (value: string) => void;
  addExercise: () => void;
  deleteExercise: (id: string) => void;
  moveExercise: (id: string, direction: -1 | 1) => void;
  applyTemplate: (template: AppState["activeTemplate"]) => void;
  updateExerciseTarget: (id: string, patch: Partial<WorkoutExercise>) => void;
  updateRoutineName: (name: string) => void;
  selectExercise: (id: string) => void;
  selectWorkoutDay: (id: string) => void;
  updateWorkoutDay: (id: string, patch: Partial<AppState["routines"][number]["days"][number]>) => void;
  addWorkoutDay: () => void;
  deleteWorkoutDay: (id: string) => void;
}) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
        </div>
        <Dumbbell size={22} />
      </div>

      <div className="routine-mode-row" aria-label={text.modeLabel}>
        <button className={props.routineMode === "view" ? "active" : ""} onClick={() => props.setRoutineMode("view")}>
          View mode
        </button>
        <button className={props.routineMode === "edit" ? "active" : ""} onClick={() => props.setRoutineMode("edit")}>
          Edit routine
        </button>
      </div>

      {props.routineMode === "edit" ? (
        <div className="exercise-edit-grid">
          <label className="wide-field">
            <span>{text.routineName}</span>
            <input value={props.activeRoutine?.name ?? ""} onChange={(event) => props.updateRoutineName(event.target.value)} />
          </label>
          <label>
            <span>{text.dayName}</span>
            <input value={props.activeWorkoutDay?.name ?? ""} onChange={(event) => props.activeWorkoutDay && props.updateWorkoutDay(props.activeWorkoutDay.id, { name: event.target.value })} />
          </label>
          <label>
            <span>{text.day}</span>
            <select value={props.activeWorkoutDay?.day ?? "Mon"} onChange={(event) => props.activeWorkoutDay && props.updateWorkoutDay(props.activeWorkoutDay.id, { day: event.target.value })}>
              {weekdays.map(([day, label]) => (
                <option key={day} value={day}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{text.daysPerWeek}</span>
            <input value={props.activeRoutine?.days.length ?? 0} readOnly />
          </label>
        </div>
      ) : (
        <div className="routine-read-summary">
          <div>
            <span>{text.routine}</span>
            <strong>{props.activeRoutine?.name ?? text.noRoutine}</strong>
          </div>
          <div>
            <span>{text.currentDay}</span>
            <strong>{props.activeWorkoutDay?.name ?? text.noDay}</strong>
          </div>
          <div>
            <span>{text.exerciseCount}</span>
            <strong>{props.state.workoutExercises.length}</strong>
          </div>
        </div>
      )}

      <div className="template-row" aria-label={text.workoutDays}>
        {[...(props.activeRoutine?.days ?? [])].sort((a, b) => a.order - b.order).map((day) => (
          <button key={day.id} className={day.id === props.activeWorkoutDay?.id ? "active" : ""} onClick={() => props.selectWorkoutDay(day.id)}>
            {day.name}
          </button>
        ))}
        {props.routineMode === "edit" && (
          <>
            <button onClick={props.addWorkoutDay}>{text.addDay}</button>
            {props.activeWorkoutDay && (
              <ConfirmActionButton
                className="danger-button"
                label={text.deleteDay}
                confirmLabel={text.confirmDelete}
                ariaLabel={text.deleteWorkoutDay}
                onConfirm={() => props.deleteWorkoutDay(props.activeWorkoutDay!.id)}
                disabled={(props.activeRoutine?.days.length ?? 0) <= 1}
              />
            )}
          </>
        )}
      </div>

      {props.routineMode === "edit" && (
        <div className="template-row" aria-label={text.templates}>
          {(Object.entries(templateLabels) as [AppState["activeTemplate"], string][]).map(([id, label]) => (
            <button key={id} className={props.state.activeTemplate === id ? "active" : ""} onClick={() => props.applyTemplate(id)}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="exercise-library plan-list">
        {props.state.workoutExercises.map((exercise, index) => (
          <div key={exercise.id} className={index === props.state.activeExerciseIndex ? "active" : ""}>
            <span>{index + 1}</span>
            <button className="exercise-select" onClick={() => props.selectExercise(exercise.id)}>
              <strong>{exercise.name}</strong>
              <em>
                {muscleGroupLabel(exercise.muscleGroup)} - {exercise.targetSets} x {exercise.targetRepsMin}-{exercise.targetRepsMax}
              </em>
            </button>
            {props.routineMode === "edit" && (
              <>
                <div className="row-actions">
                  <button onClick={() => props.moveExercise(exercise.id, -1)} aria-label={text.moveUp}>
                    {"\u2191"}
                  </button>
                  <button onClick={() => props.moveExercise(exercise.id, 1)} aria-label={text.moveDown}>
                    {"\u2193"}
                  </button>
                  <ConfirmActionButton
                    className="danger-button"
                    label={text.deleteExercise}
                    confirmLabel={text.confirmDelete}
                    ariaLabel={text.deleteExercise}
                    onConfirm={() => props.deleteExercise(exercise.id)}
                  >
                    <Trash2 size={14} />
                  </ConfirmActionButton>
                </div>
                <div className="exercise-edit-grid">
                  <label>
                    <span>{text.name}</span>
                    <input value={exercise.name} onChange={(event) => props.updateExerciseTarget(exercise.id, { name: event.target.value })} />
                  </label>
                  <label>
                    <span>{text.muscleGroup}</span>
                    <input value={exercise.muscleGroup} onChange={(event) => props.updateExerciseTarget(exercise.id, { muscleGroup: event.target.value })} />
                  </label>
                  <label>
                    <span>{text.sets}</span>
                    <input type="number" min="1" max="10" value={exercise.targetSets} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetSets: Number(event.target.value) })} />
                  </label>
                  <label>
                    <span>{text.minReps}</span>
                    <input type="number" min="1" max="50" value={exercise.targetRepsMin} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetRepsMin: Number(event.target.value) })} />
                  </label>
                  <label>
                    <span>{text.maxReps}</span>
                    <input type="number" min="1" max="50" value={exercise.targetRepsMax} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetRepsMax: Number(event.target.value) })} />
                  </label>
                  <label>
                    <span>Kg</span>
                    <input type="number" min="0" step="0.5" value={exercise.targetWeightKg} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetWeightKg: Number(event.target.value) })} />
                  </label>
                  <label>
                    <span>{text.rest}</span>
                    <input type="number" min="15" step="15" value={exercise.restSeconds} onChange={(event) => props.updateExerciseTarget(exercise.id, { restSeconds: Number(event.target.value) })} />
                  </label>
                  <label>
                    <span>{text.superset}</span>
                    <input value={exercise.supersetGroup ?? ""} onChange={(event) => props.updateExerciseTarget(exercise.id, { supersetGroup: event.target.value.trim() || undefined })} placeholder="A1" />
                  </label>
                  <div className="wide-field previous-session-readout">
                    <span>{text.previous}</span>
                    <strong>{exercise.lastSession}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {props.routineMode === "edit" && (
        <div className="inline-form">
          <input value={props.newExerciseName} onChange={(event) => props.setNewExerciseName(event.target.value)} aria-label={text.newExerciseName} />
          <button className="secondary-button" onClick={props.addExercise}>
            {text.addExercise}
          </button>
        </div>
      )}
    </section>
  );
}
