"use client";

import {
  Activity,
  Award,
  Bell,
  Bot,
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
  Waves
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
  monthlyAchievements,
  progressiveOverloadRecommendation,
  readinessScore,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  upsertQuickAmount,
  visibleQuickAmounts,
  type BodyMetric,
  type Supplement,
  type WorkoutExercise,
  type WorkoutSet
} from "@/lib/core";
import { initialState, routineTemplates, type AppState } from "@/lib/seed";
import { loadState, resetState, saveState } from "@/lib/storage";

type Tab = "today" | "workout" | "progress" | "coach" | "settings";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "today", label: "Hôm nay", icon: Home },
  { id: "workout", label: "Tập luyện", icon: Dumbbell },
  { id: "progress", label: "Tiến độ", icon: Activity },
  { id: "coach", label: "HLV", icon: Bot },
  { id: "settings", label: "Cài đặt", icon: Settings }
];

export default function AppPage() {
  const [state, setState] = useState<AppState>(initialState);
  const [tab, setTab] = useState<Tab>("today");
  const [waterAmount, setWaterAmount] = useState(650);
  const [creatineAmount, setCreatineAmount] = useState(5);
  const [newSupplementName, setNewSupplementName] = useState("Whey");
  const [newSupplementAmount, setNewSupplementAmount] = useState(30);
  const [newExerciseName, setNewExerciseName] = useState("Lateral Raise");
  const [newMetricWeight, setNewMetricWeight] = useState(72);
  const [newMetricBodyFat, setNewMetricBodyFat] = useState(18);
  const [setWeight, setSetWeight] = useState(42.5);
  const [setReps, setSetReps] = useState(8);
  const [setRpe, setSetRpe] = useState(8);
  const [toast, setToast] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (mounted) saveState(state);
  }, [mounted, state]);

  const now = new Date();
  const totalWater = hydrationTotal(state.hydrationLogs, now);
  const percent = hydrationPercent(totalWater, state.profile.waterTargetMl);
  const expectedWater = expectedHydrationByNow(
    state.profile.waterTargetMl,
    state.profile.wakeHour,
    state.profile.sleepHour,
    now
  );
  const pace = hydrationPaceStatus(totalWater, expectedWater);
  const lastHydrationLog = state.hydrationLogs[state.hydrationLogs.length - 1];
  const hydrationReminder = shouldSendHydrationReminder({
    totalMl: totalWater,
    expectedMl: expectedWater,
    lastLogAt: lastHydrationLog?.loggedAt,
    now,
    quietHours: { start: state.profile.sleepHour, end: state.profile.wakeHour }
  });
  const creatineReminder = shouldSendCreatineReminder({
    logs: state.supplementLogs,
    scheduledHour: state.profile.creatineHour,
    remindBeforeMinutes: state.profile.remindBeforeMinutes,
    now
  });
  const quickWater = visibleQuickAmounts(state.quickAmounts, "hydration", 3);
  const quickCreatine = visibleQuickAmounts(state.quickAmounts, "supplement", 2);
  const activeExercise = state.workoutExercises[state.activeExerciseIndex] ?? state.workoutExercises[0];
  const completedSetsForActive = state.workoutSets.filter((set) => set.exerciseId === activeExercise.id);
  const activeRecommendation = progressiveOverloadRecommendation({
    exerciseName: activeExercise.name,
    targetWeightKg: activeExercise.targetWeightKg,
    targetRepsMax: activeExercise.targetRepsMax,
    recentSets: completedSetsForActive.length
      ? completedSetsForActive
      : [
          { actualWeightKg: activeExercise.targetWeightKg, actualReps: activeExercise.targetRepsMin, rpe: 8 },
          { actualWeightKg: activeExercise.targetWeightKg, actualReps: activeExercise.targetRepsMin - 1, rpe: 9 }
        ]
  });
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

  function commit(next: AppState, message?: string) {
    setState(next);
    if (message) {
      setToast(message);
      window.setTimeout(() => setToast(null), 5000);
    }
  }

  function withUndo(next: AppState, label: string, message: string) {
    const previous = { ...state, undo: undefined };
    commit({ ...next, undo: { label, state: previous } }, message);
  }

  function logWater(amountMl: number, pin = false) {
    const log = { id: cryptoSafeId(), amountMl, drinkType: "water" as const, loggedAt: new Date().toISOString() };
    const quickAmounts = upsertQuickAmount(state.quickAmounts, {
      category: "hydration",
      label: `+${amountMl}ml`,
      amount: amountMl,
      unit: "ml",
      pinned: pin || state.quickAmounts.some((item) => item.category === "hydration" && item.amount === amountMl)
    });
    withUndo({ ...state, hydrationLogs: [...state.hydrationLogs, log], quickAmounts }, "water", `Đã ghi nhận ${amountMl}ml`);
  }

  function editHydrationLog(id: string, deltaMl: number) {
    const hydrationLogs = state.hydrationLogs.map((log) =>
      log.id === id ? { ...log, amountMl: Math.max(50, log.amountMl + deltaMl) } : log
    );
    withUndo({ ...state, hydrationLogs }, "edit water", "Đã cập nhật log nước");
  }

  function deleteHydrationLog(id: string) {
    withUndo(
      { ...state, hydrationLogs: state.hydrationLogs.filter((log) => log.id !== id) },
      "delete water",
      "Đã xóa log nước"
    );
  }

  function logCreatine(amount = state.profile.creatineAmountG, pin = false) {
    const log = {
      id: cryptoSafeId(),
      name: "Creatine",
      amount,
      unit: "g" as const,
      loggedAt: new Date().toISOString()
    };
    const quickAmounts = upsertQuickAmount(state.quickAmounts, {
      category: "supplement",
      label: `${amount}g`,
      amount,
      unit: "g",
      pinned: pin || state.quickAmounts.some((item) => item.category === "supplement" && item.amount === amount)
    });
    withUndo({ ...state, supplementLogs: [...state.supplementLogs, log], quickAmounts }, "creatine", `Đã ghi nhận Creatine ${amount}g`);
  }

  function logSupplement(supplement: Supplement) {
    const log = {
      id: cryptoSafeId(),
      name: supplement.name,
      amount: supplement.defaultAmount,
      unit: supplement.unit,
      loggedAt: new Date().toISOString()
    };
    withUndo({ ...state, supplementLogs: [...state.supplementLogs, log] }, supplement.name, `Đã ghi nhận ${supplement.name}`);
  }

  function addSupplement() {
    const supplement: Supplement = {
      id: cryptoSafeId(),
      name: newSupplementName.trim() || "Supplement",
      defaultAmount: newSupplementAmount,
      unit: "g",
      active: true
    };
    commit({ ...state, supplements: [...state.supplements, supplement] }, `Đã thêm ${supplement.name}`);
  }

  function deleteSupplement(id: string) {
    commit({ ...state, supplements: state.supplements.filter((supplement) => supplement.id !== id) }, "Đã xóa supplement");
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
    commit({ ...state, workoutExercises: [...state.workoutExercises, exercise] }, `Đã thêm ${exercise.name}`);
  }

  function deleteExercise(id: string) {
    const workoutExercises = state.workoutExercises.filter((exercise) => exercise.id !== id);
    commit(
      {
        ...state,
        workoutExercises,
        activeExerciseIndex: Math.min(state.activeExerciseIndex, Math.max(0, workoutExercises.length - 1))
      },
      "Đã xóa bài tập"
    );
  }

  function updateExerciseTarget(id: string, patch: Partial<WorkoutExercise>) {
    commit(
      {
        ...state,
        workoutExercises: state.workoutExercises.map((exercise) =>
          exercise.id === id ? { ...exercise, ...patch } : exercise
        )
      },
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
    commit({ ...state, workoutExercises, activeExerciseIndex: nextIndex }, "Đã sắp xếp routine");
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
      bodyFatPercent: newMetricBodyFat
    };
    commit({ ...state, bodyMetrics: [...state.bodyMetrics, metric] }, "Đã lưu chỉ số cơ thể");
  }

  function deleteBodyMetric(id: string) {
    commit({ ...state, bodyMetrics: state.bodyMetrics.filter((metric) => metric.id !== id) }, "Đã xóa chỉ số cơ thể");
  }

  function updateBodyMetric(id: string, patch: Partial<BodyMetric>) {
    commit(
      {
        ...state,
        bodyMetrics: state.bodyMetrics.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric))
      },
      "Đã cập nhật chỉ số cơ thể"
    );
  }

  function completeOnboarding() {
    commit({ ...state, profile: { ...state.profile, onboardingCompleted: true } }, "Onboarding hoàn tất");
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

  function completeSet() {
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
    const finishedExercise = completedSetsForActive.length + 1 >= activeExercise.targetSets;
    const nextExerciseIndex = finishedExercise
      ? Math.min(state.activeExerciseIndex + 1, state.workoutExercises.length - 1)
      : state.activeExerciseIndex;
    withUndo(
      {
        ...state,
        workoutSets: [...state.workoutSets, completed],
        activeExerciseIndex: nextExerciseIndex,
        restEndsAt: new Date(Date.now() + activeExercise.restSeconds * 1000).toISOString()
      },
      "set",
      `Hoàn thành set ${completedSetsForActive.length + 1}`
    );
  }

  function updateProfile(next: Partial<AppState["profile"]>) {
    commit({ ...state, profile: { ...state.profile, ...next } });
  }

  function updateRecovery(next: Partial<AppState["recovery"]>) {
    commit({ ...state, recovery: { ...state.recovery, ...next } });
  }

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

  const restSeconds = useMemo(() => {
    if (!state.restEndsAt) return 0;
    return Math.max(0, Math.ceil((new Date(state.restEndsAt).getTime() - Date.now()) / 1000));
  }, [state.restEndsAt]);

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="avatar" aria-label="User avatar">
          <User size={18} />
        </div>
        <div>
          <p className="top-date">{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "short" }).format(now)}</p>
          <p className="top-subtitle">Local-first PWA • {state.profile.timezone}</p>
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
            completeOnboarding={completeOnboarding}
          />
        )}

        {tab === "today" && (
          <TodayView
            totalWater={totalWater}
            percent={percent}
            target={state.profile.waterTargetMl}
            pace={pace}
            quickWater={quickWater}
            waterAmount={waterAmount}
            setWaterAmount={setWaterAmount}
            logWater={logWater}
            quickCreatine={quickCreatine}
            creatineAmount={creatineAmount}
            setCreatineAmount={setCreatineAmount}
            logCreatine={logCreatine}
            creatineLogged={state.supplementLogs.some((log) => log.loggedAt.startsWith(now.toISOString().slice(0, 10)))}
            creatineReminder={creatineReminder}
            workoutName="Push Day"
            setTab={setTab}
            achievements={achievements}
            recentLogs={state.hydrationLogs.slice(-3).reverse()}
            hydrationLogs={state.hydrationLogs}
            editHydrationLog={editHydrationLog}
            deleteHydrationLog={deleteHydrationLog}
            supplements={state.supplements}
            supplementLogs={state.supplementLogs}
            logSupplement={logSupplement}
            newSupplementName={newSupplementName}
            setNewSupplementName={setNewSupplementName}
            newSupplementAmount={newSupplementAmount}
            setNewSupplementAmount={setNewSupplementAmount}
            addSupplement={addSupplement}
            deleteSupplement={deleteSupplement}
          />
        )}

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
            completeSet={completeSet}
            restSeconds={restSeconds}
            newExerciseName={newExerciseName}
            setNewExerciseName={setNewExerciseName}
            addExercise={addExercise}
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
            addBodyMetric={addBodyMetric}
            deleteBodyMetric={deleteBodyMetric}
            updateBodyMetric={updateBodyMetric}
            downloadExport={downloadExport}
          />
        )}

        {tab === "coach" && (
          <CoachView
            recommendation={activeRecommendation}
            achievements={achievements}
            recovery={state.recovery}
            updateRecovery={updateRecovery}
            decisions={state.recommendationDecisions}
            decideRecommendation={decideRecommendation}
          />
        )}

        {tab === "settings" && (
          <SettingsView
            state={state}
            updateProfile={updateProfile}
            reset={() => commit(resetState(), "Đã khôi phục dữ liệu mẫu")}
            notificationPermission={notificationPermission}
            requestNotifications={requestNotifications}
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
  completeOnboarding: () => void;
}) {
  return (
    <section className="card onboarding-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Onboarding nhanh</p>
          <h2>Thiết lập EvolveFit</h2>
        </div>
        <CalendarCheck size={22} />
      </div>
      <div className="onboarding-grid">
        <label>
          <span>Tên</span>
          <input value={props.profile.name} onChange={(event) => props.updateProfile({ name: event.target.value })} />
        </label>
        <label>
          <span>Mục tiêu nước</span>
          <input
            type="number"
            value={props.profile.waterTargetMl}
            onChange={(event) => props.updateProfile({ waterTargetMl: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>Giờ dậy</span>
          <input
            type="number"
            min="0"
            max="23"
            value={props.profile.wakeHour}
            onChange={(event) => props.updateProfile({ wakeHour: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>Giờ ngủ</span>
          <input
            type="number"
            min="0"
            max="23"
            value={props.profile.sleepHour}
            onChange={(event) => props.updateProfile({ sleepHour: Number(event.target.value) })}
          />
        </label>
      </div>
      <button className="primary-button training-bg" onClick={props.completeOnboarding}>
        Hoàn tất onboarding
      </button>
    </section>
  );
}

function TodayView(props: {
  totalWater: number;
  percent: number;
  target: number;
  pace: "ahead" | "on-pace" | "behind";
  quickWater: { id: string; label: string; amount: number }[];
  waterAmount: number;
  setWaterAmount: (value: number) => void;
  logWater: (amountMl: number, pin?: boolean) => void;
  quickCreatine: { id: string; label: string; amount: number }[];
  creatineAmount: number;
  setCreatineAmount: (value: number) => void;
  logCreatine: (amount: number, pin?: boolean) => void;
  creatineLogged: boolean;
  creatineReminder: boolean;
  workoutName: string;
  setTab: (tab: Tab) => void;
  achievements: { code: string; name: string; progress: number; target: number; status: string; streakMonths: number }[];
  recentLogs: { id: string; amountMl: number; loggedAt: string }[];
  hydrationLogs: { id: string; amountMl: number; loggedAt: string }[];
  editHydrationLog: (id: string, deltaMl: number) => void;
  deleteHydrationLog: (id: string) => void;
  supplements: Supplement[];
  supplementLogs: { id: string; name: string; amount: number; unit: string; loggedAt: string }[];
  logSupplement: (supplement: Supplement) => void;
  newSupplementName: string;
  setNewSupplementName: (value: string) => void;
  newSupplementAmount: number;
  setNewSupplementAmount: (value: number) => void;
  addSupplement: () => void;
  deleteSupplement: (id: string) => void;
}) {
  const circumference = 2 * Math.PI * 74;
  const offset = circumference - (props.percent / 100) * circumference;
  const paceLabel = props.pace === "behind" ? "Chậm tiến độ" : props.pace === "ahead" ? "Vượt tiến độ" : "Đúng tiến độ";

  return (
    <div className="stack">
      <section className="hydration-hero card">
        <div className="ring-wrap">
          <svg className="progress-ring" viewBox="0 0 180 180" aria-label={`Đã uống ${props.percent}%`}>
            <circle className="ring-bg" cx="90" cy="90" r="74" />
            <circle className="ring-value" cx="90" cy="90" r="74" strokeDasharray={circumference} strokeDashoffset={offset} />
          </svg>
          <div className="ring-label">
            <strong>{props.totalWater.toLocaleString("vi-VN")}ml</strong>
            <span>/ {props.target.toLocaleString("vi-VN")}ml</span>
            <em className={props.pace}>{paceLabel}</em>
          </div>
        </div>
        <div className="quick-grid">
          {props.quickWater.map((amount) => (
            <button key={amount.id} className="quick-button hydration" onClick={() => props.logWater(amount.amount)}>
              <Waves size={18} />
              {amount.label}
            </button>
          ))}
        </div>
        <div className="slider-panel">
          <div className="slider-label">
            <span>Tùy chỉnh</span>
            <strong>{props.waterAmount}ml</strong>
          </div>
          <input
            type="range"
            min="50"
            max="1500"
            step="50"
            value={props.waterAmount}
            onChange={(event) => props.setWaterAmount(Number(event.target.value))}
            aria-label="Chọn lượng nước"
          />
          <div className="split-actions">
            <button className="secondary-button" onClick={() => props.logWater(props.waterAmount)}>
              Log
            </button>
            <button className="primary-button hydration-bg" onClick={() => props.logWater(props.waterAmount, true)}>
              Pin & log
            </button>
          </div>
        </div>
      </section>

      <section className="card supplement-card">
        <div>
          <p className="eyebrow">Supplement</p>
          <h2>Creatine {props.creatineLogged ? "đã uống" : "chưa ghi nhận"}</h2>
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

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Supplement custom</p>
            <h2>Hôm nay</h2>
          </div>
          <Plus size={20} />
        </div>
        <div className="supplement-list">
          {props.supplements.map((supplement) => {
            const logged = props.supplementLogs.some(
              (log) => log.name === supplement.name && log.loggedAt.startsWith(new Date().toISOString().slice(0, 10))
            );
            return (
              <div key={supplement.id}>
                <span>{supplement.name}</span>
                <strong>
                  {supplement.defaultAmount}
                  {supplement.unit}
                </strong>
                <button className={logged ? "tiny-chip logged" : "tiny-chip"} onClick={() => props.logSupplement(supplement)}>
                  {logged ? "Đã dùng" : "Ghi nhận"}
                </button>
                <button className="icon-mini danger" onClick={() => props.deleteSupplement(supplement.id)} aria-label="Xóa supplement">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="inline-form">
          <input value={props.newSupplementName} onChange={(event) => props.setNewSupplementName(event.target.value)} aria-label="Tên supplement" />
          <input
            type="number"
            value={props.newSupplementAmount}
            onChange={(event) => props.setNewSupplementAmount(Number(event.target.value))}
            aria-label="Liều lượng supplement"
          />
          <button className="secondary-button" onClick={props.addSupplement}>
            Thêm
          </button>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Hydration detail</p>
            <h2>Timeline hôm nay</h2>
          </div>
          <Waves size={22} />
        </div>
        <div className="timeline editable">
          {props.hydrationLogs
            .slice()
            .reverse()
            .map((log) => (
              <div key={log.id}>
                <span>{new Date(log.loggedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                <strong>{log.amountMl}ml</strong>
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
            ))}
        </div>
      </section>

      <section className="card workout-today">
        <div>
          <p className="eyebrow">Workout hôm nay</p>
          <h2>{props.workoutName}</h2>
          <p>6 bài tập • khoảng 45 phút • xem set tuần trước</p>
        </div>
        <button className="primary-button training-bg" onClick={() => props.setTab("workout")}>
          Bắt đầu tập <ChevronRight size={18} />
        </button>
      </section>

      <section className="readiness-row" aria-label="Readiness">
        <span>Năng lượng 4/5</span>
        <span>Ngủ tốt</span>
        <span>Mỏi thấp</span>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Huy hiệu tháng</p>
            <h2>Consistency</h2>
          </div>
          <Award size={22} />
        </div>
        <div className="badge-grid">
          {props.achievements.map((badge) => (
            <div className="badge-card-mini" key={badge.code}>
              <Trophy size={18} />
              <strong>{badge.name}</strong>
              <span>
                {badge.progress}/{badge.target} • {badge.streakMonths} tháng
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Gần đây</h2>
          <span className="sync-pill">Sync pending-ready</span>
        </div>
        <div className="timeline">
          {props.recentLogs.map((log) => (
            <div key={log.id}>
              <span>Water</span>
              <strong>+{log.amountMl}ml</strong>
            </div>
          ))}
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
  completeSet: () => void;
  restSeconds: number;
  newExerciseName: string;
  setNewExerciseName: (value: string) => void;
  addExercise: () => void;
  deleteExercise: (id: string) => void;
  moveExercise: (id: string, direction: -1 | 1) => void;
  applyTemplate: (template: AppState["activeTemplate"]) => void;
  updateExerciseTarget: (id: string, patch: Partial<WorkoutExercise>) => void;
}) {
  return (
    <div className="stack workout-focus">
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
                <strong>{done ? `${done.actualWeightKg}kg x ${done.actualReps}` : `${props.activeExercise.targetWeightKg}kg x ${props.activeExercise.targetRepsMin}`}</strong>
                <em>{done ? `RPE ${done.rpe}` : isCurrent ? "Current" : "Pending"}</em>
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
        <p className="eyebrow">Rest timer</p>
        <strong>{props.restSeconds > 0 ? `${props.restSeconds}s` : "Sẵn sàng"}</strong>
        <p>Tự động chạy sau mỗi set, phù hợp Focus Mode.</p>
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
                    {set.actualWeightKg}kg x {set.actualReps}
                  </strong>
                  <em>RPE {set.rpe ?? "-"}</em>
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
  addBodyMetric: () => void;
  deleteBodyMetric: (id: string) => void;
  updateBodyMetric: (id: string, patch: Partial<BodyMetric>) => void;
  downloadExport: () => void;
}) {
  const volume = props.sets.reduce((sum, set) => sum + set.actualWeightKg * set.actualReps, 0);
  const oneRm = props.bestSet ? estimatedOneRepMax(props.bestSet.actualWeightKg, props.bestSet.actualReps) : 0;

  return (
    <div className="stack">
      <section className="stats-grid">
        <MetricCard label="Nước hôm nay" value={`${props.totalWater}/${props.target}ml`} accent="hydration" />
        <MetricCard label="Volume" value={`${Math.round(volume)}kg`} accent="training" />
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
      <section className="card">
        <div className="section-heading">
          <h2>Body metrics</h2>
          <span className="sync-pill">{props.weightDelta >= 0 ? "+" : ""}{props.weightDelta}kg</span>
        </div>
        <div className="inline-form">
          <input
            type="number"
            step="0.1"
            value={props.newMetricWeight}
            onChange={(event) => props.setNewMetricWeight(Number(event.target.value))}
            aria-label="Cân nặng"
          />
          <input
            type="number"
            step="0.1"
            value={props.newMetricBodyFat}
            onChange={(event) => props.setNewMetricBodyFat(Number(event.target.value))}
            aria-label="Body fat"
          />
          <button className="secondary-button" onClick={props.addBodyMetric}>
            Lưu
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
                <em>{metric.bodyFatPercent ?? "-"}%</em>
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
        <button className="secondary-button export-button" onClick={props.downloadExport}>
          Export JSON
        </button>
      </section>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; accent: "hydration" | "training" | "coach" | "neutral" }) {
  return (
    <div className={`metric-card ${props.accent}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

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
  reset: () => void;
  notificationPermission: NotificationPermission;
  requestNotifications: () => void;
}) {
  return (
    <div className="stack">
      <section className="card">
        <h2>Profile</h2>
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
        <h2>Dữ liệu</h2>
        <button className="secondary-button" onClick={props.reset}>
          Reset dữ liệu mẫu
        </button>
      </section>
    </div>
  );
}
