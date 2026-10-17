"use client";

import { Check } from "lucide-react";
import { workingSetVolumeKg, type WorkoutSet } from "@evolvefit/shared";
import React from "react";

export function FinishedWorkoutSummary(props: {
  currentSessionSets: WorkoutSet[];
  startWorkout: () => void;
  backToPlan: () => void;
}) {
  const totalVolume = workingSetVolumeKg(props.currentSessionSets);
  const completedExerciseCount = new Set(props.currentSessionSets.map((set) => set.exerciseId)).size;

  return (
    <div className="finish-workout">
      <div className="finish-icon">
        <Check size={38} />
      </div>
      <h1>Hoàn tất buổi tập</h1>
      <p>{props.currentSessionSets.length} set - {Math.round(totalVolume)}kg tổng volume - {completedExerciseCount} bài</p>
      <div className="finish-actions">
        <button className="primary-button training-bg" onClick={props.backToPlan}>Quay lại tập luyện</button>
        <button className="secondary-button" onClick={props.startWorkout}>Tập lại</button>
      </div>
    </div>
  );
}
