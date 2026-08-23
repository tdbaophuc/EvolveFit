"use client";

import {
  Activity,
  Award,
  Bell,
  CalendarCheck,
  Check,
  ChevronRight,
  Dumbbell,
  Home,
  Minus,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  Trophy,
  User,
  Waves,
  X
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  createCustomExerciseDefinition,
  createWorkoutSession,
  cryptoSafeId,
  completeSessionExercise,
  buildBodyMetricChartDataset,
  buildProgressDashboard,
  calculatePlatesPerSide,
  detectWorkoutSetPrs,
  displayWeight,
  estimatedOneRepMax,
  expectedHydrationByNow,
  latestBodyMetric,
  bodyWeightDelta,
  formatWeight,
  hydrationPaceStatus,
  hydrationPercent,
  hydrationTotal,
  inputWeightToKg,
  isWorkingVolumeSet,
  isDrinkModuleActive,
  monthlyAchievements,
  normalizeDrinkModules,
  normalizePlateInventory,
  normalizeWorkoutSessionQueue,
  nextSupersetExerciseIndex,
  parseRoutineCsv,
  parkSessionExercise,
  readinessScore,
  filterExerciseLibrary,
  finishWorkoutSession,
  migrateWorkoutExercisesToRoutine,
  pauseWorkoutSession,
  resumeWorkoutSession,
  reorderSessionExerciseQueue,
  routineExercisesToWorkoutExercises,
  saveSessionExerciseOrderToRoutine,
  selectedWorkoutDay,
  rowsToRoutineCsv,
  enqueueSync,
  markSyncQueue,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  suggestedRoutineTemplate,
  suggestedWaterTargetMl,
  toCsv,
  upsertQuickAmount,
  validateBodyMetric,
  visibleHydrationLogs,
  visibleQuickAmounts,
  warmUpSetSuggestions,
  workingSetVolumeKg,
  type BodyMetric,
  type BodyMetricChartDataset,
  type BodyMetricRangeDays,
  type DrinkModule,
  type EquipmentType,
  type ExerciseDefinition,
  type HydrationLog,
  type MovementPattern,
  type PlateCalculation,
  type PlateSettings,
  type RoutineImportPreview,
  type RoutineExercise,
  type SessionExerciseQueueItem,
  type Supplement,
  type ProgressDashboard,
  type WorkoutSession,
  type WorkoutSetPr,
  type WorkoutExercise,
  type WorkoutSet,
  type WorkoutSetType
} from "@/lib/core";
import {
  allRestoreSections,
  applySelectiveRestore,
  deletePersonalData,
  parseImportedAppData,
  stringifyAppDataExport,
  type RestoreSection
} from "@/lib/app-data";
import { initialState, routineTemplates, type AppState } from "@/lib/seed";
import { loadState, resetState, saveState } from "@/lib/storage";

type Tab = "today" | "hydration" | "workout" | "progress" | "settings";
type SyncStatus = "offline" | "pending" | "failed" | "synced";
type CsvDataset = "hydration" | "creatine" | "workouts" | "body-metrics";
type PushSubscriptionStatus = "unsupported" | "missing-env" | "unsubscribed" | "subscribed";
type WakeLockSentinelLike = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "today", label: "Today", icon: Home },
  { id: "hydration", label: "Water", icon: Waves },
  { id: "workout", label: "Workout", icon: Dumbbell },
  { id: "progress", label: "Progress", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings }
];

function syncStatusLabel(status: SyncStatus) {
  if (status === "offline") return "Offline";
  if (status === "pending") return "Pending sync";
  if (status === "failed") return "Sync failed";
  return "Synced";
}

export default function AppPage() {
  const [state, setState] = useState<AppState>(initialState);
  const [tab, setTab] = useState<Tab>("today");
  const [workoutMode, setWorkoutMode] = useState<"plan" | "live" | "finished">("plan");
  const [waterAmount, setWaterAmount] = useState(650);
  const [creatineAmount, setCreatineAmount] = useState(5);
  const [newSupplementName, setNewSupplementName] = useState("Whey");
  const [newSupplementAmount, setNewSupplementAmount] = useState(30);
  const [newExerciseName, setNewExerciseName] = useState("Lateral Raise");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState("all");
  const [libraryEquipmentFilter, setLibraryEquipmentFilter] = useState("all");
  const [newLibraryExerciseName, setNewLibraryExerciseName] = useState("Cable Fly");
  const [newLibraryMuscleGroup, setNewLibraryMuscleGroup] = useState("Chest");
  const [newLibraryEquipment, setNewLibraryEquipment] = useState<EquipmentType>("cable");
  const [newLibraryPattern, setNewLibraryPattern] = useState<MovementPattern>("isolation");
  const [routineImportPreview, setRoutineImportPreview] = useState<RoutineImportPreview | null>(null);
  const [newMetricWeight, setNewMetricWeight] = useState(72);
  const [newMetricBodyFat, setNewMetricBodyFat] = useState(18);
  const [newMetricWaist, setNewMetricWaist] = useState(82);
  const [newMetricChest, setNewMetricChest] = useState(96);
  const [newMetricArm, setNewMetricArm] = useState(34);
  const [newMetricThigh, setNewMetricThigh] = useState(56);
  const [newMetricNote, setNewMetricNote] = useState("");
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
  const [mounted, setMounted] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [drinkType, setDrinkType] = useState<HydrationLog["drinkType"]>("water");
  const [isOnline, setIsOnline] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());
  const [restPausedSeconds, setRestPausedSeconds] = useState<number | null>(null);
  const [restNotifiedFor, setRestNotifiedFor] = useState<string | null>(null);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
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
    if (mounted) saveState(state);
  }, [mounted, state]);

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
    if (!mounted || !isOnline || !state.syncQueue.some((item) => item.status === "pending")) return;
    const id = window.setTimeout(() => {
      setState((current) => ({ ...current, syncQueue: markSyncQueue(current.syncQueue, "synced") }));
      setToast("Offline queue đã retry local và đánh dấu synced");
    }, 1200);
    return () => window.clearTimeout(id);
  }, [mounted, isOnline, state.syncQueue]);

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
    if (tab !== "workout" || !wakeLockNavigator.wakeLock) return;

    wakeLockNavigator.wakeLock
      .request("screen")
      .then((lock) => {
        wakeLock = lock;
      })
      .catch(() => undefined);

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
      ? `Snooze đến ${new Date(state.notificationSettings.snoozeUntil).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
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

    setToast("Đến giờ creatine. Log taken hoặc skip để không nhắc lại hôm nay.");
    setState((current) => ({
      ...current,
      notificationSettings: { ...current.notificationSettings, lastCreatineReminderAt: remindedAt }
    }));
  }, [creatineReminder, hydrationReminder, mounted, notificationPermission, state.notificationSettings.inAppFallbackEnabled]);

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
    equipment: libraryEquipmentFilter
  });
  const activeQueueItem = activeSessionQueue[state.activeExerciseIndex] ?? activeSessionQueue.find((item) => item.status !== "completed") ?? activeSessionQueue[0];
  const activeExercise =
    (activeWorkoutSession && activeQueueItem
      ? state.workoutExercises.find((exercise) => exercise.id === activeQueueItem.exerciseId)
      : state.workoutExercises[state.activeExerciseIndex]) ??
    state.workoutExercises[0] ??
    emptyExercise;
  const completedSetsForActive = currentSessionSets.filter((set) => set.exerciseId === activeExercise.id && (set.setType ?? "working") !== "warmup");
  const allSetsForActive = currentSessionSets.filter((set) => set.exerciseId === activeExercise.id);
  const achievements = monthlyAchievements({
    hydrationGoalDays: 18,
    hydrationTargetDays: 24,
    volumeChangePercent: 6,
    previousHydrationStreak: 2,
    previousVolumeStreak: 1
  });
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
    : state.syncQueue.some((item) => item.status === "failed")
      ? "failed"
      : state.syncQueue.some((item) => item.status === "pending")
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
      setToast(`${type} is disabled in Drink settings.`);
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
      setToast("Creatine is disabled in Drink settings.");
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

  function logSupplement(supplement: Supplement) {
    if (!supplement.active) return;
    const log = {
      id: cryptoSafeId(),
      supplementId: supplement.id,
      name: supplement.name,
      amount: supplement.defaultAmount,
      unit: supplement.unit,
      loggedAt: new Date().toISOString(),
      status: "taken" as const
    };
    withUndo({ ...state, supplementLogs: [...state.supplementLogs, log], syncQueue: enqueueSync(state.syncQueue, { type: "supplement.log", payload: log }) }, supplement.name, `Đã ghi nhận ${supplement.name}`);
  }

  function skipSupplement(supplement: Supplement) {
    if (!supplement.active) return;
    const log = {
      id: cryptoSafeId(),
      supplementId: supplement.id,
      name: supplement.name,
      amount: 0,
      unit: supplement.unit,
      loggedAt: new Date().toISOString(),
      status: "skipped" as const
    };
    withUndo({ ...state, supplementLogs: [...state.supplementLogs, log], syncQueue: enqueueSync(state.syncQueue, { type: "supplement.skip", payload: log }) }, supplement.name, `Đã bỏ qua ${supplement.name}`);
  }

  function addSupplement() {
    const supplement: Supplement = {
      id: cryptoSafeId(),
      name: newSupplementName.trim() || "Supplement",
      defaultAmount: newSupplementAmount,
      unit: "g",
      scheduleHours: [],
      active: true
    };
    commitSynced({ ...state, supplements: [...state.supplements, supplement] }, "supplement.create", supplement, `Đã thêm ${supplement.name}`);
  }

  function updateDrinkModule(id: DrinkModule["id"], patch: Partial<DrinkModule>) {
    if (id === "water" && patch.active === false) {
      setToast("Water is the primary drink and cannot be disabled.");
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

  function deleteSupplement(id: string) {
    commitSynced({ ...state, supplements: state.supplements.filter((supplement) => supplement.id !== id) }, "supplement.delete", { id }, "Đã xóa supplement");
  }

  function updateSupplementLocal(id: string, patch: Partial<Supplement>) {
    const target = state.supplements.find((supplement) => supplement.id === id);
    const syncCreatineActive = target?.name.toLowerCase() === "creatine" && patch.active !== undefined;
    commitSynced(
      {
        ...state,
        supplements: state.supplements.map((supplement) => (supplement.id === id ? { ...supplement, ...patch } : supplement)),
        drinkModules: syncCreatineActive
          ? normalizeDrinkModules(state.drinkModules, state.profile.waterTargetMl, state.profile.creatineAmountG).map((module) =>
              module.id === "creatine" ? { ...module, active: Boolean(patch.active) } : module
            )
          : state.drinkModules,
        notificationSettings:
          syncCreatineActive && patch.active === false
            ? { ...state.notificationSettings, creatineEnabled: false }
            : state.notificationSettings
      },
      "supplement.patch",
      { id, patch },
      "Đã cập nhật supplement"
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
      { routineId: updatedRoutine.id },
      label
    );
  }

  function updateActiveWorkoutDay(
    patch: (day: AppState["routines"][number]["days"][number]) => AppState["routines"][number]["days"][number],
    label = "Updated workout day"
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
      name: newExerciseName.trim() || "Custom Exercise",
      muscleGroup: "Custom",
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 12,
      targetWeightKg: 10,
      restSeconds: 60,
      lastSession: "Custom exercise"
    };
    updateActiveWorkoutDay(
      (day) => ({ ...day, exercises: [...day.exercises, routineExerciseFromWorkout(exercise, day.exercises.length)] }),
      `?? th?m ${exercise.name}`
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
            setRoutineImportPreview({ fileName: file.name, rows: [], errors: ["Workbook does not contain a worksheet."] });
            return;
          }
          const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], { header: 1, blankrows: false });
          setRoutineImportPreview(parseRoutineCsv(rowsToRoutineCsv(rows), file.name));
        })
        .catch(() => setRoutineImportPreview({ fileName: file.name, rows: [], errors: ["Could not read the selected spreadsheet."] }));
      return;
    }

    file
      .text()
      .then((text) => setRoutineImportPreview(parseRoutineCsv(text, file.name)))
      .catch(() => setRoutineImportPreview({ fileName: file.name, rows: [], errors: ["Could not read the selected file."] }));
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
      "routine.import",
      { fileName: routineImportPreview.fileName, mode, count: routineImportPreview.rows.length },
      `Imported ${routineImportPreview.rows.length} exercises`
    );
    setRoutineImportPreview(null);
  }

  function deleteExercise(id: string) {
    updateActiveWorkoutDay(
      (day) => ({
        ...day,
        exercises: day.exercises.filter((exercise) => exercise.id !== id).map((exercise, index) => ({ ...exercise, order: index }))
      }),
      "?? x?a b?i t?p"
    );
  }

  function updateExerciseTarget(id: string, patch: Partial<WorkoutExercise>) {
    updateActiveWorkoutDay(
      (day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise))
      }),
      "?? c?p nh?t b?i t?p"
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
      "?? s?p x?p routine"
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
      lastSession: "Template exercise",
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
            day("Push Day", "Mon", 0, routineTemplates.ppl.map((item, index) => routineExerciseFromWorkout(item, index))),
            day("Pull Day", "Wed", 1, [exercise("Chest Supported Row", "Back", 0, 40), exercise("Lat Pulldown", "Back", 1, 45), exercise("Dumbbell Curl", "Arms", 2, 12)]),
            day("Leg Day", "Fri", 2, [exercise("Back Squat", "Legs", 0, 80), exercise("Romanian Deadlift", "Legs", 1, 70), exercise("Leg Press", "Legs", 2, 120)])
          ]
        : template === "upper-lower"
          ? [
              day("Upper Day", "Mon", 0, routineTemplates["upper-lower"].map((item, index) => routineExerciseFromWorkout(item, index))),
              day("Lower Day", "Thu", 1, [exercise("Back Squat", "Legs", 0, 80), exercise("Romanian Deadlift", "Legs", 1, 70), exercise("Leg Press", "Legs", 2, 120)])
            ]
          : [
              day("Full Body A", "Mon", 0, routineTemplates["full-body"].map((item, index) => routineExerciseFromWorkout(item, index))),
              day("Full Body B", "Wed", 1, [exercise("Barbell Bench Press", "Chest", 0, 60), exercise("Chest Supported Row", "Back", 1, 40), exercise("Back Squat", "Legs", 2, 80)]),
              day("Full Body C", "Fri", 2, [exercise("Seated Shoulder Press", "Shoulders", 0, 24), exercise("Lat Pulldown", "Back", 1, 45), exercise("Romanian Deadlift", "Legs", 2, 70)])
            ];
    return {
      id: `routine-${template}-${cryptoSafeId()}`,
      name: template === "ppl" ? "Push/Pull/Legs" : template === "upper-lower" ? "Upper/Lower" : "Full Body",
      daysPerWeek: days.length,
      days,
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }

  function applyTemplate(template: AppState["activeTemplate"]) {
    if (template === "custom") {
      commit({ ...state, activeTemplate: "custom" }, "?? chuy?n sang Custom");
      return;
    }
    const routine = routineFromTemplate(template);
    commit(
      syncSelectedDay({
        ...state,
        activeTemplate: template,
        routines: [...state.routines, routine],
        activeRoutineId: routine.id,
        selectedWorkoutDayId: routine.days[0].id,
        workoutSets: [],
        activeExerciseIndex: 0
      }),
      `?? ?p d?ng template ${template}`
    );
  }

  function selectWorkoutDay(dayId: string) {
    const routine = activeRoutine;
    const day = routine?.days.find((item) => item.id === dayId);
    if (!routine || !day) return;
    commitSynced(
      syncSelectedDay({ ...state, selectedWorkoutDayId: day.id, activeExerciseIndex: 0 }),
      "routine.day.select",
      { routineId: routine.id, dayId },
      `Selected ${day.name}`
    );
  }

  function updateRoutineName(name: string) {
    updateActiveRoutine((routine) => ({ ...routine, name: name || "Untitled Routine" }), "Updated routine name");
  }

  function updateWorkoutDay(id: string, patch: Partial<AppState["routines"][number]["days"][number]>) {
    updateActiveRoutine(
      (routine) => ({
        ...routine,
        days: routine.days.map((day) => (day.id === id ? { ...day, ...patch } : day))
      }),
      "Updated workout day"
    );
  }

  function addWorkoutDay() {
    updateActiveRoutine((routine) => {
      const nextIndex = routine.days.length + 1;
      const day = {
        id: `day-${cryptoSafeId()}`,
        name: `Day ${nextIndex}`,
        day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][routine.days.length % 7],
        order: routine.days.length,
        exercises: []
      };
      return { ...routine, daysPerWeek: routine.days.length + 1, days: [...routine.days, day] };
    }, "Added workout day");
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
      "Deleted workout day"
    );
  }

  function addExerciseFromLibrary(definition: ExerciseDefinition) {
    const exercise: WorkoutExercise = {
      id: cryptoSafeId(),
      name: definition.name,
      muscleGroup: definition.muscleGroup,
      targetSets: 3,
      targetRepsMin: definition.movementPattern === "core" ? 30 : 8,
      targetRepsMax: definition.movementPattern === "core" ? 60 : 12,
      targetWeightKg: definition.equipment === "bodyweight" ? 0 : 20,
      restSeconds: definition.movementPattern === "isolation" ? 60 : 90,
      lastSession: definition.builtIn ? "Copied from built-in library" : "Custom library exercise"
    };
    updateActiveWorkoutDay(
      (day) => ({
        ...day,
        exercises: [...day.exercises, routineExerciseFromWorkout(exercise, day.exercises.length, definition.id)]
      }),
      `Added ${definition.name}`
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
      "exerciseLibrary.create",
      exercise,
      `Created ${exercise.name}`
    );
  }

  function updateExerciseDefinition(id: string, patch: Partial<ExerciseDefinition>) {
    const target = state.exerciseLibrary.find((exercise) => exercise.id === id);
    if (!target || target.builtIn) return;
    commitSynced(
      { ...state, exerciseLibrary: state.exerciseLibrary.map((exercise) => (exercise.id === id ? { ...exercise, ...patch, builtIn: false } : exercise)) },
      "exerciseLibrary.update",
      { id, patch },
      "Updated custom exercise"
    );
  }

  function deleteExerciseDefinition(id: string) {
    const target = state.exerciseLibrary.find((exercise) => exercise.id === id);
    if (!target || target.builtIn) return;
    commitSynced(
      { ...state, exerciseLibrary: state.exerciseLibrary.filter((exercise) => exercise.id !== id) },
      "exerciseLibrary.delete",
      { id },
      "Deleted custom exercise"
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
    if (!state.profile.name.trim() || !emailOk || state.profile.waterTargetMl < 1000 || state.profile.waterTargetMl > 6000 || !hoursOk || state.profile.workoutDays.length < 1) {
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
    const payload = stringifyAppDataExport(state);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "evolvefit-export.json";
    link.click();
    URL.revokeObjectURL(url);
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

  function importJsonExport(file: File) {
    readTextFile(file)
      .then((text) => {
        const imported = parseImportedAppData(text);
        if (!imported.ok) {
          setToast(`Import JSON không hợp lệ: ${imported.errors[0]}`);
          return;
        }
        if (!restoreSections.length) {
          setToast("Chọn ít nhất một nhóm dữ liệu để restore");
          return;
        }
        commit(applySelectiveRestore(state, imported.data, restoreSections), "Đã restore JSON theo lựa chọn");
      })
      .catch(() => setToast("Không import được JSON"));
  }

  function deleteLocalPersonalData() {
    commit(deletePersonalData(state), "Đã xóa dữ liệu cá nhân local");
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
      const response = await fetch(`/api/notifications/config?localProfileId=${encodeURIComponent(localProfileId())}`);
      const result = (await response.json()) as { ok?: boolean; data?: { vapidPublicKey?: string; configured?: boolean } };
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || result.data?.vapidPublicKey || null;
      setVapidPublicKey(key);
      setPushConfigured(Boolean(result.data?.configured && key));
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setPushSubscriptionStatus(!key || !result.data?.configured ? "missing-env" : subscription ? "subscribed" : "unsubscribed");
    } catch {
      setPushSubscriptionStatus("missing-env");
    }
  }

  async function subscribeWebPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushSubscriptionStatus("unsupported");
      setToast("TrÃ¬nh duyá»‡t khÃ´ng há»— trá»£ Web Push, sáº½ dÃ¹ng in-app fallback");
      return;
    }
    const key = vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key || !pushConfigured) {
      setPushSubscriptionStatus("missing-env");
      setToast("Thiáº¿u VAPID public key hoáº·c server env, sáº½ dÃ¹ng in-app fallback");
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
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...subscription.toJSON(), localProfileId: localProfileId(), platform: navigator.userAgent })
    });
    setPushSubscriptionStatus("subscribed");
    setToast("ÄÃ£ subscribe Web Push");
  }

  async function unsubscribeWebPush() {
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const endpoint = subscription?.endpoint;
    await subscription?.unsubscribe();
    if (endpoint) {
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint })
      });
    }
    setPushSubscriptionStatus(pushConfigured ? "unsubscribed" : "missing-env");
    setToast("ÄÃ£ unsubscribe Web Push");
  }

  async function sendTestPushNotification() {
    if (pushSubscriptionStatus !== "subscribed") {
      if (notificationPermission !== "granted") await requestNotifications();
      else await subscribeWebPush();
    }
    const registration = await getServiceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const response = await fetch("/api/notifications/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription?.endpoint, localProfileId: localProfileId() })
    });
    const result = (await response.json()) as { ok?: boolean; data?: { sent?: number } };
    if (result.ok && result.data?.sent) {
      setToast("ÄÃ£ gá»­i test Web Push");
      return;
    }
    registration?.active?.postMessage({
      type: "EVOLVEFIT_TEST_NOTIFICATION",
      payload: { title: "EvolveFit test", body: "In-app/service worker fallback notification." }
    });
    setToast("ÄÃ£ dÃ¹ng fallback test notification");
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
    const commitMessage = prs.length ? `New PR: ${prs.map((pr) => pr.label).join(", ")}` : message;
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
      setToast("Add or import an exercise before logging a set.");
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
    commitWorkoutSet(completed, "set", `Ho?n th?nh ${setType} set ${completedSetsForActive.length + 1}`);
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
    commitWorkoutSet(skipped, "skip set", `?? b? qua set ${completedSetsForActive.length + 1}`);
  }

  function updateWorkoutSet(id: string, patch: Partial<WorkoutSet>) {
    const workoutSets = state.workoutSets.map((set) => (set.id === id ? { ...set, ...patch } : set));
    withUndo(
      { ...state, workoutSets, syncQueue: enqueueSync(state.syncQueue, { type: "workout.set.patch", payload: { id, patch } }) },
      "edit set",
      "?? c?p nh?t set"
    );
  }

  function deleteWorkoutSet(id: string) {
    withUndo(
      { ...state, workoutSets: state.workoutSets.filter((set) => set.id !== id), syncQueue: enqueueSync(state.syncQueue, { type: "workout.set.delete", payload: { id } }) },
      "delete set",
      "?? x?a set"
    );
  }

  function startWorkout() {
    if (!state.workoutExercises.length) {
      setToast("Add or import an exercise before starting a workout.");
      return;
    }
    const session = createWorkoutSession({
      routineId: activeRoutine?.id ?? state.activeRoutineId,
      workoutDayId: activeWorkoutDay?.id ?? state.selectedWorkoutDayId,
      sessionName: activeWorkoutDay?.name ?? "Workout Session",
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
      "Start workout"
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
        "Finished workout session"
      );
    }
    setWorkoutMode("finished");
  }

  function selectWorkoutExercise(id: string) {
    const index = activeWorkoutSession
      ? activeSessionQueue.findIndex((item) => item.exerciseId === id)
      : state.workoutExercises.findIndex((exercise) => exercise.id === id);
    if (index < 0) return;
    commitSynced({ ...state, activeExerciseIndex: index }, "workout.session.selectExercise", { id }, "Selected exercise");
  }

  function skipActiveExercise() {
    if (!activeWorkoutSession) {
      const nextIndex = Math.min(state.activeExerciseIndex + 1, state.workoutExercises.length - 1);
      commitSynced({ ...state, activeExerciseIndex: nextIndex }, "workout.session.skipExercise", { from: activeExercise.id }, "Skipped exercise");
      return;
    }
    const parked = parkSessionExercise(activeWorkoutSession, activeExercise.id);
    const nextIndex = Math.min(state.activeExerciseIndex, Math.max(0, parked.exerciseQueue.length - 1));
    commitSynced(
      { ...state, workoutSessions: replaceWorkoutSession(parked), activeExerciseIndex: nextIndex },
      "workout.session.skipExercise",
      { sessionId: activeWorkoutSession.id, from: activeExercise.id, queue: parked.exerciseQueue },
      "Skipped exercise"
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
      "Updated session queue"
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
      "Saved session order to routine"
    );
  }

  function pauseRestTimer() {
    if (state.restEndsAt) {
      setRestPausedSeconds(Math.max(0, Math.ceil((new Date(state.restEndsAt).getTime() - Date.now()) / 1000)));
    }
    if (activeWorkoutSession) {
      const paused = pauseWorkoutSession(activeWorkoutSession);
      commit({ ...state, workoutSessions: state.workoutSessions.map((session) => (session.id === paused.id ? paused : session)) }, "Pause workout session");
    }
  }

  function resumeRestTimer() {
    if (!activeWorkoutSession && restPausedSeconds === null) return;
    setRestNotifiedFor(null);
    const resumedSessions = activeWorkoutSession
      ? state.workoutSessions.map((session) => (session.id === activeWorkoutSession.id ? resumeWorkoutSession(session) : session))
      : state.workoutSessions;
    commit(
      {
        ...state,
        workoutSessions: resumedSessions,
        restEndsAt: restPausedSeconds !== null ? new Date(Date.now() + restPausedSeconds * 1000).toISOString() : state.restEndsAt
      },
      "Resume workout session"
    );
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

  function updatePlateSettings(next: Partial<PlateSettings>) {
    const plateSettings = {
      ...state.plateSettings,
      ...next,
      plateInventoryKg: next.plateInventoryKg ? normalizePlateInventory(next.plateInventoryKg) : state.plateSettings.plateInventoryKg
    };
    commit({ ...state, plateSettings });
  }

  function markQueue(status: "synced" | "failed") {
    commit({ ...state, syncQueue: markSyncQueue(state.syncQueue, status) }, status === "synced" ? "Đã đánh dấu sync xong" : "Đã đánh dấu sync lỗi");
  }

  function clearQueue(status?: "synced" | "failed") {
    commit(
      { ...state, syncQueue: status ? state.syncQueue.filter((item) => item.status !== status) : [] },
      status ? `Đã xóa queue ${status}` : "Đã xóa toàn bộ sync queue"
    );
  }

  const activeRecommendation = {
    title: "V1 insight moved to Progress",
    reason: "Coach không nằm trong navigation chính của V1."
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function decideRecommendation(decision: "accepted" | "rejected") {
    commit(
      {
        ...state,
        recommendationDecisions: [
          {
            id: cryptoSafeId(),
            title: activeRecommendation.title,
            decision,
            reason: activeRecommendation.reason,
            decidedAt: new Date().toISOString()
          },
          ...state.recommendationDecisions
        ]
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
    drinkModules,
    activeOptionalDrinkModules,
    workoutName: "Push Day",
    setTab,
    achievements,
    recentLogs: activeHydrationLogs.slice(-3).reverse(),
    hydrationLogs: activeHydrationLogs,
    editHydrationLog,
    deleteHydrationLog,
    supplements: state.supplements,
    supplementLogs: state.supplementLogs,
    logSupplement,
    skipSupplement,
    newSupplementName,
    setNewSupplementName,
    newSupplementAmount,
    setNewSupplementAmount,
    addSupplement,
    deleteSupplement,
    updateSupplement: updateSupplementLocal,
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

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="avatar" aria-label="User avatar">
          <User size={18} />
        </div>
        <div>
          <p className="top-date">{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "short" }).format(now)}</p>
          <p className="top-subtitle">Local-first PWA • {state.profile.timezone}</p>
          <span className={`sync-status ${syncStatus}`}>{syncStatusLabel(syncStatus)}</span>
        </div>
        <button className={`icon-button ${hydrationReminder || creatineReminder ? "attention" : ""}`} aria-label="Thông báo">
          <Bell size={20} />
        </button>
      </header>

      <section className="content">
        {!state.profile.onboardingCompleted && (
          <OnboardingPanel
            profile={state.profile}
            updateProfile={updateProfile}
            activeTemplate={state.activeTemplate}
            applyTemplate={applyTemplate}
            step={onboardingStep}
            setStep={setOnboardingStep}
            completeOnboarding={completeOnboarding}
          />
        )}

        {tab === "today" && (
          <TodayOverview
            totalWater={totalWater}
            percent={percent}
            target={state.profile.waterTargetMl}
            pace={pace}
            quickWater={quickWater}
            waterAmount={waterAmount}
            setWaterAmount={setWaterAmount}
            logWater={logWater}
            drinkType={drinkType}
            setDrinkType={setDrinkType}
            quickAmounts={state.quickAmounts.filter((item) => item.category === "hydration")}
            updateQuickAmount={(id, patch) =>
              commit({
                ...state,
                quickAmounts: state.quickAmounts.map((item) => (item.id === id ? { ...item, ...patch } : item))
              })
            }
            deleteQuickAmount={(id) => commit({ ...state, quickAmounts: state.quickAmounts.filter((item) => item.id !== id) })}
            quickCreatine={quickCreatine}
            creatineAmount={creatineAmount}
            setCreatineAmount={setCreatineAmount}
            logCreatine={logCreatine}
            creatineLogged={state.supplementLogs.some(
              (log) => log.name === "Creatine" && log.status !== "skipped" && log.loggedAt.startsWith(now.toISOString().slice(0, 10))
            )}
            creatineActive={creatineActive}
            creatineReminder={creatineReminder}
            drinkModules={drinkModules}
            activeOptionalDrinkModules={activeOptionalDrinkModules}
            workoutName="Push Day"
            workoutExerciseCount={state.workoutExercises.length}
            setTab={setTab}
            achievements={achievements}
            recentLogs={activeHydrationLogs.slice(-3).reverse()}
            latestMetric={latestMetric}
            hydrationLogs={activeHydrationLogs}
            editHydrationLog={editHydrationLog}
            deleteHydrationLog={deleteHydrationLog}
            supplements={state.supplements}
            supplementLogs={state.supplementLogs}
            logSupplement={logSupplement}
            skipSupplement={skipSupplement}
            newSupplementName={newSupplementName}
            setNewSupplementName={setNewSupplementName}
            newSupplementAmount={newSupplementAmount}
            setNewSupplementAmount={setNewSupplementAmount}
            addSupplement={addSupplement}
            deleteSupplement={deleteSupplement}
            updateSupplement={updateSupplementLocal}
          />
        )}

        {tab === "hydration" && <TodayView {...hydrationViewProps} />}

        {tab === "workout" && (
          <WorkoutView
            state={state}
            activeRoutine={activeRoutine}
            activeWorkoutDay={activeWorkoutDay}
            activeWorkoutSession={activeWorkoutSession}
            sessionQueue={activeSessionQueue}
            currentSessionSets={currentSessionSets}
            filteredExerciseLibrary={filteredExerciseLibrary}
            activeExercise={activeExercise}
            completedSets={completedSetsForActive}
            allSetsForActive={allSetsForActive}
            livePrBadges={livePrBadges}
            plateSettings={state.plateSettings}
            setWeight={setWeight}
            setSetWeight={setSetWeight}
            setReps={setReps}
            setSetReps={setSetReps}
            setRpe={setRpe}
            setSetRpe={setSetRpe}
            setType={setType}
            setSetType={setSetType}
            mode={workoutMode}
            startWorkout={startWorkout}
            finishWorkout={finishWorkout}
            backToPlan={() => setWorkoutMode("plan")}
            completeSet={completeSet}
            selectExercise={selectWorkoutExercise}
            skipExercise={skipActiveExercise}
            restSeconds={restSeconds}
            restPaused={restPausedSeconds !== null || activeWorkoutSession?.status === "paused"}
            pauseRestTimer={pauseRestTimer}
            resumeRestTimer={resumeRestTimer}
            adjustRestTimer={adjustRestTimer}
            resetRestTimer={resetRestTimer}
            skipCurrentSet={skipCurrentSet}
            updateWorkoutSet={updateWorkoutSet}
            deleteWorkoutSet={deleteWorkoutSet}
            librarySearch={librarySearch}
            setLibrarySearch={setLibrarySearch}
            libraryMuscleFilter={libraryMuscleFilter}
            setLibraryMuscleFilter={setLibraryMuscleFilter}
            libraryEquipmentFilter={libraryEquipmentFilter}
            setLibraryEquipmentFilter={setLibraryEquipmentFilter}
            newLibraryExerciseName={newLibraryExerciseName}
            setNewLibraryExerciseName={setNewLibraryExerciseName}
            newLibraryMuscleGroup={newLibraryMuscleGroup}
            setNewLibraryMuscleGroup={setNewLibraryMuscleGroup}
            newLibraryEquipment={newLibraryEquipment}
            setNewLibraryEquipment={setNewLibraryEquipment}
            newLibraryPattern={newLibraryPattern}
            setNewLibraryPattern={setNewLibraryPattern}
            newExerciseName={newExerciseName}
            setNewExerciseName={setNewExerciseName}
            addExercise={addExercise}
            routineImportPreview={routineImportPreview}
            previewRoutineImport={previewRoutineImport}
            downloadRoutineSampleXlsx={downloadRoutineSampleXlsx}
            confirmRoutineImport={confirmRoutineImport}
            clearRoutineImport={() => setRoutineImportPreview(null)}
            deleteExercise={deleteExercise}
            moveExercise={moveExercise}
            reorderSessionExercise={reorderSessionExercise}
            saveWorkoutOrderToRoutine={saveWorkoutOrderToRoutine}
            applyTemplate={applyTemplate}
            updateExerciseTarget={updateExerciseTarget}
            updateRoutineName={updateRoutineName}
            selectWorkoutDay={selectWorkoutDay}
            updateWorkoutDay={updateWorkoutDay}
            addWorkoutDay={addWorkoutDay}
            deleteWorkoutDay={deleteWorkoutDay}
            addExerciseFromLibrary={addExerciseFromLibrary}
            addCustomExerciseDefinition={addCustomExerciseDefinition}
            updateExerciseDefinition={updateExerciseDefinition}
            deleteExerciseDefinition={deleteExerciseDefinition}
          />
        )}

        {tab === "progress" && (
          <ProgressView
            totalWater={totalWater}
            target={state.profile.waterTargetMl}
            sets={state.workoutSets}
            bestSet={bestSet}
            progress={progressDashboard}
            achievements={achievements}
            bodyMetrics={state.bodyMetrics}
            bodyMetricChart={bodyMetricChart}
            bodyMetricRange={bodyMetricRange}
            setBodyMetricRange={setBodyMetricRange}
            bodyMetricWarnings={bodyMetricWarnings}
            unitWeight={state.profile.unitWeight}
            updateProfile={updateProfile}
            latestMetric={latestMetric}
            weightDelta={weightDelta}
            newMetricWeight={newMetricWeight}
            setNewMetricWeight={setNewMetricWeight}
            newMetricBodyFat={newMetricBodyFat}
            setNewMetricBodyFat={setNewMetricBodyFat}
            newMetricWaist={newMetricWaist}
            setNewMetricWaist={setNewMetricWaist}
            newMetricChest={newMetricChest}
            setNewMetricChest={setNewMetricChest}
            newMetricArm={newMetricArm}
            setNewMetricArm={setNewMetricArm}
            newMetricThigh={newMetricThigh}
            setNewMetricThigh={setNewMetricThigh}
            newMetricNote={newMetricNote}
            setNewMetricNote={setNewMetricNote}
            addBodyMetric={addBodyMetric}
            deleteBodyMetric={deleteBodyMetric}
            updateBodyMetric={updateBodyMetric}
            downloadExport={downloadExport}
          />
        )}

        {tab === "settings" && (
          <SettingsView
            state={state}
            updateProfile={updateProfile}
            signInLocal={(mode) => updateProfile({ authMode: mode })}
            reset={() => commit(resetState(), "Đã khôi phục dữ liệu mẫu")}
            deletePersonalData={deleteLocalPersonalData}
            notificationPermission={notificationPermission}
            pushConfigured={pushConfigured}
            pushSubscriptionStatus={pushSubscriptionStatus}
            requestNotifications={requestNotifications}
            subscribeWebPush={subscribeWebPush}
            unsubscribeWebPush={unsubscribeWebPush}
            sendTestPushNotification={sendTestPushNotification}
            markQueue={markQueue}
            clearQueue={clearQueue}
            downloadExport={downloadExport}
            downloadCsvExport={downloadCsvExport}
            importJsonExport={importJsonExport}
            restoreSections={restoreSections}
            setRestoreSections={setRestoreSections}
            updateNotificationSettings={updateNotificationSettings}
            updatePlateSettings={updatePlateSettings}
            drinkModules={drinkModules}
            updateDrinkModule={updateDrinkModule}
            reopenOnboarding={() => {
              setOnboardingStep(0);
              updateProfile({ onboardingCompleted: false });
            }}
          />
        )}
      </section>

      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          {state.undo && (
            <button onClick={undo}>
              <RotateCcw size={16} /> Undo
            </button>
          )}
        </div>
      )}

      <nav className="bottom-tabs" aria-label="Điều hướng chính">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}

function OnboardingPanel(props: {
  profile: AppState["profile"];
  updateProfile: (next: Partial<AppState["profile"]>) => void;
  activeTemplate: AppState["activeTemplate"];
  applyTemplate: (template: AppState["activeTemplate"]) => void;
  step: number;
  setStep: (step: number) => void;
  completeOnboarding: () => void;
}) {
  const steps = ["Account", "Body", "Schedule", "Reminders"];
  const workoutDays = [
    ["Mon", "T2"],
    ["Tue", "T3"],
    ["Wed", "T4"],
    ["Thu", "T5"],
    ["Fri", "T6"],
    ["Sat", "T7"],
    ["Sun", "CN"]
  ];
  const toggleWorkoutDay = (day: string) => {
    const nextDays = props.profile.workoutDays.includes(day)
      ? props.profile.workoutDays.filter((item) => item !== day)
      : [...props.profile.workoutDays, day];
    props.updateProfile({ workoutDays: nextDays });
  };
  const canGoBack = props.step > 0;
  const canGoNext = props.step < steps.length - 1;
  const suggestedWater = suggestedWaterTargetMl(props.profile.bodyWeightKg, props.profile.workoutDays.length);
  const suggestedTemplate = suggestedRoutineTemplate(props.profile.workoutDays.length);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.profile.email);
  const hoursOk = props.profile.wakeHour >= 0 && props.profile.wakeHour <= 23 && props.profile.sleepHour >= 0 && props.profile.sleepHour <= 23 && props.profile.wakeHour !== props.profile.sleepHour;
  const validationMessage =
    props.step === 0 && (!props.profile.name.trim() || !emailOk)
      ? "Nhập tên và email hợp lệ, hoặc dùng local mode rồi cập nhật email sau."
      : props.step === 1 && (props.profile.bodyWeightKg <= 0 || props.profile.heightCm <= 0 || props.profile.waterTargetMl < 1000 || props.profile.waterTargetMl > 6000)
        ? "Cân nặng, chiều cao và mục tiêu nước cần nằm trong ngưỡng hợp lý."
        : props.step === 2 && props.profile.workoutDays.length < 1
          ? "Chọn ít nhất một ngày tập trong tuần."
          : props.step === 3 && !hoursOk
            ? "Giờ dậy và giờ ngủ phải từ 0-23 và không được trùng nhau."
            : "";

  return (
    <section className="card onboarding-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Onboarding nhanh</p>
          <h2>{steps[props.step]}</h2>
        </div>
        <CalendarCheck size={22} />
      </div>
      <div className="step-dots" aria-label="Onboarding progress">
        {steps.map((label, index) => (
          <button key={label} className={props.step === index ? "active" : ""} onClick={() => props.setStep(index)}>
            {index + 1}
          </button>
        ))}
      </div>
      <p className="progress-copy">Bước {props.step + 1}/{steps.length}</p>
      {validationMessage && <p className="form-warning">{validationMessage}</p>}

      {props.step === 0 && (
        <div className="onboarding-grid">
          <label>
            <span>Tên</span>
            <input value={props.profile.name} onChange={(event) => props.updateProfile({ name: event.target.value })} />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={props.profile.email} onChange={(event) => props.updateProfile({ email: event.target.value })} />
          </label>
          <label>
            <span>Đơn vị cân nặng</span>
            <select value={props.profile.unitWeight} onChange={(event) => props.updateProfile({ unitWeight: event.target.value as AppState["profile"]["unitWeight"] })}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </label>
          <label>
            <span>Đơn vị nước</span>
            <select value={props.profile.unitVolume} onChange={(event) => props.updateProfile({ unitVolume: event.target.value as AppState["profile"]["unitVolume"] })}>
              <option value="ml">ml</option>
              <option value="oz">oz</option>
            </select>
          </label>
        </div>
      )}

      {props.step === 1 && (
        <div className="onboarding-grid">
          <label>
            <span>Cân nặng</span>
            <input type="number" value={props.profile.bodyWeightKg} onChange={(event) => props.updateProfile({ bodyWeightKg: Number(event.target.value) })} />
          </label>
          <label>
            <span>Chiều cao</span>
            <input type="number" value={props.profile.heightCm} onChange={(event) => props.updateProfile({ heightCm: Number(event.target.value) })} />
          </label>
          <label>
            <span>Mục tiêu nước</span>
            <input type="number" value={props.profile.waterTargetMl} onChange={(event) => props.updateProfile({ waterTargetMl: Number(event.target.value) })} />
          </label>
          <label>
            <span>Timezone</span>
            <input value={props.profile.timezone} onChange={(event) => props.updateProfile({ timezone: event.target.value })} />
          </label>
          <button className="secondary-button inline-suggestion" onClick={() => props.updateProfile({ waterTargetMl: suggestedWater })}>
            Gợi ý {suggestedWater}ml
          </button>
        </div>
      )}

      {props.step === 2 && (
        <div className="stack compact-stack">
          <div className="template-row" aria-label="Routine templates onboarding">
            {[
              ["ppl", "PPL"],
              ["upper-lower", "Upper/Lower"],
              ["full-body", "Full Body"],
              ["custom", "Custom"]
            ].map(([id, label]) => (
              <button key={id} className={props.activeTemplate === id ? "active" : ""} onClick={() => props.applyTemplate(id as AppState["activeTemplate"])}>
                {label}
              </button>
            ))}
          </div>
          <div className="day-picker">
            {workoutDays.map(([day, label]) => (
              <button key={day} className={props.profile.workoutDays.includes(day) ? "active" : ""} onClick={() => toggleWorkoutDay(day)}>
                {label}
              </button>
            ))}
          </div>
          <button className="secondary-button" onClick={() => props.applyTemplate(suggestedTemplate)}>
            Gợi ý template {suggestedTemplate}
          </button>
        </div>
      )}

      {props.step === 3 && (
        <div className="onboarding-grid">
          <label>
            <span>Giờ dậy</span>
            <input type="number" min="0" max="23" value={props.profile.wakeHour} onChange={(event) => props.updateProfile({ wakeHour: Number(event.target.value) })} />
          </label>
          <label>
            <span>Giờ ngủ</span>
            <input type="number" min="0" max="23" value={props.profile.sleepHour} onChange={(event) => props.updateProfile({ sleepHour: Number(event.target.value) })} />
          </label>
          <label>
            <span>Creatine</span>
            <input type="number" min="1" max="20" value={props.profile.creatineAmountG} onChange={(event) => props.updateProfile({ creatineAmountG: Number(event.target.value) })} />
          </label>
          <label>
            <span>Giờ uống</span>
            <input type="number" min="0" max="23" value={props.profile.creatineHour} onChange={(event) => props.updateProfile({ creatineHour: Number(event.target.value) })} />
          </label>
        </div>
      )}

      <div className="split-actions">
        <button className="secondary-button" onClick={() => props.setStep(props.step - 1)} disabled={!canGoBack}>
          Quay lại
        </button>
        {canGoNext ? (
          <button className="primary-button training-bg" onClick={() => props.setStep(props.step + 1)} disabled={Boolean(validationMessage)}>
            Tiếp tục
          </button>
        ) : (
          <button className="primary-button training-bg" onClick={props.completeOnboarding} disabled={Boolean(validationMessage)}>
            Hoàn tất onboarding
          </button>
        )}
      </div>
    </section>
  );
}

function TodayOverview(props: Parameters<typeof TodayView>[0] & { latestMetric?: BodyMetric; workoutExerciseCount?: number }) {
  const paceLabel = props.pace === "behind" ? "Chậm nhịp" : props.pace === "ahead" ? "Vượt nhịp" : "Đúng nhịp";

  return (
    <div className="stack today-overview">
      <section className="action-grid">
        <button className="action-card hydration-action" onClick={() => props.setTab("hydration")}>
          <div className="action-icon">
            <Waves size={22} />
          </div>
          <span>Hydration today</span>
          <strong>
            {props.totalWater.toLocaleString("vi-VN")} / {props.target.toLocaleString("vi-VN")} ml
          </strong>
          <em>
            {props.percent}% mục tiêu - {paceLabel}
          </em>
          <b>Mở màn nước</b>
        </button>

        <button className="action-card workout-action" onClick={() => props.setTab("workout")}>
          <div className="action-icon">
            <Dumbbell size={22} />
          </div>
          <span>Workout today</span>
          <strong>{props.workoutName}</strong>
          <em>{props.workoutExerciseCount ?? 6} bài - focus mode</em>
          <b>Bắt đầu tập</b>
        </button>
      </section>

      {props.creatineActive && (
        <section className="card supplement-card compact-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Creatine</p>
              <h2>{props.creatineLogged ? "?? log h?m nay" : "Ch?a log h?m nay"}</h2>
            </div>
            <button className="icon-button" onClick={() => props.logCreatine(props.creatineAmount)}>
              {props.creatineLogged ? <Check size={18} /> : <Plus size={18} />}
            </button>
          </div>
          <p>M?c ti?u {props.creatineAmount}g m?i ng?y, nh?c trong Settings.</p>
        </section>
      )}

      <section className="stats-grid">
        <MetricCard label="N??c" value={`${props.percent}%`} accent="hydration" />
        {props.creatineActive && <MetricCard label="Creatine" value={props.creatineLogged ? "Done" : "Open"} accent="neutral" />}
        <MetricCard label="Set h?m nay" value={`${props.workoutExerciseCount ?? 0} b?i`} accent="training" />
        <MetricCard label="C?n n?ng" value={props.latestMetric ? `${props.latestMetric.weightKg}kg` : "Ch?a c?"} accent="coach" />
      </section>

      <section className="card chart-card">
        <div className="section-heading">
          <h2>Hoạt động gần đây</h2>
          <span className="sync-pill">Local-first</span>
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
            <p>Chưa có log hôm nay.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function TodayView(props: {
  totalWater: number;
  percent: number;
  target: number;
  pace: "ahead" | "on-pace" | "behind";
  quickWater: { id: string; label: string; amount: number }[];
  quickAmounts: { id: string; label: string; amount: number; pinned: boolean }[];
  waterAmount: number;
  setWaterAmount: (value: number) => void;
  logWater: (amountMl: number, pin?: boolean, type?: HydrationLog["drinkType"]) => void;
  drinkType: HydrationLog["drinkType"];
  setDrinkType: (value: HydrationLog["drinkType"]) => void;
  updateQuickAmount: (id: string, patch: { pinned?: boolean }) => void;
  deleteQuickAmount: (id: string) => void;
  quickCreatine: { id: string; label: string; amount: number }[];
  creatineAmount: number;
  setCreatineAmount: (value: number) => void;
  logCreatine: (amount: number, pin?: boolean) => void;
  creatineLogged: boolean;
  creatineActive: boolean;
  creatineReminder: boolean;
  drinkModules: DrinkModule[];
  activeOptionalDrinkModules: DrinkModule[];
  workoutName: string;
  setTab: (tab: Tab) => void;
  achievements: { code: string; name: string; progress: number; target: number; status: string; streakMonths: number }[];
  recentLogs: { id: string; amountMl: number; loggedAt: string }[];
  hydrationLogs: { id: string; amountMl: number; loggedAt: string }[];
  editHydrationLog: (id: string, deltaMl: number) => void;
  deleteHydrationLog: (id: string) => void;
  supplements: Supplement[];
  supplementLogs: { id: string; supplementId?: string; name: string; amount: number; unit: string; loggedAt: string; status?: "taken" | "skipped"; skippedReason?: string }[];
  logSupplement: (supplement: Supplement) => void;
  skipSupplement: (supplement: Supplement) => void;
  newSupplementName: string;
  setNewSupplementName: (value: string) => void;
  newSupplementAmount: number;
  setNewSupplementAmount: (value: number) => void;
  addSupplement: () => void;
  deleteSupplement: (id: string) => void;
  updateSupplement: (id: string, patch: Partial<Supplement>) => void;
  waterReminderEnabled?: boolean;
  waterReminderLabel?: string;
  updateProfile?: (next: Partial<AppState["profile"]>) => void;
  updateNotificationSettings?: (next: Partial<AppState["notificationSettings"]>) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const ringPercent = Math.min(props.percent, 100);
  const quickWater = props.quickWater.slice(0, 3);
  const drinkOptions = [
    { id: "water" as const, label: "Nước" },
    ...props.activeOptionalDrinkModules.map((module) => ({ id: module.id as HydrationLog["drinkType"], label: module.name }))
  ];
  const hourly = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const hour = index + 8;
      const amount = props.hydrationLogs
        .filter((log) => new Date(log.loggedAt).getHours() === hour)
        .reduce((sum, log) => sum + log.amountMl, 0);
      return { hour, amount };
    });
  }, [props.hydrationLogs]);
  const maxHourAmount = Math.max(250, ...hourly.map((item) => item.amount));
  const paceCopy =
    props.pace === "behind"
      ? "Hãy uống thêm một chút để bắt kịp nhịp."
      : props.pace === "ahead"
        ? "Bạn đang vượt nhịp. Giữ đều trong phần còn lại của ngày."
        : "Bạn đang đúng nhịp. Tiếp tục nhé.";

  return (
    <div className="stack hydration-detail-screen">
      <section className="hydration-summary">
        <div>
          <p>Tiến độ hôm nay</p>
          <h1>
            {props.totalWater.toLocaleString("vi-VN")} <span>/ {props.target.toLocaleString("vi-VN")} ml</span>
          </h1>
          <em>{paceCopy}</em>
        </div>
        <div className="hydration-ring" aria-label={`Đã uống ${props.percent}% mục tiêu`}>
          <svg viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="45" />
            <circle cx="55" cy="55" r="45" style={{ strokeDashoffset: `${283 * (1 - ringPercent / 100)}` }} />
          </svg>
          <div>
            <strong>{ringPercent}%</strong>
            <span>mục tiêu</span>
          </div>
        </div>
      </section>

      <section className="hydration-block">
        <div className="section-heading compact">
          <h2>Log nhanh</h2>
        </div>
        <div className="hydration-quick-grid">
          {quickWater.map((amount) => (
            <button key={amount.id} onClick={() => props.logWater(amount.amount, false, "water")}>
              +{amount.amount} <span>ml</span>
            </button>
          ))}
          <button className="custom-water-button" onClick={() => setShowCustom(true)}>
            Custom
          </button>
        </div>
      </section>

      <section className="hydration-block">
        <div className="section-heading compact">
          <h2>Lượng nước theo giờ</h2>
        </div>
        <div className="hydration-hour-chart">
          {hourly.map((item, index) => (
            <div key={item.hour}>
              <span className={index === 6 ? "active" : ""} style={{ height: `${Math.max(7, (item.amount / maxHourAmount) * 100)}%` }} />
              <em>{item.hour}h</em>
            </div>
          ))}
        </div>
      </section>

      <section className="hydration-block">
        <div className="section-heading compact">
          <h2>Lịch sử hôm nay</h2>
          <span className="sync-pill">{props.hydrationLogs.length} logs</span>
        </div>
        <div className="hydration-history">
          {props.hydrationLogs.length ? (
            props.hydrationLogs
              .slice()
              .reverse()
              .map((log) => (
                <div key={log.id}>
                  <span>{new Date(log.loggedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  <strong>+{log.amountMl} ml</strong>
                  <div className="row-actions">
                    <button onClick={() => props.editHydrationLog(log.id, -50)} aria-label="Giảm log nước">
                      <Minus size={14} />
                    </button>
                    <button onClick={() => props.editHydrationLog(log.id, 50)} aria-label="Tăng log nước">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => props.deleteHydrationLog(log.id)} aria-label="Xóa log nước">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <p>Chưa có log nước hôm nay.</p>
          )}
        </div>
      </section>

      <section className="hydration-settings-card">
        <div className="hydration-setting-row">
          <div>
            <p>Nhắc uống nước</p>
            <span>{props.waterReminderEnabled ? props.waterReminderLabel : "?ang t?t"}</span>
          </div>
          <button
            className={props.waterReminderEnabled ? "toggle-switch active" : "toggle-switch"}
            onClick={() => props.updateNotificationSettings?.({ hydrationEnabled: !props.waterReminderEnabled })}
            aria-label="Bật tắt nhắc uống nước"
          >
            <span />
          </button>
        </div>
        <button className="hydration-goal-row" onClick={() => props.updateProfile?.({ waterTargetMl: props.target === 2500 ? 3000 : 2500 })}>
          <div>
            <p>Mục tiêu hằng ngày</p>
            <span>{props.target.toLocaleString("vi-VN")} ml - Gợi ý theo cân nặng</span>
          </div>
          <ChevronRight size={18} />
        </button>
      </section>

      {showCustom && (
        <div className="hydration-modal-backdrop">
          <div className="hydration-modal">
            <div className="modal-heading">
              <h2>Lượng tùy chỉnh</h2>
              <button onClick={() => setShowCustom(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <div className="custom-water-value">
              <strong>{props.waterAmount}</strong>
              <span>ml</span>
            </div>
            <div className="segmented-control" aria-label="Lo?i ?? u?ng">
              {drinkOptions.map(({ id, label }) => (
                <button key={id} className={props.drinkType === id ? "active" : ""} onClick={() => props.setDrinkType(id)}>
                  {label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="50"
              max="1500"
              step="50"
              value={props.waterAmount}
              onChange={(event) => props.setWaterAmount(Number(event.target.value))}
              aria-label="Lượng nước"
            />
            <div className="custom-stepper-row">
              <button onClick={() => props.setWaterAmount(Math.max(50, props.waterAmount - 50))}>- 50</button>
              <button onClick={() => props.setWaterAmount(Math.min(1500, props.waterAmount + 50))}>+ 50</button>
            </div>
            <button
              className="primary-button hydration-bg custom-log-button"
              onClick={() => {
                props.logWater(props.waterAmount, true, props.drinkType);
                setShowCustom(false);
              }}
            >
              Log {props.waterAmount} ml
            </button>
            <div className="quick-manager compact-manager">
              {props.quickAmounts.map((amount) => (
                <div key={amount.id}>
                  <span>{amount.label}</span>
                  <button className={amount.pinned ? "tiny-chip logged" : "tiny-chip"} onClick={() => props.updateQuickAmount(amount.id, { pinned: !amount.pinned })}>
                    {amount.pinned ? "Pinned" : "Pin"}
                  </button>
                  <button className="icon-mini danger" onClick={() => props.deleteQuickAmount(amount.id)} aria-label="Xóa quick amount">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="card supplement-card hydration-creatine-card">
        <div>
          <p className="eyebrow">Creatine</p>
          <h2>{props.creatineLogged ? "Đã log hôm nay" : "Chưa log hôm nay"}</h2>
          <p>{props.creatineReminder ? "Đã tới giờ nhắc hôm nay" : "Nhắc trước giờ uống cố định"}</p>
        </div>
        <div className="supplement-actions">
          <div className="chip-row">
            {props.quickCreatine.map((item) => (
              <button key={item.id} className="tiny-chip" onClick={() => props.logCreatine(item.amount)}>
                {item.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={props.creatineAmount}
            onChange={(event) => props.setCreatineAmount(Number(event.target.value))}
            aria-label="Chọn lượng creatine"
          />
          <button className="primary-button supplement-bg" onClick={() => props.logCreatine(props.creatineAmount, true)}>
            {props.creatineAmount}g
          </button>
        </div>
      </section>
    </div>
  );
}

function WorkoutView(props: {
  state: AppState;
  activeRoutine?: AppState["routines"][number];
  activeWorkoutDay?: AppState["routines"][number]["days"][number];
  activeWorkoutSession?: AppState["workoutSessions"][number];
  sessionQueue: SessionExerciseQueueItem[];
  currentSessionSets: WorkoutSet[];
  filteredExerciseLibrary: ExerciseDefinition[];
  activeExercise: AppState["workoutExercises"][number];
  completedSets: WorkoutSet[];
  allSetsForActive: WorkoutSet[];
  livePrBadges: WorkoutSetPr[];
  plateSettings: PlateSettings;
  setWeight: number;
  setSetWeight: (value: number) => void;
  setReps: number;
  setSetReps: (value: number) => void;
  setRpe: number;
  setSetRpe: (value: number) => void;
  setType: WorkoutSetType;
  setSetType: (value: WorkoutSetType) => void;
  mode: "plan" | "live" | "finished";
  startWorkout: () => void;
  finishWorkout: () => void;
  backToPlan: () => void;
  completeSet: () => void;
  selectExercise: (id: string) => void;
  skipExercise: () => void;
  restSeconds: number;
  restPaused: boolean;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  resetRestTimer: () => void;
  skipCurrentSet: () => void;
  updateWorkoutSet: (id: string, patch: Partial<WorkoutSet>) => void;
  deleteWorkoutSet: (id: string) => void;
  librarySearch: string;
  setLibrarySearch: (value: string) => void;
  libraryMuscleFilter: string;
  setLibraryMuscleFilter: (value: string) => void;
  libraryEquipmentFilter: string;
  setLibraryEquipmentFilter: (value: string) => void;
  newLibraryExerciseName: string;
  setNewLibraryExerciseName: (value: string) => void;
  newLibraryMuscleGroup: string;
  setNewLibraryMuscleGroup: (value: string) => void;
  newLibraryEquipment: EquipmentType;
  setNewLibraryEquipment: (value: EquipmentType) => void;
  newLibraryPattern: MovementPattern;
  setNewLibraryPattern: (value: MovementPattern) => void;
  newExerciseName: string;
  setNewExerciseName: (value: string) => void;
  addExercise: () => void;
  routineImportPreview: RoutineImportPreview | null;
  previewRoutineImport: (file: File) => void;
  downloadRoutineSampleXlsx: () => void;
  confirmRoutineImport: (mode: "replace" | "append") => void;
  clearRoutineImport: () => void;
  deleteExercise: (id: string) => void;
  moveExercise: (id: string, direction: -1 | 1) => void;
  reorderSessionExercise: (id: string, direction: -1 | 1) => void;
  saveWorkoutOrderToRoutine: () => void;
  applyTemplate: (template: AppState["activeTemplate"]) => void;
  updateExerciseTarget: (id: string, patch: Partial<WorkoutExercise>) => void;
  updateRoutineName: (name: string) => void;
  selectWorkoutDay: (id: string) => void;
  updateWorkoutDay: (id: string, patch: Partial<AppState["routines"][number]["days"][number]>) => void;
  addWorkoutDay: () => void;
  deleteWorkoutDay: (id: string) => void;
  addExerciseFromLibrary: (definition: ExerciseDefinition) => void;
  addCustomExerciseDefinition: () => void;
  updateExerciseDefinition: (id: string, patch: Partial<ExerciseDefinition>) => void;
  deleteExerciseDefinition: (id: string) => void;
}) {
  const totalVolume = workingSetVolumeKg(props.currentSessionSets);
  const completedExerciseCount = new Set(props.currentSessionSets.map((set) => set.exerciseId)).size;
  const queueExercises = props.sessionQueue.flatMap((item) => {
    const exercise = props.state.workoutExercises.find((entry) => entry.id === item.exerciseId);
    return exercise ? [{ item, exercise }] : [];
  });
  const queuedCount = props.sessionQueue.filter((item) => item.status === "queued").length;
  const completedCount = props.sessionQueue.filter((item) => item.status === "completed").length;
  const parkedCount = props.sessionQueue.filter((item) => item.status === "parked").length;
  const plateCalculation = calculatePlatesPerSide(props.setWeight, props.plateSettings);
  const warmUpSuggestions = warmUpSetSuggestions({
    workingWeightKg: props.activeExercise.targetWeightKg,
    workingReps: props.activeExercise.targetRepsMin
  });
  const setTypeLabels: Record<WorkoutSetType, string> = {
    warmup: "Warm-up",
    working: "Working",
    drop: "Drop",
    failure: "Failure"
  };

  if (props.mode === "finished") {
    return (
      <div className="finish-workout">
        <div className="finish-icon">
          <Check size={38} />
        </div>
        <h1>Workout complete</h1>
        <p>{props.currentSessionSets.length} sets - {Math.round(totalVolume)}kg volume - {completedExerciseCount} exercises</p>
        <div className="finish-actions">
          <button className="primary-button training-bg" onClick={props.backToPlan}>Back to workout</button>
          <button className="secondary-button" onClick={props.startWorkout}>Start again</button>
        </div>
      </div>
    );
  }

  if (props.mode === "plan") {
    return (
      <div className="stack workout-plan">
        <section className="workout-hero">
          <div>
            <p className="eyebrow">Plan mode</p>
            <h1>{props.activeWorkoutDay?.name ?? "Workout day"}</h1>
            <p>{props.activeRoutine?.name ?? "Routine"} - {props.state.workoutExercises.length} exercises in selected day</p>
          </div>
          <div className="action-icon workout-icon">
            <Dumbbell size={24} />
          </div>
          <button className="primary-button training-bg" onClick={props.startWorkout}>
            <Check size={18} /> Start workout
          </button>
        </section>

        <section className="card">
          <div className="section-heading">
            <h2>Weekly schedule</h2>
            <span className="sync-pill">{props.activeRoutine?.daysPerWeek ?? props.activeRoutine?.days.length ?? 0} days/week</span>
          </div>
          <div className="week-strip">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
              const planned = props.activeRoutine?.days.find((item) => item.day === day);
              return (
              <button key={day} className={planned?.id === props.activeWorkoutDay?.id ? "active" : planned ? "done" : ""} onClick={() => planned && props.selectWorkoutDay(planned.id)} disabled={!planned}>
                <strong>{day.slice(0, 1)}</strong>
                <em>{planned?.name ?? "-"}</em>
              </button>
            );})}
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Active routine</p>
              <h2>Routine editor</h2>
            </div>
            <Dumbbell size={22} />
          </div>
          <div className="exercise-edit-grid">
            <label className="wide-field">
              <span>Routine name</span>
              <input value={props.activeRoutine?.name ?? ""} onChange={(event) => props.updateRoutineName(event.target.value)} />
            </label>
            <label>
              <span>Session name</span>
              <input value={props.activeWorkoutDay?.name ?? ""} onChange={(event) => props.activeWorkoutDay && props.updateWorkoutDay(props.activeWorkoutDay.id, { name: event.target.value })} />
            </label>
            <label>
              <span>Day</span>
              <select value={props.activeWorkoutDay?.day ?? "Mon"} onChange={(event) => props.activeWorkoutDay && props.updateWorkoutDay(props.activeWorkoutDay.id, { day: event.target.value })}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
            <label>
              <span>Days/week</span>
              <input value={props.activeRoutine?.days.length ?? 0} readOnly />
            </label>
          </div>
          <div className="template-row" aria-label="Workout days">
            {[...(props.activeRoutine?.days ?? [])].sort((a, b) => a.order - b.order).map((day) => (
              <button key={day.id} className={day.id === props.activeWorkoutDay?.id ? "active" : ""} onClick={() => props.selectWorkoutDay(day.id)}>
                {day.name}
              </button>
            ))}
            <button onClick={props.addWorkoutDay}>+ Day</button>
            {props.activeWorkoutDay && <button onClick={() => props.deleteWorkoutDay(props.activeWorkoutDay!.id)} disabled={(props.activeRoutine?.days.length ?? 0) <= 1}>Delete day</button>}
          </div>
          <div className="template-row" aria-label="Routine templates">
            {[
              ["ppl", "PPL"],
              ["upper-lower", "Upper/Lower"],
              ["full-body", "Full Body"],
              ["custom", "Custom"]
            ].map(([id, label]) => (
              <button key={id} className={props.state.activeTemplate === id ? "active" : ""} onClick={() => props.applyTemplate(id as AppState["activeTemplate"])}>
                {label}
              </button>
            ))}
          </div>
          <div className="exercise-library plan-list">
            {props.state.workoutExercises.map((exercise, index) => (
              <div key={exercise.id} className={index === props.state.activeExerciseIndex ? "active" : ""}>
                <span>{index + 1}</span>
                <button className="exercise-select" onClick={() => props.selectExercise(exercise.id)}>
                  <strong>{exercise.name}</strong>
                  <em>{exercise.muscleGroup} - {exercise.targetSets} x {exercise.targetRepsMin}-{exercise.targetRepsMax}</em>
                </button>
                <div className="row-actions">
                  <button onClick={() => props.moveExercise(exercise.id, -1)} aria-label="Move exercise up">↑</button>
                  <button onClick={() => props.moveExercise(exercise.id, 1)} aria-label="Move exercise down">↓</button>
                  <button onClick={() => props.deleteExercise(exercise.id)} aria-label="Delete exercise"><Trash2 size={14} /></button>
                </div>
                <div className="exercise-edit-grid">
                  <label><span>Name</span><input value={exercise.name} onChange={(event) => props.updateExerciseTarget(exercise.id, { name: event.target.value })} /></label>
                  <label><span>Muscle</span><input value={exercise.muscleGroup} onChange={(event) => props.updateExerciseTarget(exercise.id, { muscleGroup: event.target.value })} /></label>
                  <label><span>Sets</span><input type="number" min="1" max="10" value={exercise.targetSets} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetSets: Number(event.target.value) })} /></label>
                  <label><span>Reps min</span><input type="number" min="1" max="50" value={exercise.targetRepsMin} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetRepsMin: Number(event.target.value) })} /></label>
                  <label><span>Reps max</span><input type="number" min="1" max="50" value={exercise.targetRepsMax} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetRepsMax: Number(event.target.value) })} /></label>
                  <label><span>Kg</span><input type="number" min="0" step="0.5" value={exercise.targetWeightKg} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetWeightKg: Number(event.target.value) })} /></label>
                  <label><span>Rest</span><input type="number" min="15" step="15" value={exercise.restSeconds} onChange={(event) => props.updateExerciseTarget(exercise.id, { restSeconds: Number(event.target.value) })} /></label>
                  <label><span>Superset</span><input value={exercise.supersetGroup ?? ""} onChange={(event) => props.updateExerciseTarget(exercise.id, { supersetGroup: event.target.value.trim() || undefined })} placeholder="A1" /></label>
                  <label className="wide-field"><span>Last session</span><input value={exercise.lastSession} onChange={(event) => props.updateExerciseTarget(exercise.id, { lastSession: event.target.value })} /></label>
                </div>
              </div>
            ))}
          </div>
          <div className="inline-form">
            <input value={props.newExerciseName} onChange={(event) => props.setNewExerciseName(event.target.value)} aria-label="New exercise name" />
            <button className="secondary-button" onClick={props.addExercise}>Add exercise</button>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Exercise library</p>
              <h2>Pick or customize</h2>
            </div>
            <Plus size={20} />
          </div>
          <div className="exercise-edit-grid">
            <label className="wide-field">
              <span>Search</span>
              <input value={props.librarySearch} onChange={(event) => props.setLibrarySearch(event.target.value)} placeholder="Bench, back, cable..." />
            </label>
            <label>
              <span>Muscle</span>
              <select value={props.libraryMuscleFilter} onChange={(event) => props.setLibraryMuscleFilter(event.target.value)}>
                {["all", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Custom"].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Equipment</span>
              <select value={props.libraryEquipmentFilter} onChange={(event) => props.setLibraryEquipmentFilter(event.target.value)}>
                {["all", "barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="exercise-library plan-list">
            {props.filteredExerciseLibrary.slice(0, 10).map((exercise) => (
              <div key={exercise.id}>
                <span>{exercise.builtIn ? "Built-in" : "Custom"}</span>
                <button className="exercise-select" onClick={() => props.addExerciseFromLibrary(exercise)}>
                  <strong>{exercise.name}</strong>
                  <em>{exercise.muscleGroup} - {exercise.equipment} - {exercise.movementPattern}</em>
                </button>
                {!exercise.builtIn && (
                  <div className="row-actions">
                    <button onClick={() => props.updateExerciseDefinition(exercise.id, { name: `${exercise.name}*` })}>Edit</button>
                    <button onClick={() => props.deleteExerciseDefinition(exercise.id)}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="exercise-edit-grid">
            <label>
              <span>Custom name</span>
              <input value={props.newLibraryExerciseName} onChange={(event) => props.setNewLibraryExerciseName(event.target.value)} />
            </label>
            <label>
              <span>Muscle</span>
              <input value={props.newLibraryMuscleGroup} onChange={(event) => props.setNewLibraryMuscleGroup(event.target.value)} />
            </label>
            <label>
              <span>Equipment</span>
              <select value={props.newLibraryEquipment} onChange={(event) => props.setNewLibraryEquipment(event.target.value as EquipmentType)}>
                {["barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Pattern</span>
              <select value={props.newLibraryPattern} onChange={(event) => props.setNewLibraryPattern(event.target.value as MovementPattern)}>
                {["push", "pull", "squat", "hinge", "lunge", "carry", "isolation", "core"].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button className="secondary-button" onClick={props.addCustomExerciseDefinition}>Add custom exercise</button>
          </div>
        </section>

        <section className="card import-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Import routine</p>
              <h2>CSV preview</h2>
            </div>
            <Plus size={20} />
          </div>
          <p>CSV/XLSX columns: session, day, exercise, muscle group, sets, reps min, reps max, weight, rest seconds, note.</p>
          <div className="split-actions">
            <a className="secondary-button import-button" href="/samples/evolvefit-routine-template.csv" download>
              Download sample CSV
            </a>
            <button className="secondary-button" onClick={props.downloadRoutineSampleXlsx}>
              Download sample XLSX
            </button>
            <label className="secondary-button import-button">
              Choose CSV/XLSX
              <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => event.target.files?.[0] && props.previewRoutineImport(event.target.files[0])} />
            </label>
          </div>
          {props.routineImportPreview && (
            <div className="import-preview">
              <div className="section-heading">
                <strong>{props.routineImportPreview.fileName}</strong>
                <span className="sync-pill">{props.routineImportPreview.rows.length} rows</span>
              </div>
              {props.routineImportPreview.errors.length ? (
                <div className="import-errors">
                  {props.routineImportPreview.errors.map((error) => (
                    <span key={error}>{error}</span>
                  ))}
                </div>
              ) : (
                <>
                  <div className="import-table">
                    {props.routineImportPreview.rows.slice(0, 6).map((row) => (
                      <div key={row.id}>
                        <span>Line {row.sourceLine}</span>
                        <strong>{row.name}</strong>
                        <em>{row.session} / {row.day} - {row.muscleGroup} - {row.targetSets} x {row.targetRepsMin}-{row.targetRepsMax} - {row.targetWeightKg}kg</em>
                      </div>
                    ))}
                  </div>
                  <div className="split-actions">
                    <button className="secondary-button" onClick={() => props.confirmRoutineImport("append")}>Append</button>
                    <button className="primary-button training-bg" onClick={() => props.confirmRoutineImport("replace")}>Replace routine</button>
                  </div>
                </>
              )}
              <button className="secondary-button" onClick={props.clearRoutineImport}>Clear preview</button>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="stack workout-focus live-workout">
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live mode</p>
            <h2>{props.activeWorkoutDay?.name ?? "Workout session"}</h2>
          </div>
          <Dumbbell size={22} />
        </div>
        <div className="template-row" aria-label="Routine templates">
          {[
            ["ppl", "PPL"],
            ["upper-lower", "Upper/Lower"],
            ["full-body", "Full Body"],
            ["custom", "Custom"]
          ].map(([id, label]) => (
            <button
              key={id}
              className={props.state.activeTemplate === id ? "active" : ""}
              onClick={() => props.applyTemplate(id as AppState["activeTemplate"])}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="exercise-library">
          {props.state.workoutExercises.map((exercise, index) => (
            <div key={exercise.id} className={index === props.state.activeExerciseIndex ? "active" : ""}>
              <span>{index + 1}</span>
              <strong>{exercise.name}</strong>
              <em>
                {exercise.targetSets}x{exercise.targetRepsMin}-{exercise.targetRepsMax}
              </em>
              <div className="row-actions">
                <button
                  onClick={() => props.updateExerciseTarget(exercise.id, { targetWeightKg: Math.max(0, exercise.targetWeightKg - 2.5) })}
                  aria-label="Giảm target weight"
                >
                  -kg
                </button>
                <button
                  onClick={() => props.updateExerciseTarget(exercise.id, { targetWeightKg: exercise.targetWeightKg + 2.5 })}
                  aria-label="Tăng target weight"
                >
                  +kg
                </button>
                <button
                  onClick={() => props.updateExerciseTarget(exercise.id, { targetRepsMax: exercise.targetRepsMax + 1 })}
                  aria-label="Tăng target reps"
                >
                  +rep
                </button>
                <button onClick={() => props.moveExercise(exercise.id, -1)} aria-label="Đưa bài tập lên">
                  ↑
                </button>
                <button onClick={() => props.moveExercise(exercise.id, 1)} aria-label="Đưa bài tập xuống">
                  ↓
                </button>
                <button onClick={() => props.deleteExercise(exercise.id)} aria-label="Xóa bài tập">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="exercise-edit-grid">
                <label>
                  <span>Tên</span>
                  <input value={exercise.name} onChange={(event) => props.updateExerciseTarget(exercise.id, { name: event.target.value })} />
                </label>
                <label>
                  <span>Nhóm cơ</span>
                  <input value={exercise.muscleGroup} onChange={(event) => props.updateExerciseTarget(exercise.id, { muscleGroup: event.target.value })} />
                </label>
                <label>
                  <span>Sets</span>
                  <input type="number" min="1" max="10" value={exercise.targetSets} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetSets: Number(event.target.value) })} />
                </label>
                <label>
                  <span>Rep min</span>
                  <input type="number" min="1" max="50" value={exercise.targetRepsMin} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetRepsMin: Number(event.target.value) })} />
                </label>
                <label>
                  <span>Rep max</span>
                  <input type="number" min="1" max="50" value={exercise.targetRepsMax} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetRepsMax: Number(event.target.value) })} />
                </label>
                <label>
                  <span>Kg</span>
                  <input type="number" min="0" step="0.5" value={exercise.targetWeightKg} onChange={(event) => props.updateExerciseTarget(exercise.id, { targetWeightKg: Number(event.target.value) })} />
                </label>
                <label>
                  <span>Nghỉ</span>
                  <input type="number" min="15" step="15" value={exercise.restSeconds} onChange={(event) => props.updateExerciseTarget(exercise.id, { restSeconds: Number(event.target.value) })} />
                </label>
                <label>
                  <span>Superset</span>
                  <input value={exercise.supersetGroup ?? ""} onChange={(event) => props.updateExerciseTarget(exercise.id, { supersetGroup: event.target.value.trim() || undefined })} placeholder="A1" />
                </label>
                <label className="wide-field">
                  <span>Lần trước</span>
                  <input value={exercise.lastSession} onChange={(event) => props.updateExerciseTarget(exercise.id, { lastSession: event.target.value })} />
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="inline-form">
          <input value={props.newExerciseName} onChange={(event) => props.setNewExerciseName(event.target.value)} aria-label="Tên bài tập mới" />
          <button className="secondary-button" onClick={props.addExercise}>
            Thêm bài
          </button>
        </div>
      </section>

      <section className="card workout-overview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{props.activeWorkoutDay?.name ?? "Session"} ? Exercise {props.state.activeExerciseIndex + 1}/{props.sessionQueue.length}</p>
            <h1>{props.activeExercise.name}</h1>
            <p>{props.activeExercise.muscleGroup} • Target {props.activeExercise.targetSets} x {props.activeExercise.targetRepsMin}-{props.activeExercise.targetRepsMax}</p>
          </div>
          <Dumbbell size={26} />
        </div>
        <div className="last-session">Lần trước: {props.activeExercise.lastSession}</div>
        {props.livePrBadges.length > 0 && (
          <div className="live-pr-banner" role="status" aria-label="Live PR notification">
            <Trophy size={18} />
            <strong>New PR</strong>
            <span>{props.livePrBadges.map((pr) => `${pr.label} ${pr.next}${pr.type === "maxReps" ? " reps" : "kg"}`).join(" | ")}</span>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Set hiện tại</h2>
        {props.activeExercise.supersetGroup && <span className="sync-pill">Superset {props.activeExercise.supersetGroup}</span>}
        {props.allSetsForActive.some((set) => (set.setType ?? "working") === "warmup") && (
          <div className="chip-row warmup-row" aria-label="Warm-up sets completed">
            {props.allSetsForActive
              .filter((set) => (set.setType ?? "working") === "warmup")
              .map((set) => (
                <span key={set.id} className="tiny-chip">WU {set.actualWeightKg}kg x {set.actualReps}</span>
              ))}
          </div>
        )}
        <div className="set-table">
          {Array.from({ length: props.activeExercise.targetSets }).map((_, index) => {
            const done = props.completedSets[index];
            const isCurrent = index === props.completedSets.length;
            return (
              <div key={index} className={isCurrent ? "current" : ""}>
                <span>{done ? setTypeLabels[done.setType ?? "working"] : `Set ${index + 1}`}</span>
                <strong>{done ? (done.actualReps === 0 ? "Skipped" : `${done.actualWeightKg}kg x ${done.actualReps}`) : `${props.activeExercise.targetWeightKg}kg x ${props.activeExercise.targetRepsMin}`}</strong>
                <em>{done ? (done.actualReps === 0 ? "Skipped" : `RPE ${done.rpe ?? "-"}`) : isCurrent ? "Current" : "Pending"}</em>
              </div>
            );
          })}
        </div>
      </section>

      <section className="control-card card">
        <div className="template-row set-type-row" aria-label="Set type">
          {(["warmup", "working", "drop", "failure"] as WorkoutSetType[]).map((type) => (
            <button key={type} className={props.setType === type ? "active" : ""} onClick={() => props.setSetType(type)}>
              {setTypeLabels[type]}
            </button>
          ))}
        </div>
        {warmUpSuggestions.length > 0 && (
          <div className="chip-row warmup-row" aria-label="Warm-up suggestions">
            {warmUpSuggestions.map((suggestion) => (
              <button
                key={`${suggestion.percent}-${suggestion.weightKg}`}
                className="tiny-chip"
                onClick={() => {
                  props.setSetType("warmup");
                  props.setSetWeight(suggestion.weightKg);
                  props.setSetReps(suggestion.reps);
                }}
              >
                {suggestion.percent}%: {suggestion.weightKg}kg x {suggestion.reps}
              </button>
            ))}
          </div>
        )}
        <div className="plate-stepper-block">
          <Stepper label="Tạ" value={props.setWeight} suffix="kg" step={2.5} onChange={props.setSetWeight} />
          <PlateCalculatorReadout calculation={plateCalculation} />
        </div>
        <Stepper label="Reps" value={props.setReps} step={1} onChange={props.setSetReps} />
        <Stepper label="RPE" value={props.setRpe} step={1} min={1} max={10} onChange={props.setSetRpe} />
      </section>

      <section className="rest-card card">
        <div>
          <p className="eyebrow">Rest timer</p>
          <strong>{props.restSeconds > 0 ? `${Math.floor(props.restSeconds / 60)}:${String(props.restSeconds % 60).padStart(2, "0")}` : "Sẵn sàng"}</strong>
          <p>{props.restPaused ? "Tạm dừng" : props.restSeconds > 0 ? "Đang đếm ngược" : "Sẵn sàng set tiếp theo"}</p>
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
            {props.restPaused ? "Resume" : "Pause"}
          </button>
          <button onClick={() => props.adjustRestTimer(15)} aria-label="Thêm 15 giây">
            +15
          </button>
        </div>
      </section>

      <section className="card">
        <div className="split-actions">
          <button className="secondary-button" onClick={props.skipCurrentSet}>Skip set</button>
          <button className="secondary-button" onClick={props.skipExercise}>Skip exercise</button>
          <button className="secondary-button" onClick={props.finishWorkout}>Finish</button>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Workout queue</h2>
          <span className="sync-pill">{props.activeWorkoutSession?.status ?? "no session"}</span>
        </div>
        <div className="queue-summary" aria-label="Session queue status">
          <span>{queuedCount} remaining</span>
          <span>{completedCount} completed</span>
          <span>{parkedCount} parked</span>
        </div>
        <div className="queue-list">
          {queueExercises.map(({ item, exercise }, index) => {
            const isActive = item.exerciseId === props.activeExercise.id;
            const statusLabel = item.status === "parked" ? "Parked" : item.status === "completed" ? "Completed" : "Remaining";
            return (
              <div key={item.exerciseId} className={`queue-row ${isActive ? "active" : ""} ${item.status}`}>
                <button className="queue-select" onClick={() => props.selectExercise(item.exerciseId)}>
                  <span>{index + 1}</span>
                  <strong>{exercise.name}</strong>
                  <em>{exercise.muscleGroup} - {statusLabel}</em>
                </button>
                <div className="row-actions">
                  <button onClick={() => props.reorderSessionExercise(item.exerciseId, -1)} aria-label="Move session exercise up">
                    ↑
                  </button>
                  <button onClick={() => props.reorderSessionExercise(item.exerciseId, 1)} aria-label="Move session exercise down">
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className="secondary-button" onClick={props.saveWorkoutOrderToRoutine} disabled={!props.activeWorkoutSession}>
          Save order to routine
        </button>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workout history</p>
            <h2>Sets đã ghi</h2>
          </div>
          <Activity size={22} />
        </div>
        <div className="timeline compact">
          {props.currentSessionSets.length ? (
            props.currentSessionSets
              .slice()
              .reverse()
              .map((set) => (
                <div key={set.id}>
                  <span>{set.exerciseName}</span>
                  <strong>
                    {set.actualReps === 0 ? "Skipped" : `${set.actualWeightKg}kg x ${set.actualReps}`}
                  </strong>
                  <em>{setTypeLabels[set.setType ?? "working"]} - RPE {set.rpe ?? "-"}</em>
                  <div className="row-actions">
                    <button onClick={() => props.updateWorkoutSet(set.id, { actualWeightKg: Math.max(0, set.actualWeightKg - 2.5) })} aria-label="Giảm kg set">
                      -kg
                    </button>
                    <button onClick={() => props.updateWorkoutSet(set.id, { actualWeightKg: set.actualWeightKg + 2.5 })} aria-label="Tăng kg set">
                      +kg
                    </button>
                    <button onClick={() => props.updateWorkoutSet(set.id, { actualReps: Math.max(0, set.actualReps - 1) })} aria-label="Giảm reps set">
                      -rep
                    </button>
                    <button onClick={() => props.updateWorkoutSet(set.id, { actualReps: set.actualReps + 1 })} aria-label="Tăng reps set">
                      +rep
                    </button>
                    <button onClick={() => props.deleteWorkoutSet(set.id)} aria-label="Xóa set">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <p>Chưa có set nào trong buổi hiện tại.</p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Session history</h2>
          <span className="sync-pill">{props.state.workoutSessions.length} sessions</span>
        </div>
        <div className="timeline compact">
          {props.state.workoutSessions.length ? (
            props.state.workoutSessions
              .slice()
              .reverse()
              .map((session) => {
                const setCount = props.state.workoutSets.filter((set) => set.sessionId === session.id).length;
                return (
                  <div key={session.id}>
                    <span>{session.sessionName}</span>
                    <strong>{session.status}</strong>
                    <em>{setCount} sets - {Math.round(session.durationSeconds / 60)}m</em>
                  </div>
                );
              })
          ) : (
            <p>No workout sessions yet.</p>
          )}
        </div>
      </section>

      <button className="sticky-complete training-bg" onClick={props.completeSet}>
        <Check size={22} /> Hoàn thành set
      </button>
    </div>
  );
}

function Stepper(props: {
  label: string;
  value: number;
  step: number;
  suffix?: string;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const update = (direction: -1 | 1) => {
    const next = Math.round((props.value + props.step * direction) * 10) / 10;
    props.onChange(Math.min(props.max ?? 999, Math.max(props.min ?? 0, next)));
  };

  return (
    <div className="stepper">
      <span>{props.label}</span>
      <button onClick={() => update(-1)} aria-label={`Giảm ${props.label}`}>
        <Minus size={18} />
      </button>
      <strong>
        {props.value}
        {props.suffix}
      </strong>
      <button onClick={() => update(1)} aria-label={`Tăng ${props.label}`}>
        <Plus size={18} />
      </button>
    </div>
  );
}

function PlateCalculatorReadout(props: { calculation: PlateCalculation }) {
  const { calculation } = props;
  const plateText = calculation.platesPerSide.length
    ? calculation.platesPerSide.map((plate) => `${plate.count}x${plate.weightKg}`).join(" + ")
    : "bar only";
  return (
    <div className="plate-readout" aria-label="Plate calculator">
      <span>Plates / side</span>
      <strong>{plateText}</strong>
      <em>
        Bar {calculation.barbellKg}kg
        {calculation.remainderKg > 0 ? ` | closest ${calculation.matchedWeightKg}kg, missing ${calculation.remainderKg}kg` : ""}
      </em>
    </div>
  );
}

function ProgressView(props: {
  totalWater: number;
  target: number;
  sets: WorkoutSet[];
  bestSet?: WorkoutSet;
  progress: ProgressDashboard;
  achievements: { code: string; name: string; progress: number; target: number; status: string; streakMonths: number }[];
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
  downloadExport: () => void;
}) {
  const volume = workingSetVolumeKg(props.sets);
  const oneRm = props.bestSet ? estimatedOneRepMax(props.bestSet.actualWeightKg, props.bestSet.actualReps) : 0;
  const completedExercises = new Set(props.sets.filter(isWorkingVolumeSet).map((set) => set.exerciseId)).size;
  const maxWeeklyVolume = Math.max(1, ...props.progress.weeklyVolume.map((bucket) => bucket.volumeKg));
  const maxMuscleVolume = Math.max(1, ...props.progress.volumeByMuscleGroup.map((bucket) => bucket.volumeKg));

  return (
    <div className="stack progress-screen">
      <section className="stats-grid progress-summary">
        <MetricCard label="Nước hôm nay" value={`${props.totalWater}/${props.target}ml`} accent="hydration" />
        <MetricCard icon={<Dumbbell size={19} />} label="Workouts 7d/30d" value={`${props.progress.workoutCount7}/${props.progress.workoutCount30}`} accent="training" />
        <MetricCard label="e1RM tốt nhất" value={oneRm ? `${oneRm}kg` : "Chưa có"} accent="coach" />
        <MetricCard label="Cân nặng" value={props.latestMetric ? `${props.latestMetric.weightKg}kg` : "Chưa có"} accent="neutral" />
      </section>
      <section className="card">
        <h2>Xu hướng 7 ngày</h2>
        <div className="bar-chart" aria-label="Biểu đồ tiến độ">
          {[props.progress.hydration7.goalHitRate, props.progress.hydration30.goalHitRate].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>
      <section className="card chart-card">
        <div className="section-heading">
          <h2>Weekly volume</h2>
          <span className="sync-pill">{completedExercises} exercises</span>
        </div>
        {props.progress.weeklyVolume.length ? (
          <div className="bar-chart training-chart" aria-label="Weekly training volume chart">
            {props.progress.weeklyVolume.slice(-6).map((bucket) => (
              <span key={bucket.label} title={`${bucket.label}: ${bucket.volumeKg}kg`} style={{ height: `${Math.max(8, (bucket.volumeKg / maxWeeklyVolume) * 100)}%` }} />
            ))}
          </div>
        ) : (
          <EmptyState title="No weekly volume yet" text="Complete working sets to build weekly volume." />
        )}
        <p className="chart-note">{volume ? `${Math.round(volume)}kg total working volume logged.` : "Skipped sets are excluded from volume."}</p>
      </section>

      <section className="card progress-detail-card">
        <div className="section-heading">
          <h2>Hydration trend</h2>
          <span className="sync-pill">{props.totalWater}/{props.target}ml today</span>
        </div>
        <div className="progress-kpi-grid">
          <div>
            <span>7-day average</span>
            <strong>{props.progress.hydration7.averageMl}ml</strong>
            <em>{props.progress.hydration7.hitDays}/7 goal days</em>
          </div>
          <div>
            <span>30-day average</span>
            <strong>{props.progress.hydration30.averageMl}ml</strong>
            <em>{props.progress.hydration30.goalHitRate}% goal hit</em>
          </div>
          {props.progress.creatineConsistency && (
            <div>
              <span>Creatine consistency</span>
              <strong>{props.progress.creatineConsistency.consistencyRate}%</strong>
              <em>{props.progress.creatineConsistency.takenDays}/30 days</em>
            </div>
          )}
        </div>
      </section>

      <section className="card progress-detail-card">
        <div className="section-heading">
          <h2>Muscle group volume</h2>
          <span className="sync-pill">working sets only</span>
        </div>
        {props.progress.volumeByMuscleGroup.length ? (
          <div className="progress-list">
            {props.progress.volumeByMuscleGroup.map((bucket) => (
              <div key={bucket.label}>
                <span>{bucket.label}</span>
                <strong>{bucket.volumeKg}kg</strong>
                <i style={{ width: `${Math.max(8, (bucket.volumeKg / maxMuscleVolume) * 100)}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No muscle split yet" text="Log working sets from your routine to see volume by muscle group." />
        )}
      </section>

      <section className="card progress-detail-card">
        <div className="section-heading">
          <h2>e1RM trend</h2>
          <span className="sync-pill">main lifts</span>
        </div>
        {props.progress.e1RmTrend.length ? (
          <div className="timeline compact">
            {props.progress.e1RmTrend.slice(-8).map((point) => (
              <div key={`${point.exerciseId}-${point.date}`}>
                <span>{new Date(`${point.date}T00:00:00.000Z`).toLocaleDateString("vi-VN")}</span>
                <strong>{point.exerciseName}</strong>
                <em>{point.estimatedOneRepMaxKg}kg e1RM</em>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No e1RM trend yet" text="Log weighted sets with reps to generate main lift e1RM points." />
        )}
      </section>

      <section className="card progress-detail-card">
        <div className="section-heading">
          <h2>Exercise PRs</h2>
          <span className="sync-pill">{props.progress.prs.length} exercises</span>
        </div>
        {props.progress.prs.length ? (
          <div className="pr-grid">
            {props.progress.prs.map((pr) => (
              <div key={pr.exerciseId}>
                <strong>{pr.exerciseName}</strong>
                <span>Max weight {pr.maxWeightKg}kg</span>
                <span>Max reps {pr.maxReps}</span>
                <span>e1RM {pr.estimatedOneRepMaxKg}kg</span>
                <span>Volume PR {pr.volumePrKg}kg</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No PRs yet" text="Skipped sets do not count. Complete working sets to create PRs." />
        )}
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Body metrics</h2>
          <span className="sync-pill">{props.weightDelta >= 0 ? "+" : ""}{formatWeight(props.weightDelta, props.unitWeight)}</span>
        </div>
        <BodyMetricCharts
          dataset={props.bodyMetricChart}
          range={props.bodyMetricRange}
          setRange={props.setBodyMetricRange}
        />
        <div className="metric-goals">
          <label>
            <span>Goal weight ({props.unitWeight})</span>
            <input
              type="number"
              step="0.1"
              value={props.bodyMetricChart.weightGoal ?? ""}
              onChange={(event) => props.updateProfile({ goalWeightKg: event.target.value ? inputWeightToKg(Number(event.target.value), props.unitWeight) : undefined })}
            />
          </label>
          <label>
            <span>Goal body fat (%)</span>
            <input
              type="number"
              min="0"
              max="70"
              step="0.1"
              value={props.bodyMetricChart.bodyFatGoal ?? ""}
              onChange={(event) => props.updateProfile({ goalBodyFatPercent: event.target.value ? Number(event.target.value) : undefined })}
            />
          </label>
        </div>
        {props.bodyMetricWarnings.length > 0 && (
          <div className="warning-list" role="alert">
            {props.bodyMetricWarnings.map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </div>
        )}
        <div className="metric-form">
          <label>
            <span>Weight ({props.unitWeight})</span>
            <input type="number" step="0.1" value={props.newMetricWeight} onChange={(event) => props.setNewMetricWeight(Number(event.target.value))} />
          </label>
          <label>
            <span>Body fat</span>
            <input type="number" step="0.1" value={props.newMetricBodyFat} onChange={(event) => props.setNewMetricBodyFat(Number(event.target.value))} />
          </label>
          <label>
            <span>Waist</span>
            <input type="number" step="0.1" value={props.newMetricWaist} onChange={(event) => props.setNewMetricWaist(Number(event.target.value))} />
          </label>
          <label>
            <span>Chest</span>
            <input type="number" step="0.1" value={props.newMetricChest} onChange={(event) => props.setNewMetricChest(Number(event.target.value))} />
          </label>
          <label>
            <span>Arm</span>
            <input type="number" step="0.1" value={props.newMetricArm} onChange={(event) => props.setNewMetricArm(Number(event.target.value))} />
          </label>
          <label>
            <span>Thigh</span>
            <input type="number" step="0.1" value={props.newMetricThigh} onChange={(event) => props.setNewMetricThigh(Number(event.target.value))} />
          </label>
          <label className="wide-field">
            <span>Note</span>
            <input value={props.newMetricNote} onChange={(event) => props.setNewMetricNote(event.target.value)} />
          </label>
          <button className="secondary-button" onClick={props.addBodyMetric}>
            Lưu metric
          </button>
        </div>
        <div className="timeline compact">
          {props.bodyMetrics
            .slice()
            .reverse()
            .map((metric) => (
              <div key={metric.id}>
                <span>{new Date(metric.measuredAt).toLocaleDateString("vi-VN")}</span>
                <strong>{formatWeight(metric.weightKg, props.unitWeight)}</strong>
                <em>{metric.bodyFatPercent ?? "-"}% • W {metric.waistCm ?? "-"}</em>
                <div className="row-actions">
                  <button onClick={() => props.updateBodyMetric(metric.id, { weightKg: Math.round((metric.weightKg - 0.1) * 10) / 10 })}>
                    -0.1
                  </button>
                  <button onClick={() => props.updateBodyMetric(metric.id, { weightKg: Math.round((metric.weightKg + 0.1) * 10) / 10 })}>
                    +0.1
                  </button>
                </div>
                <button className="icon-mini danger" onClick={() => props.deleteBodyMetric(metric.id)} aria-label="Xóa chỉ số cơ thể">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>
      </section>

      <section className="card">
        <h2>Badges</h2>
        <div className="badge-list">
          {props.achievements.map((badge) => (
            <div key={badge.code}>
              <Trophy size={20} />
              <div>
                <strong>{badge.name}</strong>
                <p>{badge.progress}/{badge.target} • {badge.status} • streak {badge.streakMonths}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="insight-card">
          <Award size={18} />
          <div>
            <strong>Progress insight</strong>
            <p>Consistent hydration and logged sets will unlock stronger weekly trend data.</p>
          </div>
        </div>
        <button className="secondary-button export-button" onClick={props.downloadExport}>
          Export JSON
        </button>
      </section>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; accent: "hydration" | "training" | "coach" | "neutral"; icon?: React.ReactNode }) {
  return (
    <div className={`metric-card ${props.accent}`}>
      {props.icon && <span className="metric-icon">{props.icon}</span>}
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function EmptyState(props: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{props.title}</strong>
      <p>{props.text}</p>
    </div>
  );
}

function BodyMetricCharts(props: {
  dataset: BodyMetricChartDataset;
  range: BodyMetricRangeDays;
  setRange: (range: BodyMetricRangeDays) => void;
}) {
  const weightValues = props.dataset.points.flatMap((point) => [point.weight, point.smoothedWeight, props.dataset.weightGoal].filter((value): value is number => value !== undefined));
  const bodyFatValues = props.dataset.points.flatMap((point) =>
    [point.bodyFatPercent, point.smoothedBodyFatPercent, props.dataset.bodyFatGoal].filter((value): value is number => value !== undefined)
  );
  const weightMin = Math.min(...weightValues, 0);
  const weightMax = Math.max(...weightValues, 1);
  const bodyFatMin = Math.min(...bodyFatValues, 0);
  const bodyFatMax = Math.max(...bodyFatValues, 1);
  const heightFor = (value: number, min: number, max: number) => `${Math.max(8, ((value - min) / Math.max(1, max - min)) * 100)}%`;

  return (
    <div className="body-chart-panel">
      <div className="segmented-control" aria-label="Body metric range">
        {[7, 30, 90].map((range) => (
          <button key={range} className={props.range === range ? "active" : ""} onClick={() => props.setRange(range as BodyMetricRangeDays)}>
            {range}d
          </button>
        ))}
      </div>
      {props.dataset.hasWeightData ? (
        <div className="body-chart">
          <div className="section-heading">
            <h2>Weight trend</h2>
            <span className="sync-pill">{props.dataset.weightGoal ? `Goal ${props.dataset.weightGoal}${props.dataset.unit}` : "No goal"}</span>
          </div>
          <div className="body-chart-bars" aria-label={`Weight chart ${props.range} days`}>
            {props.dataset.points.map((point, index) => (
              <span key={`${point.date}-${index}`} title={`${point.date}: ${point.weight}${props.dataset.unit}`} style={{ height: heightFor(point.smoothedWeight, weightMin, weightMax) }} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="No weight chart yet" text="Add body metrics to see weight over 7, 30, or 90 days." />
      )}
      {props.dataset.hasBodyFatData ? (
        <div className="body-chart">
          <div className="section-heading">
            <h2>Body fat trend</h2>
            <span className="sync-pill">{props.dataset.bodyFatGoal ? `Goal ${props.dataset.bodyFatGoal}%` : "No goal"}</span>
          </div>
          <div className="body-chart-bars body-fat-chart" aria-label={`Body fat chart ${props.range} days`}>
            {props.dataset.points
              .filter((point) => point.smoothedBodyFatPercent !== undefined)
              .map((point, index) => (
                <span key={`${point.date}-${index}`} title={`${point.date}: ${point.bodyFatPercent}%`} style={{ height: heightFor(point.smoothedBodyFatPercent ?? 0, bodyFatMin, bodyFatMax) }} />
              ))}
          </div>
        </div>
      ) : (
        <EmptyState title="No body fat chart yet" text="Add body fat percentage to at least one metric to show this chart." />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CoachView(props: {
  recommendation: { title: string; reason: string; source: string; action: string; nextWeightKg: number };
  achievements: { name: string; streakMonths: number }[];
  recovery: AppState["recovery"];
  updateRecovery: (next: Partial<AppState["recovery"]>) => void;
  decisions: AppState["recommendationDecisions"];
  decideRecommendation: (decision: "accepted" | "rejected") => void;
}) {
  return (
    <div className="stack">
      <section className="card coach-card">
        <p className="eyebrow">Coach recommendation</p>
        <h1>{props.recommendation.title}</h1>
        <p>{props.recommendation.reason}</p>
        <div className="coach-actions">
          <button className="primary-button coach-bg" onClick={() => props.decideRecommendation("accepted")}>
            Áp dụng
          </button>
          <button className="secondary-button" onClick={() => props.decideRecommendation("rejected")}>
            Từ chối
          </button>
        </div>
      </section>
      <section className="card">
        <h2>Readiness</h2>
        <div className="readiness-score">
          <strong>{readinessScore(props.recovery)}</strong>
          <span>{props.recovery.note}</span>
        </div>
        <div className="recovery-controls">
          <label>
            Energy
            <input type="range" min="1" max="5" value={props.recovery.energy} onChange={(event) => props.updateRecovery({ energy: Number(event.target.value) })} />
          </label>
          <label>
            Sleep
            <input type="range" min="1" max="5" value={props.recovery.sleepQuality} onChange={(event) => props.updateRecovery({ sleepQuality: Number(event.target.value) })} />
          </label>
          <label>
            Soreness
            <input type="range" min="1" max="5" value={props.recovery.soreness} onChange={(event) => props.updateRecovery({ soreness: Number(event.target.value) })} />
          </label>
          <label>
            Stress
            <input type="range" min="1" max="5" value={props.recovery.stress} onChange={(event) => props.updateRecovery({ stress: Number(event.target.value) })} />
          </label>
          <input value={props.recovery.note} onChange={(event) => props.updateRecovery({ note: event.target.value })} aria-label="Recovery note" />
        </div>
      </section>
      <section className="card">
        <h2>Recommendation audit</h2>
        <div className="timeline compact">
          {props.decisions.length ? (
            props.decisions.map((decision) => (
              <div key={decision.id}>
                <span>{new Date(decision.decidedAt).toLocaleDateString("vi-VN")}</span>
                <strong>{decision.decision}</strong>
                <em>{decision.title}</em>
              </div>
            ))
          ) : (
            <p>Chưa có recommendation nào được áp dụng hoặc từ chối.</p>
          )}
        </div>
      </section>
      <section className="card">
        <h2>Leaderboard preview</h2>
        <div className="leaderboard">
          {["Minh", "Phúc", "An"].map((name, index) => (
            <div key={name}>
              <span>#{index + 1}</span>
              <strong>{name}</strong>
              <em>{props.achievements[index % props.achievements.length].streakMonths + index} tháng</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsView(props: {
  state: AppState;
  updateProfile: (next: Partial<AppState["profile"]>) => void;
  signInLocal: (mode: AppState["profile"]["authMode"]) => void;
  reset: () => void;
  deletePersonalData: () => void;
  notificationPermission: NotificationPermission;
  pushConfigured: boolean;
  pushSubscriptionStatus: PushSubscriptionStatus;
  requestNotifications: () => void;
  subscribeWebPush: () => void;
  unsubscribeWebPush: () => void;
  sendTestPushNotification: () => void;
  markQueue: (status: "synced" | "failed") => void;
  clearQueue: (status?: "synced" | "failed") => void;
  downloadExport: () => void;
  downloadCsvExport: (dataset?: CsvDataset) => void;
  importJsonExport: (file: File) => void;
  restoreSections: RestoreSection[];
  setRestoreSections: (sections: RestoreSection[]) => void;
  updateNotificationSettings: (next: Partial<AppState["notificationSettings"]>) => void;
  updatePlateSettings: (next: Partial<PlateSettings>) => void;
  drinkModules: DrinkModule[];
  updateDrinkModule: (id: DrinkModule["id"], patch: Partial<DrinkModule>) => void;
  reopenOnboarding: () => void;
}) {
  const pendingQueue = props.state.syncQueue.filter((item) => item.status === "pending").length;
  const syncedQueue = props.state.syncQueue.filter((item) => item.status === "synced").length;
  const failedQueue = props.state.syncQueue.filter((item) => item.status === "failed").length;
  const creatineActive = isDrinkModuleActive(props.drinkModules, "creatine");

  function updateModuleGoal(module: DrinkModule, goal: number) {
    if (module.id === "water") {
      props.updateProfile({ waterTargetMl: goal });
      return;
    }
    if (module.id === "creatine") {
      props.updateProfile({ creatineAmountG: goal });
      return;
    }
    props.updateDrinkModule(module.id, { goal });
  }

  function parseHours(value: string): number[] {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)
      .filter((hour, index, list) => list.indexOf(hour) === index)
      .sort((a, b) => a - b);
  }

  function parsePlateInventory(value: string): number[] {
    return normalizePlateInventory(
      value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((plate) => Number.isFinite(plate) && plate > 0)
    );
  }

  function snooze(minutes: number) {
    props.updateNotificationSettings({ snoozeUntil: new Date(Date.now() + minutes * 60000).toISOString() });
  }

  function toggleRestoreSection(section: RestoreSection, checked: boolean) {
    props.setRestoreSections(
      checked
        ? [...props.restoreSections, section].filter((item, index, list) => list.indexOf(item) === index)
        : props.restoreSections.filter((item) => item !== section)
    );
  }

  return (
    <div className="stack settings-screen">
      <section className="card settings-profile-card">
        <div className="settings-profile-head">
          <div className="settings-avatar">{(props.state.profile.name || "A").slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{props.state.profile.name || "Athlete"}</strong>
            <p>{props.state.profile.email || "Local profile"} - goal: stronger every day</p>
          </div>
          <ChevronRight size={18} />
        </div>
        <h2>Profile</h2>
        <div className="setting-row">
          <span>Session</span>
          <strong>{props.state.profile.authMode}</strong>
        </div>
        <label className="setting-row">
          <span>Email</span>
          <input
            type="email"
            value={props.state.profile.email}
            onChange={(event) => props.updateProfile({ email: event.target.value })}
          />
        </label>
        <div className="split-actions">
          <button className="secondary-button" onClick={() => props.signInLocal("email")}>
            Email mode
          </button>
          <button className="secondary-button" onClick={() => props.signInLocal("google")}>
            Google mode
          </button>
        </div>
        <button className="secondary-button export-button" onClick={props.reopenOnboarding}>
          Mở lại onboarding
        </button>
        <label className="setting-row">
          <span>Mục tiêu nước</span>
          <input
            type="number"
            value={props.state.profile.waterTargetMl}
            onChange={(event) => props.updateProfile({ waterTargetMl: Number(event.target.value) })}
          />
        </label>
        <label className="setting-row">
          <span>Giờ uống creatine</span>
          <input
            type="number"
            min="0"
            max="23"
            value={props.state.profile.creatineHour}
            onChange={(event) => props.updateProfile({ creatineHour: Number(event.target.value) })}
          />
        </label>
        <label className="setting-row">
          <span>Nhắc trước</span>
          <input
            type="number"
            min="0"
            max="120"
            value={props.state.profile.remindBeforeMinutes}
            onChange={(event) => props.updateProfile({ remindBeforeMinutes: Number(event.target.value) })}
          />
        </label>
      </section>
      <section className="card">
        <h2>Thức uống & supplement</h2>
        <div className="readiness-list drink-module-list">
          {props.drinkModules.map((module) => (
            <div key={module.id} className="drink-module-row">
              <label className="toggle-row">
                <span>
                  {module.name}
                  <em>{module.id === "water" ? "Primary" : module.category}</em>
                </span>
                <input
                  type="checkbox"
                  checked={module.id === "water" ? true : module.active}
                  disabled={module.id === "water"}
                  onChange={(event) => props.updateDrinkModule(module.id, { active: event.target.checked })}
                />
              </label>
              <div className="settings-inline-grid">
                <label>
                  <span>{module.unit === "ml" ? "Mục tiêu ml" : "Mục tiêu g"}</span>
                  <input type="number" min="0" value={module.goal} onChange={(event) => updateModuleGoal(module, Number(event.target.value))} />
                </label>
                {module.category === "drink" && (
                  <label>
                    <span>Hydration factor</span>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={module.hydrationFactor ?? 0}
                      disabled={!module.active}
                      onChange={(event) => props.updateDrinkModule(module.id, { hydrationFactor: Number(event.target.value) })}
                    />
                  </label>
                )}
                <label className="toggle-row compact-toggle">
                  <span>Reminder</span>
                  <input
                    type="checkbox"
                    checked={module.reminderEnabled}
                    disabled={module.id === "water" || !module.active}
                    onChange={(event) => props.updateDrinkModule(module.id, { reminderEnabled: event.target.checked })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <p className="privacy-note">Water luôn là thức uống chính; module tắt sẽ rời khỏi UI hằng ngày nhưng dữ liệu cũ vẫn nằm trong export.</p>
      </section>
      <section className="card">
        <h2>Plate calculator</h2>
        <div className="settings-inline-grid">
          <label>
            <span>Barbell</span>
            <select
              value={props.state.plateSettings.barbellDefault}
              onChange={(event) => props.updatePlateSettings({ barbellDefault: event.target.value as PlateSettings["barbellDefault"] })}
            >
              <option value="20kg">20kg</option>
              <option value="15kg">15kg</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label>
            <span>Custom bar kg</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={props.state.plateSettings.customBarbellKg}
              disabled={props.state.plateSettings.barbellDefault !== "custom"}
              onChange={(event) => props.updatePlateSettings({ customBarbellKg: Number(event.target.value) })}
            />
          </label>
          <label className="wide-field">
            <span>Plate inventory kg</span>
            <input
              value={props.state.plateSettings.plateInventoryKg.join(", ")}
              onChange={(event) => props.updatePlateSettings({ plateInventoryKg: parsePlateInventory(event.target.value) })}
              aria-label="Plate inventory kg"
            />
          </label>
        </div>
        <p className="privacy-note">Live Workout dùng cấu hình này để hiển thị đĩa mỗi bên từ target weight hoặc tạ đang log.</p>
      </section>
      <section className="card">
        <h2>Privacy</h2>
        <label className="toggle-row">
          <span>Tham gia leaderboard</span>
          <input
            type="checkbox"
            checked={props.state.profile.leaderboardPublic}
            onChange={(event) => props.updateProfile({ leaderboardPublic: event.target.checked })}
          />
        </label>
        <p className="privacy-note">Mặc định riêng tư. Leaderboard chỉ hiển thị tên, avatar, rank và badge streak.</p>
      </section>
      <section className="card">
        <h2>Notifications</h2>
        <div className="setting-row">
          <span>Quyền trình duyệt</span>
          <strong>{props.notificationPermission}</strong>
        </div>
        <button className="secondary-button export-button" onClick={props.requestNotifications}>
          Bật thông báo
        </button>
        <div className="setting-row">
          <span>Web Push env</span>
          <strong>{props.pushConfigured ? "configured" : "fallback"}</strong>
        </div>
        <div className="setting-row">
          <span>Subscription</span>
          <strong>{props.pushSubscriptionStatus}</strong>
        </div>
        <div className="split-actions">
          <button className="secondary-button" onClick={props.subscribeWebPush} disabled={props.notificationPermission !== "granted" || props.pushSubscriptionStatus === "subscribed"}>
            Subscribe push
          </button>
          <button className="secondary-button" onClick={props.unsubscribeWebPush} disabled={props.pushSubscriptionStatus !== "subscribed"}>
            Unsubscribe push
          </button>
        </div>
        <button className="secondary-button export-button" onClick={props.sendTestPushNotification}>
          Send test notification
        </button>
        <label className="toggle-row">
          <span>Nh?c u?ng n??c</span>
          <input
            type="checkbox"
            checked={props.state.notificationSettings.hydrationEnabled}
            onChange={(event) => props.updateNotificationSettings({ hydrationEnabled: event.target.checked })}
          />
        </label>
        <div className="settings-inline-grid">
          <label>
            <span>Water mode</span>
            <select
              value={props.state.notificationSettings.hydrationMode}
              onChange={(event) => props.updateNotificationSettings({ hydrationMode: event.target.value as AppState["notificationSettings"]["hydrationMode"] })}
            >
              <option value="interval">Interval</option>
              <option value="fixed">Fixed times</option>
            </select>
          </label>
          <label>
            <span>Fixed hours</span>
            <input
              value={props.state.notificationSettings.hydrationTimes.join(", ")}
              onChange={(event) => props.updateNotificationSettings({ hydrationTimes: parseHours(event.target.value) })}
              aria-label="Water fixed reminder hours"
            />
          </label>
          <label>
            <span>Interval hours</span>
            <input
              type="number"
              min="1"
              max="8"
              step="0.5"
              value={props.state.notificationSettings.hydrationIntervalHours}
              onChange={(event) => props.updateNotificationSettings({ hydrationIntervalHours: Number(event.target.value) })}
            />
          </label>
        </div>
        <label className="toggle-row">
          <span>Nh?c creatine</span>
          <input
            type="checkbox"
            checked={creatineActive && props.state.notificationSettings.creatineEnabled}
            disabled={!creatineActive}
            onChange={(event) => props.updateNotificationSettings({ creatineEnabled: event.target.checked })}
          />
        </label>
        <div className="settings-inline-grid">
          <label>
            <span>Creatine mode</span>
            <select
              value={props.state.notificationSettings.creatineMode}
              disabled={!creatineActive}
              onChange={(event) => props.updateNotificationSettings({ creatineMode: event.target.value as AppState["notificationSettings"]["creatineMode"] })}
            >
              <option value="fixed">Fixed times</option>
              <option value="interval">Interval</option>
            </select>
          </label>
          <label>
            <span>Fixed hours</span>
            <input
              value={props.state.notificationSettings.creatineTimes.join(", ")}
              disabled={!creatineActive}
              onChange={(event) => props.updateNotificationSettings({ creatineTimes: parseHours(event.target.value) })}
              aria-label="Creatine fixed reminder hours"
            />
          </label>
          <label>
            <span>Interval hours</span>
            <input
              type="number"
              min="1"
              max="24"
              value={props.state.notificationSettings.creatineIntervalHours}
              disabled={!creatineActive}
              onChange={(event) => props.updateNotificationSettings({ creatineIntervalHours: Number(event.target.value) })}
            />
          </label>
        </div>
        <label className="toggle-row">
          <span>Quiet hours</span>
          <input
            type="checkbox"
            checked={props.state.notificationSettings.quietHoursEnabled}
            onChange={(event) => props.updateNotificationSettings({ quietHoursEnabled: event.target.checked })}
          />
        </label>
        <div className="settings-inline-grid">
          <label>
            <span>Quiet start</span>
            <input
              type="number"
              min="0"
              max="23"
              value={props.state.notificationSettings.quietHoursStart}
              onChange={(event) => props.updateNotificationSettings({ quietHoursStart: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Quiet end</span>
            <input
              type="number"
              min="0"
              max="23"
              value={props.state.notificationSettings.quietHoursEnd}
              onChange={(event) => props.updateNotificationSettings({ quietHoursEnd: Number(event.target.value) })}
            />
          </label>
          <label className="toggle-row compact-toggle">
            <span>In-app fallback</span>
            <input
              type="checkbox"
              checked={props.state.notificationSettings.inAppFallbackEnabled}
              onChange={(event) => props.updateNotificationSettings({ inAppFallbackEnabled: event.target.checked })}
            />
          </label>
        </div>
        <div className="split-actions">
          <button className="secondary-button" onClick={() => snooze(30)}>
            Snooze 30m
          </button>
          <button className="secondary-button" onClick={() => snooze(120)}>
            Snooze 2h
          </button>
        </div>
        <button className="secondary-button export-button" onClick={() => props.updateNotificationSettings({ snoozeUntil: undefined })}>
          Clear snooze {props.state.notificationSettings.snoozeUntil ? `(${new Date(props.state.notificationSettings.snoozeUntil).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})` : ""}
        </button>
        <p className="privacy-note">Web Push thật cần VAPID/FCM credentials; app hiện đã có service worker action handler và API subscription contract.</p>
      </section>
      <section className="card">
        <h2>Backend readiness</h2>
        <div className="readiness-list">
          <span>Supabase adapter: env-ready contract</span>
          <span>AI coach: Gemini/OpenAI fallback contract</span>
          <span>Vercel Cron: configured</span>
          <span>Push actions: Log 250ml / Snooze</span>
        </div>
      </section>
      <section className="card">
        <h2>Offline sync queue</h2>
        <div className="readiness-list">
          <span>{pendingQueue} pending</span>
          <span>{syncedQueue} synced</span>
          <span>{failedQueue} failed</span>
        </div>
        <div className="split-actions">
          <button className="secondary-button" onClick={() => props.markQueue("synced")} disabled={!pendingQueue}>
            Retry / mark synced
          </button>
          <button className="secondary-button" onClick={() => props.markQueue("failed")} disabled={!pendingQueue}>
            Mark failed
          </button>
        </div>
        <div className="split-actions">
          <button className="secondary-button" onClick={() => props.clearQueue("synced")} disabled={!syncedQueue}>
            Clear synced
          </button>
          <button className="secondary-button" onClick={() => props.clearQueue("failed")} disabled={!failedQueue}>
            Clear failed
          </button>
        </div>
        <div className="sync-preview">
          {props.state.syncQueue.slice(0, 4).map((item) => (
            <div key={item.id}>
              <span>{item.status}</span>
              <strong>{item.type}</strong>
              <em>{new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</em>
            </div>
          ))}
        </div>
        <p className="privacy-note">Queue hiện lưu local-first để chuẩn bị sync backend và xử lý retry/conflict ở bước production.</p>
      </section>
      <section className="card">
        <h2>Dữ liệu & quyền riêng tư</h2>
        <p className="privacy-note">Export JSON gồm metadata appVersion, exportedAt, schemaVersion và local profile id. Import JSON được kiểm tra schema trước khi restore nên file sai không ghi đè dữ liệu hiện tại.</p>
        <div className="restore-section-grid" aria-label="Chọn nhóm dữ liệu restore">
          {[
            ["profile", "Profile"],
            ["hydration", "Hydration"],
            ["workouts", "Workouts"],
            ["bodyMetrics", "Body metrics"],
            ["settings", "Settings"]
          ].map(([section, label]) => (
            <label key={section} className="toggle-row compact-toggle">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={props.restoreSections.includes(section as RestoreSection)}
                onChange={(event) => toggleRestoreSection(section as RestoreSection, event.target.checked)}
              />
            </label>
          ))}
        </div>
        <div className="settings-actions">
          <button className="secondary-button" onClick={props.downloadExport}>
            Export JSON
          </button>
          <button className="secondary-button" onClick={() => props.downloadCsvExport()}>
            Export all CSV
          </button>
          <label className="secondary-button import-button">
            Import JSON
            <input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && props.importJsonExport(event.target.files[0])} />
          </label>
          <button className="secondary-button danger-button" onClick={() => window.confirm("Xóa dữ liệu cá nhân local? Leaderboard sẽ tắt và dữ liệu profile, hydration, workout, body metrics, queue local sẽ bị xóa.") && props.deletePersonalData()}>
            Delete personal data
          </button>
          <button className="secondary-button danger-button" onClick={() => window.confirm("Reset demo data? Flow này khôi phục dữ liệu mẫu và tách riêng khỏi xóa dữ liệu cá nhân.") && props.reset()}>
            Reset demo data
          </button>
        </div>
        <p className="privacy-note">Leaderboard mặc định tắt; khi bật chỉ gửi trạng thái public cho hồ sơ xếp hạng. Dữ liệu cá nhân như email, số đo cơ thể, lịch sử uống nước và workout chỉ nằm trong local/export JSON cho đến khi bạn restore hoặc xóa.</p>
        <div className="dataset-export-grid" aria-label="Export CSV theo dataset">
          {[
            ["hydration", "Hydration"],
            ["creatine", "Creatine"],
            ["workouts", "Workouts"],
            ["body-metrics", "Body metrics"]
          ].map(([dataset, label]) => (
            <button key={dataset} onClick={() => props.downloadCsvExport(dataset as CsvDataset)}>
              <span>{label}</span>
              <em>CSV</em>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
