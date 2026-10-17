"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import React, { useState } from "react";

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
      ? "Màn hình đang được giữ sáng trong lúc tập."
      : props.wakeLockStatus === "unsupported"
        ? "Trình duyệt không hỗ trợ wake lock; hãy tăng thời gian sáng màn hình khi tập."
        : props.wakeLockStatus === "failed"
          ? "Không bật được wake lock, nhưng bạn vẫn có thể tiếp tục tập."
          : "Đang kiểm tra wake lock.";

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">An toàn buổi tập</p>
          <h2>Thao tác nhanh</h2>
        </div>
        <AlertTriangle size={20} />
      </div>
      <p className="form-warning">{wakeLockCopy}</p>
      {props.undoAvailable && (
        <p className="progress-copy">
          <RotateCcw size={14} /> Có thể hoàn tác thao tác gần nhất từ thông báo.
        </p>
      )}
      {finishArmed && (
        <p className="form-warning" role="status" aria-live="polite">
          Bấm xác nhận trong 6 giây để kết thúc buổi tập.
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
