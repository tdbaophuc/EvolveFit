"use client";

import type { AppState } from "@evolvefit/shared";
import React from "react";
import { weekdays } from "../workout/workout-labels";

export function WeeklyScheduleCard(props: {
  activeRoutine?: AppState["routines"][number];
  activeWorkoutDay?: AppState["routines"][number]["days"][number];
  selectWorkoutDay: (id: string) => void;
}) {
  return (
    <section className="card">
      <div className="section-heading">
        <h2>Lịch tuần</h2>
        <span className="sync-pill">{props.activeRoutine?.daysPerWeek ?? props.activeRoutine?.days.length ?? 0} ngày/tuần</span>
      </div>
      <div className="week-strip">
        {weekdays.map(([day, label]) => {
          const planned = props.activeRoutine?.days.find((item) => item.day === day);
          return (
            <button
              key={day}
              className={planned?.id === props.activeWorkoutDay?.id ? "active" : planned ? "done" : ""}
              onClick={() => planned && props.selectWorkoutDay(planned.id)}
              disabled={!planned}
            >
              <strong>{label}</strong>
              <em>{planned?.name ?? "-"}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
