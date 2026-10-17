"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  createCustomExerciseDefinition,
  cloneMarketplaceExerciseToCustom,
  createWorkoutSession,
  cryptoSafeId,
  completeSessionExercise,
  buildBodyMetricChartDataset,
  buildBadgeSharePreview,
  buildWorkoutSummarySharePreview,
  buildWorkoutPlannerPreview,
  coachV2Recommendation,
  buildProgressDashboard,
  buildProgressReports,
  detectWorkoutSetPrs,
  displayWeight,
  estimatedOneRepMax,
  expectedHydrationByNow,
  latestBodyMetric,
  bodyWeightDelta,
  hydrationPaceStatus,
  hydrationPercent,
  hydrationTotal,
  inputWeightToKg,
  isWorkingVolumeSet,
  isDrinkModuleActive,
  isUserOwnedExercise,
  listMarketplaceExercises,
  listRoutineTemplates,
  normalizeDrinkModules,
  normalizeExerciseDefinition,
  normalizePlateInventory,
  normalizeWorkoutSessionQueue,
  nextSupersetExerciseIndex,
  parseRoutineCsv,
  parkSessionExercise,
  privateFriendLeaderboard,
  publishSharePreview,
  filterExerciseLibrary,
  finishWorkoutSession,
  migrateWorkoutExercisesToRoutine,
  pauseWorkoutSession,
  resumeWorkoutSession,
  requestHealthIntegrationPermission,
  revokeHealthIntegrationPermission,
  reorderSessionExerciseQueue,
  previewRoutineTemplateApply,
  routineFromMarketplaceTemplate,
  routineExercisesToWorkoutExercises,
  saveSessionExerciseOrderToRoutine,
  selectedWorkoutDay,
  rowsToRoutineCsv,
  enqueueSync,
  markSyncItemConflict,
  markSyncItemFailed,
  markSyncItemSynced,
  markSyncItemSyncing,
  markSyncQueue,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  toCsv,
  upsertQuickAmount,
  validateBodyMetric,
  visibleHydrationLogs,
  visibleQuickAmounts,
  workingSetVolumeKg,
  type BodyMetric,
  type BodyMetricRangeDays,
  type DrinkModule,
  type EquipmentType,
  type ExerciseDefinition,
  type Friend,
  type HealthIntegrationSettings,
  type HydrationLog,
  type MovementPattern,
  type PlateSettings,
  type RoutineImportPreview,
  type RoutineTemplate,
  type RoutineTemplatePreview,
  type RoutineExercise,
  type SessionExerciseQueueItem,
  type ProgressReports,
  type RecommendationDecision,
  type RecommendationHistoryItem,
  type SharedPost,
  type SocialPrivacySettings,
  type SyncQueueItem,
  type WorkoutSession,
  type WorkoutSetPr,
  type WorkoutExercise,
  type WorkoutSet,
  type WorkoutSetType,
  type WorkoutPlannerPreview
} from "@evolvefit/shared";
import {
  allRestoreSections,
  applySelectiveRestore,
  buildCloudMergePreview,
  buildLocalToCloudSyncItems,
  deletePersonalData,
  mergeLocalDataIntoCloud,
  parseImportedAppData,
  stringifyAppDataExport,
  type CloudMergePreview,
  type RestoreSection
} from "@evolvefit/shared";
import { routineTemplates, type AppState } from "@evolvefit/shared";
import { evolveFitApiClient } from "@/lib/api-client";
import { resetState } from "@/lib/storage";
import { usePersistentAppState } from "../../_hooks/use-persistent-app-state";
import { routeForSection, type AppSection } from "./app-navigation";
import { AppChrome } from "./app-chrome";
import { AppSectionRouter, type AppTab } from "./app-section-router";
import { templateLabels } from "../workout/workout-labels";
import type { CsvDataset, HealthDashboard, PushSubscriptionStatus } from "../settings/settings-view";

type Tab = AppTab;
type SyncStatus = "offline" | "pending" | "failed" | "synced";

type WakeLockSentinelLike = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};


function syncStatusLabel(status: SyncStatus) {
  if (status === "offline") return "Ngoại tuyến";
  if (status === "pending") return "Đang chờ đồng bộ";
  if (status === "failed") return "Đồng bộ lỗi";
  return "Đã đồng bộ";
}

function syncQueueStatusLabel(status: SyncQueueItem["status"]) {
  if (status === "pending") return "Đang chờ";
  if (status === "syncing") return "Đang đồng bộ";
  if (status === "synced") return "Đã đồng bộ";
  if (status === "failed") return "Lỗi";
  return "Xung đột";
}

export default function EvolveFitApp({ initialTab = "today" }: { initialTab?: AppTab }) {
  const { state, setState, mounted } = usePersistentAppState();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [workoutMode, setWorkoutMode] = useState<"plan" | "live" | "finished">("plan");
  const [waterAmount, setWaterAmount] = useState(650);
  const [creatineAmount, setCreatineAmount] = useState(5);
  const [newExerciseName, setNewExerciseName] = useState("Lateral Raise");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState("all");
  const [libraryEquipmentFilter, setLibraryEquipmentFilter] = useState("all");
  const [libraryDifficultyFilter, setLibraryDifficultyFilter] = useState("all");
  const [libraryTagFilter, setLibraryTagFilter] = useState("all");
  const [selectedMarketplaceExerciseId, setSelectedMarketplaceExerciseId] = useState<string | null>(null);
  const [routineTemplateSearch, setRoutineTemplateSearch] = useState("");
  const [routineTemplateGoalFilter, setRoutineTemplateGoalFilter] = useState<"all" | RoutineTemplate["targetGoal"]>("all");
  const [routineTemplateEquipmentFilter, setRoutineTemplateEquipmentFilter] = useState<"all" | EquipmentType>("all");
  const [selectedRoutineTemplateId, setSelectedRoutineTemplateId] = useState<string | null>(null);
  const [routineTemplatePreview, setRoutineTemplatePreview] = useState<RoutineTemplatePreview | null>(null);
  const [newLibraryExerciseName, setNewLibraryExerciseName] = useState("Cable Fly");
  const [newLibraryMuscleGroup, setNewLibraryMuscleGroup] = useState("Ngực");
  const [newLibraryEquipment, setNewLibraryEquipment] = useState<EquipmentType>("cable");
  const [newLibraryPattern, setNewLibraryPattern] = useState<MovementPattern>("isolation");
  const [routineImportPreview, setRoutineImportPreview] = useState<RoutineImportPreview | null>(null);
  const [workoutPlannerPreview, setWorkoutPlannerPreview] = useState<WorkoutPlannerPreview | null>(null);
  const [newMetricWeight, setNewMetricWeight] = useState(72);
  const [newMetricBodyFat, setNewMetricBodyFat] = useState(18);
  const [newMetricWaist, setNewMetricWaist] = useState(82);
  const [newMetricChest, setNewMetricChest] = useState(96);
  const [newMetricArm, setNewMetricArm] = useState(34);
  const [newMetricThigh, setNewMetricThigh] = useState(56);
  const [newMetricNote, setNewMetricNote] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authResetToken, setAuthResetToken] = useState("");
  const [cloudMergePreview, setCloudMergePreview] = useState<CloudMergePreview | null>(null);
  const [bodyMetricRange, setBodyMetricRange] = useState<BodyMetricRangeDays>(30);
  const [setWeight, setSetWeight] = useState(42.5);
  const [setReps, setSetReps] = useState(8);
  const [setRpe, setSetRpe] = useState(8);
  const [setType, setSetType] = useState<WorkoutSetType>("working");
  const [livePrBadges, setLivePrBadges] = useState<WorkoutSetPr[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [pushSubscriptionStatus, setPushSubscriptionStatus] = useState<PushSubscriptionStatus>("unsupported");
  const [pushConfigured, setPushConfigured] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null);
  const [restoreSections, setRestoreSections] = useState<RestoreSection[]>(allRestoreSections());
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [drinkType, setDrinkType] = useState<HydrationLog["drinkType"]>("water");
  const [isOnline, setIsOnline] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());
  const [restPausedSeconds, setRestPausedSeconds] = useState<number | null>(null);
  const [restNotifiedFor, setRestNotifiedFor] = useState<string | null>(null);
  const [healthDashboard, setHealthDashboard] = useState<HealthDashboard | null>(null);
  const [coachFeedback, setCoachFeedback] = useState("");
  const [wakeLockStatus, setWakeLockStatus] = useState<"unknown" | "unsupported" | "active" | "failed">("unknown");

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function navigateToTab(nextTab: AppSection) {
    setTab(nextTab);
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", routeForSection(nextTab));
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    refreshPushStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, state.profile.email]);

  useEffect(() => {
    if (!mounted) return;
    evolveFitApiClient
      .health()
      .then((body) => {
        if (body.ok && body.data) setHealthDashboard({ ...(body.data as HealthDashboard), requestId: body.requestId });
      })
      .catch(() => undefined);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "progress") setTab("progress");
    const action = params.get("quickAction");
    if (action === "log-water-250") logWater(250);
    if (action === "log-creatine") logCreatine(state.profile.creatineAmountG);
    if (action === "snooze-reminders") updateNotificationSettings({ snoozeUntil: new Date(Date.now() + 30 * 60000).toISOString() });
    params.delete("quickAction");
    params.delete("tab");
    const nextQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    setNewMetricWeight(displayWeight(state.profile.bodyWeightKg, state.profile.unitWeight));
  }, [state.profile.bodyWeightKg, state.profile.unitWeight]);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!mounted || !isOnline) return;
    const nowTime = Date.now();
    const nextItem = state.syncQueue
      .filter((item) => item.status === "pending" || item.status === "failed")
      .find((item) => !item.nextRetryAt || new Date(item.nextRetryAt).getTime() <= nowTime);
    if (!nextItem) return;

    let cancelled = false;
    setState((current) => ({ ...current, syncQueue: markSyncItemSyncing(current.syncQueue, nextItem.id) }));

    evolveFitApiClient
      .syncBatch({
        idempotencyKey: nextItem.idempotencyKey ?? nextItem.id,
        items: [{ id: nextItem.id, type: nextItem.type, payload: nextItem.payload, idempotencyKey: nextItem.idempotencyKey ?? nextItem.id }]
      })
      .then((body) => {
        if (!body.ok) throw new Error(body.error ?? "Yêu cầu đồng bộ thất bại");
        return body.data?.results?.[0];
      })
      .then((result) => {
        if (cancelled || !result) return;
        if (result.status === "synced") {
          setState((current) => ({ ...current, syncQueue: markSyncItemSynced(current.syncQueue, nextItem.id) }));
          return;
        }
        if (result.status === "conflict" && result.conflict) {
          const conflict = result.conflict;
          setState((current) => ({ ...current, syncQueue: markSyncItemConflict(current.syncQueue, nextItem.id, conflict) }));
          setToast("Lịch tập bị xung đột, cần xem trước rồi xác nhận");
          return;
        }
        setState((current) => ({ ...current, syncQueue: markSyncItemFailed(current.syncQueue, nextItem.id, result.error ?? "Đồng bộ thất bại") }));
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setState((current) => ({ ...current, syncQueue: markSyncItemFailed(current.syncQueue, nextItem.id, error.message) }));
      });

    return () => {
      cancelled = true;
    };
  }, [mounted, isOnline, setState, state.syncQueue]);

  useEffect(() => {
    if (!mounted || !isOnline || !state.syncQueue.some((item) => item.status === "pending" && item.type === "__legacy_disabled__")) return;
    const id = window.setTimeout(() => {
      setState((current) => ({ ...current, syncQueue: markSyncQueue(current.syncQueue, "synced") }));
      setToast("Hàng đợi ngoại tuyến đã thử lại trên máy và đánh dấu đã đồng bộ");
    }, 1200);
    return () => window.clearTimeout(id);
  }, [mounted, isOnline, setState, state.syncQueue]);

  useEffect(() => {
    if (tab !== "workout" || workoutMode !== "live" || !state.restEndsAt || restPausedSeconds !== null) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [restPausedSeconds, state.restEndsAt, tab, workoutMode]);

  useEffect(() => {
    if (!state.restEndsAt || restPausedSeconds !== null) return;
    const remaining = Math.max(0, Math.ceil((new Date(state.restEndsAt).getTime() - nowMs) / 1000));
    if (remaining > 0 || restNotifiedFor === state.restEndsAt) return;
    setRestNotifiedFor(state.restEndsAt);
    setToast("Đã hết giờ nghỉ. Sẵn sàng set tiếp theo.");
    if (notificationPermission === "granted") {
      new Notification("EvolveFit", { body: "Đã hết giờ nghỉ. Sẵn sàng set tiếp theo." });
    }
  }, [notificationPermission, nowMs, restNotifiedFor, restPausedSeconds, state.restEndsAt]);

  useEffect(() => {
    let wakeLock: WakeLockSentinelLike | undefined;
    const wakeLockNavigator = navigator as NavigatorWithWakeLock;
    if (tab !== "workout") {
      setWakeLockStatus("unknown");
      return;
    }
    if (!wakeLockNavigator.wakeLock) {
      setWakeLockStatus("unsupported");
      return;
    }

    wakeLockNavigator.wakeLock
      .request("screen")
      .then((lock) => {
        wakeLock = lock;
        setWakeLockStatus("active");
      })
      .catch(() => setWakeLockStatus("failed"));

    return () => {
      wakeLock?.release().catch(() => undefined);
    };
  }, [tab]);

  const now = new Date();
  const drinkModules = normalizeDrinkModules(state.drinkModules, state.profile.waterTargetMl, state.profile.creatineAmountG);
  const activeHydrationLogs = visibleHydrationLogs(state.hydrationLogs, drinkModules);
  const waterModule = drinkModules.find((module) => module.id === "water");
  const creatineModule = drinkModules.find((module) => module.id === "creatine");
  const creatineActive = isDrinkModuleActive(drinkModules, "creatine");
  const optionalDrinkModules = drinkModules.filter((module) => module.category === "drink");
  const activeOptionalDrinkModules = optionalDrinkModules.filter((module) => module.active);
  const totalWater = hydrationTotal(state.hydrationLogs, now, drinkModules);
  const percent = hydrationPercent(totalWater, state.profile.waterTargetMl);
  const expectedWater = expectedHydrationByNow(
    state.profile.waterTargetMl,
    state.profile.wakeHour,
    state.profile.sleepHour,
    now
  );
  const pace = hydrationPaceStatus(totalWater, expectedWater);
  const lastHydrationLog = activeHydrationLogs[activeHydrationLogs.length - 1];
  const hydrationReminder =
    waterModule?.reminderEnabled !== false &&
    state.notificationSettings.hydrationEnabled &&
    shouldSendHydrationReminder({
      totalMl: totalWater,
      expectedMl: expectedWater,
      lastLogAt: lastHydrationLog?.loggedAt,
      lastReminderAt: state.notificationSettings.lastHydrationReminderAt,
      now,
      quietHours: { start: state.notificationSettings.quietHoursStart, end: state.notificationSettings.quietHoursEnd },
      quietHoursEnabled: state.notificationSettings.quietHoursEnabled,
      mode: state.notificationSettings.hydrationMode,
      times: state.notificationSettings.hydrationTimes,
      intervalHours: state.notificationSettings.hydrationIntervalHours,
      snoozeUntil: state.notificationSettings.snoozeUntil,
      enabled: isDrinkModuleActive(drinkModules, "water")
    });
  const creatineReminder =
    creatineActive &&
    creatineModule?.reminderEnabled !== false &&
    state.notificationSettings.creatineEnabled &&
    shouldSendCreatineReminder({
      logs: state.supplementLogs,
      scheduledHour: state.profile.creatineHour,
      scheduleHours: state.notificationSettings.creatineTimes,
      remindBeforeMinutes: state.profile.remindBeforeMinutes,
      lastReminderAt: state.notificationSettings.lastCreatineReminderAt,
      now,
      quietHours: { start: state.notificationSettings.quietHoursStart, end: state.notificationSettings.quietHoursEnd },
      quietHoursEnabled: state.notificationSettings.quietHoursEnabled,
      mode: state.notificationSettings.creatineMode,
      intervalHours: state.notificationSettings.creatineIntervalHours,
      snoozeUntil: state.notificationSettings.snoozeUntil,
      enabled: creatineActive
    });
  const quickWater = visibleQuickAmounts(state.quickAmounts, "hydration", 3);
  const quickCreatine = visibleQuickAmounts(state.quickAmounts, "supplement", 2);
  const hydrationReminderLabel =
    state.notificationSettings.snoozeUntil && new Date(state.notificationSettings.snoozeUntil).getTime() > now.getTime()
      ? `Tạm hoãn đến ${new Date(state.notificationSettings.snoozeUntil).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
      : state.notificationSettings.hydrationMode === "fixed"
        ? `Giờ cố định ${state.notificationSettings.hydrationTimes.join(", ")}h`
        : `Mỗi ${state.notificationSettings.hydrationIntervalHours} giờ`;

  useEffect(() => {
    if (!mounted || !state.notificationSettings.inAppFallbackEnabled || notificationPermission === "granted") return;
    if (!hydrationReminder && !creatineReminder) return;

    const remindedAt = new Date().toISOString();
    if (hydrationReminder) {
      setToast("Đến giờ uống nước. Hãy log khi bạn uống xong.");
      setState((current) => ({
        ...current,
        notificationSettings: { ...current.notificationSettings, lastHydrationReminderAt: remindedAt }
      }));
      return;
    }

    setToast("Đến giờ creatine. Log đã uống hoặc bỏ qua để không nhắc lại hôm nay.");
    setState((current) => ({
      ...current,
      notificationSettings: { ...current.notificationSettings, lastCreatineReminderAt: remindedAt }
    }));
  }, [creatineReminder, hydrationReminder, mounted, notificationPermission, setState, state.notificationSettings.inAppFallbackEnabled]);

  const emptyExercise: WorkoutExercise = {
    id: "empty-exercise",
    name: "No exercise selected",
    muscleGroup: "Routine",
    targetSets: 1,
    targetRepsMin: 1,
    targetRepsMax: 1,
    targetWeightKg: 0,
    restSeconds: 60,
    lastSession: "Import or add an exercise to start."
  };
  const activeRoutine = state.routines.find((routine) => routine.id === state.activeRoutineId) ?? state.routines[0];
  const activeWorkoutDay =
    activeRoutine?.days.find((day) => day.id === state.selectedWorkoutDayId) ?? selectedWorkoutDay(activeRoutine, now) ?? activeRoutine?.days[0];
  const activeWorkoutSession = state.workoutSessions.find((session) => session.id === state.activeWorkoutSessionId);
  const currentSessionSets = activeWorkoutSession
    ? state.workoutSets.filter((set) => set.sessionId === activeWorkoutSession.id)
    : [];
  const activeSessionQueue = activeWorkoutSession
    ? normalizeWorkoutSessionQueue(activeWorkoutSession).exerciseQueue
    : state.workoutExercises.map((exercise) => ({ exerciseId: exercise.id, status: "queued" as const }));
  const activeSessionExercises = activeSessionQueue.flatMap((item) => {
    const exercise = state.workoutExercises.find((entry) => entry.id === item.exerciseId);
    return exercise ? [exercise] : [];
  });
  const filteredExerciseLibrary = filterExerciseLibrary(state.exerciseLibrary, {
    query: librarySearch,
    muscleGroup: libraryMuscleFilter,
    equipment: libraryEquipmentFilter,
    difficulty: libraryDifficultyFilter,
    tag: libraryTagFilter,
    includeArchived: false
  });
  const marketplaceExercises = listMarketplaceExercises(state.exerciseLibrary, {
    query: librarySearch,
    muscleGroup: libraryMuscleFilter,
    equipment: libraryEquipmentFilter,
    difficulty: libraryDifficultyFilter,
    tag: libraryTagFilter
  });
  const customExerciseLibrary = filteredExerciseLibrary.filter(isUserOwnedExercise);
  const selectedMarketplaceExercise = selectedMarketplaceExerciseId
    ? marketplaceExercises.find((exercise) => exercise.id === selectedMarketplaceExerciseId) ?? null
    : marketplaceExercises[0] ?? null;
  const routineTemplateCatalog = listRoutineTemplates(state.routineTemplatesMarketplace, {
    query: routineTemplateSearch,
    goal: routineTemplateGoalFilter,
    equipment: routineTemplateEquipmentFilter,
    status: "published",
    sort: "compatibility",
    profile: {
      trainingGoal: state.profile.trainingGoal,
      experienceLevel: state.profile.experienceLevel,
      availableEquipment: state.profile.availableEquipment
    }
  });
  const selectedRoutineTemplate = selectedRoutineTemplateId
    ? routineTemplateCatalog.find((template) => template.id === selectedRoutineTemplateId) ?? null
    : routineTemplateCatalog[0] ?? null;
  const activeRoutineTemplatePreview =
    routineTemplatePreview && selectedRoutineTemplate && routineTemplatePreview.template.id === selectedRoutineTemplate.id
      ? routineTemplatePreview
      : selectedRoutineTemplate
        ? previewRoutineTemplateApply(selectedRoutineTemplate, {
            trainingGoal: state.profile.trainingGoal,
            experienceLevel: state.profile.experienceLevel,
            availableEquipment: state.profile.availableEquipment
          })
        : null;
  const activeQueueItem = activeSessionQueue[state.activeExerciseIndex] ?? activeSessionQueue.find((item) => item.status !== "completed") ?? activeSessionQueue[0];
  const activeExercise =
    (activeWorkoutSession && activeQueueItem
      ? state.workoutExercises.find((exercise) => exercise.id === activeQueueItem.exerciseId)
      : state.workoutExercises[state.activeExerciseIndex]) ??
    state.workoutExercises[0] ??
    emptyExercise;
  const completedSetsForActive = currentSessionSets.filter((set) => set.exerciseId === activeExercise.id && (set.setType ?? "working") !== "warmup");
  const allSetsForActive = currentSessionSets.filter((set) => set.exerciseId === activeExercise.id);
  const recentCoachSets = state.workoutSets.filter((set) => set.exerciseId === activeExercise.id && isWorkingVolumeSet(set)).slice(-activeExercise.targetSets);
  const activeRecommendation: RecommendationHistoryItem = {
    ...coachV2Recommendation({
      exercise: activeExercise,
      recentSets: recentCoachSets,
      allSets: state.workoutSets,
      workoutSessions: state.workoutSessions,
      readiness: state.recovery,
      availableEquipment: state.profile.availableEquipment,
      exerciseLibrary: state.exerciseLibrary
    }),
    id: `local-${activeExercise.id}`,
    generatedAt: new Date().toISOString(),
    exerciseId: activeExercise.id,
    exerciseName: activeExercise.name,
    status: state.recommendationHistory.find((item) => item.exerciseId === activeExercise.id)?.status ?? "pending"
  };
  const bestSet = state.workoutSets.filter(isWorkingVolumeSet).reduce<WorkoutSet | undefined>(
    (best, set) => (!best || estimatedOneRepMax(set.actualWeightKg, set.actualReps) > estimatedOneRepMax(best.actualWeightKg, best.actualReps) ? set : best),
    undefined
  );
  const progressDashboard = buildProgressDashboard({
    hydrationLogs: state.hydrationLogs,
    waterTargetMl: state.profile.waterTargetMl,
    supplementLogs: state.supplementLogs,
    creatineEnabled: creatineActive,
    workoutSessions: state.workoutSessions,
    workoutSets: state.workoutSets,
    workoutExercises: state.workoutExercises,
    now
  });
  const progressReports = buildProgressReports({
    hydrationLogs: state.hydrationLogs,
    waterTargetMl: state.profile.waterTargetMl,
    workoutSessions: state.workoutSessions,
    workoutSets: state.workoutSets,
    workoutExercises: state.workoutExercises,
    hydrationEnabled: isDrinkModuleActive(drinkModules, "water"),
    workoutEnabled: state.workoutExercises.length > 0,
    volumeEnabled: state.workoutExercises.length > 0,
    now
  });
  const achievements = progressReports.monthly.badges.filter((badge) => badge.status !== "disabled");
  const topBadge = achievements.find((badge) => badge.status === "active") ?? achievements[0];
  const socialLeaderboard = privateFriendLeaderboard({
    profileName: state.profile.name,
    friends: state.friends,
    enabled: state.socialPrivacy.friendLeaderboardEnabled,
    myScore: progressDashboard.hydration30.goalHitRate + progressDashboard.workoutCount30 * 5,
    myBadgeStreakMonths: Math.max(0, ...achievements.map((badge) => badge.streakMonths))
  });
  const latestWorkoutSession = state.workoutSessions.filter((session) => session.status === "finished").at(-1);
  const latestWorkoutDate = latestWorkoutSession?.endedAt ?? latestWorkoutSession?.startedAt;
  const latestWorkoutFinishedToday = latestWorkoutDate?.slice(0, 10) === now.toISOString().slice(0, 10);
  const workoutProgressPercent = activeWorkoutSession
    ? Math.round((activeSessionQueue.filter((item) => item.status === "completed").length / Math.max(activeSessionQueue.length, 1)) * 100)
    : latestWorkoutFinishedToday
      ? 100
      : 0;
  const badgeSharePreview = topBadge ? buildBadgeSharePreview({ badge: topBadge, privacy: state.socialPrivacy }) : null;
  const workoutSummarySharePreview = latestWorkoutSession
    ? buildWorkoutSummarySharePreview({
        session: latestWorkoutSession,
        setCount: state.workoutSets.filter((set) => set.sessionId === latestWorkoutSession.id).length,
        totalVolumeKg: workingSetVolumeKg(state.workoutSets.filter((set) => set.sessionId === latestWorkoutSession.id)),
        privacy: state.socialPrivacy
      })
    : null;
  const latestMetric = latestBodyMetric(state.bodyMetrics);
  const weightDelta = bodyWeightDelta(state.bodyMetrics);
  const bodyMetricChart = buildBodyMetricChartDataset({
    metrics: state.bodyMetrics,
    rangeDays: bodyMetricRange,
    unit: state.profile.unitWeight,
    goalWeightKg: state.profile.goalWeightKg,
    goalBodyFatPercent: state.profile.goalBodyFatPercent,
    now
  });
  const newMetricWeightKg = inputWeightToKg(newMetricWeight, state.profile.unitWeight);
  const bodyMetricWarnings = validateBodyMetric({
    weightKg: newMetricWeightKg,
    bodyFatPercent: newMetricBodyFat,
    waistCm: newMetricWaist,
    chestCm: newMetricChest,
    armCm: newMetricArm,
    thighCm: newMetricThigh
  });
  const syncStatus: SyncStatus = !isOnline
    ? "offline"
    : state.syncQueue.some((item) => item.status === "failed" || item.status === "conflict")
      ? "failed"
      : state.syncQueue.some((item) => item.status === "pending" || item.status === "syncing")
        ? "pending"
        : "synced";

  function commit(next: AppState, message?: string) {
    setState(next);
    if (message) {
      setToast(message);
      window.setTimeout(() => setToast(null), 5000);
    }
  }

  function commitSynced(next: AppState, type: string, payload: unknown, message?: string) {
    commit({ ...next, syncQueue: enqueueSync(next.syncQueue, { type, payload }) }, message);
  }

  function withUndo(next: AppState, label: string, message: string) {
    const previous = { ...state, undo: undefined };
    commit({ ...next, undo: { label, state: previous } }, message);
  }

  function logWater(amountMl: number, pin = false, type: HydrationLog["drinkType"] = drinkType) {
    if (!isDrinkModuleActive(drinkModules, type)) {
      const drinkName = drinkModules.find((module) => module.id === type)?.name ?? type;
      setToast(`${drinkName} đang tắt trong Cài đặt thức uống.`);
      return;
    }
    const log = { id: cryptoSafeId(), amountMl, drinkType: type, loggedAt: new Date().toISOString() };
    const quickAmounts = upsertQuickAmount(state.quickAmounts, {
      category: "hydration",
      label: `+${amountMl}ml`,
      amount: amountMl,
      unit: "ml",
      pinned: pin || state.quickAmounts.some((item) => item.category === "hydration" && item.amount === amountMl)
    });
    withUndo(
      { ...state, hydrationLogs: [...state.hydrationLogs, log], quickAmounts, syncQueue: enqueueSync(state.syncQueue, { type: "hydration.log", payload: log }) },
      "water",
      `Đã ghi nhận ${amountMl}ml`
    );
  }

  function editHydrationLog(id: string, deltaMl: number) {
    const hydrationLogs = state.hydrationLogs.map((log) =>
      log.id === id ? { ...log, amountMl: Math.max(50, log.amountMl + deltaMl) } : log
    );
    withUndo({ ...state, hydrationLogs, syncQueue: enqueueSync(state.syncQueue, { type: "hydration.patch", payload: { id, deltaMl } }) }, "edit water", "Đã cập nhật log nước");
  }

  function deleteHydrationLog(id: string) {
    withUndo(
      { ...state, hydrationLogs: state.hydrationLogs.filter((log) => log.id !== id), syncQueue: enqueueSync(state.syncQueue, { type: "hydration.delete", payload: { id } }) },
      "delete water",
      "Đã xóa log nước"
    );
  }

  function logCreatine(amount = state.profile.creatineAmountG, pin = false) {
    if (!creatineActive) {
      setToast("Creatine đang tắt trong Cài đặt thức uống.");
      return;
    }
    const creatine = state.supplements.find((supplement) => supplement.name.toLowerCase() === "creatine");
    const log = {
      id: cryptoSafeId(),
      supplementId: creatine?.id,
      name: "Creatine",
      amount,
      unit: "g" as const,
      loggedAt: new Date().toISOString(),
      status: "taken" as const
    };
    const quickAmounts = upsertQuickAmount(state.quickAmounts, {
      category: "supplement",
      label: `${amount}g`,
      amount,
      unit: "g",
      pinned: pin || state.quickAmounts.some((item) => item.category === "supplement" && item.amount === amount)
    });
    withUndo({ ...state, supplementLogs: [...state.supplementLogs, log], quickAmounts, syncQueue: enqueueSync(state.syncQueue, { type: "supplement.log", payload: log }) }, "creatine", `Đã ghi nhận Creatine ${amount}g`);
  }

  function updateDrinkModule(id: DrinkModule["id"], patch: Partial<DrinkModule>) {
    if (id === "water" && patch.active === false) {
      setToast("Nước là đồ uống chính nên không thể tắt.");
      return;
    }
    const nextModules = normalizeDrinkModules(state.drinkModules, state.profile.waterTargetMl, state.profile.creatineAmountG).map((module) =>
      module.id === id ? { ...module, ...patch, active: id === "water" ? true : (patch.active ?? module.active) } : module
    );
    const nextSupplements =
      id === "creatine" && patch.active !== undefined
        ? state.supplements.map((supplement) => (supplement.name.toLowerCase() === "creatine" ? { ...supplement, active: Boolean(patch.active) } : supplement))
        : state.supplements;
    commitSynced(
      {
        ...state,
        drinkModules: nextModules,
        supplements: nextSupplements,
        notificationSettings:
          id === "creatine" && patch.active === false
            ? { ...state.notificationSettings, creatineEnabled: false }
            : state.notificationSettings
      },
      "drinkModule.update",
      { id, patch },
      "Updated drink settings"
    );
  }

  function routineExerciseFromWorkout(exercise: WorkoutExercise, order: number, definitionId?: string): RoutineExercise {
    return { ...exercise, definitionId, order };
  }

  function syncSelectedDay(nextState: AppState): AppState {
    const routine = nextState.routines.find((item) => item.id === nextState.activeRoutineId) ?? nextState.routines[0];
    const day = routine?.days.find((item) => item.id === nextState.selectedWorkoutDayId) ?? routine?.days[0];
    return {
      ...nextState,
      activeRoutineId: routine?.id ?? nextState.activeRoutineId,
      selectedWorkoutDayId: day?.id ?? nextState.selectedWorkoutDayId,
      workoutExercises: day ? routineExercisesToWorkoutExercises(day.exercises) : nextState.workoutExercises,
      activeExerciseIndex: Math.min(nextState.activeExerciseIndex, Math.max(0, (day?.exercises.length ?? 1) - 1))
    };
  }

  function updateActiveRoutine(patch: (routine: AppState["routines"][number]) => AppState["routines"][number], label = "Updated routine") {
    if (!activeRoutine) return;
    const draft = { ...activeRoutine, days: activeRoutine.days.map((day) => ({ ...day, exercises: [...day.exercises] })) };
    const updatedRoutine = patch(draft);
    commitSynced(
      syncSelectedDay({
        ...state,
        activeTemplate: "custom",
        routines: state.routines.map((routine) => (routine.id === updatedRoutine.id ? { ...updatedRoutine, updatedAt: new Date().toISOString() } : routine))
      }),
      "routine.update",
      { routineId: updatedRoutine.id, routine: updatedRoutine, baseUpdatedAt: activeRoutine.updatedAt },
      label
    );
  }

  function updateActiveWorkoutDay(
    patch: (day: AppState["routines"][number]["days"][number]) => AppState["routines"][number]["days"][number],
    label = "Đã cập nhật ngày tập"
  ) {
    if (!activeWorkoutDay) return;
    updateActiveRoutine(
      (routine) => ({
        ...routine,
        days: routine.days.map((day) => (day.id === activeWorkoutDay.id ? patch({ ...day, exercises: [...day.exercises] }) : day))
      }),
      label
    );
  }

  function addExercise() {
    const exercise: WorkoutExercise = {
      id: cryptoSafeId(),
      name: newExerciseName.trim() || "Bài tập tùy chỉnh",
      muscleGroup: "Tùy chỉnh",
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 12,
      targetWeightKg: 10,
      restSeconds: 60,
      lastSession: "Bài tập tùy chỉnh"
    };
    updateActiveWorkoutDay(
      (day) => ({ ...day, exercises: [...day.exercises, routineExerciseFromWorkout(exercise, day.exercises.length)] }),
      `Đã thêm ${exercise.name}`
    );
  }

  async function downloadRoutineSampleXlsx() {
    const response = await fetch("/samples/evolvefit-routine-template.csv");
    const csv = await response.text();
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(csv, { type: "string" });
    XLSX.writeFile(workbook, "evolvefit-routine-template.xlsx");
  }

  function previewRoutineImport(file: File) {
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      file
        .arrayBuffer()
        .then(async (buffer) => {
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(buffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            setRoutineImportPreview({ fileName: file.name, rows: [], errors: ["File bảng tính không có sheet dữ liệu."] });
            return;
          }
          const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], { header: 1, blankrows: false });
          setRoutineImportPreview(parseRoutineCsv(rowsToRoutineCsv(rows), file.name));
        })
        .catch(() => setRoutineImportPreview({ fileName: file.name, rows: [], errors: ["Không đọc được file bảng tính đã chọn."] }));
      return;
    }

    file
      .text()
      .then((text) => setRoutineImportPreview(parseRoutineCsv(text, file.name)))
      .catch(() => setRoutineImportPreview({ fileName: file.name, rows: [], errors: ["Không đọc được file đã chọn."] }));
  }

  function confirmRoutineImport(mode: "replace" | "append") {
    if (!routineImportPreview || routineImportPreview.errors.length || !routineImportPreview.rows.length) return;
    const importedDays = routineImportPreview.rows.reduce<AppState["routines"][number]["days"]>((days, row) => {
      const existingDay = days.find((day) => day.name === row.session && day.day === row.day);
      const exercise = routineExerciseFromWorkout(
        {
          id: row.id,
          name: row.name,
          muscleGroup: row.muscleGroup,
          targetSets: row.targetSets,
          targetRepsMin: row.targetRepsMin,
          targetRepsMax: row.targetRepsMax,
          targetWeightKg: row.targetWeightKg,
          restSeconds: row.restSeconds,
          lastSession: row.lastSession
        },
        existingDay?.exercises.length ?? 0
      );
      if (existingDay) {
        existingDay.exercises.push(exercise);
        return days;
      }
      return [
        ...days,
        {
          id: `day-${cryptoSafeId()}`,
          name: row.session,
          day: row.day,
          order: days.length,
          exercises: [exercise]
        }
      ];
    }, []);
    const nextRoutine = activeRoutine ?? migrateWorkoutExercisesToRoutine(state.workoutExercises);
    const days = mode === "replace" ? importedDays : [...nextRoutine.days, ...importedDays.map((day, index) => ({ ...day, order: nextRoutine.days.length + index }))];
    const updatedRoutine = { ...nextRoutine, daysPerWeek: days.length, days, updatedAt: new Date().toISOString() };
    commitSynced(
      syncSelectedDay({
        ...state,
        activeTemplate: "custom",
        routines: state.routines.some((routine) => routine.id === updatedRoutine.id)
          ? state.routines.map((routine) => (routine.id === updatedRoutine.id ? updatedRoutine : routine))
          : [...state.routines, updatedRoutine],
        activeRoutineId: updatedRoutine.id,
        selectedWorkoutDayId: days[0]?.id ?? state.selectedWorkoutDayId,
        workoutSets: [],
        activeExerciseIndex: 0
      }),
      "routine.update",
      { routineId: updatedRoutine.id, routine: updatedRoutine, baseUpdatedAt: nextRoutine.updatedAt, fileName: routineImportPreview.fileName, mode },
      `Đã nhập ${routineImportPreview.rows.length} bài tập`
    );
    setRoutineImportPreview(null);
  }

  function deleteExercise(id: string) {
    updateActiveWorkoutDay(
      (day) => ({
        ...day,
        exercises: day.exercises.filter((exercise) => exercise.id !== id).map((exercise, index) => ({ ...exercise, order: index }))
      }),
      "Đã xóa bài tập"
    );
  }

  function updateExerciseTarget(id: string, patch: Partial<WorkoutExercise>) {
    updateActiveWorkoutDay(
      (day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise))
      }),
      "Đã cập nhật bài tập"
    );
  }

  function moveExercise(id: string, direction: -1 | 1) {
    if (!activeWorkoutDay) return;
    const ordered = [...activeWorkoutDay.exercises].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((exercise) => exercise.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const [item] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, item);
    updateActiveWorkoutDay(
      (day) => ({ ...day, exercises: ordered.map((exercise, order) => ({ ...exercise, order })) }),
      "Đã sắp xếp lịch tập"
    );
  }

  function routineFromTemplate(template: Exclude<AppState["activeTemplate"], "custom">) {
    const nowIso = new Date().toISOString();
    const exercise = (name: string, muscleGroup: string, order: number, targetWeightKg = 20): RoutineExercise => ({
      id: cryptoSafeId(),
      name,
      muscleGroup,
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetWeightKg,
      restSeconds: 90,
      lastSession: "Bài tập từ mẫu",
      order
    });
    const day = (name: string, weekday: string, order: number, exercises: RoutineExercise[]) => ({
      id: `day-${cryptoSafeId()}`,
      name,
      day: weekday,
      order,
      exercises
    });
    const days =
      template === "ppl"
        ? [
            day("Ngày đẩy", "Mon", 0, routineTemplates.ppl.map((item, index) => routineExerciseFromWorkout(item, index))),
            day("Ngày kéo", "Wed", 1, [exercise("Chest Supported Row", "Lưng", 0, 40), exercise("Lat Pulldown", "Lưng", 1, 45), exercise("Dumbbell Curl", "Tay", 2, 12)]),
            day("Ngày chân", "Fri", 2, [exercise("Back Squat", "Chân", 0, 80), exercise("Romanian Deadlift", "Chân", 1, 70), exercise("Leg Press", "Chân", 2, 120)])
          ]
        : template === "upper-lower"
          ? [
              day("Ngày thân trên", "Mon", 0, routineTemplates["upper-lower"].map((item, index) => routineExerciseFromWorkout(item, index))),
              day("Ngày thân dưới", "Thu", 1, [exercise("Back Squat", "Chân", 0, 80), exercise("Romanian Deadlift", "Chân", 1, 70), exercise("Leg Press", "Chân", 2, 120)])
            ]
          : [
              day("Toàn thân A", "Mon", 0, routineTemplates["full-body"].map((item, index) => routineExerciseFromWorkout(item, index))),
              day("Toàn thân B", "Wed", 1, [exercise("Barbell Bench Press", "Ngực", 0, 60), exercise("Chest Supported Row", "Lưng", 1, 40), exercise("Back Squat", "Chân", 2, 80)]),
              day("Toàn thân C", "Fri", 2, [exercise("Seated Shoulder Press", "Vai", 0, 24), exercise("Lat Pulldown", "Lưng", 1, 45), exercise("Romanian Deadlift", "Chân", 2, 70)])
            ];
    return {
      id: `routine-${template}-${cryptoSafeId()}`,
      name: templateLabels[template],
      daysPerWeek: days.length,
      days,
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }

  function applyTemplate(template: AppState["activeTemplate"]) {
    if (template === "custom") {
      commit({ ...state, activeTemplate: "custom" }, "Đã chuyển sang Tùy chỉnh");
      return;
    }
    const routine = routineFromTemplate(template);
    commitSynced(
      syncSelectedDay({
        ...state,
        activeTemplate: template,
        routines: [...state.routines, routine],
        activeRoutineId: routine.id,
        selectedWorkoutDayId: routine.days[0].id,
        workoutSets: [],
        activeExerciseIndex: 0
      }),
      "routine.create",
      routine,
      `Đã áp dụng mẫu ${templateLabels[template]}`
    );
  }

  function previewRoutineTemplate(template: RoutineTemplate) {
    setSelectedRoutineTemplateId(template.id);
    setRoutineTemplatePreview(
      previewRoutineTemplateApply(template, {
        trainingGoal: state.profile.trainingGoal,
        experienceLevel: state.profile.experienceLevel,
        availableEquipment: state.profile.availableEquipment
      })
    );
    setToast(`Đã tạo preview ${template.name}`);
  }

  function applyRoutineMarketplaceTemplate(template: RoutineTemplate, customize = false) {
    const routine = routineFromMarketplaceTemplate(template, {
      id: `routine-template-${template.id}-${cryptoSafeId()}`,
      name: customize ? `${template.name} (custom)` : template.name
    });
    commitSynced(
      syncSelectedDay({
        ...state,
        activeTemplate: "custom",
        routines: [...state.routines, routine],
        activeRoutineId: routine.id,
        selectedWorkoutDayId: routine.days[0]?.id ?? state.selectedWorkoutDayId,
        workoutExercises: routine.days[0]?.exercises ?? state.workoutExercises,
        activeExerciseIndex: 0
      }),
      "routine.create",
      {
        ...routine,
        marketplaceTemplateId: template.id,
        marketplaceTemplateVersion: template.version,
        customize
      },
      customize ? `Đã tạo bản tùy biến từ ${template.name}` : `Đã áp dụng ${template.name}`
    );
    setRoutineTemplatePreview(null);
  }

  function previewWorkoutPlanner() {
    const preview = buildWorkoutPlannerPreview(
      {
        goal: state.profile.trainingGoal ?? "muscle",
        daysPerWeek: Math.max(1, state.profile.workoutDays.length || activeRoutine?.daysPerWeek || 3),
        equipment: state.profile.availableEquipment?.length ? state.profile.availableEquipment : ["bodyweight"],
        experienceLevel: state.profile.experienceLevel ?? "intermediate",
        minutesPerSession: 60,
        musclePriority: latestMetric?.bodyFatPercent && latestMetric.bodyFatPercent > 20 ? ["Legs", "Back"] : undefined
      },
      state.exerciseLibrary
    );
    setWorkoutPlannerPreview(preview);
    setToast("Coach Planner V2 đã tạo bản xem trước");
  }

  function applyWorkoutPlanner() {
    if (!workoutPlannerPreview) return;
    const routine = workoutPlannerPreview.routine;
    commitSynced(
      syncSelectedDay({
        ...state,
        activeTemplate: "custom",
        routines: [...state.routines, routine],
        activeRoutineId: routine.id,
        selectedWorkoutDayId: routine.days[0]?.id ?? state.selectedWorkoutDayId,
        activeExerciseIndex: 0
      }),
      "routine.create",
      routine,
      "Đã áp dụng Coach Planner V2"
    );
    setWorkoutPlannerPreview(null);
  }

  function selectWorkoutDay(dayId: string) {
    const routine = activeRoutine;
    const day = routine?.days.find((item) => item.id === dayId);
    if (!routine || !day) return;
    commitSynced(
      syncSelectedDay({ ...state, selectedWorkoutDayId: day.id, activeExerciseIndex: 0 }),
      "routine.day.select",
      { routineId: routine.id, dayId },
      `Đã chọn ${day.name}`
    );
  }

  function updateRoutineName(name: string) {
    updateActiveRoutine((routine) => ({ ...routine, name: name || "Lịch tập chưa đặt tên" }), "Đã cập nhật tên lịch tập");
  }

  function updateWorkoutDay(id: string, patch: Partial<AppState["routines"][number]["days"][number]>) {
    updateActiveRoutine(
      (routine) => ({
        ...routine,
        days: routine.days.map((day) => (day.id === id ? { ...day, ...patch } : day))
      }),
      "Đã cập nhật ngày tập"
    );
  }

  function addWorkoutDay() {
    updateActiveRoutine((routine) => {
      const nextIndex = routine.days.length + 1;
      const day = {
        id: `day-${cryptoSafeId()}`,
        name: `Ngày ${nextIndex}`,
        day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][routine.days.length % 7],
        order: routine.days.length,
        exercises: []
      };
      return { ...routine, daysPerWeek: routine.days.length + 1, days: [...routine.days, day] };
    }, "Đã thêm ngày tập");
  }

  function deleteWorkoutDay(id: string) {
    if (!activeRoutine || activeRoutine.days.length <= 1) return;
    const nextDays = activeRoutine.days.filter((day) => day.id !== id).map((day, index) => ({ ...day, order: index }));
    const nextSelected = nextDays[0]?.id ?? state.selectedWorkoutDayId;
    commitSynced(
      syncSelectedDay({
        ...state,
        routines: state.routines.map((routine) =>
          routine.id === activeRoutine.id ? { ...routine, daysPerWeek: nextDays.length, days: nextDays, updatedAt: new Date().toISOString() } : routine
        ),
        selectedWorkoutDayId: nextSelected,
        activeExerciseIndex: 0
      }),
      "routine.day.delete",
      { id },
      "Đã xóa ngày tập"
    );
  }

  function addExerciseFromLibrary(definition: ExerciseDefinition) {
    const normalized = normalizeExerciseDefinition(definition);
    const exercise: WorkoutExercise = {
      id: cryptoSafeId(),
      name: normalized.name,
      muscleGroup: normalized.muscleGroup,
      targetSets: 3,
      targetRepsMin: normalized.movementPattern === "core" ? 30 : 8,
      targetRepsMax: normalized.movementPattern === "core" ? 60 : 12,
      targetWeightKg: normalized.equipment === "bodyweight" ? 0 : 20,
      restSeconds: normalized.movementPattern === "isolation" || normalized.movementPattern === "core" ? 60 : 90,
      lastSession: normalized.catalogSource === "marketplace" ? "Thêm từ marketplace" : normalized.builtIn ? "Sao chép từ thư viện có sẵn" : "Bài tập tùy chỉnh trong thư viện"
    };
    updateActiveWorkoutDay(
      (day) => ({
        ...day,
        exercises: [...day.exercises, routineExerciseFromWorkout(exercise, day.exercises.length, normalized.id)]
      }),
      `Đã thêm ${normalized.name}`
    );
  }

  function cloneExerciseFromMarketplace(definition: ExerciseDefinition) {
    const custom = cloneMarketplaceExerciseToCustom(definition);
    commitSynced(
      { ...state, exerciseLibrary: [...state.exerciseLibrary, custom] },
      "exercise.create",
      custom,
      `Đã tạo bản tùy chỉnh ${custom.name}`
    );
  }

  function addCustomExerciseDefinition() {
    const exercise = createCustomExerciseDefinition({
      name: newLibraryExerciseName,
      muscleGroup: newLibraryMuscleGroup,
      equipment: newLibraryEquipment,
      movementPattern: newLibraryPattern
    });
    commitSynced(
      { ...state, exerciseLibrary: [...state.exerciseLibrary, exercise] },
      "exercise.create",
      exercise,
      `Đã tạo ${exercise.name}`
    );
  }

  function updateExerciseDefinition(id: string, patch: Partial<ExerciseDefinition>) {
    const target = state.exerciseLibrary.find((exercise) => exercise.id === id);
    if (!target || !isUserOwnedExercise(target)) return;
    commitSynced(
      { ...state, exerciseLibrary: state.exerciseLibrary.map((exercise) => (exercise.id === id ? { ...exercise, ...patch, builtIn: false, catalogSource: "custom" } : exercise)) },
      "exercise.update",
      { id, patch },
      "Đã cập nhật bài tùy chỉnh"
    );
  }

  function deleteExerciseDefinition(id: string) {
    const target = state.exerciseLibrary.find((exercise) => exercise.id === id);
    if (!target || !isUserOwnedExercise(target)) return;
    commitSynced(
      { ...state, exerciseLibrary: state.exerciseLibrary.filter((exercise) => exercise.id !== id) },
      "exercise.delete",
      { id },
      "Đã xóa bài tùy chỉnh"
    );
  }

  function addBodyMetric() {
    if (bodyMetricWarnings.length) {
      setToast(bodyMetricWarnings[0]);
      return;
    }
    const metric: BodyMetric = {
      id: cryptoSafeId(),
      measuredAt: new Date().toISOString(),
      weightKg: newMetricWeightKg,
      heightCm: latestMetric?.heightCm ?? 174,
      bodyFatPercent: newMetricBodyFat,
      waistCm: newMetricWaist,
      chestCm: newMetricChest,
      armCm: newMetricArm,
      thighCm: newMetricThigh,
      note: newMetricNote.trim() || undefined
    };
    commitSynced({ ...state, bodyMetrics: [...state.bodyMetrics, metric] }, "bodyMetric.create", metric, "Đã lưu chỉ số cơ thể");
  }

  function deleteBodyMetric(id: string) {
    commitSynced({ ...state, bodyMetrics: state.bodyMetrics.filter((metric) => metric.id !== id) }, "bodyMetric.delete", { id }, "Đã xóa chỉ số cơ thể");
  }

  function updateBodyMetric(id: string, patch: Partial<BodyMetric>) {
    const current = state.bodyMetrics.find((metric) => metric.id === id);
    if (!current) return;
    const warnings = validateBodyMetric({ ...current, ...patch });
    if (warnings.length) {
      setToast(warnings[0]);
      return;
    }
    commitSynced(
      {
        ...state,
        bodyMetrics: state.bodyMetrics.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric))
      },
      "bodyMetric.patch",
      { id, patch },
      "Đã cập nhật chỉ số cơ thể"
    );
  }

  function completeOnboarding() {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.profile.email);
    const hoursOk = state.profile.wakeHour >= 0 && state.profile.wakeHour <= 23 && state.profile.sleepHour >= 0 && state.profile.sleepHour <= 23 && state.profile.wakeHour !== state.profile.sleepHour;
    const onboardingEquipmentOk = Boolean(state.profile.availableEquipment?.length);
    if (!state.profile.name.trim() || !emailOk || state.profile.waterTargetMl < 1000 || state.profile.waterTargetMl > 6000 || !hoursOk || state.profile.workoutDays.length < 1 || !onboardingEquipmentOk) {
      setToast("Onboarding chưa hợp lệ: kiểm tra email, mục tiêu nước, giờ ngủ/dậy và ngày tập");
      return;
    }
    const metric: BodyMetric = {
      id: cryptoSafeId(),
      measuredAt: new Date().toISOString(),
      weightKg: state.profile.bodyWeightKg,
      heightCm: state.profile.heightCm,
      bodyFatPercent: latestMetric?.bodyFatPercent
    };
    commitSynced(
      {
        ...state,
        profile: { ...state.profile, onboardingCompleted: true },
        bodyMetrics: [...state.bodyMetrics, metric]
      },
      "onboarding.complete",
      { profile: state.profile, bodyMetric: metric },
      "Onboarding hoàn tất"
    );
  }

  function downloadExport() {
    const payload = stringifyAppDataExport(state, new Date(), process.env.NEXT_PUBLIC_APP_VERSION);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "evolvefit-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadReportPdf(period: keyof ProgressReports) {
    const report = progressReports[period];
    const escapeHtml = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
            <li>Nước trung bình: ${report.trendVsPrevious.hydrationAverageMl >= 0 ? "+" : ""}${report.trendVsPrevious.hydrationAverageMl}ml</li>
            <li>Tỷ lệ đạt mục tiêu: ${report.trendVsPrevious.goalHitRate >= 0 ? "+" : ""}${report.trendVsPrevious.goalHitRate}%</li>
            <li>Số buổi tập: ${report.trendVsPrevious.workoutCount >= 0 ? "+" : ""}${report.trendVsPrevious.workoutCount}</li>
            <li>Tổng volume: ${report.trendVsPrevious.totalVolumeKg >= 0 ? "+" : ""}${report.trendVsPrevious.totalVolumeKg}kg</li>
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

  function downloadCsvExport(dataset?: CsvDataset) {
    const datasets: Record<CsvDataset, Record<string, unknown>[]> = {
      hydration: state.hydrationLogs.map((row) => ({ ...row })),
      creatine: state.supplementLogs.filter((row) => row.name === "Creatine").map((row) => ({ ...row })),
      workouts: state.workoutSets.map((row) => ({ ...row })),
      "body-metrics": state.bodyMetrics.map((row) => ({ ...row }))
    };
    const selected = dataset ? [[dataset, datasets[dataset]]] as const : Object.entries(datasets);
    selected.forEach(([name, rows]) => {
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `evolvefit-${name}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  async function authenticateEmail(mode: "sign-in" | "sign-up") {
    if (!state.profile.email.trim() || authPassword.length < 6) {
      setToast("Email hoặc mật khẩu chưa hợp lệ");
      return;
    }
    const payload =
      mode === "sign-up"
        ? await evolveFitApiClient.signUp({ email: state.profile.email.trim(), password: authPassword })
        : await evolveFitApiClient.signIn({ email: state.profile.email.trim(), password: authPassword, mode: "email" });
    if (!payload.ok) {
      setToast(payload.error ?? "Đăng nhập thất bại");
      return;
    }
    const nextState = { ...state, profile: { ...state.profile, email: payload.data.email, authMode: payload.data.mode } };
    setCloudMergePreview(buildCloudMergePreview(nextState));
    commit(
      nextState,
      payload.data.needsEmailVerification
        ? "Đã tạo tài khoản. Hãy kiểm tra email để xác minh trước khi đồng bộ."
        : "Đã liên kết tài khoản. Chọn cách đồng bộ dữ liệu."
    );
  }

  function startGoogleOAuth() {
    window.location.href = evolveFitApiClient.googleOAuthUrl();
  }

  async function refreshAuthSession() {
    const payload = await evolveFitApiClient.refresh();
    if (!payload.ok) {
      setToast(payload.error ?? "Không làm mới được phiên");
      return;
    }
    commit({ ...state, profile: { ...state.profile, email: payload.data.email, authMode: payload.data.mode } }, "Phiên đăng nhập đã được làm mới");
  }

  async function requestPasswordResetEmail() {
    if (!state.profile.email.trim()) {
      setToast("Nhập email trước khi yêu cầu đặt lại mật khẩu");
      return;
    }
    const payload = await evolveFitApiClient.requestPasswordReset({ email: state.profile.email.trim(), redirectTo: window.location.origin });
    setToast(payload.ok ? "Đã gửi hướng dẫn đặt lại mật khẩu nếu email hợp lệ" : payload.error);
  }

  async function resetAccountPassword() {
    if (!authResetToken.trim() || authPassword.length < 8) {
      setToast("Token và mật khẩu mới tối thiểu 8 ký tự");
      return;
    }
    const payload = await evolveFitApiClient.resetPassword({ accessToken: authResetToken.trim(), password: authPassword });
    setToast(payload.ok ? "Mật khẩu đã được cập nhật" : payload.error);
  }

  async function mergeLocalAccountToCloud() {
    const idempotencyKey = `account-merge:${localProfileId()}`;
    const items = buildLocalToCloudSyncItems(state, idempotencyKey);
    const payload = await evolveFitApiClient.syncBatch({ idempotencyKey, items });
    if (!payload.ok) {
      setToast(payload.error ?? "Đồng bộ dữ liệu local thất bại");
      return;
    }
    const exportPayload = await evolveFitApiClient.exportAccount();
    const merged = exportPayload.ok ? mergeLocalDataIntoCloud(state, exportPayload.data.data) : state;
    setCloudMergePreview(null);
    commit({ ...merged, profile: { ...merged.profile, authMode: state.profile.authMode, email: state.profile.email } }, "Đã đưa dữ liệu trên máy lên cloud");
  }

  async function replaceLocalWithCloud() {
    const payload = await evolveFitApiClient.exportAccount();
    if (!payload.ok) {
      setToast(payload.error ?? "Không tải được dữ liệu cloud");
      return;
    }
    setCloudMergePreview(null);
    commit({ ...payload.data.data, profile: { ...payload.data.data.profile, authMode: state.profile.authMode, email: state.profile.email } }, "Đã thay dữ liệu trên máy bằng bản cloud");
  }

  function keepLocalAccountData() {
    setCloudMergePreview(null);
    setToast("Giữ dữ liệu trên máy. Bạn có thể đồng bộ sau.");
  }

  async function signOutAccount() {
    await evolveFitApiClient.signOut();
    setCloudMergePreview(null);
    commit({ ...state, profile: { ...state.profile, authMode: "local" } }, "Đã đăng xuất khỏi tài khoản cloud");
  }

  async function deleteCloudAccount() {
    const payload = await evolveFitApiClient.deleteAccount();
    if (!payload.ok) {
      setToast(payload.error ?? "Xóa tài khoản thất bại");
      return;
    }
    setCloudMergePreview(null);
    commit(deletePersonalData(state), "Đã xóa tài khoản cloud và dữ liệu cá nhân");
  }

  function importJsonExport(file: File) {
    readTextFile(file)
      .then((text) => {
        const imported = parseImportedAppData(text);
        if (!imported.ok) {
          setToast(`Import JSON không hợp lệ: ${imported.errors[0]}`);
          return;
        }
        if (!restoreSections.length) {
          setToast("Chọn ít nhất một nhóm dữ liệu để khôi phục");
          return;
        }
        commit(applySelectiveRestore(state, imported.data, restoreSections), "Đã khôi phục JSON theo lựa chọn");
      })
      .catch(() => setToast("Không import được JSON"));
  }

  function deleteLocalPersonalData() {
    commit(deletePersonalData(state), "Đã xóa dữ liệu cá nhân trên máy");
  }
  function readTextFile(file: File) {
    if (typeof file.text === "function") return file.text();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function localProfileId() {
    return state.profile.email || "local-profile";
  }

  function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const bytes = Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }

  async function getServiceWorkerRegistration() {
    if (!("serviceWorker" in navigator)) return undefined;
    return navigator.serviceWorker.ready;
  }

  async function refreshPushStatus() {
    if (!("Notification" in window)) {
      setNotificationPermission("default");
      setPushSubscriptionStatus("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushSubscriptionStatus("unsupported");
      return;
    }
    try {
      const result = await evolveFitApiClient.notificationConfig(localProfileId());
      const config = result.ok ? result.data : undefined;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || config?.vapidPublicKey || null;
      setVapidPublicKey(key);
      setPushConfigured(Boolean(config?.configured && key));
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setPushSubscriptionStatus(!key || !config?.configured ? "missing-env" : subscription ? "subscribed" : "unsubscribed");
    } catch {
      setPushSubscriptionStatus("missing-env");
    }
  }

  async function subscribeWebPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushSubscriptionStatus("unsupported");
      setToast("Trình duyệt không hỗ trợ Web Push, sẽ dùng nhắc dự phòng trong app");
      return;
    }
    const key = vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key || !pushConfigured) {
      setPushSubscriptionStatus("missing-env");
      setToast("Thiếu VAPID public key hoặc cấu hình máy chủ, sẽ dùng nhắc trong app");
      return;
    }
    const registration = await getServiceWorkerRegistration();
    if (!registration) return;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(key)
      }));
    await evolveFitApiClient.subscribeNotifications({ ...subscription.toJSON(), localProfileId: localProfileId(), platform: navigator.userAgent });
    setPushSubscriptionStatus("subscribed");
    setToast("Đã đăng ký Web Push");
  }

  async function unsubscribeWebPush() {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const endpoint = subscription?.endpoint;
    await subscription?.unsubscribe();
    if (endpoint) {
      await evolveFitApiClient.unsubscribeNotifications(endpoint);
    }
    setPushSubscriptionStatus(pushConfigured ? "unsubscribed" : "missing-env");
    setToast("Đã hủy đăng ký Web Push");
  }

  async function sendTestPushNotification() {
    if (pushSubscriptionStatus !== "subscribed") {
      if (notificationPermission !== "granted") await requestNotifications();
      else await subscribeWebPush();
    }
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const result = await evolveFitApiClient.sendTestNotification({ endpoint: subscription?.endpoint, localProfileId: localProfileId() });
    if (result.ok && result.data?.sent) {
      setToast("Đã gửi thử Web Push");
      return;
    }
    registration?.active?.postMessage({
      type: "EVOLVEFIT_TEST_NOTIFICATION",
      payload: { title: "Thông báo thử EvolveFit", body: "Thông báo dự phòng trong app/dịch vụ nền." }
    });
    setToast("Đã dùng thông báo thử bằng cơ chế dự phòng");
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setToast("Trình duyệt chưa hỗ trợ Notification API");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      await subscribeWebPush();
      return;
    }
    setToast("Chưa bật quyền thông báo");
  }

  function undo() {
    if (!state.undo) return;
    commit(state.undo.state, `Đã hoàn tác ${state.undo.label}`);
  }

  function nextOpenQueueIndex(queue: SessionExerciseQueueItem[], currentIndex: number): number {
    const afterCurrent = queue.findIndex((item, index) => index > currentIndex && item.status !== "completed");
    if (afterCurrent >= 0) return afterCurrent;
    return queue.findIndex((item) => item.status !== "completed");
  }

  function replaceWorkoutSession(session: WorkoutSession): WorkoutSession[] {
    return state.workoutSessions.map((item) => (item.id === session.id ? session : item));
  }

  function commitWorkoutSet(completed: WorkoutSet, label: string, message: string) {
    const prs = detectWorkoutSetPrs(state.workoutSets, completed);
    const commitMessage = prs.length ? `PR mới: ${prs.map((pr) => pr.label).join(", ")}` : message;
    const countsTowardTarget = (completed.setType ?? "working") !== "warmup";
    const finishedExercise = countsTowardTarget && completedSetsForActive.length + 1 >= activeExercise.targetSets;
    const completedSession =
      activeWorkoutSession && finishedExercise ? completeSessionExercise(activeWorkoutSession, activeExercise.id) : activeWorkoutSession;
    const nextWorkoutSets = [...state.workoutSets, completed];
    const supersetIndex =
      countsTowardTarget && !finishedExercise
        ? nextSupersetExerciseIndex({
            exercises: activeWorkoutSession ? activeSessionExercises : state.workoutExercises,
            currentIndex: state.activeExerciseIndex,
            sets: currentSessionSets.concat(completed)
          })
        : undefined;
    const nextExerciseIndex =
      completedSession && finishedExercise
        ? nextOpenQueueIndex(completedSession.exerciseQueue, state.activeExerciseIndex)
        : supersetIndex ?? state.activeExerciseIndex;
    const shouldFinishSession = Boolean(completedSession && finishedExercise && nextExerciseIndex < 0);
    const restEndsAt = new Date(Date.now() + activeExercise.restSeconds * 1000).toISOString();
    if (shouldFinishSession) {
      setWorkoutMode("finished");
    }
    setRestPausedSeconds(null);
    setRestNotifiedFor(null);
    setNowMs(Date.now());
    setLivePrBadges(prs);
    if (prs.length) window.setTimeout(() => setLivePrBadges([]), 8000);
    const finishedSession = shouldFinishSession && completedSession ? finishWorkoutSession(completedSession) : undefined;
    withUndo(
      {
        ...state,
        workoutSets: nextWorkoutSets,
        workoutSessions: finishedSession
          ? replaceWorkoutSession(finishedSession)
          : completedSession
            ? replaceWorkoutSession(completedSession)
            : state.workoutSessions,
        activeWorkoutSessionId: finishedSession ? undefined : state.activeWorkoutSessionId,
        activeExerciseIndex: Math.max(0, nextExerciseIndex),
        restEndsAt: finishedSession ? undefined : restEndsAt,
        syncQueue: enqueueSync(state.syncQueue, { type: label === "skip set" ? "workout.set.skip" : "workout.set.create", payload: completed })
      },
      label,
      commitMessage
    );
  }

  function completeSet() {
    if (!state.workoutExercises.length) {
      setToast("Thêm hoặc nhập bài tập trước khi ghi set.");
      return;
    }
    if (!activeWorkoutSession) {
      startWorkout();
      return;
    }
    const completed: WorkoutSet = {
      id: cryptoSafeId(),
      sessionId: activeWorkoutSession.id,
      exerciseId: activeExercise.id,
      exerciseName: activeExercise.name,
      targetWeightKg: activeExercise.targetWeightKg,
      targetReps: activeExercise.targetRepsMin,
      setType,
      actualWeightKg: setWeight,
      actualReps: setReps,
      rpe: setRpe,
      completedAt: new Date().toISOString()
    };
    commitWorkoutSet(completed, "set", `Hoàn thành ${setType} set ${completedSetsForActive.length + 1}`);
  }

  function skipCurrentSet() {
    if (!state.workoutExercises.length) return;
    if (!activeWorkoutSession) {
      startWorkout();
      return;
    }
    const skipped: WorkoutSet = {
      id: cryptoSafeId(),
      sessionId: activeWorkoutSession.id,
      exerciseId: activeExercise.id,
      exerciseName: activeExercise.name,
      targetWeightKg: activeExercise.targetWeightKg,
      targetReps: activeExercise.targetRepsMin,
      setType: "working",
      actualWeightKg: activeExercise.targetWeightKg,
      actualReps: 0,
      completedAt: new Date().toISOString()
    };
    commitWorkoutSet(skipped, "skip set", `Đã bỏ qua set ${completedSetsForActive.length + 1}`);
  }

  function updateWorkoutSet(id: string, patch: Partial<WorkoutSet>) {
    const workoutSets = state.workoutSets.map((set) => (set.id === id ? { ...set, ...patch } : set));
    withUndo(
      { ...state, workoutSets, syncQueue: enqueueSync(state.syncQueue, { type: "workout.set.patch", payload: { id, patch } }) },
      "edit set",
      "Đã cập nhật set"
    );
  }

  function deleteWorkoutSet(id: string) {
    withUndo(
      { ...state, workoutSets: state.workoutSets.filter((set) => set.id !== id), syncQueue: enqueueSync(state.syncQueue, { type: "workout.set.delete", payload: { id } }) },
      "delete set",
      "Đã xóa set"
    );
  }

  function startWorkout() {
    if (!state.workoutExercises.length) {
      setToast("Thêm hoặc nhập bài tập trước khi bắt đầu buổi tập.");
      return;
    }
    const session = createWorkoutSession({
      routineId: activeRoutine?.id ?? state.activeRoutineId,
      workoutDayId: activeWorkoutDay?.id ?? state.selectedWorkoutDayId,
      sessionName: activeWorkoutDay?.name ?? "Buổi tập",
      sessionExerciseOrder: state.workoutExercises.map((exercise) => exercise.id)
    });
    setWorkoutMode("live");
    setRestPausedSeconds(null);
    setRestNotifiedFor(null);
    commit(
      {
        ...state,
        workoutSessions: [...state.workoutSessions, session],
        activeWorkoutSessionId: session.id,
        activeExerciseIndex: 0,
        restEndsAt: undefined,
        syncQueue: enqueueSync(state.syncQueue, { type: "workout.session.start", payload: session })
      },
      "Bắt đầu buổi tập"
    );
  }

  function finishWorkout() {
    setRestPausedSeconds(null);
    if (activeWorkoutSession) {
      const finished = finishWorkoutSession(activeWorkoutSession);
      commitSynced(
        {
          ...state,
          workoutSessions: state.workoutSessions.map((session) => (session.id === finished.id ? finished : session)),
          activeWorkoutSessionId: undefined,
          restEndsAt: undefined
        },
        "workout.session.finish",
        finished,
        "Đã kết thúc buổi tập"
      );
    }
    setWorkoutMode("finished");
  }

  function selectWorkoutExercise(id: string) {
    const index = activeWorkoutSession
      ? activeSessionQueue.findIndex((item) => item.exerciseId === id)
      : state.workoutExercises.findIndex((exercise) => exercise.id === id);
    if (index < 0) return;
    commitSynced({ ...state, activeExerciseIndex: index }, "workout.session.selectExercise", { id }, "Đã chọn bài tập");
  }

  function skipActiveExercise() {
    if (!activeWorkoutSession) {
      const nextIndex = Math.min(state.activeExerciseIndex + 1, state.workoutExercises.length - 1);
      commitSynced({ ...state, activeExerciseIndex: nextIndex }, "workout.session.skipExercise", { from: activeExercise.id }, "Đã bỏ qua bài tập");
      return;
    }
    const parked = parkSessionExercise(activeWorkoutSession, activeExercise.id);
    const nextIndex = Math.min(state.activeExerciseIndex, Math.max(0, parked.exerciseQueue.length - 1));
    commitSynced(
      { ...state, workoutSessions: replaceWorkoutSession(parked), activeExerciseIndex: nextIndex },
      "workout.session.skipExercise",
      { sessionId: activeWorkoutSession.id, from: activeExercise.id, queue: parked.exerciseQueue },
      "Đã bỏ qua bài tập"
    );
  }

  function reorderSessionExercise(id: string, direction: -1 | 1) {
    if (!activeWorkoutSession) return;
    const reordered = reorderSessionExerciseQueue(activeWorkoutSession, id, direction);
    const activeIndex = reordered.exerciseQueue.findIndex((item) => item.exerciseId === activeExercise.id);
    commitSynced(
      { ...state, workoutSessions: replaceWorkoutSession(reordered), activeExerciseIndex: Math.max(0, activeIndex) },
      "workout.session.reorder",
      { sessionId: activeWorkoutSession.id, queue: reordered.exerciseQueue },
      "Đã cập nhật hàng đợi buổi tập"
    );
  }

  function saveWorkoutOrderToRoutine() {
    if (!activeRoutine || !activeWorkoutSession) return;
    const normalizedSession = normalizeWorkoutSessionQueue(activeWorkoutSession);
    const updatedRoutine = saveSessionExerciseOrderToRoutine(activeRoutine, activeWorkoutSession.workoutDayId, normalizedSession.exerciseQueue);
    const updatedDay = updatedRoutine.days.find((day) => day.id === activeWorkoutSession.workoutDayId);
    commitSynced(
      {
        ...state,
        activeTemplate: "custom",
        routines: state.routines.map((routine) => (routine.id === updatedRoutine.id ? updatedRoutine : routine)),
        workoutExercises: updatedDay ? routineExercisesToWorkoutExercises(updatedDay.exercises) : state.workoutExercises
      },
      "routine.saveSessionOrder",
      { routineId: updatedRoutine.id, workoutDayId: activeWorkoutSession.workoutDayId, queue: normalizedSession.exerciseQueue },
      "Đã lưu thứ tự buổi tập vào lịch"
    );
  }

  function pauseRestTimer() {
    if (state.restEndsAt) {
      setRestPausedSeconds(Math.max(0, Math.ceil((new Date(state.restEndsAt).getTime() - Date.now()) / 1000)));
    }
    if (activeWorkoutSession) {
      const paused = pauseWorkoutSession(activeWorkoutSession);
      commitSynced(
        { ...state, workoutSessions: state.workoutSessions.map((session) => (session.id === paused.id ? paused : session)) },
        "workout.session.pause",
        paused,
        "Đã tạm dừng buổi tập"
      );
    }
  }

  function resumeRestTimer() {
    if (!activeWorkoutSession && restPausedSeconds === null) return;
    setRestNotifiedFor(null);
    const resumedSessions = activeWorkoutSession
      ? state.workoutSessions.map((session) => (session.id === activeWorkoutSession.id ? resumeWorkoutSession(session) : session))
      : state.workoutSessions;
    const nextState = {
      ...state,
      workoutSessions: resumedSessions,
      restEndsAt: restPausedSeconds !== null ? new Date(Date.now() + restPausedSeconds * 1000).toISOString() : state.restEndsAt
    };
    if (activeWorkoutSession) {
      commitSynced(nextState, "workout.session.resume", resumeWorkoutSession(activeWorkoutSession), "Đã tiếp tục buổi tập");
    } else {
      commit(nextState, "Đã tiếp tục đồng hồ nghỉ");
    }
    setRestPausedSeconds(null);
    setNowMs(Date.now());
  }

  function adjustRestTimer(deltaSeconds: number) {
    if (restPausedSeconds !== null) {
      setRestPausedSeconds(Math.max(0, restPausedSeconds + deltaSeconds));
      return;
    }
    const currentRemaining = state.restEndsAt ? Math.max(0, Math.ceil((new Date(state.restEndsAt).getTime() - Date.now()) / 1000)) : 0;
    const nextRemaining = Math.max(0, currentRemaining + deltaSeconds);
    setRestNotifiedFor(null);
    commit({ ...state, restEndsAt: nextRemaining ? new Date(Date.now() + nextRemaining * 1000).toISOString() : undefined }, "Adjust rest timer");
    setNowMs(Date.now());
  }

  function resetRestTimer() {
    setRestPausedSeconds(null);
    setRestNotifiedFor(null);
    commit({ ...state, restEndsAt: new Date(Date.now() + activeExercise.restSeconds * 1000).toISOString() }, "Reset rest timer");
    setNowMs(Date.now());
  }

  function updateProfile(next: Partial<AppState["profile"]>) {
    const nextProfile = { ...state.profile, ...next };
    const nextDrinkModules = normalizeDrinkModules(state.drinkModules, nextProfile.waterTargetMl, nextProfile.creatineAmountG).map((module) => {
      if (module.id === "water" && next.waterTargetMl !== undefined) return { ...module, goal: nextProfile.waterTargetMl };
      if (module.id === "creatine" && next.creatineAmountG !== undefined) return { ...module, goal: nextProfile.creatineAmountG };
      return module;
    });
    commit({ ...state, profile: nextProfile, drinkModules: nextDrinkModules });
  }

  function updateNotificationSettings(next: Partial<AppState["notificationSettings"]>) {
    commit({ ...state, notificationSettings: { ...state.notificationSettings, ...next } });
  }

  function updateSocialPrivacy(next: Partial<SocialPrivacySettings>) {
    const socialPrivacy = { ...state.socialPrivacy, ...next };
    commitSynced({ ...state, socialPrivacy }, "social.privacy.update", socialPrivacy, "Updated social privacy");
  }

  function updateHealthIntegration(next: Partial<HealthIntegrationSettings>) {
    const healthIntegration = { ...state.healthIntegration, ...next };
    commitSynced({ ...state, healthIntegration }, "health.permission.update", healthIntegration, "Updated health permissions");
  }

  function requestHealthPermission() {
    const healthIntegration = requestHealthIntegrationPermission(state.healthIntegration, state.healthIntegration.selectedDataTypes);
    commitSynced({ ...state, healthIntegration }, "health.permission.request", healthIntegration, "Health permission request saved");
    if (!healthIntegration.nativeBridgeAvailable) {
      setToast("Đã lưu lựa chọn quyền sức khỏe. Cần cầu nối ứng dụng trước khi đồng bộ.");
    }
  }

  function revokeHealthPermission() {
    const healthIntegration = revokeHealthIntegrationPermission(state.healthIntegration);
    commitSynced({ ...state, healthIntegration }, "health.permission.revoke", healthIntegration, "Health permissions revoked");
  }

  function addFriend() {
    const friend: Friend = {
      id: cryptoSafeId(),
      displayName: "New friend",
      handle: `@friend${state.friends.length + 1}`,
      status: "pending",
      badgeStreakMonths: 0,
      score: 0,
      addedAt: new Date().toISOString()
    };
    commitSynced({ ...state, friends: [friend, ...state.friends] }, "social.friend.add", friend, "Added friend invite");
  }

  function updateFriend(id: string, patch: Partial<Friend>) {
    commitSynced(
      { ...state, friends: state.friends.map((friend) => (friend.id === id ? { ...friend, ...patch } : friend)) },
      "social.friend.update",
      { id, patch },
      "Đã cập nhật bạn bè"
    );
  }

  function publishSocialShare(kind: SharedPost["kind"]) {
    const preview = kind === "badge" ? badgeSharePreview : workoutSummarySharePreview;
    const post = publishSharePreview(preview, state.socialPrivacy);
    if (!post) {
      setToast("Bật quyền chia sẻ tương ứng trước khi đăng.");
      return;
    }
    commitSynced({ ...state, sharedPosts: [post, ...state.sharedPosts] }, "social.share.publish", post, "Đã chia sẻ với bạn bè riêng tư");
  }

  function updatePlateSettings(next: Partial<PlateSettings>) {
    const plateSettings = {
      ...state.plateSettings,
      ...next,
      plateInventoryKg: next.plateInventoryKg ? normalizePlateInventory(next.plateInventoryKg) : state.plateSettings.plateInventoryKg
    };
    commit({ ...state, plateSettings });
  }

  function markQueue(status: "synced" | "failed") {
    commit({ ...state, syncQueue: markSyncQueue(state.syncQueue, status) }, status === "synced" ? "Đã đánh dấu đồng bộ xong" : "Đã đánh dấu đồng bộ lỗi");
  }

  function retryQueueItem(id: string) {
    commit(
      {
        ...state,
        syncQueue: state.syncQueue.map((item) =>
          item.id === id ? { ...item, status: "pending", nextRetryAt: undefined, lastError: undefined, updatedAt: new Date().toISOString() } : item
        )
      },
      "Đã đưa mục vào hàng đợi thử lại"
    );
  }

  function confirmRoutineConflict(id: string) {
    commit(
      {
        ...state,
        syncQueue: state.syncQueue.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "pending",
                payload: { ...(item.payload as Record<string, unknown>), conflictResolution: "confirm" },
                conflict: undefined,
                lastError: undefined,
                nextRetryAt: undefined,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      },
      "Đã xác nhận lịch tập để đồng bộ"
    );
  }

  function clearQueue(status?: SyncQueueItem["status"]) {
    commit(
      { ...state, syncQueue: status ? state.syncQueue.filter((item) => item.status !== status) : [] },
      status ? `Đã xóa mục ${syncQueueStatusLabel(status).toLowerCase()} trong hàng đợi` : "Đã xóa toàn bộ hàng đợi đồng bộ"
    );
  }

  const legacyRecommendationPlaceholder = {
    title: "Gợi ý V1 đã chuyển sang Tiến độ",
    reason: "Coach không nằm trong navigation chính của V1."
  };

  void legacyRecommendationPlaceholder;

  function decideRecommendation(decision: "accepted" | "rejected") {
    const decidedAt = new Date().toISOString();
    const recommendationId = activeRecommendation.id;
    const feedback = coachFeedback.trim() || undefined;
    const decisionRecord: RecommendationDecision = {
      id: cryptoSafeId(),
      recommendationId,
      title: activeRecommendation.title,
      source: activeRecommendation.source,
      action: activeRecommendation.action,
      nextWeightKg: activeRecommendation.nextWeightKg,
      decision,
      reason: activeRecommendation.reason,
      feedback,
      decidedAt
    };
    const historyItem: RecommendationHistoryItem = {
      ...activeRecommendation,
      id: recommendationId,
      status: decision,
      feedback
    };
    commit(
      {
        ...state,
        recommendationHistory: [historyItem, ...state.recommendationHistory.filter((item) => item.id !== recommendationId)].slice(0, 50),
        recommendationDecisions: [decisionRecord, ...state.recommendationDecisions]
      },
      decision === "accepted" ? "Đã áp dụng recommendation" : "Đã từ chối recommendation"
    );
  }

  const hydrationViewProps = {
    totalWater,
    percent,
    target: state.profile.waterTargetMl,
    pace,
    quickWater,
    waterAmount,
    setWaterAmount,
    logWater,
    drinkType,
    setDrinkType,
    quickAmounts: state.quickAmounts.filter((item) => item.category === "hydration"),
    updateQuickAmount: (id: string, patch: { pinned?: boolean }) =>
      commit({
        ...state,
        quickAmounts: state.quickAmounts.map((item) => (item.id === id ? { ...item, ...patch } : item))
      }),
    deleteQuickAmount: (id: string) => commit({ ...state, quickAmounts: state.quickAmounts.filter((item) => item.id !== id) }),
    quickCreatine,
    creatineAmount,
    setCreatineAmount,
    logCreatine,
    creatineLogged: state.supplementLogs.some(
      (log) => log.name === "Creatine" && log.status !== "skipped" && log.loggedAt.startsWith(now.toISOString().slice(0, 10))
    ),
    creatineActive,
    creatineReminder,
    activeOptionalDrinkModules,
    hydrationLogs: activeHydrationLogs,
    editHydrationLog,
    deleteHydrationLog,
    waterReminderEnabled: waterModule?.reminderEnabled !== false && state.notificationSettings.hydrationEnabled,
    waterReminderLabel: hydrationReminderLabel,
    updateProfile,
    updateNotificationSettings
  };

  const restSeconds = useMemo(() => {
    if (restPausedSeconds !== null) return restPausedSeconds;
    if (!state.restEndsAt) return 0;
    return Math.max(0, Math.ceil((new Date(state.restEndsAt).getTime() - nowMs) / 1000));
  }, [nowMs, restPausedSeconds, state.restEndsAt]);

  const onboardingProps = {
    profile: state.profile,
    updateProfile,
    activeTemplate: state.activeTemplate,
    applyTemplate,
    step: onboardingStep,
    setStep: setOnboardingStep,
    notificationSettings: state.notificationSettings,
    notificationPermission,
    updateNotificationSettings,
    requestNotifications,
    completeOnboarding
  };

  const todayProps = {
    totalWater,
    percent,
    target: state.profile.waterTargetMl,
    pace,
    creatineAmount,
    logCreatine,
    creatineLogged: state.supplementLogs.some(
      (log) => log.name === "Creatine" && log.status !== "skipped" && log.loggedAt.startsWith(now.toISOString().slice(0, 10))
    ),
    creatineActive,
    workoutName: "Push Day",
    workoutExerciseCount: state.workoutExercises.length,
    workoutProgressPercent,
    logWater,
    setTab: (nextTab: "hydration" | "workout") => setTab(nextTab),
    recentLogs: activeHydrationLogs.slice(-3).reverse(),
    latestMetric
  };

  const workoutProps = {
    state,
    activeRoutine,
    activeWorkoutDay,
    activeWorkoutSession,
    sessionQueue: activeSessionQueue,
    currentSessionSets,
    filteredExerciseLibrary,
    marketplaceExercises,
    customExerciseLibrary,
    selectedMarketplaceExercise,
    selectMarketplaceExercise: setSelectedMarketplaceExerciseId,
    activeExercise,
    completedSets: completedSetsForActive,
    allSetsForActive,
    livePrBadges,
    plateSettings: state.plateSettings,
    setWeight,
    setSetWeight,
    setReps,
    setSetReps,
    setRpe,
    setSetRpe,
    setType,
    setSetType,
    mode: workoutMode,
    startWorkout,
    finishWorkout,
    backToPlan: () => setWorkoutMode("plan"),
    completeSet,
    selectExercise: selectWorkoutExercise,
    skipExercise: skipActiveExercise,
    restSeconds,
    restPaused: restPausedSeconds !== null || activeWorkoutSession?.status === "paused",
    pauseRestTimer,
    resumeRestTimer,
    adjustRestTimer,
    resetRestTimer,
    skipCurrentSet,
    updateWorkoutSet,
    deleteWorkoutSet,
    librarySearch,
    setLibrarySearch,
    libraryMuscleFilter,
    setLibraryMuscleFilter,
    libraryEquipmentFilter,
    setLibraryEquipmentFilter,
    libraryDifficultyFilter,
    setLibraryDifficultyFilter,
    libraryTagFilter,
    setLibraryTagFilter,
    newLibraryExerciseName,
    setNewLibraryExerciseName,
    newLibraryMuscleGroup,
    setNewLibraryMuscleGroup,
    newLibraryEquipment,
    setNewLibraryEquipment,
    newLibraryPattern,
    setNewLibraryPattern,
    newExerciseName,
    setNewExerciseName,
    addExercise,
    routineImportPreview,
    previewRoutineImport,
    downloadRoutineSampleXlsx,
    confirmRoutineImport,
    clearRoutineImport: () => setRoutineImportPreview(null),
    workoutPlannerPreview,
    previewWorkoutPlanner,
    applyWorkoutPlanner,
    clearWorkoutPlanner: () => setWorkoutPlannerPreview(null),
    deleteExercise,
    moveExercise,
    reorderSessionExercise,
    saveWorkoutOrderToRoutine,
    applyTemplate,
    updateExerciseTarget,
    updateRoutineName,
    selectWorkoutDay,
    updateWorkoutDay,
    addWorkoutDay,
    deleteWorkoutDay,
    addExerciseFromLibrary,
    cloneExerciseFromMarketplace,
    addCustomExerciseDefinition,
    updateExerciseDefinition,
    deleteExerciseDefinition,
    routineTemplateCatalog,
    selectedRoutineTemplate,
    routineTemplatePreview: activeRoutineTemplatePreview,
    routineTemplateSearch,
    setRoutineTemplateSearch,
    routineTemplateGoalFilter,
    setRoutineTemplateGoalFilter,
    routineTemplateEquipmentFilter,
    setRoutineTemplateEquipmentFilter,
    selectRoutineTemplate: setSelectedRoutineTemplateId,
    previewRoutineTemplate,
    applyRoutineMarketplaceTemplate,
    wakeLockStatus
  };

  const progressProps = {
    totalWater,
    target: state.profile.waterTargetMl,
    sets: state.workoutSets,
    bestSet,
    progress: progressDashboard,
    reports: progressReports,
    achievements,
    bodyMetrics: state.bodyMetrics,
    bodyMetricChart,
    bodyMetricRange,
    setBodyMetricRange,
    bodyMetricWarnings,
    unitWeight: state.profile.unitWeight,
    updateProfile,
    latestMetric,
    weightDelta,
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
    addBodyMetric,
    deleteBodyMetric,
    updateBodyMetric,
    coachRecommendation: activeRecommendation,
    coachFeedback,
    setCoachFeedback,
    recommendationHistory: state.recommendationHistory,
    recommendationDecisions: state.recommendationDecisions,
    decideRecommendation,
    socialLeaderboard,
    badgeSharePreview,
    workoutSummarySharePreview,
    sharedPosts: state.sharedPosts,
    publishSocialShare,
    downloadExport,
    downloadReportPdf
  };

  const settingsProps = {
    state,
    updateProfile,
    signInLocal: (mode: AppState["profile"]["authMode"]) => updateProfile({ authMode: mode }),
    authPassword,
    setAuthPassword,
    authResetToken,
    setAuthResetToken,
    cloudMergePreview,
    authenticateEmail,
    startGoogleOAuth,
    refreshAuthSession,
    requestPasswordResetEmail,
    resetAccountPassword,
    mergeLocalAccountToCloud,
    replaceLocalWithCloud,
    keepLocalAccountData,
    signOutAccount,
    deleteCloudAccount,
    reset: () => commit(resetState(), "Đã khôi phục dữ liệu mẫu"),
    deletePersonalData: deleteLocalPersonalData,
    notificationPermission,
    pushConfigured,
    pushSubscriptionStatus,
    healthDashboard,
    requestNotifications,
    subscribeWebPush,
    unsubscribeWebPush,
    sendTestPushNotification,
    markQueue,
    retryQueueItem,
    confirmRoutineConflict,
    clearQueue,
    downloadExport,
    downloadCsvExport,
    importJsonExport,
    restoreSections,
    setRestoreSections,
    updateNotificationSettings,
    updatePlateSettings,
    updateSocialPrivacy,
    updateHealthIntegration,
    requestHealthPermission,
    revokeHealthPermission,
    addFriend,
    updateFriend,
    drinkModules,
    updateDrinkModule,
    reopenOnboarding: () => {
      setOnboardingStep(0);
      updateProfile({ onboardingCompleted: false });
    }
  };

  return (
    <AppChrome
      active={tab}
      hasReminder={hydrationReminder || creatineReminder}
      isInkShell={tab === "today" && state.profile.onboardingCompleted}
      now={now}
      onNavigate={navigateToTab}
      onUndo={undo}
      showNavigation={state.profile.onboardingCompleted && !(tab === "workout" && workoutMode === "live")}
      showUndo={Boolean(state.undo)}
      syncStatus={syncStatus}
      syncStatusLabel={syncStatusLabel(syncStatus)}
      timezone={state.profile.timezone}
      toast={toast}
    >
      <AppSectionRouter
        hydrationProps={hydrationViewProps}
        isOnboarded={state.profile.onboardingCompleted}
        onboardingProps={onboardingProps}
        progressProps={progressProps}
        settingsProps={settingsProps}
        tab={tab}
        todayProps={todayProps}
        workoutProps={workoutProps}
      />
    </AppChrome>
  );
}


