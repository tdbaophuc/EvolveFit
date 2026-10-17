"use client";

import type { WorkoutExercise, WorkoutSet } from "@evolvefit/shared";
import React from "react";
import { setTypeLabels } from "./workout-labels";

export function LiveSetProgressCard(props: {
  activeExercise: WorkoutExercise;
  completedSets: WorkoutSet[];
  allSetsForActive: WorkoutSet[];
}) {
  const warmupSets = props.allSetsForActive.filter((set) => (set.setType ?? "working") === "warmup");

  return (
    <section className="card">
      <h2>Set hiện tại</h2>
      {props.activeExercise.supersetGroup && <span className="sync-pill">Superset {props.activeExercise.supersetGroup}</span>}
      {warmupSets.length > 0 && (
        <div className="chip-row warmup-row" aria-label="Set khởi động đã hoàn tất">
          {warmupSets.map((set) => (
            <span key={set.id} className="tiny-chip">
              WU {set.actualWeightKg}kg x {set.actualReps}
            </span>
          ))}
        </div>
      )}
      <div className="set-table">
        {Array.from({ length: props.activeExercise.targetSets }).map((_, index) => {
          const done = props.completedSets[index];
          const isCurrent = index === props.completedSets.length;
          return (
            <div key={index} className={isCurrent ? "current" : ""}>
              <span>{done ? setTypeLabels[done.setType ?? "working"] : `Set ${index + 1}`}</span>
              <strong>
                {done
                  ? done.actualReps === 0
                    ? "Đã bỏ qua"
                    : `${done.actualWeightKg}kg x ${done.actualReps}`
                  : `${props.activeExercise.targetWeightKg}kg x ${props.activeExercise.targetRepsMin}`}
              </strong>
              <em>{done ? (done.actualReps === 0 ? "Đã bỏ qua" : `RPE ${done.rpe ?? "-"}`) : isCurrent ? "Đang tập" : "Đang chờ"}</em>
            </div>
          );
        })}
      </div>
    </section>
  );
}
