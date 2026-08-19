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
import { useEffect, useMemo, useState } from "react";
import {
  cryptoSafeId,
  estimatedOneRepMax,
  exportAppData,
  expectedHydrationByNow,
  latestBodyMetric,
  bodyWeightDelta,
  hydrationPaceStatus,
  hydrationPercent,
  hydrationTotal,
  isDrinkModuleActive,
  monthlyAchievements,
  normalizeDrinkModules,
  readinessScore,
  enqueueSync,
  markSyncQueue,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  suggestedRoutineTemplate,
  suggestedWaterTargetMl,
  toCsv,
  upsertQuickAmount,
  visibleHydrationLogs,
  visibleQuickAmounts,
  type BodyMetric,
  type DrinkModule,
  type HydrationLog,
  type Supplement,
  type WorkoutExercise,
  type WorkoutSet
} from "@/lib/core";
import { initialState, routineTemplates, type AppState } from "@/lib/seed";
import { loadState, resetState, saveState } from "@/lib/storage";

type Tab = "today" | "hydration" | "workout" | "progress" | "settings";
type SyncStatus = "offline" | "pending" | "failed" | "synced";
type CsvDataset = "hydration" | "creatine" | "workouts" | "body-metrics";
type RoutineImportRow = WorkoutExercise & { sourceLine: number };
type RoutineImportPreview = {
  fileName: string;
  rows: RoutineImportRow[];
  errors: string[];
};
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

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseRoutineCsv(text: string, fileName: string): RoutineImportPreview {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errors: string[] = [];
  if (lines.length < 2) return { fileName, rows: [], errors: ["CSV needs a header row and at least one exercise row."] };

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const findHeader = (...names: string[]) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const indexes = {
    name: findHeader("exercise", "exercise name", "ten bai tap", "tên bài tập"),
    muscle: findHeader("muscle group", "muscle", "nhom co", "nhóm cơ"),
    sets: findHeader("sets", "set"),
    repsMin: findHeader("reps min", "rep min", "min reps"),
    repsMax: findHeader("reps max", "rep max", "max reps", "reps"),
    weight: findHeader("weight", "weight kg", "kg"),
    rest: findHeader("rest seconds", "rest", "rest sec"),
    note: findHeader("note", "notes", "ghi chu", "ghi chú")
  };

  if (indexes.name < 0) errors.push("Missing required column: exercise.");
  if (indexes.sets < 0) errors.push("Missing required column: sets.");
  if (indexes.repsMax < 0) errors.push("Missing required column: reps max or reps.");
  if (errors.length) return { fileName, rows: [], errors };

  const numberAt = (cells: string[], index: number, fallback: number) => {
    if (index < 0) return fallback;
    const value = Number(cells[index]);
    return Number.isFinite(value) ? value : fallback;
  };
  const textAt = (cells: string[], index: number, fallback = "") => (index >= 0 && cells[index] ? cells[index] : fallback);

  const rows = lines.slice(1).flatMap<RoutineImportRow>((line, index) => {
    const sourceLine = index + 2;
    const cells = splitCsvLine(line);
    const name = textAt(cells, indexes.name).trim();
    const targetSets = numberAt(cells, indexes.sets, 0);
    const targetRepsMax = numberAt(cells, indexes.repsMax, 0);
    const targetRepsMin = numberAt(cells, indexes.repsMin, targetRepsMax);
    const targetWeightKg = numberAt(cells, indexes.weight, 0);
    const restSeconds = numberAt(cells, indexes.rest, 60);

    if (!name) errors.push(`Line ${sourceLine}: exercise is required.`);
    if (!Number.isInteger(targetSets) || targetSets < 1) errors.push(`Line ${sourceLine}: sets must be a positive integer.`);
    if (!Number.isFinite(targetRepsMax) || targetRepsMax < 1) errors.push(`Line ${sourceLine}: reps max must be positive.`);
    if (!Number.isFinite(targetRepsMin) || targetRepsMin < 1 || targetRepsMin > targetRepsMax) {
      errors.push(`Line ${sourceLine}: reps min must be between 1 and reps max.`);
    }
    if (!Number.isFinite(targetWeightKg) || targetWeightKg < 0) errors.push(`Line ${sourceLine}: weight must be zero or positive.`);
    if (!Number.isFinite(restSeconds) || restSeconds < 15) errors.push(`Line ${sourceLine}: rest seconds must be at least 15.`);

    if (!name || targetSets < 1 || targetRepsMax < 1 || targetRepsMin < 1 || targetRepsMin > targetRepsMax) return [];

    return [{
      id: `import-${sourceLine}-${cryptoSafeId()}`,
      sourceLine,
      name,
      muscleGroup: textAt(cells, indexes.muscle, "Custom"),
      targetSets,
      targetRepsMin,
      targetRepsMax,
      targetWeightKg,
      restSeconds,
      lastSession: textAt(cells, indexes.note, "Imported routine")
    }];
  });

  return { fileName, rows, errors };
}

function rowsToRoutineCsv(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === undefined || cell === null ? "" : String(cell);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(",")
    )
    .join("\n");
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
  const [routineImportPreview, setRoutineImportPreview] = useState<RoutineImportPreview | null>(null);
  const [newMetricWeight, setNewMetricWeight] = useState(72);
  const [newMetricBodyFat, setNewMetricBodyFat] = useState(18);
  const [newMetricWaist, setNewMetricWaist] = useState(82);
  const [newMetricChest, setNewMetricChest] = useState(96);
  const [newMetricArm, setNewMetricArm] = useState(34);
  const [newMetricThigh, setNewMetricThigh] = useState(56);
  const [newMetricNote, setNewMetricNote] = useState("");
  const [setWeight, setSetWeight] = useState(42.5);
  const [setReps, setSetReps] = useState(8);
  const [setRpe, setSetRpe] = useState(8);
  const [toast, setToast] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
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
    if (mounted) saveState(state);
  }, [mounted, state]);

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
  const activeExercise = state.workoutExercises[state.activeExerciseIndex] ?? state.workoutExercises[0] ?? emptyExercise;
  const completedSetsForActive = state.workoutSets.filter((set) => set.exerciseId === activeExercise.id);
  const achievements = monthlyAchievements({
    hydrationGoalDays: 18,
    hydrationTargetDays: 24,
    volumeChangePercent: 6,
    previousHydrationStreak: 2,
    previousVolumeStreak: 1
  });
  const bestSet = state.workoutSets.reduce<WorkoutSet | undefined>(
    (best, set) => (!best || estimatedOneRepMax(set.actualWeightKg, set.actualReps) > estimatedOneRepMax(best.actualWeightKg, best.actualReps) ? set : best),
    undefined
  );
  const latestMetric = latestBodyMetric(state.bodyMetrics);
  const weightDelta = bodyWeightDelta(state.bodyMetrics);
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
      lastSession: "Chưa có dữ liệu tuần trước"
    };
    commitSynced({ ...state, workoutExercises: [...state.workoutExercises, exercise] }, "exercise.create", exercise, `Đã thêm ${exercise.name}`);
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
    const imported = routineImportPreview.rows.map((row) => ({
      id: row.id,
      name: row.name,
      muscleGroup: row.muscleGroup,
      targetSets: row.targetSets,
      targetRepsMin: row.targetRepsMin,
      targetRepsMax: row.targetRepsMax,
      targetWeightKg: row.targetWeightKg,
      restSeconds: row.restSeconds,
      lastSession: row.lastSession
    }));
    const workoutExercises = mode === "replace" ? imported : [...state.workoutExercises, ...imported];
    commitSynced(
      { ...state, activeTemplate: "custom", workoutExercises, workoutSets: [], activeExerciseIndex: 0 },
      "routine.import",
      { fileName: routineImportPreview.fileName, mode, count: imported.length },
      `Imported ${imported.length} exercises`
    );
    setRoutineImportPreview(null);
  }

  function deleteExercise(id: string) {
    const workoutExercises = state.workoutExercises.filter((exercise) => exercise.id !== id);
    commitSynced(
      {
        ...state,
        workoutExercises,
        activeExerciseIndex: Math.min(state.activeExerciseIndex, Math.max(0, workoutExercises.length - 1))
      },
      "exercise.delete",
      { id },
      "Đã xóa bài tập"
    );
  }

  function updateExerciseTarget(id: string, patch: Partial<WorkoutExercise>) {
    commitSynced(
      {
        ...state,
        workoutExercises: state.workoutExercises.map((exercise) =>
          exercise.id === id ? { ...exercise, ...patch } : exercise
        )
      },
      "exercise.patch",
      { id, patch },
      "Đã cập nhật bài tập"
    );
  }

  function moveExercise(id: string, direction: -1 | 1) {
    const index = state.workoutExercises.findIndex((exercise) => exercise.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= state.workoutExercises.length) return;
    const workoutExercises = [...state.workoutExercises];
    const [item] = workoutExercises.splice(index, 1);
    workoutExercises.splice(nextIndex, 0, item);
    commitSynced({ ...state, workoutExercises, activeExerciseIndex: nextIndex }, "exercise.reorder", { id, direction }, "Đã sắp xếp routine");
  }

  function applyTemplate(template: AppState["activeTemplate"]) {
    if (template === "custom") {
      commit({ ...state, activeTemplate: "custom" }, "Đã chuyển sang Custom");
      return;
    }
    commit(
      {
        ...state,
        activeTemplate: template,
        workoutExercises: routineTemplates[template],
        workoutSets: [],
        activeExerciseIndex: 0
      },
      `Đã áp dụng template ${template}`
    );
  }

  function addBodyMetric() {
    const metric: BodyMetric = {
      id: cryptoSafeId(),
      measuredAt: new Date().toISOString(),
      weightKg: newMetricWeight,
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
    const payload = exportAppData({ ...state, exportedAt: new Date().toISOString() });
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
    file
      .text()
      .then((text) => {
        const imported = JSON.parse(text) as Partial<AppState>;
        commit(
          {
            ...state,
            ...imported,
            profile: { ...state.profile, ...imported.profile },
            recovery: { ...state.recovery, ...imported.recovery },
            notificationSettings: { ...state.notificationSettings, ...imported.notificationSettings },
            undo: undefined
          },
          "Đã import JSON"
        );
      })
      .catch(() => setToast("Không import được JSON"));
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setToast("Trình duyệt chưa hỗ trợ Notification API");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setToast(permission === "granted" ? "Đã bật quyền thông báo" : "Chưa bật quyền thông báo");
  }

  function undo() {
    if (!state.undo) return;
    commit(state.undo.state, `Đã hoàn tác ${state.undo.label}`);
  }

  function commitWorkoutSet(completed: WorkoutSet, label: string, message: string) {
    const finishedExercise = completedSetsForActive.length + 1 >= activeExercise.targetSets;
    const nextExerciseIndex = finishedExercise
      ? Math.min(state.activeExerciseIndex + 1, state.workoutExercises.length - 1)
      : state.activeExerciseIndex;
    const restEndsAt = new Date(Date.now() + activeExercise.restSeconds * 1000).toISOString();
    if (workoutWouldFinishOnNextSet) {
      setWorkoutMode("finished");
    }
    setRestPausedSeconds(null);
    setRestNotifiedFor(null);
    setNowMs(Date.now());
    withUndo(
      {
        ...state,
        workoutSets: [...state.workoutSets, completed],
        activeExerciseIndex: nextExerciseIndex,
        restEndsAt,
        syncQueue: enqueueSync(state.syncQueue, { type: label === "skip set" ? "workout.set.skip" : "workout.set.create", payload: completed })
      },
      label,
      message
    );
  }

  function completeSet() {
    if (!state.workoutExercises.length) {
      setToast("Add or import an exercise before logging a set.");
      return;
    }
    const completed: WorkoutSet = {
      id: cryptoSafeId(),
      exerciseId: activeExercise.id,
      exerciseName: activeExercise.name,
      targetWeightKg: activeExercise.targetWeightKg,
      targetReps: activeExercise.targetRepsMin,
      actualWeightKg: setWeight,
      actualReps: setReps,
      rpe: setRpe,
      completedAt: new Date().toISOString()
    };
    commitWorkoutSet(completed, "set", `Ho?n th?nh set ${completedSetsForActive.length + 1}`);
  }

  function skipCurrentSet() {
    if (!state.workoutExercises.length) return;
    const skipped: WorkoutSet = {
      id: cryptoSafeId(),
      exerciseId: activeExercise.id,
      exerciseName: activeExercise.name,
      targetWeightKg: activeExercise.targetWeightKg,
      targetReps: activeExercise.targetRepsMin,
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

  const workoutWouldFinishOnNextSet =
    completedSetsForActive.length + 1 >= activeExercise.targetSets &&
    state.activeExerciseIndex >= state.workoutExercises.length - 1;

  function startWorkout() {
    if (!state.workoutExercises.length) {
      setToast("Add or import an exercise before starting a workout.");
      return;
    }
    setWorkoutMode("live");
    setRestPausedSeconds(null);
    setRestNotifiedFor(null);
    commit({ ...state, activeExerciseIndex: 0, restEndsAt: undefined }, "Start workout");
  }

  function finishWorkout() {
    setRestPausedSeconds(null);
    setWorkoutMode("finished");
  }

  function selectWorkoutExercise(id: string) {
    const index = state.workoutExercises.findIndex((exercise) => exercise.id === id);
    if (index < 0) return;
    commitSynced({ ...state, activeExerciseIndex: index }, "workout.session.selectExercise", { id }, "Selected exercise");
  }

  function skipActiveExercise() {
    const nextIndex = Math.min(state.activeExerciseIndex + 1, state.workoutExercises.length - 1);
    commitSynced({ ...state, activeExerciseIndex: nextIndex }, "workout.session.skipExercise", { from: activeExercise.id }, "Skipped exercise");
  }

  function pauseRestTimer() {
    if (!state.restEndsAt) return;
    setRestPausedSeconds(Math.max(0, Math.ceil((new Date(state.restEndsAt).getTime() - Date.now()) / 1000)));
  }

  function resumeRestTimer() {
    if (restPausedSeconds === null) return;
    setRestNotifiedFor(null);
    commit({ ...state, restEndsAt: new Date(Date.now() + restPausedSeconds * 1000).toISOString() }, "Resume rest timer");
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
            activeExercise={activeExercise}
            completedSets={completedSetsForActive}
            setWeight={setWeight}
            setSetWeight={setSetWeight}
            setReps={setReps}
            setSetReps={setSetReps}
            setRpe={setRpe}
            setSetRpe={setSetRpe}
            mode={workoutMode}
            startWorkout={startWorkout}
            finishWorkout={finishWorkout}
            backToPlan={() => setWorkoutMode("plan")}
            completeSet={completeSet}
            selectExercise={selectWorkoutExercise}
            skipExercise={skipActiveExercise}
            restSeconds={restSeconds}
            restPaused={restPausedSeconds !== null}
            pauseRestTimer={pauseRestTimer}
            resumeRestTimer={resumeRestTimer}
            adjustRestTimer={adjustRestTimer}
            resetRestTimer={resetRestTimer}
            skipCurrentSet={skipCurrentSet}
            updateWorkoutSet={updateWorkoutSet}
            deleteWorkoutSet={deleteWorkoutSet}
            newExerciseName={newExerciseName}
            setNewExerciseName={setNewExerciseName}
            addExercise={addExercise}
            routineImportPreview={routineImportPreview}
            previewRoutineImport={previewRoutineImport}
            confirmRoutineImport={confirmRoutineImport}
            clearRoutineImport={() => setRoutineImportPreview(null)}
            deleteExercise={deleteExercise}
            moveExercise={moveExercise}
            applyTemplate={applyTemplate}
            updateExerciseTarget={updateExerciseTarget}
          />
        )}

        {tab === "progress" && (
          <ProgressView
            totalWater={totalWater}
            target={state.profile.waterTargetMl}
            sets={state.workoutSets}
            bestSet={bestSet}
            achievements={achievements}
            bodyMetrics={state.bodyMetrics}
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
            notificationPermission={notificationPermission}
            requestNotifications={requestNotifications}
            markQueue={markQueue}
            clearQueue={clearQueue}
            downloadExport={downloadExport}
            downloadCsvExport={downloadCsvExport}
            importJsonExport={importJsonExport}
            updateNotificationSettings={updateNotificationSettings}
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
  activeExercise: AppState["workoutExercises"][number];
  completedSets: WorkoutSet[];
  setWeight: number;
  setSetWeight: (value: number) => void;
  setReps: number;
  setSetReps: (value: number) => void;
  setRpe: number;
  setSetRpe: (value: number) => void;
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
  newExerciseName: string;
  setNewExerciseName: (value: string) => void;
  addExercise: () => void;
  routineImportPreview: RoutineImportPreview | null;
  previewRoutineImport: (file: File) => void;
  confirmRoutineImport: (mode: "replace" | "append") => void;
  clearRoutineImport: () => void;
  deleteExercise: (id: string) => void;
  moveExercise: (id: string, direction: -1 | 1) => void;
  applyTemplate: (template: AppState["activeTemplate"]) => void;
  updateExerciseTarget: (id: string, patch: Partial<WorkoutExercise>) => void;
}) {
  const totalVolume = props.state.workoutSets.reduce((sum, set) => sum + set.actualWeightKg * set.actualReps, 0);
  const completedExerciseCount = new Set(props.state.workoutSets.map((set) => set.exerciseId)).size;

  if (props.mode === "finished") {
    return (
      <div className="finish-workout">
        <div className="finish-icon">
          <Check size={38} />
        </div>
        <h1>Workout complete</h1>
        <p>{props.state.workoutSets.length} sets - {Math.round(totalVolume)}kg volume - {completedExerciseCount} exercises</p>
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
            <p className="eyebrow">Today workout</p>
            <h1>Push Day</h1>
            <p>{props.state.workoutExercises.length} exercises - about 45 minutes</p>
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
            <span className="sync-pill">{props.state.activeTemplate}</span>
          </div>
          <div className="week-strip">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
              <span key={day} className={index === 0 ? "active" : index < 3 ? "done" : ""}>
                <strong>{day.slice(0, 1)}</strong>
                <em>{index === 0 ? "Train" : index < 3 ? "Done" : "-"}</em>
              </span>
            ))}
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

        <section className="card import-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Import routine</p>
              <h2>CSV preview</h2>
            </div>
            <Plus size={20} />
          </div>
          <p>CSV/XLSX columns: exercise, muscle group, sets, reps min, reps max, weight, rest seconds, note.</p>
          <label className="secondary-button import-button">
            Choose CSV/XLSX
            <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => event.target.files?.[0] && props.previewRoutineImport(event.target.files[0])} />
          </label>
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
                        <em>{row.muscleGroup} - {row.targetSets} x {row.targetRepsMin}-{row.targetRepsMax} - {row.targetWeightKg}kg</em>
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
            <p className="eyebrow">Routine builder</p>
            <h2>Push Day</h2>
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
            <p className="eyebrow">Push Day • Exercise {props.state.activeExerciseIndex + 1}/{props.state.workoutExercises.length}</p>
            <h1>{props.activeExercise.name}</h1>
            <p>{props.activeExercise.muscleGroup} • Target {props.activeExercise.targetSets} x {props.activeExercise.targetRepsMin}-{props.activeExercise.targetRepsMax}</p>
          </div>
          <Dumbbell size={26} />
        </div>
        <div className="last-session">Lần trước: {props.activeExercise.lastSession}</div>
      </section>

      <section className="card">
        <h2>Set hiện tại</h2>
        <div className="set-table">
          {Array.from({ length: props.activeExercise.targetSets }).map((_, index) => {
            const done = props.completedSets[index];
            const isCurrent = index === props.completedSets.length;
            return (
              <div key={index} className={isCurrent ? "current" : ""}>
                <span>Set {index + 1}</span>
                <strong>{done ? (done.actualReps === 0 ? "Skipped" : `${done.actualWeightKg}kg x ${done.actualReps}`) : `${props.activeExercise.targetWeightKg}kg x ${props.activeExercise.targetRepsMin}`}</strong>
                <em>{done ? (done.actualReps === 0 ? "Skipped" : `RPE ${done.rpe ?? "-"}`) : isCurrent ? "Current" : "Pending"}</em>
              </div>
            );
          })}
        </div>
      </section>

      <section className="control-card card">
        <Stepper label="Tạ" value={props.setWeight} suffix="kg" step={2.5} onChange={props.setSetWeight} />
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
          <span className="sync-pill">Session only</span>
        </div>
        <div className="queue-list">
          {props.state.workoutExercises.map((exercise, index) => (
            <button key={exercise.id} className={index === props.state.activeExerciseIndex ? "active" : ""} onClick={() => props.selectExercise(exercise.id)}>
              <span>{index + 1}</span>
              <strong>{exercise.name}</strong>
              <em>{exercise.muscleGroup}</em>
            </button>
          ))}
        </div>
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
          {props.state.workoutSets.length ? (
            props.state.workoutSets
              .slice()
              .reverse()
              .map((set) => (
                <div key={set.id}>
                  <span>{set.exerciseName}</span>
                  <strong>
                    {set.actualReps === 0 ? "Skipped" : `${set.actualWeightKg}kg x ${set.actualReps}`}
                  </strong>
                  <em>RPE {set.rpe ?? "-"}</em>
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

function ProgressView(props: {
  totalWater: number;
  target: number;
  sets: WorkoutSet[];
  bestSet?: WorkoutSet;
  achievements: { code: string; name: string; progress: number; target: number; status: string; streakMonths: number }[];
  bodyMetrics: BodyMetric[];
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
  const volume = props.sets.reduce((sum, set) => sum + set.actualWeightKg * set.actualReps, 0);
  const oneRm = props.bestSet ? estimatedOneRepMax(props.bestSet.actualWeightKg, props.bestSet.actualReps) : 0;
  const completedExercises = new Set(props.sets.map((set) => set.exerciseId)).size;

  return (
    <div className="stack progress-screen">
      <section className="stats-grid progress-summary">
        <MetricCard label="Nước hôm nay" value={`${props.totalWater}/${props.target}ml`} accent="hydration" />
        <MetricCard icon={<Dumbbell size={19} />} label="Volume" value={`${Math.round(volume)}kg`} accent="training" />
        <MetricCard label="e1RM tốt nhất" value={oneRm ? `${oneRm}kg` : "Chưa có"} accent="coach" />
        <MetricCard label="Cân nặng" value={props.latestMetric ? `${props.latestMetric.weightKg}kg` : "Chưa có"} accent="neutral" />
      </section>
      <section className="card">
        <h2>Xu hướng 7 ngày</h2>
        <div className="bar-chart" aria-label="Biểu đồ tiến độ">
          {[64, 72, 48, 88, 76, 92, Math.min(100, (props.totalWater / props.target) * 100)].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>
      <section className="card chart-card">
        <div className="section-heading">
          <h2>Training trend</h2>
          <span className="sync-pill">{completedExercises} exercises</span>
        </div>
        <div className="bar-chart training-chart" aria-label="Training volume chart">
          {[42, 58, 46, 72, 63, 82, Math.min(100, Math.max(12, volume / 80))].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
        <p className="chart-note">{props.sets.length ? "Recent sets are feeding volume and e1RM metrics." : "Log sets in Live Workout to build a meaningful trend."}</p>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Body metrics</h2>
          <span className="sync-pill">{props.weightDelta >= 0 ? "+" : ""}{props.weightDelta}kg</span>
        </div>
        <div className="metric-form">
          <label>
            <span>Kg</span>
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
                <strong>{metric.weightKg}kg</strong>
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
  notificationPermission: NotificationPermission;
  requestNotifications: () => void;
  markQueue: (status: "synced" | "failed") => void;
  clearQueue: (status?: "synced" | "failed") => void;
  downloadExport: () => void;
  downloadCsvExport: (dataset?: CsvDataset) => void;
  importJsonExport: (file: File) => void;
  updateNotificationSettings: (next: Partial<AppState["notificationSettings"]>) => void;
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

  function snooze(minutes: number) {
    props.updateNotificationSettings({ snoozeUntil: new Date(Date.now() + minutes * 60000).toISOString() });
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
        <h2>D? li?u & quy?n ri?ng t?</h2>
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
          <button className="secondary-button danger-button" onClick={() => window.confirm("Reset to?n b? d? li?u local?") && props.reset()}>
            Reset d? li?u m?u
          </button>
        </div>
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
