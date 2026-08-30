"use client";

import { ArrowLeft, ChevronRight, Minus, Plus, Trash2, Waves, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  cryptoSafeId,
  expectedHydrationByNow,
  hydrationPaceStatus,
  hydrationPercent,
  hydrationTotal,
  isDrinkModuleActive,
  normalizeDrinkModules,
  upsertQuickAmount,
  visibleHydrationLogs,
  visibleQuickAmounts,
  type HydrationLog
} from "@/lib/core";
import { initialState, type AppState } from "@/lib/seed";
import { loadState, saveState } from "@/lib/storage";

export default function HydrationDetailPage() {
  const [state, setState] = useState<AppState>(initialState);
  const [customAmount, setCustomAmount] = useState(500);
  const [drinkType, setDrinkType] = useState<HydrationLog["drinkType"]>("water");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const drinkModules = normalizeDrinkModules(state.drinkModules, state.profile.waterTargetMl, state.profile.creatineAmountG);
  const activeHydrationLogs = visibleHydrationLogs(state.hydrationLogs, drinkModules);
  const activeOptionalDrinkModules = drinkModules.filter((module) => module.category === "drink" && module.active);
  const drinkOptions = [
    { id: "water" as const, label: "Nước" },
    ...activeOptionalDrinkModules.map((module) => ({ id: module.id as HydrationLog["drinkType"], label: module.name }))
  ];
  const total = hydrationTotal(state.hydrationLogs, new Date(), drinkModules);
  const percent = hydrationPercent(total, state.profile.waterTargetMl);
  const expected = expectedHydrationByNow(state.profile.waterTargetMl, state.profile.wakeHour, state.profile.sleepHour);
  const pace = hydrationPaceStatus(total, expected);
  const ringPercent = Math.min(percent, 100);
  const quickWater = visibleQuickAmounts(state.quickAmounts, "hydration", 3);
  const hourly = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const hour = index + 8;
      const amount = activeHydrationLogs
        .filter((log) => new Date(log.loggedAt).getHours() === hour)
        .reduce((sum, log) => sum + log.amountMl, 0);
      return { hour, amount };
    });
  }, [activeHydrationLogs]);
  const maxHourAmount = Math.max(250, ...hourly.map((item) => item.amount));
  const paceCopy =
    pace === "behind"
      ? "Hãy uống thêm một chút để bắt kịp nhịp."
      : pace === "ahead"
        ? "Bạn đang vượt nhịp. Giữ đều trong phần còn lại của ngày."
        : "Bạn đang đúng nhịp. Tiếp tục nhé.";

  function logWater(amountMl: number, pin = false, type: HydrationLog["drinkType"] = "water") {
    if (!isDrinkModuleActive(drinkModules, type)) return;
    const log: HydrationLog = { id: cryptoSafeId(), amountMl, drinkType: type, loggedAt: new Date().toISOString() };
    setState((current) => ({
      ...current,
      hydrationLogs: [...current.hydrationLogs, log],
      quickAmounts: upsertQuickAmount(current.quickAmounts, {
        category: "hydration",
        label: `+${amountMl}ml`,
        amount: amountMl,
        unit: "ml",
        pinned: pin
      })
    }));
  }

  function updateLog(id: string, delta: number) {
    setState((current) => ({
      ...current,
      hydrationLogs: current.hydrationLogs.map((log) =>
        log.id === id ? { ...log, amountMl: Math.max(50, log.amountMl + delta) } : log
      )
    }));
  }

  function deleteLog(id: string) {
    setState((current) => ({ ...current, hydrationLogs: current.hydrationLogs.filter((log) => log.id !== id) }));
  }

  return (
    <main className="app-shell detail-shell">
      <header className="top-bar">
        <Link className="avatar" href="/" aria-label="Quay lại">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="top-date">Nước</p>
          <p className="top-subtitle">Theo dõi nhịp uống nước</p>
        </div>
        <div className="icon-button">
          <Waves size={20} />
        </div>
      </header>

      <section className="content stack hydration-detail-screen">
        <section className="hydration-summary">
          <div>
            <p>Tiến độ hôm nay</p>
            <h1>
              {total.toLocaleString("vi-VN")} <span>/ {state.profile.waterTargetMl.toLocaleString("vi-VN")} ml</span>
            </h1>
            <em>{paceCopy}</em>
          </div>
          <div className="hydration-ring" aria-label={`Đã uống ${percent}% mục tiêu`}>
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
              <button key={amount.id} onClick={() => logWater(amount.amount, false, "water")}>
                +{amount.amount} <span>ml</span>
              </button>
            ))}
            <button className="custom-water-button" onClick={() => setShowCustom(true)}>
              Tùy chỉnh
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
            <span className="sync-pill">{activeHydrationLogs.length} log</span>
          </div>
          <div className="hydration-history">
            {activeHydrationLogs.length ? (
              activeHydrationLogs.slice().reverse().map((log) => (
                <div key={log.id}>
                  <span>{new Date(log.loggedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  <strong>+{log.amountMl} ml</strong>
                  <div className="row-actions">
                    <button onClick={() => updateLog(log.id, -50)} aria-label="Giảm log nước">
                      <Minus size={14} />
                    </button>
                    <button onClick={() => updateLog(log.id, 50)} aria-label="Tăng log nước">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => deleteLog(log.id)} aria-label="Xóa log nước">
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
              <span>{state.notificationSettings.hydrationEnabled ? "Mỗi 2 giờ - 09:00-21:00" : "Đang tắt"}</span>
            </div>
            <button
              className={state.notificationSettings.hydrationEnabled ? "toggle-switch active" : "toggle-switch"}
              onClick={() => setState((current) => ({ ...current, notificationSettings: { ...current.notificationSettings, hydrationEnabled: !current.notificationSettings.hydrationEnabled } }))}
              aria-label="Bật tắt nhắc uống nước"
            >
              <span />
            </button>
          </div>
          <button
            className="hydration-goal-row"
            onClick={() => setState((current) => ({ ...current, profile: { ...current.profile, waterTargetMl: current.profile.waterTargetMl === 2500 ? 3000 : 2500 } }))}
          >
            <div>
              <p>Mục tiêu hằng ngày</p>
              <span>{state.profile.waterTargetMl.toLocaleString("vi-VN")} ml - Gợi ý theo cân nặng</span>
            </div>
            <ChevronRight size={18} />
          </button>
        </section>
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
              <strong>{customAmount}</strong>
              <span>ml</span>
            </div>
            <div className="segmented-control" aria-label="Loại đồ uống">
              {drinkOptions.map(({ id, label }) => (
                <button key={id} className={drinkType === id ? "active" : ""} onClick={() => setDrinkType(id)}>
                  {label}
                </button>
              ))}
            </div>
            <input type="range" min="50" max="1500" step="50" value={customAmount} onChange={(event) => setCustomAmount(Number(event.target.value))} aria-label="Lượng nước" />
            <div className="custom-stepper-row">
              <button onClick={() => setCustomAmount(Math.max(50, customAmount - 50))}>- 50</button>
              <button onClick={() => setCustomAmount(Math.min(1500, customAmount + 50))}>+ 50</button>
            </div>
            <button
              className="primary-button hydration-bg custom-log-button"
              onClick={() => {
                logWater(customAmount, true, drinkType);
                setShowCustom(false);
              }}
            >
              Ghi {customAmount} ml
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
