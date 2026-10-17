"use client";

import type { AppState, SessionExerciseQueueItem, WorkoutSession } from "@evolvefit/shared";
import React from "react";
import { muscleGroupLabel, sessionStatusLabel } from "./workout-labels";

export function SessionQueueCard(props: {
  state: AppState;
  sessionQueue: SessionExerciseQueueItem[];
  activeExercise: AppState["workoutExercises"][number];
  activeWorkoutSession?: WorkoutSession;
  showSessionQueue: boolean;
  setShowSessionQueue: (value: boolean) => void;
  selectExercise: (id: string) => void;
  reorderSessionExercise: (id: string, direction: -1 | 1) => void;
  saveWorkoutOrderToRoutine: () => void;
}) {
  const queueExercises = props.sessionQueue.flatMap((item) => {
    const exercise = props.state.workoutExercises.find((entry) => entry.id === item.exerciseId);
    return exercise ? [{ item, exercise }] : [];
  });
  const queuedCount = props.sessionQueue.filter((item) => item.status === "queued").length;
  const completedCount = props.sessionQueue.filter((item) => item.status === "completed").length;
  const parkedCount = props.sessionQueue.filter((item) => item.status === "parked").length;

  return (
    <section className="card">
      <div className="section-heading">
        <h2>Hàng đợi bài tập</h2>
        <span className="sync-pill">{props.activeWorkoutSession ? sessionStatusLabel(props.activeWorkoutSession.status) : "Chưa có buổi"}</span>
      </div>
      <div className="queue-summary" aria-label="Trạng thái hàng đợi buổi tập">
        <span>{queuedCount} còn lại</span>
        <span>{completedCount} hoàn tất</span>
        <span>{parkedCount} tạm dừng</span>
      </div>
      <button className="secondary-button disclosure-toggle" onClick={() => props.setShowSessionQueue(!props.showSessionQueue)} aria-expanded={props.showSessionQueue}>
        {props.showSessionQueue ? "Ẩn hàng đợi" : "Mở hàng đợi và sắp xếp"}
      </button>
      {props.showSessionQueue && (
        <>
          <div className="queue-list">
            {queueExercises.map(({ item, exercise }, index) => {
              const isActive = item.exerciseId === props.activeExercise.id;
              const statusLabel = item.status === "parked" ? "Tạm dừng" : item.status === "completed" ? "Hoàn tất" : "Còn lại";
              return (
                <div key={item.exerciseId} className={`queue-row ${isActive ? "active" : ""} ${item.status}`}>
                  <button className="queue-select" onClick={() => props.selectExercise(item.exerciseId)}>
                    <span>{index + 1}</span>
                    <strong>{exercise.name}</strong>
                    <em>
                      {muscleGroupLabel(exercise.muscleGroup)} - {statusLabel}
                    </em>
                  </button>
                  <div className="row-actions">
                    <button onClick={() => props.reorderSessionExercise(item.exerciseId, -1)} aria-label="Đưa bài trong buổi lên">
                      ↑
                    </button>
                    <button onClick={() => props.reorderSessionExercise(item.exerciseId, 1)} aria-label="Đưa bài trong buổi xuống">
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="secondary-button" onClick={props.saveWorkoutOrderToRoutine} disabled={!props.activeWorkoutSession}>
            Lưu thứ tự vào lịch tập
          </button>
        </>
      )}
    </section>
  );
}
