"use client";

import {
  buildBadgeSharePreview,
  buildWorkoutSummarySharePreview,
  estimatedOneRepMax,
  formatWeight,
  inputWeightToKg,
  isWorkingVolumeSet,
  workingSetVolumeKg,
  type BodyMetric,
  type BodyMetricChartDataset,
  type BodyMetricRangeDays,
  type ProgressDashboard,
  type ProgressReports,
  type RecommendationDecision,
  type RecommendationHistoryItem,
  type SharedPost,
  type WorkoutSet
} from "@evolvefit/shared";
import { Award, Dumbbell, Trash2, Trophy } from "lucide-react";
import React from "react";
import type { AppState } from "@evolvefit/shared";
import { ConfirmActionButton } from "../ui/confirm-action-button";
import { EmptyState, MetricCard } from "../ui/feedback";
import { BodyMetricCharts as ProgressBodyMetricCharts } from "./body-metric-charts";
import { ReportCard as ProgressReportCard, SharePreviewCard as ProgressSharePreviewCard } from "./progress-cards";

type ProgressPanel = "overview" | "training" | "body" | "coach" | "social";

function recommendationDecisionLabel(decision: RecommendationDecision["decision"]) {
  return decision === "accepted" ? "Đã chấp nhận" : "Đã từ chối";
}

function recommendationActionLabel(action: string) {
  if (action === "increase") return "tăng";
  if (action === "deload" || action === "reduce_load") return "giảm tải";
  if (action === "increase_weight") return "tăng tạ";
  if (action === "hold") return "giữ";
  return "giữ nguyên";
}

function audienceLabel(audience: SharedPost["audience"]) {
  if (audience === "private-friends") return "Bạn bè riêng tư";
  if (audience === "friends") return "Bạn bè";
  if (audience === "public") return "Công khai";
  return "Riêng tư";
}

function badgeStatusLabel(status: string) {
  if (status === "active") return "đang bật";
  if (status === "earned") return "đã đạt";
  if (status === "locked") return "đang khóa";
  if (status === "lost") return "đã mất";
  if (status === "disabled") return "đã tắt";
  return status;
}

function muscleGroupLabel(group: string) {
  const labels: Record<string, string> = {
    Chest: "Ngực",
    Back: "Lưng",
    Legs: "Chân",
    Shoulders: "Vai",
    Arms: "Tay",
    Core: "Core"
  };
  return labels[group] ?? group;
}

export function ProgressView(props: {
  totalWater: number;
  target: number;
  sets: WorkoutSet[];
  bestSet?: WorkoutSet;
  progress: ProgressDashboard;
  reports: ProgressReports;
  achievements: { code: string; name: string; progress: number; target: number; status: string; streakMonths: number; condition?: string }[];
  bodyMetrics: BodyMetric[];
  bodyMetricChart: BodyMetricChartDataset;
  bodyMetricRange: BodyMetricRangeDays;
  setBodyMetricRange: (range: BodyMetricRangeDays) => void;
  bodyMetricWarnings: string[];
  unitWeight: AppState["profile"]["unitWeight"];
  updateProfile: (next: Partial<AppState["profile"]>) => void;
  latestMetric?: BodyMetric;
  weightDelta: number;
  newMetricWeight: number;
  setNewMetricWeight: (value: number) => void;
  newMetricBodyFat: number;
  setNewMetricBodyFat: (value: number) => void;
  newMetricWaist: number;
  setNewMetricWaist: (value: number) => void;
  newMetricChest: number;
  setNewMetricChest: (value: number) => void;
  newMetricArm: number;
  setNewMetricArm: (value: number) => void;
  newMetricThigh: number;
  setNewMetricThigh: (value: number) => void;
  newMetricNote: string;
  setNewMetricNote: (value: string) => void;
  addBodyMetric: () => void;
  deleteBodyMetric: (id: string) => void;
  updateBodyMetric: (id: string, patch: Partial<BodyMetric>) => void;
  coachRecommendation: RecommendationHistoryItem;
  coachFeedback: string;
  setCoachFeedback: (value: string) => void;
  recommendationHistory: RecommendationHistoryItem[];
  recommendationDecisions: RecommendationDecision[];
  decideRecommendation: (decision: "accepted" | "rejected") => void;
  socialLeaderboard: { visible: boolean; entries: { rank: number; displayName: string; score: number; badgeStreakMonths: number }[] };
  badgeSharePreview: ReturnType<typeof buildBadgeSharePreview>;
  workoutSummarySharePreview: ReturnType<typeof buildWorkoutSummarySharePreview>;
  sharedPosts: SharedPost[];
  publishSocialShare: (kind: SharedPost["kind"]) => void;
  downloadExport: () => void;
  downloadReportPdf: (period: keyof ProgressReports) => void;
}) {
  const volume = workingSetVolumeKg(props.sets);
  const oneRm = props.bestSet ? estimatedOneRepMax(props.bestSet.actualWeightKg, props.bestSet.actualReps) : 0;
  const completedExercises = new Set(props.sets.filter(isWorkingVolumeSet).map((set) => set.exerciseId)).size;
  const maxWeeklyVolume = Math.max(1, ...props.progress.weeklyVolume.map((bucket) => bucket.volumeKg));
  const maxMuscleVolume = Math.max(1, ...props.progress.volumeByMuscleGroup.map((bucket) => bucket.volumeKg));
  const coachPoints = [props.coachRecommendation.reason, ...props.coachRecommendation.dataBasis, props.coachRecommendation.guardrail]
    .flatMap((text) => text.split(/(?<=[.!?])\s+/).filter(Boolean))
    .slice(0, 4);
  const hydrationBars = Array.from({ length: 7 }, (_, index) => {
    const hitDay = index < props.progress.hydration7.hitDays;
    return {
      label: `D${index + 1}`,
      height: hitDay ? 100 : Math.max(12, Math.min(100, (props.progress.hydration7.averageMl / Math.max(1, props.target)) * 100)),
      hitDay
    };
  });
  const [showTrainingDetails, setShowTrainingDetails] = React.useState(false);
  const [showProgressReports, setShowProgressReports] = React.useState(false);
  const [showBadgeDetails, setShowBadgeDetails] = React.useState(false);
  const [showCoachDetails, setShowCoachDetails] = React.useState(false);
  const [showCoachFeedback, setShowCoachFeedback] = React.useState(false);
  const [showBodyForm, setShowBodyForm] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<ProgressPanel>("overview");
  const progressPanels: { id: ProgressPanel; label: string }[] = [
    { id: "overview", label: "Tổng quan" },
    { id: "training", label: "Tập luyện" },
    { id: "body", label: "Cơ thể" },
    { id: "coach", label: "Coach" },
    { id: "social", label: "Chia sẻ" }
  ];

  return (
    <div className="stack progress-screen">
      <nav className="segmented-control progress-tabs" aria-label="Nhóm dữ liệu tiến độ">
        {progressPanels.map((panel) => (
          <button key={panel.id} className={activePanel === panel.id ? "active" : ""} onClick={() => setActivePanel(panel.id)}>
            {panel.label}
          </button>
        ))}
      </nav>

      {activePanel === "overview" && (
        <>
          <section className="stats-grid progress-summary">
            <MetricCard label="Nước hôm nay" value={`${props.totalWater}/${props.target}ml`} accent="hydration" />
            <MetricCard icon={<Dumbbell size={19} />} label="Buổi tập 7n/30n" value={`${props.progress.workoutCount7}/${props.progress.workoutCount30}`} accent="training" />
            <MetricCard label="e1RM tốt nhất" value={oneRm ? `${oneRm}kg` : "Chưa có"} accent="coach" />
            <MetricCard label="Cân nặng" value={props.latestMetric ? `${props.latestMetric.weightKg}kg` : "Chưa có"} accent="neutral" />
          </section>

          <section className="card">
            <h2>Xu hướng 7 ngày</h2>
            <div className="bar-chart labeled-chart" aria-label="Biểu đồ tiến độ">
              {hydrationBars.map((bar) => (
                <span key={bar.label} className={bar.hitDay ? "hit" : ""} style={{ height: `${bar.height}%` }}>
                  <em>{bar.label}</em>
                </span>
              ))}
            </div>
          </section>

          <section className="card progress-detail-card">
            <div className="section-heading">
              <h2>Xu hướng nước</h2>
              <span className="sync-pill">{props.totalWater}/{props.target}ml hôm nay</span>
            </div>
            <div className="progress-kpi-grid">
              <div>
                <span>Trung bình 7 ngày</span>
                <strong>{props.progress.hydration7.averageMl}ml</strong>
                <em>{props.progress.hydration7.hitDays}/7 ngày đạt mục tiêu</em>
              </div>
              <div>
                <span>Trung bình 30 ngày</span>
                <strong>{props.progress.hydration30.averageMl}ml</strong>
                <em>{props.progress.hydration30.goalHitRate}% đạt mục tiêu</em>
              </div>
              {props.progress.creatineConsistency && (
                <div>
                  <span>Độ đều creatine</span>
                  <strong>{props.progress.creatineConsistency.consistencyRate}%</strong>
                  <em>{props.progress.creatineConsistency.takenDays}/30 ngày</em>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {(activePanel === "overview" || activePanel === "coach") && (
        <section className="card coach-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Coach có kiểm soát</p>
              <h2>{props.coachRecommendation.title}</h2>
            </div>
            <span className="sync-pill">{props.coachRecommendation.aiEligible ? props.coachRecommendation.mode : "ưu tiên luật"}</span>
          </div>
          <ul className="coach-bullets">
            {coachPoints.slice(0, 2).map((point) => <li key={point}>{point}</li>)}
          </ul>
          <div className="setting-row">
            <span>Hành động gợi ý</span>
            <strong>{props.coachRecommendation.suggestedAction}</strong>
          </div>
          <div className="split-actions">
            <button className="secondary-button" onClick={() => setShowCoachDetails(!showCoachDetails)} aria-expanded={showCoachDetails}>
              {showCoachDetails ? "Ẩn dữ liệu Coach" : "Xem dữ liệu dùng"}
            </button>
            <button className="secondary-button" onClick={() => setShowCoachFeedback(!showCoachFeedback)} aria-expanded={showCoachFeedback}>
              {showCoachFeedback ? "Ẩn phản hồi" : "Thêm phản hồi"}
            </button>
          </div>
          {showCoachDetails && (
            <>
              <ul className="coach-bullets">
                {props.coachRecommendation.dataBasis.map((point) => <li key={point}>{point}</li>)}
              </ul>
              {props.coachRecommendation.detectedSignals?.length ? (
                <div className="chip-row" aria-label="Tín hiệu Coach V2">
                  {props.coachRecommendation.detectedSignals.map((signal) => <span key={signal} className="tiny-chip">{signal}</span>)}
                </div>
              ) : null}
              <p className="privacy-note">{props.coachRecommendation.guardrail}</p>
              {!props.coachRecommendation.aiEligible && (
                <p className="privacy-note">Gợi ý AI sẽ ẩn cho đến khi bài này có ít nhất 3 set chính hữu ích. Coach theo luật vẫn luôn khả dụng trước.</p>
              )}
            </>
          )}
          {showCoachFeedback && (
            <label className="setting-row">
              <span>Phản hồi</span>
              <input value={props.coachFeedback} onChange={(event) => props.setCoachFeedback(event.target.value)} placeholder="Quá nặng, đã áp dụng, chưa phù hợp..." />
            </label>
          )}
          <div className="coach-actions">
            <button className="primary-button" onClick={() => props.decideRecommendation("accepted")}>Chấp nhận</button>
            <button className="secondary-button" onClick={() => props.decideRecommendation("rejected")}>Từ chối</button>
          </div>
        </section>
      )}

      {(activePanel === "coach" || props.recommendationDecisions.length > 0) && (
        <section className="card">
          <h2>Lịch sử gợi ý</h2>
          <div className="timeline compact">
            {props.recommendationDecisions.length ? (
              props.recommendationDecisions.slice(0, 6).map((decision) => (
                <div key={decision.id}>
                  <span>{new Date(decision.decidedAt).toLocaleDateString("vi-VN")}</span>
                  <strong>{recommendationDecisionLabel(decision.decision)}</strong>
                  <em>{decision.title} - {recommendationActionLabel(decision.action)} tới {decision.nextWeightKg}kg{decision.feedback ? ` - ${decision.feedback}` : ""}</em>
                </div>
              ))
            ) : (
              <p>Chưa có phản hồi gợi ý.</p>
            )}
          </div>
        </section>
      )}

      {activePanel === "training" && (
        <>
          <button className="secondary-button disclosure-toggle" onClick={() => setShowProgressReports(!showProgressReports)} aria-expanded={showProgressReports}>
            {showProgressReports ? "Ẩn báo cáo tuần/tháng" : "Mở báo cáo tuần/tháng"}
          </button>
          {showProgressReports && (
            <section className="report-grid" aria-label="Báo cáo tuần và tháng">
              <ProgressReportCard title="Báo cáo tuần" report={props.reports.weekly} onExportPdf={() => props.downloadReportPdf("weekly")} />
              <ProgressReportCard title="Báo cáo tháng" report={props.reports.monthly} onExportPdf={() => props.downloadReportPdf("monthly")} />
            </section>
          )}

          <button className="secondary-button disclosure-toggle" onClick={() => setShowTrainingDetails(!showTrainingDetails)} aria-expanded={showTrainingDetails}>
            {showTrainingDetails ? "Ẩn chi tiết tập luyện" : "Mở chi tiết tập luyện"}
          </button>
          {showTrainingDetails && (
            <>
              <section className="card chart-card">
                <div className="section-heading">
                  <h2>Volume theo tuần</h2>
                  <span className="sync-pill">{completedExercises} bài</span>
                </div>
                {props.progress.weeklyVolume.length ? (
                  <div className="bar-chart training-chart" aria-label="Biểu đồ volume tập luyện theo tuần">
                    {props.progress.weeklyVolume.slice(-6).map((bucket) => (
                      <span key={bucket.label} title={`${bucket.label}: ${bucket.volumeKg}kg`} style={{ height: `${Math.max(8, (bucket.volumeKg / maxWeeklyVolume) * 100)}%` }} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Chưa có volume tuần" text="Hoàn tất set chính để tạo volume theo tuần." />
                )}
                <p className="chart-note">{volume ? `Đã ghi ${Math.round(volume)}kg tổng volume set chính.` : "Set bỏ qua không tính vào volume."}</p>
              </section>

              <section className="card progress-detail-card">
                <div className="section-heading">
                  <h2>Volume theo nhóm cơ</h2>
                  <span className="sync-pill">chỉ set chính</span>
                </div>
                {props.progress.volumeByMuscleGroup.length ? (
                  <div className="progress-list">
                    {props.progress.volumeByMuscleGroup.map((bucket) => (
                      <div key={bucket.label}>
                        <span>{muscleGroupLabel(bucket.label)}</span>
                        <strong>{bucket.volumeKg}kg</strong>
                        <i style={{ width: `${Math.max(8, (bucket.volumeKg / maxMuscleVolume) * 100)}%` }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Chưa có phân bổ nhóm cơ" text="Ghi set chính trong lịch tập để xem volume theo nhóm cơ." />
                )}
              </section>
            </>
          )}
        </>
      )}

      {activePanel === "body" && (
        <section className="card">
          <div className="section-heading">
            <h2>Chỉ số cơ thể</h2>
            <span className="sync-pill">{props.weightDelta >= 0 ? "+" : ""}{formatWeight(props.weightDelta, props.unitWeight)}</span>
          </div>
          <ProgressBodyMetricCharts dataset={props.bodyMetricChart} range={props.bodyMetricRange} setRange={props.setBodyMetricRange} />
          <div className="metric-goals">
            <label>
              <span>Mục tiêu cân nặng ({props.unitWeight})</span>
              <input type="number" step="0.1" value={props.bodyMetricChart.weightGoal ?? ""} onChange={(event) => props.updateProfile({ goalWeightKg: event.target.value ? inputWeightToKg(Number(event.target.value), props.unitWeight) : undefined })} />
            </label>
            <label>
              <span>Mục tiêu mỡ cơ thể (%)</span>
              <input type="number" min="0" max="70" step="0.1" value={props.bodyMetricChart.bodyFatGoal ?? ""} onChange={(event) => props.updateProfile({ goalBodyFatPercent: event.target.value ? Number(event.target.value) : undefined })} />
            </label>
          </div>
          {props.bodyMetricWarnings.length > 0 && <div className="warning-list" role="alert">{props.bodyMetricWarnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}
          <button className="secondary-button disclosure-toggle" onClick={() => setShowBodyForm(!showBodyForm)} aria-expanded={showBodyForm}>
            {showBodyForm ? "Ẩn form chỉ số" : "Thêm chỉ số cơ thể"}
          </button>
          {showBodyForm && (
            <div className="metric-form">
              <label><span>Cân nặng ({props.unitWeight})</span><input type="number" step="0.1" value={props.newMetricWeight} onChange={(event) => props.setNewMetricWeight(Number(event.target.value))} /></label>
              <label><span>Mỡ cơ thể</span><input type="number" step="0.1" value={props.newMetricBodyFat} onChange={(event) => props.setNewMetricBodyFat(Number(event.target.value))} /></label>
              <label><span>Eo</span><input type="number" step="0.1" value={props.newMetricWaist} onChange={(event) => props.setNewMetricWaist(Number(event.target.value))} /></label>
              <label><span>Ngực</span><input type="number" step="0.1" value={props.newMetricChest} onChange={(event) => props.setNewMetricChest(Number(event.target.value))} /></label>
              <label><span>Tay</span><input type="number" step="0.1" value={props.newMetricArm} onChange={(event) => props.setNewMetricArm(Number(event.target.value))} /></label>
              <label><span>Đùi</span><input type="number" step="0.1" value={props.newMetricThigh} onChange={(event) => props.setNewMetricThigh(Number(event.target.value))} /></label>
              <label className="wide-field"><span>Ghi chú</span><input value={props.newMetricNote} onChange={(event) => props.setNewMetricNote(event.target.value)} /></label>
              <button className="secondary-button" onClick={props.addBodyMetric}>Lưu metric</button>
            </div>
          )}
          <div className="timeline compact">
            {props.bodyMetrics.slice().reverse().map((metric) => (
              <div key={metric.id}>
                <span>{new Date(metric.measuredAt).toLocaleDateString("vi-VN")}</span>
                <strong>{formatWeight(metric.weightKg, props.unitWeight)}</strong>
                <em>{metric.bodyFatPercent ?? "-"}% - Eo {metric.waistCm ?? "-"}</em>
                <div className="row-actions">
                  <button onClick={() => props.updateBodyMetric(metric.id, { weightKg: Math.round((metric.weightKg - 0.1) * 10) / 10 })}>-0.1</button>
                  <button onClick={() => props.updateBodyMetric(metric.id, { weightKg: Math.round((metric.weightKg + 0.1) * 10) / 10 })}>+0.1</button>
                </div>
                <ConfirmActionButton className="icon-mini danger danger-button" label="Xóa chỉ số cơ thể" confirmLabel="Xác nhận xóa" ariaLabel="Xóa chỉ số cơ thể" onConfirm={() => props.deleteBodyMetric(metric.id)}>
                  <Trash2 size={14} />
                </ConfirmActionButton>
              </div>
            ))}
          </div>
        </section>
      )}

      {activePanel === "social" && (
        <>
          <section className="card">
            <div className="section-heading">
              <h2>Bảng xếp hạng bạn bè riêng tư</h2>
              <span className="sync-pill">{props.socialLeaderboard.visible ? "nhóm riêng tư" : "tắt"}</span>
            </div>
            {props.socialLeaderboard.visible ? (
              <div className="leaderboard">
                {props.socialLeaderboard.entries.map((entry) => <div key={entry.displayName}><span>#{entry.rank}</span><strong>{entry.displayName}</strong><em>{entry.score} điểm - streak {entry.badgeStreakMonths}</em></div>)}
              </div>
            ) : (
              <p className="privacy-note">Bảng xếp hạng bạn bè đang riêng tư và tắt cho đến khi bạn bật trong Cài đặt.</p>
            )}
          </section>
          <section className="card">
            <h2>Chia sẻ với bạn bè</h2>
            <div className="settings-inline-grid">
              <ProgressSharePreviewCard title="Chia sẻ huy hiệu" preview={props.badgeSharePreview} onPublish={() => props.publishSocialShare("badge")} />
              <ProgressSharePreviewCard title="Chia sẻ tóm tắt tập luyện" preview={props.workoutSummarySharePreview} onPublish={() => props.publishSocialShare("workout-summary")} />
            </div>
            <p className="privacy-note">Thẻ chia sẻ sẽ ẩn cân nặng, mỡ cơ thể, email và chi tiết buổi tập trừ khi quyền tương ứng được bật.</p>
            <div className="timeline compact">
              {props.sharedPosts.slice(0, 4).map((post) => <div key={post.id}><span>{audienceLabel(post.audience)}</span><strong>{post.title}</strong><em>{new Date(post.publishedAt).toLocaleDateString("vi-VN")}</em></div>)}
              {!props.sharedPosts.length && <EmptyState title="Chưa có bài chia sẻ" text="Chia sẻ huy hiệu hoặc tóm tắt buổi tập khi bạn muốn công khai tiến độ." />}
            </div>
          </section>
          <button className="secondary-button disclosure-toggle" onClick={() => setShowBadgeDetails(!showBadgeDetails)} aria-expanded={showBadgeDetails}>
            {showBadgeDetails ? "Ẩn huy hiệu & xuất dữ liệu" : "Mở huy hiệu & xuất dữ liệu"}
          </button>
          {showBadgeDetails && (
            <section className="card">
              <h2>Huy hiệu</h2>
              <div className="badge-list">
                {props.achievements.filter((badge) => badge.status !== "disabled").map((badge) => (
                  <div key={badge.code}>
                    <Trophy size={20} />
                    <div><strong>{badge.name}</strong>{badge.condition && <p>{badge.condition}</p>}<p>{badge.progress}/{badge.target} - {badgeStatusLabel(badge.status)} - streak {badge.streakMonths}</p></div>
                  </div>
                ))}
              </div>
              <div className="insight-card">
                <Award size={18} />
                <div><strong>Gợi ý tiến độ</strong><p>Uống nước đều và ghi set tập sẽ mở khóa dữ liệu xu hướng tuần tốt hơn.</p></div>
              </div>
              <button className="secondary-button export-button" onClick={props.downloadExport}>Xuất JSON</button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
