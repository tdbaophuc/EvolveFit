import {
  cryptoSafeId,
  latestBodyMetric,
  publishSharePreview,
  validateBodyMetric,
  type BodyMetric,
  type ProgressReports,
  type RecommendationDecision,
  type RecommendationHistoryItem,
  type SharedPost
} from "@evolvefit/shared";
import { commit, commitSynced, currentState, notify } from "@/lib/store/app-store";
import { selectProgress } from "./selectors";

export type BodyMetricInput = Pick<BodyMetric, "weightKg" | "bodyFatPercent" | "waistCm" | "chestCm" | "armCm" | "thighCm"> & { note?: string };

export function addBodyMetric(input: BodyMetricInput): boolean {
  const state = currentState();
  const warnings = validateBodyMetric(input);
  if (warnings.length) {
    notify(warnings[0]);
    return false;
  }
  const metric: BodyMetric = {
    id: cryptoSafeId(),
    measuredAt: new Date().toISOString(),
    weightKg: input.weightKg,
    heightCm: latestBodyMetric(state.bodyMetrics)?.heightCm ?? 174,
    bodyFatPercent: input.bodyFatPercent,
    waistCm: input.waistCm,
    chestCm: input.chestCm,
    armCm: input.armCm,
    thighCm: input.thighCm,
    note: input.note?.trim() || undefined
  };
  commitSynced({ ...state, bodyMetrics: [...state.bodyMetrics, metric] }, "bodyMetric.create", metric, "Đã lưu chỉ số cơ thể");
  return true;
}

export function deleteBodyMetric(id: string) {
  const state = currentState();
  commitSynced({ ...state, bodyMetrics: state.bodyMetrics.filter((metric) => metric.id !== id) }, "bodyMetric.delete", { id }, "Đã xóa chỉ số cơ thể");
}

export function updateBodyMetric(id: string, patch: Partial<BodyMetric>) {
  const state = currentState();
  const current = state.bodyMetrics.find((metric) => metric.id === id);
  if (!current) return;
  const warnings = validateBodyMetric({ ...current, ...patch });
  if (warnings.length) {
    notify(warnings[0]);
    return;
  }
  commitSynced(
    { ...state, bodyMetrics: state.bodyMetrics.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric)) },
    "bodyMetric.patch",
    { id, patch },
    "Đã cập nhật chỉ số cơ thể"
  );
}

export function decideRecommendation(recommendation: RecommendationHistoryItem, decision: "accepted" | "rejected", feedbackText: string) {
  const state = currentState();
  const feedback = feedbackText.trim() || undefined;
  const decisionRecord: RecommendationDecision = {
    id: cryptoSafeId(),
    recommendationId: recommendation.id,
    title: recommendation.title,
    source: recommendation.source,
    action: recommendation.action,
    nextWeightKg: recommendation.nextWeightKg,
    decision,
    reason: recommendation.reason,
    feedback,
    decidedAt: new Date().toISOString()
  };
  const historyItem: RecommendationHistoryItem = { ...recommendation, status: decision, feedback };
  commit(
    {
      ...state,
      recommendationHistory: [historyItem, ...state.recommendationHistory.filter((item) => item.id !== recommendation.id)].slice(0, 50),
      recommendationDecisions: [decisionRecord, ...state.recommendationDecisions]
    },
    decision === "accepted" ? "Đã áp dụng gợi ý" : "Đã từ chối gợi ý"
  );
}

export function publishSocialShare(kind: SharedPost["kind"]) {
  const state = currentState();
  const { badgeSharePreview, workoutSummarySharePreview } = selectProgress(state, new Date());
  const post = publishSharePreview(kind === "badge" ? badgeSharePreview : workoutSummarySharePreview, state.socialPrivacy);
  if (!post) {
    notify("Bật quyền chia sẻ tương ứng trước khi đăng.");
    return;
  }
  commitSynced({ ...state, sharedPosts: [post, ...state.sharedPosts] }, "social.share.publish", post, "Đã chia sẻ với bạn bè riêng tư");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const signed = (value: number, unit = "") => `${value >= 0 ? "+" : ""}${value}${unit}`;

export function downloadReportPdf(period: keyof ProgressReports) {
  const report = selectProgress(currentState(), new Date()).progressReports[period];
  const badgeRows = report.badges
    .filter((badge) => badge.status !== "disabled")
    .map((badge) => `<li><strong>${escapeHtml(badge.name)}</strong>: ${badge.progress}/${badge.target} - ${badge.status} - streak ${badge.streakMonths}</li>`)
    .join("");
  const prRows = report.prs
    .slice(0, 8)
    .map((pr) => `<li><strong>${escapeHtml(pr.exerciseName)}</strong>: ${pr.maxWeightKg}kg max, ${pr.estimatedOneRepMaxKg}kg e1RM, ${pr.volumePrKg}kg volume PR</li>`)
    .join("");
  const html = `<!doctype html>
    <html>
      <head>
        <title>EvolveFit ${report.period} report</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
          h1 { margin-bottom: 4px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0; }
          .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; }
          span { color: #6b7280; font-size: 12px; text-transform: uppercase; }
          strong { display: block; font-size: 22px; margin-top: 4px; }
          li { margin: 8px 0; }
        </style>
      </head>
      <body>
        <h1>Báo cáo ${report.period === "weekly" ? "tuần" : "tháng"} EvolveFit</h1>
        <p>${report.periodStart} đến ${report.periodEnd}</p>
        <div class="grid">
          <div class="card"><span>Nước trung bình</span><strong>${report.hydrationAverageMl}ml</strong></div>
          <div class="card"><span>Tỷ lệ đạt mục tiêu</span><strong>${report.hydrationGoalHitRate}%</strong></div>
          <div class="card"><span>Số buổi tập</span><strong>${report.workoutCount}</strong></div>
          <div class="card"><span>Tổng volume</span><strong>${report.totalVolumeKg}kg</strong></div>
        </div>
        <h2>Xu hướng so với kỳ trước</h2>
        <ul>
          <li>Nước trung bình: ${signed(report.trendVsPrevious.hydrationAverageMl, "ml")}</li>
          <li>Tỷ lệ đạt mục tiêu: ${signed(report.trendVsPrevious.goalHitRate, "%")}</li>
          <li>Số buổi tập: ${signed(report.trendVsPrevious.workoutCount)}</li>
          <li>Tổng volume: ${signed(report.trendVsPrevious.totalVolumeKg, "kg")}</li>
        </ul>
        <h2>PR</h2>
        <ul>${prRows || "<li>Không có PR trong kỳ này.</li>"}</ul>
        <h2>Huy hiệu</h2>
        <ul>${badgeRows || "<li>Không có dữ liệu huy hiệu đang bật trong kỳ này.</li>"}</ul>
      </body>
    </html>`;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!popup) {
    window.print();
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}
