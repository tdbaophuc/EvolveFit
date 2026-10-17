"use client";

import { Check, ChevronRight, Dumbbell, Plus, Waves } from "lucide-react";
import React from "react";
import type { BodyMetric } from "@evolvefit/shared";
import { EmptyState, MetricCard } from "../ui/feedback";

type TodayOverviewProps = {
  totalWater: number;
  percent: number;
  target: number;
  pace: "ahead" | "on-pace" | "behind";
  workoutName: string;
  workoutExerciseCount?: number;
  workoutProgressPercent?: number;
  setTab: (tab: "hydration" | "workout") => void;
  logWater: (amountMl: number, pin?: boolean, type?: "water") => void;
  creatineActive: boolean;
  creatineLogged: boolean;
  creatineAmount: number;
  logCreatine: (amount: number, pin?: boolean) => void;
  latestMetric?: BodyMetric;
  recentLogs: { id: string; amountMl: number; loggedAt: string }[];
};

const text = {
  today: "Hôm nay",
  nextAction: "Việc quan trọng nhất",
  startWorkout: "Bắt đầu tập",
  viewSchedule: "Xem lịch",
  localFirst: "Lưu trên máy trước",
  water: "Nước",
  details: "Chi tiết",
  creatine: "Creatine",
  logged: "Đã log",
  notLogged: "Chưa log",
  markTaken: "Đã uống",
  recent: "Hoạt động gần đây",
  noActivity: "Chưa có hoạt động",
  noActivityText: "Log nước hoặc bắt đầu buổi tập để lấp đầy dòng thời gian hôm nay.",
  bodyWeight: "Cân nặng",
  none: "Chưa có",
  done: "Xong",
  open: "Mở",
  setsToday: "Set hôm nay",
  workoutMode: "chế độ tập trung",
  exerciseUnit: "bài",
  quickWater: "Log nước nhanh",
  everyDay: "mỗi ngày"
};

export function TodayOverview(props: TodayOverviewProps) {
  const paceLabel = props.pace === "behind" ? "Chậm nhịp" : props.pace === "ahead" ? "Vượt nhịp" : "Đúng nhịp";
  const workoutPercent = props.workoutProgressPercent ?? 0;
  const exerciseCount = props.workoutExerciseCount ?? 0;

  return (
    <div className="stack today-overview production-today">
      <section className="today-hero-card" aria-label={text.nextAction}>
        <div className="today-hero-copy">
          <p className="eyebrow">{text.today}</p>
          <h1>{props.workoutName}</h1>
          <p>
            {exerciseCount || 3} {text.exerciseUnit} - {workoutPercent}% hoàn tất - {text.localFirst}
          </p>
        </div>
        <div className="today-hero-actions">
          <button className="primary-button" onClick={() => props.setTab("workout")}>
            <Dumbbell size={18} /> {text.startWorkout}
          </button>
          <button className="secondary-button dark-secondary" onClick={() => props.setTab("workout")}>
            {text.viewSchedule} <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <section className="daily-action-grid" aria-label="Daily actions">
        <article className="daily-action-card hydration-action">
          <div className="daily-action-head">
            <div className="action-icon"><Waves size={20} /></div>
            <div>
              <span>{text.water}</span>
              <strong>{props.totalWater.toLocaleString("vi-VN")} / {props.target.toLocaleString("vi-VN")} ml</strong>
            </div>
          </div>
          <div className="progress-track" aria-label={`${props.percent}% ${text.water}`}>
            <span style={{ width: `${Math.min(100, Math.max(0, props.percent))}%` }} />
          </div>
          <p>{props.percent}% - {paceLabel}</p>
          <div className="today-quick-actions" aria-label={text.quickWater}>
            <button onClick={() => props.logWater(250, false, "water")}>+250ml</button>
            <button onClick={() => props.logWater(500, false, "water")}>+500ml</button>
            <button onClick={() => props.setTab("hydration")}>{text.details}</button>
          </div>
        </article>

        {props.creatineActive && (
          <article className="daily-action-card supplement-action">
            <div className="daily-action-head">
              <div className="action-icon supplement-icon">{props.creatineLogged ? <Check size={20} /> : <Plus size={20} />}</div>
              <div>
                <span>{text.creatine}</span>
                <strong>{props.creatineLogged ? text.logged : text.notLogged}</strong>
              </div>
            </div>
            <p>{props.creatineAmount}g {text.everyDay}</p>
            <button className={props.creatineLogged ? "secondary-button" : "primary-button"} onClick={() => props.logCreatine(props.creatineAmount)}>
              {props.creatineLogged ? text.done : text.markTaken}
            </button>
          </article>
        )}
      </section>

      <section className="stats-grid">
        <MetricCard label={text.water} value={`${props.percent}%`} accent="hydration" />
        {props.creatineActive && <MetricCard label={text.creatine} value={props.creatineLogged ? text.done : text.open} accent="neutral" />}
        <MetricCard label={text.setsToday} value={`${exerciseCount} ${text.exerciseUnit}`} accent="training" />
        <MetricCard label={text.bodyWeight} value={props.latestMetric ? `${props.latestMetric.weightKg}kg` : text.none} accent="coach" />
      </section>

      <section className="card chart-card recent-activity-card">
        <div className="section-heading">
          <h2>{text.recent}</h2>
          <span className="sync-pill">{text.localFirst}</span>
        </div>
        <div className="timeline">
          {props.recentLogs.length ? (
            props.recentLogs.map((log) => (
              <div key={log.id}>
                <span>{new Date(log.loggedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                <strong>+{log.amountMl}ml</strong>
              </div>
            ))
          ) : (
            <EmptyState title={text.noActivity} text={text.noActivityText} />
          )}
        </div>
      </section>
    </div>
  );
}
