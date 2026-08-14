"use client";

import {
  Activity,
  Award,
  Bell,
  Bot,
  Check,
  ChevronRight,
  Dumbbell,
  Home,
  Minus,
  Plus,
  RotateCcw,
  Settings,
  Trophy,
  User,
  Waves
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  cryptoSafeId,
  estimatedOneRepMax,
  expectedHydrationByNow,
  hydrationPaceStatus,
  hydrationPercent,
  hydrationTotal,
  monthlyAchievements,
  progressiveOverloadRecommendation,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  upsertQuickAmount,
  visibleQuickAmounts,
  type WorkoutSet
} from "@/lib/core";
import { initialState, type AppState } from "@/lib/seed";
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
  const [setWeight, setSetWeight] = useState(42.5);
  const [setReps, setSetReps] = useState(8);
  const [setRpe, setSetRpe] = useState(8);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
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
          />
        )}

        {tab === "progress" && (
          <ProgressView
            totalWater={totalWater}
            target={state.profile.waterTargetMl}
            sets={state.workoutSets}
            bestSet={bestSet}
            achievements={achievements}
          />
        )}

        {tab === "coach" && <CoachView recommendation={activeRecommendation} achievements={achievements} />}

        {tab === "settings" && (
          <SettingsView
            state={state}
            updateProfile={updateProfile}
            reset={() => commit(resetState(), "Đã khôi phục dữ liệu mẫu")}
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
}) {
  return (
    <div className="stack workout-focus">
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
}) {
  const volume = props.sets.reduce((sum, set) => sum + set.actualWeightKg * set.actualReps, 0);
  const oneRm = props.bestSet ? estimatedOneRepMax(props.bestSet.actualWeightKg, props.bestSet.actualReps) : 0;

  return (
    <div className="stack">
      <section className="stats-grid">
        <MetricCard label="Nước hôm nay" value={`${props.totalWater}/${props.target}ml`} accent="hydration" />
        <MetricCard label="Volume" value={`${Math.round(volume)}kg`} accent="training" />
        <MetricCard label="e1RM tốt nhất" value={oneRm ? `${oneRm}kg` : "Chưa có"} accent="coach" />
        <MetricCard label="Workout" value={`${props.sets.length} sets`} accent="neutral" />
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
}) {
  return (
    <div className="stack">
      <section className="card coach-card">
        <p className="eyebrow">Coach recommendation</p>
        <h1>{props.recommendation.title}</h1>
        <p>{props.recommendation.reason}</p>
        <div className="coach-actions">
          <button className="primary-button coach-bg">Áp dụng</button>
          <button className="secondary-button">Từ chối</button>
        </div>
      </section>
      <section className="card">
        <h2>Readiness</h2>
        <div className="readiness-score">
          <strong>82</strong>
          <span>Ngủ tốt, soreness thấp, có thể giữ intensity.</span>
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

function SettingsView(props: { state: AppState; updateProfile: (next: Partial<AppState["profile"]>) => void; reset: () => void }) {
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
        <h2>Dữ liệu</h2>
        <button className="secondary-button" onClick={props.reset}>
          Reset dữ liệu mẫu
        </button>
      </section>
    </div>
  );
}
