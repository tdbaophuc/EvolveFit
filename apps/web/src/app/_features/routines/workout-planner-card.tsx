"use client";

import { Trophy } from "lucide-react";
import type { WorkoutPlannerPreview } from "@evolvefit/shared";
import React from "react";

export function WorkoutPlannerCard(props: {
  workoutPlannerPreview: WorkoutPlannerPreview | null;
  previewWorkoutPlanner: () => void;
  applyWorkoutPlanner: () => void;
  clearWorkoutPlanner: () => void;
}) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Coach Planner V2</p>
          <h2>Gợi ý lịch rule-first</h2>
        </div>
        <Trophy size={20} />
      </div>
      <p>Tạo lịch theo mục tiêu, số buổi/tuần, thiết bị, kinh nghiệm và ràng buộc phục hồi trong hồ sơ.</p>
      <div className="split-actions">
        <button className="secondary-button" onClick={props.previewWorkoutPlanner}>Tạo preview</button>
        <button className="primary-button training-bg" onClick={props.applyWorkoutPlanner} disabled={!props.workoutPlannerPreview}>Áp dụng lịch</button>
        <button className="secondary-button" onClick={props.clearWorkoutPlanner} disabled={!props.workoutPlannerPreview}>Xóa preview</button>
      </div>
      {props.workoutPlannerPreview && (
        <div className="timeline compact">
          <div>
            <span>{props.workoutPlannerPreview.routine.name}</span>
            <strong>{props.workoutPlannerPreview.routine.days.length} ngày - {props.workoutPlannerPreview.routine.days.reduce((sum, day) => sum + day.exercises.length, 0)} bài</strong>
            <em>{props.workoutPlannerPreview.rationale.join(" | ")}</em>
          </div>
          {props.workoutPlannerPreview.routine.days.map((day) => (
            <div key={day.id}>
              <span>{day.day}</span>
              <strong>{day.name}</strong>
              <em>{day.exercises.map((exercise) => exercise.name).join(", ")}</em>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
