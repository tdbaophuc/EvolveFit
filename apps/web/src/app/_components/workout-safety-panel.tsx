"use client";

import React, { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type WakeLockStatus = "unknown" | "unsupported" | "active" | "failed";

export function WorkoutSafetyPanel(props: {
  skipCurrentSet: () => void;
  skipExercise: () => void;
  finishWorkout: () => void;
  hasActiveSession: boolean;
  undoAvailable: boolean;
  wakeLockStatus: WakeLockStatus;
}) {
  const [finishArmed, setFinishArmed] = useState(false);

  const finishLabel = finishArmed ? "Xác nhận kết thúc" : "Kết thúc";
  const wakeLockCopy =
    props.wakeLockStatus === "active"
      ? "Man hinh duoc giu sang trong luc tap."
      : props.wakeLockStatus === "unsupported"
        ? "Trinh duyet khong ho tro wake lock, hay tang timeout man hinh khi tap."
        : props.wakeLockStatus === "failed"
          ? "Khong bat duoc wake lock, van co the tiep tuc tap."
          : "Dang kiem tra wake lock.";

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live workout safety</p>
          <h2>Thao tac nhanh</h2>
        </div>
        <AlertTriangle size={20} />
      </div>
      <p className="form-warning">{wakeLockCopy}</p>
      {props.undoAvailable && (
        <p className="progress-copy">
          <RotateCcw size={14} /> Co the Undo thao tac gan nhat tu toast.
        </p>
      )}
      <div className="split-actions">
        <button className="secondary-button" onClick={props.skipCurrentSet} disabled={!props.hasActiveSession}>
          Bỏ qua set
        </button>
        <button className="secondary-button" onClick={props.skipExercise}>
          Bỏ qua bài
        </button>
        <button
          className={finishArmed ? "primary-button training-bg" : "secondary-button"}
          onClick={() => {
            if (!finishArmed) {
              setFinishArmed(true);
              window.setTimeout(() => setFinishArmed(false), 6000);
              return;
            }
            props.finishWorkout();
            setFinishArmed(false);
          }}
          disabled={!props.hasActiveSession}
        >
          {finishLabel}
        </button>
      </div>
    </section>
  );
}
