"use client";

import { Dumbbell, Trash2 } from "lucide-react";
import type { AppState, WorkoutExercise } from "@evolvefit/shared";
import React from "react";
import { ConfirmActionButton } from "../ui/confirm-action-button";
import { muscleGroupLabel, templateLabels, weekdays } from "../workout/workout-labels";

const text = {
  eyebrow: "Lịch đang dùng",
  title: "Chỉnh lịch tập",
  modeLabel: "Chế độ lịch tập",
  routineName: "Tên lịch tập",
  dayName: "Tên buổi",
  day: "Ngày",
  daysPerWeek: "Ngày/tuần",
  routine: "Lịch tập",
  noRoutine: "Chưa có lịch",
  currentDay: "Buổi đang xem",
  noDay: "Chưa chọn buổi",
  exerciseCount: "Số bài",
  workoutDays: "Ngày tập",
  addDay: "+ Ngày",
  deleteDay: "Xóa ngày",
  confirmDelete: "Xác nhận xóa",
  deleteWorkoutDay: "Xóa ngày tập",
  templates: "Mẫu lịch tập",
  moveUp: "Đưa bài tập lên",
  moveDown: "Đưa bài tập xuống",
  deleteExercise: "Xóa bài tập",
  name: "Tên",
  muscleGroup: "Nhóm cơ",
  sets: "Set",
  minReps: "Rep tối thiểu",
  maxReps: "Rep tối đa",
  rest: "Nghỉ",
  superset: "Nhóm superset",
  previous: "Lần trước",
  newExerciseName: "Tên bài tập mới",
  addExercise: "Thêm bài"
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
                    {"↑"}
                  </button>
                  <button onClick={() => props.moveExercise(exercise.id, 1)} aria-label={text.moveDown}>
                    {"↓"}
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
