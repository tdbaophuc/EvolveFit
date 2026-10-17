"use client";

import { Trash2 } from "lucide-react";
import type { WorkoutSet } from "@evolvefit/shared";
import React, { useState } from "react";
import { ConfirmActionButton } from "../ui/confirm-action-button";
import { EmptyState } from "../ui/feedback";
import { setTypeLabels } from "./workout-labels";

export function WorkoutSetHistoryCard(props: {
  currentSessionSets: WorkoutSet[];
  updateWorkoutSet: (id: string, patch: Partial<WorkoutSet>) => void;
  deleteWorkoutSet: (id: string) => void;
}) {
  const [showSetHistory, setShowSetHistory] = useState(false);

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lịch sử tập</p>
          <h2>Set đã ghi</h2>
        </div>
        <span className="sync-pill">{props.currentSessionSets.length} set</span>
      </div>
      <button className="secondary-button disclosure-toggle" onClick={() => setShowSetHistory(!showSetHistory)} aria-expanded={showSetHistory}>
        {showSetHistory ? "Ẩn set đã ghi" : "Mở set đã ghi"}
      </button>
      {showSetHistory && (
        <div className="timeline compact">
          {props.currentSessionSets.length ? (
            props.currentSessionSets
              .slice()
              .reverse()
              .map((set) => (
                <div key={set.id}>
                  <span>{set.exerciseName}</span>
                  <strong>{set.actualReps === 0 ? "Đã bỏ qua" : `${set.actualWeightKg}kg x ${set.actualReps}`}</strong>
                  <em>
                    {setTypeLabels[set.setType ?? "working"]} - RPE {set.rpe ?? "-"}
                  </em>
                  <div className="row-actions">
                    <button onClick={() => props.updateWorkoutSet(set.id, { actualWeightKg: Math.max(0, set.actualWeightKg - 2.5) })} aria-label="Giảm kg set">
                      -kg
                    </button>
                    <button onClick={() => props.updateWorkoutSet(set.id, { actualWeightKg: set.actualWeightKg + 2.5 })} aria-label="Tăng kg set">
                      +kg
                    </button>
                    <button onClick={() => props.updateWorkoutSet(set.id, { actualReps: Math.max(0, set.actualReps - 1) })} aria-label="Giảm reps set">
                      -rep
                    </button>
                    <button onClick={() => props.updateWorkoutSet(set.id, { actualReps: set.actualReps + 1 })} aria-label="Tăng reps set">
                      +rep
                    </button>
                    <ConfirmActionButton
                      className="danger-button"
                      label="Xóa set"
                      confirmLabel="Xác nhận xóa"
                      ariaLabel="Xóa set"
                      onConfirm={() => props.deleteWorkoutSet(set.id)}
                    >
                      <Trash2 size={14} />
                    </ConfirmActionButton>
                  </div>
                </div>
              ))
          ) : (
            <EmptyState title="Chưa ghi set" text="Hoàn thành set hiện tại để tạo lịch sử buổi tập." />
          )}
        </div>
      )}
    </section>
  );
}
