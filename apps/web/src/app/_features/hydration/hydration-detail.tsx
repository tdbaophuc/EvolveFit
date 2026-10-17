"use client";

import type { DrinkModule, HydrationLog } from "@evolvefit/shared";
import { ChevronRight, Minus, Plus, Trash2, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { ConfirmActionButton } from "../ui/confirm-action-button";
import { EmptyState } from "../ui/feedback";

type QuickAmount = { id: string; label: string; amount: number };
type PinnedQuickAmount = QuickAmount & { pinned: boolean };

export function HydrationDetailView(props: {
  totalWater: number;
  percent: number;
  target: number;
  pace: "ahead" | "on-pace" | "behind";
  quickWater: QuickAmount[];
  quickAmounts: PinnedQuickAmount[];
  waterAmount: number;
  setWaterAmount: (value: number) => void;
  logWater: (amountMl: number, pin?: boolean, type?: HydrationLog["drinkType"]) => void;
  drinkType: HydrationLog["drinkType"];
  setDrinkType: (value: HydrationLog["drinkType"]) => void;
  updateQuickAmount: (id: string, patch: { pinned?: boolean }) => void;
  deleteQuickAmount: (id: string) => void;
  quickCreatine: QuickAmount[];
  creatineAmount: number;
  setCreatineAmount: (value: number) => void;
  logCreatine: (amount: number, pin?: boolean) => void;
  creatineLogged: boolean;
  creatineReminder: boolean;
  activeOptionalDrinkModules: DrinkModule[];
  hydrationLogs: { id: string; amountMl: number; loggedAt: string }[];
  editHydrationLog: (id: string, deltaMl: number) => void;
  deleteHydrationLog: (id: string) => void;
  waterReminderEnabled?: boolean;
  waterReminderLabel?: string;
  updateProfile?: (next: { waterTargetMl: number }) => void;
  updateNotificationSettings?: (next: { hydrationEnabled: boolean }) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreatineTools, setShowCreatineTools] = useState(false);
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

      <div className="hydration-disclosures">
        <button className="secondary-button disclosure-toggle" onClick={() => setShowHistory(!showHistory)} aria-expanded={showHistory}>
          {showHistory ? "Ẩn lịch sử hôm nay" : `Mở lịch sử hôm nay (${props.hydrationLogs.length})`}
        </button>
        <button className="secondary-button disclosure-toggle" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings}>
          {showSettings ? "Ẩn cài đặt nước" : "Mở cài đặt nước"}
        </button>
        <button className="secondary-button disclosure-toggle" onClick={() => setShowCreatineTools(!showCreatineTools)} aria-expanded={showCreatineTools}>
          {showCreatineTools ? "Ẩn creatine" : "Mở creatine"}
        </button>
      </div>

      {showHistory && (
        <section className="hydration-block">
          <div className="section-heading compact">
            <h2>Lịch sử hôm nay</h2>
            <span className="sync-pill">{props.hydrationLogs.length} log</span>
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
                      <ConfirmActionButton
                        className="danger-button"
                        label="Xóa log nước"
                        confirmLabel="Xác nhận xóa"
                        ariaLabel="Xóa log nước"
                        onConfirm={() => props.deleteHydrationLog(log.id)}
                      >
                        <Trash2 size={14} />
                      </ConfirmActionButton>
                    </div>
                  </div>
                ))
            ) : (
              <EmptyState title="Chưa có log nước" text="Dùng một nút log nhanh phía trên để bắt đầu theo dõi hôm nay." />
            )}
          </div>
        </section>
      )}

      {showSettings && (
        <section className="hydration-settings-card">
          <div className="hydration-setting-row">
            <div>
              <p>Nhắc uống nước</p>
              <span>{props.waterReminderEnabled ? props.waterReminderLabel : "Đang tắt"}</span>
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
      )}

      {showCustom && (
        <div className="hydration-modal-backdrop">
          <div className="hydration-modal" role="dialog" aria-modal="true" aria-labelledby="custom-water-title">
            <div className="modal-heading">
              <h2 id="custom-water-title">Lượng tùy chỉnh</h2>
              <button onClick={() => setShowCustom(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <div className="custom-water-value">
              <strong>{props.waterAmount}</strong>
              <span>ml</span>
            </div>
            <div className="segmented-control" aria-label="Loại đồ uống">
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
                    {amount.pinned ? "Đã ghim" : "Ghim"}
                  </button>
                  <ConfirmActionButton
                    className="icon-mini danger danger-button"
                    label="Xóa lượng uống nhanh"
                    confirmLabel="Xác nhận xóa"
                    ariaLabel="Xóa lượng uống nhanh"
                    onConfirm={() => props.deleteQuickAmount(amount.id)}
                  >
                    <Trash2 size={14} />
                  </ConfirmActionButton>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreatineTools && (
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
      )}
    </div>
  );
}
