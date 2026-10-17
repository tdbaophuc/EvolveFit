"use client";

import { RotateCcw } from "lucide-react";
import React from "react";

export function RestTimerCard(props: {
  restSeconds: number;
  restPaused: boolean;
  resetRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
}) {
  const timerText = props.restSeconds > 0 ? `${Math.floor(props.restSeconds / 60)}:${String(props.restSeconds % 60).padStart(2, "0")}` : "Sẵn sàng";
  const statusText = props.restPaused ? "Tạm dừng" : props.restSeconds > 0 ? "Đang đếm ngược" : "Sẵn sàng set tiếp theo";

  return (
    <section className="rest-card card">
      <div>
        <p className="eyebrow">Đồng hồ nghỉ</p>
        <strong>{timerText}</strong>
        <p>{statusText}</p>
      </div>
      <div className="rest-controls">
        <button onClick={props.resetRestTimer} aria-label="Đặt lại timer">
          <RotateCcw size={16} />
        </button>
        <button onClick={() => props.adjustRestTimer(-15)} aria-label="Giảm 15 giây">
          -15
        </button>
        <button
          className="primary"
          onClick={props.restPaused ? props.resumeRestTimer : props.pauseRestTimer}
          aria-label={props.restPaused ? "Tiếp tục timer" : "Tạm dừng timer"}
        >
          {props.restPaused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={() => props.adjustRestTimer(15)} aria-label="Thêm 15 giây">
          +15
        </button>
      </div>
    </section>
  );
}
