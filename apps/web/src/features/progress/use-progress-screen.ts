"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { buildBodyMetricChartDataset, displayWeight, inputWeightToKg, validateBodyMetric, type BodyMetricRangeDays } from "@evolvefit/shared";
import type { ProgressView } from "@/app/_features/progress/progress-view";
import { useAppStore } from "@/lib/store/app-store";
import { downloadExport, updateProfile } from "../settings/actions";
import { selectHydration } from "../hydration/selectors";
import { selectActiveRecommendation } from "../workout/selectors";
import { addBodyMetric, decideRecommendation, deleteBodyMetric, downloadReportPdf, publishSocialShare, updateBodyMetric } from "./actions";
import { selectProgress } from "./selectors";

export function useProgressScreen(): ComponentProps<typeof ProgressView> {
  const state = useAppStore((store) => store.state);
  const unit = state.profile.unitWeight;
  const [bodyMetricRange, setBodyMetricRange] = useState<BodyMetricRangeDays>(30);
  const [newMetricWeight, setNewMetricWeight] = useState(() => displayWeight(state.profile.bodyWeightKg, unit));
  const [newMetricBodyFat, setNewMetricBodyFat] = useState(18);
  const [newMetricWaist, setNewMetricWaist] = useState(82);
  const [newMetricChest, setNewMetricChest] = useState(96);
  const [newMetricArm, setNewMetricArm] = useState(34);
  const [newMetricThigh, setNewMetricThigh] = useState(56);
  const [newMetricNote, setNewMetricNote] = useState("");
  const [coachFeedback, setCoachFeedback] = useState("");

  useEffect(() => {
    setNewMetricWeight(displayWeight(state.profile.bodyWeightKg, unit));
  }, [state.profile.bodyWeightKg, unit]);

  const now = new Date();
  const progress = selectProgress(state, now);
  const coachRecommendation = selectActiveRecommendation(state, now);
  const metricInput = {
    weightKg: inputWeightToKg(newMetricWeight, unit),
    bodyFatPercent: newMetricBodyFat,
    waistCm: newMetricWaist,
    chestCm: newMetricChest,
    armCm: newMetricArm,
    thighCm: newMetricThigh
  };

  return {
    totalWater: selectHydration(state, now).totalWater,
    target: state.profile.waterTargetMl,
    sets: state.workoutSets,
    bestSet: progress.bestSet,
    progress: progress.progressDashboard,
    reports: progress.progressReports,
    achievements: progress.achievements,
    bodyMetrics: state.bodyMetrics,
    bodyMetricChart: buildBodyMetricChartDataset({
      metrics: state.bodyMetrics,
      rangeDays: bodyMetricRange,
      unit,
      goalWeightKg: state.profile.goalWeightKg,
      goalBodyFatPercent: state.profile.goalBodyFatPercent,
      now
    }),
    bodyMetricRange,
    setBodyMetricRange,
    bodyMetricWarnings: validateBodyMetric(metricInput),
    unitWeight: unit,
    updateProfile,
    latestMetric: progress.latestMetric,
    weightDelta: progress.weightDelta,
    newMetricWeight,
    setNewMetricWeight,
    newMetricBodyFat,
    setNewMetricBodyFat,
    newMetricWaist,
    setNewMetricWaist,
    newMetricChest,
    setNewMetricChest,
    newMetricArm,
    setNewMetricArm,
    newMetricThigh,
    setNewMetricThigh,
    newMetricNote,
    setNewMetricNote,
    addBodyMetric: () => {
      if (addBodyMetric({ ...metricInput, note: newMetricNote })) setNewMetricNote("");
    },
    deleteBodyMetric,
    updateBodyMetric,
    coachRecommendation,
    coachFeedback,
    setCoachFeedback,
    recommendationHistory: state.recommendationHistory,
    recommendationDecisions: state.recommendationDecisions,
    decideRecommendation: (decision: "accepted" | "rejected") => {
      decideRecommendation(coachRecommendation, decision, coachFeedback);
      setCoachFeedback("");
    },
    socialLeaderboard: progress.socialLeaderboard,
    badgeSharePreview: progress.badgeSharePreview,
    workoutSummarySharePreview: progress.workoutSummarySharePreview,
    sharedPosts: state.sharedPosts,
    publishSocialShare,
    downloadExport,
    downloadReportPdf
  };
}
