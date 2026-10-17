"use client";

import { Trash2 } from "lucide-react";
import type { AppState, WorkoutExercise } from "@evolvefit/shared";
import React from "react";
import { ConfirmActionButton } from "../ui/confirm-action-button";
import { templateLabels } from "./workout-labels";

const text = {
  templates: "Mẫu lịch tập",
  decreaseWeight: "Giảm tạ mục tiêu",
  increaseWeight: "Tăng tạ mục tiêu",
  increaseRep: "Tăng rep mục tiêu",
  moveUp: "Đưa bài tập lên",
  moveDown: "Đưa bài tập xuống",
  deleteExercise: "Xóa bài tập",
  confirmDelete: "Xác nhận xóa",
  name: "Tên",
  muscleGroup: "Nhóm cơ",
  sets: "Set",
  minReps: "Rep tối thiểu",
  maxReps: "Rep tối đa",
  rest: "Nghỉ",
  superset: "Nhóm superset",
  previous: "Lần trước",
  newExercise: "Tên bài tập mới",
  addExercise: "Thêm bài"
};

export function LivePlanTools(props: {
  state: AppState;
  newExerciseName: string;
  setNewExerciseName: (value: string) => void;
  addExercise: () => void;
  deleteExercise: (id: string) => void;
  moveExercise: (id: string, direction: -1 | 1) => void;
  applyTemplate: (template: AppState["activeTemplate"]) => void;
  updateExerciseTarget: (id: string, patch: Partial<WorkoutExercise>) => void;
}) {
  return (
    <>
      <div className="template-row" aria-label={text.templates}>
        {(Object.entries(templateLabels) as [AppState["activeTemplate"], string][]).map(([id, label]) => (
          <button key={id} className={props.state.activeTemplate === id ? "active" : ""} onClick={() => props.applyTemplate(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="exercise-library">
        {props.state.workoutExercises.map((exercise, index) => (
          <div key={exercise.id} className={index === props.state.activeExerciseIndex ? "active" : ""}>
            <span>{index + 1}</span>
            <strong>{exercise.name}</strong>
            <em>{exercise.targetSets}x{exercise.targetRepsMin}-{exercise.targetRepsMax}</em>
            <div className="row-actions">
              <button onClick={() => props.updateExerciseTarget(exercise.id, { targetWeightKg: Math.max(0, exercise.targetWeightKg - 2.5) })} aria-label={text.decreaseWeight}>-kg</button>
              <button onClick={() => props.updateExerciseTarget(exercise.id, { targetWeightKg: exercise.targetWeightKg + 2.5 })} aria-label={text.increaseWeight}>+kg</button>
              <button onClick={() => props.updateExerciseTarget(exercise.id, { targetRepsMax: exercise.targetRepsMax + 1 })} aria-label={text.increaseRep}>+rep</button>
              <button onClick={() => props.moveExercise(exercise.id, -1)} aria-label={text.moveUp}>{"↑"}</button>
              <button onClick={() => props.moveExercise(exercise.id, 1)} aria-label={text.moveDown}>{"↓"}</button>
              <ConfirmActionButton className="danger-button" label={text.deleteExercise} confirmLabel={text.confirmDelete} ariaLabel={text.deleteExercise} onConfirm={() => props.deleteExercise(exercise.id)}>
                <Trash2 size={14} />
              </ConfirmActionButton>
            </div>
            <div className="exercise-edit-grid">
              <label><span>{text.name}</span><input value={exercise.name} onChange={(event) => props.updateExerciseTarget(exercise.id, { name: event.target.value })} /></label>
              <label><span>{text.muscleGroup}</span><input value={exercise.muscleGroup} onChange={(event) => props.updateExerciseTarget(exercise.id, { muscleGroup: event.target.value })} /></label>
              <label><span>{text.sets}</span><input type="number" min="1" max="10" value={exercise.targetSets} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetSets: Number(event.target.value) })} /></label>
              <label><span>{text.minReps}</span><input type="number" min="1" max="50" value={exercise.targetRepsMin} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetRepsMin: Number(event.target.value) })} /></label>
              <label><span>{text.maxReps}</span><input type="number" min="1" max="50" value={exercise.targetRepsMax} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetRepsMax: Number(event.target.value) })} /></label>
              <label><span>Kg</span><input type="number" min="0" step="0.5" value={exercise.targetWeightKg} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetWeightKg: Number(event.target.value) })} /></label>
              <label><span>{text.rest}</span><input type="number" min="15" step="15" value={exercise.restSeconds} onChange={(event) => props.updateExerciseTarget(exercise.id, { restSeconds: Number(event.target.value) })} /></label>
              <label><span>{text.superset}</span><input value={exercise.supersetGroup ?? ""} onChange={(event) => props.updateExerciseTarget(exercise.id, { supersetGroup: event.target.value.trim() || undefined })} placeholder="A1" /></label>
              <div className="wide-field previous-session-readout"><span>{text.previous}</span><strong>{exercise.lastSession}</strong></div>
            </div>
          </div>
        ))}
      </div>
      <div className="inline-form">
        <input value={props.newExerciseName} onChange={(event) => props.setNewExerciseName(event.target.value)} aria-label={text.newExercise} />
        <button className="secondary-button" onClick={props.addExercise}>{text.addExercise}</button>
      </div>
    </>
  );
}
