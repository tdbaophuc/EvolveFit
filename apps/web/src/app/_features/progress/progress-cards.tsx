"use client";

import React from "react";
import {
  buildBadgeSharePreview,
  buildWorkoutSummarySharePreview,
  type ProgressReports
} from "@evolvefit/shared";

function badgeStatusLabel(status: string) {
  if (status === "active") return "đang bật";
  if (status === "earned") return "đã đạt";
  if (status === "locked") return "đang khóa";
  if (status === "lost") return "đã mất";
  if (status === "disabled") return "đã tắt";
  return status;
}

export function SharePreviewCard(props: {
  title: string;
  preview: ReturnType<typeof buildBadgeSharePreview> | ReturnType<typeof buildWorkoutSummarySharePreview>;
  onPublish: () => void;
}) {
  return (
    <div className="share-preview-card">
      <strong>{props.title}</strong>
      {props.preview ? (
        <>
          <span>{props.preview.summary}</span>
          <em>Hiển thị: {props.preview.visibleFields.join(", ")}</em>
          <em>Đã ẩn: {props.preview.redactedFields.join(", ")}</em>
        </>
      ) : (
        <>
          <span>Chưa bật chia sẻ.</span>
          <em>Bật quyền chia sẻ trong Cài đặt trước khi đăng.</em>
        </>
      )}
      <button className="secondary-button" onClick={props.onPublish}>
        Đăng
      </button>
    </div>
  );
}

export function ReportCard(props: { title: string; report: ProgressReports[keyof ProgressReports]; onExportPdf: () => void }) {
  const trend = props.report.trendVsPrevious;
  const trendText = (value: number, suffix = "") => `${value >= 0 ? "+" : ""}${value}${suffix}`;
  return (
    <section className="card report-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{props.report.periodStart} - {props.report.periodEnd}</p>
          <h2>{props.title}</h2>
        </div>
        <button className="secondary-button export-button" onClick={props.onExportPdf}>
          Xuất PDF
        </button>
      </div>
      <div className="report-kpi-grid">
        <div>
          <span>Nước trung bình</span>
          <strong>{props.report.hydrationAverageMl}ml</strong>
          <em>{trendText(trend.hydrationAverageMl, "ml")}</em>
        </div>
        <div>
          <span>Đạt mục tiêu</span>
          <strong>{props.report.hydrationGoalHitRate}%</strong>
          <em>{trendText(trend.goalHitRate, "%")}</em>
        </div>
        <div>
          <span>Buổi tập</span>
          <strong>{props.report.workoutCount}</strong>
          <em>{trendText(trend.workoutCount)}</em>
        </div>
        <div>
          <span>Volume</span>
          <strong>{props.report.totalVolumeKg}kg</strong>
          <em>{trendText(trend.totalVolumeKg, "kg")}</em>
        </div>
      </div>
      <div className="report-list">
        <strong>PR</strong>
        <span>{props.report.prs.length ? props.report.prs.slice(0, 3).map((pr) => pr.exerciseName).join(", ") : "Không có PR trong kỳ này"}</span>
      </div>
      {props.report.badges.length > 0 && (
        <div className="report-list">
          <strong>Huy hiệu</strong>
          <span>{props.report.badges.filter((badge) => badge.status !== "disabled").map((badge) => `${badge.name}: ${badgeStatusLabel(badge.status)}`).join(", ") || "Đã ẩn vì module liên quan đang tắt"}</span>
        </div>
      )}
    </section>
  );
}
