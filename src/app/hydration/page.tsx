"use client";

import { ArrowLeft, Minus, Plus, Trash2, Waves } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { hydrationPercent, hydrationTotal, type HydrationLog } from "@/lib/core";
import { initialState, type AppState } from "@/lib/seed";
import { loadState, saveState } from "@/lib/storage";

export default function HydrationDetailPage() {
  const [state, setState] = useState<AppState>(initialState);
  const [filter, setFilter] = useState<HydrationLog["drinkType"] | "all">("all");

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const total = hydrationTotal(state.hydrationLogs);
  const percent = hydrationPercent(total, state.profile.waterTargetMl);
  const filteredLogs = state.hydrationLogs.filter((log) => filter === "all" || log.drinkType === filter);
  const hourly = useMemo(() => {
    return Array.from({ length: 18 }, (_, index) => {
      const hour = index + 6;
      const amount = state.hydrationLogs
        .filter((log) => new Date(log.loggedAt).getHours() === hour)
        .reduce((sum, log) => sum + log.amountMl, 0);
      return { hour, amount };
    });
  }, [state.hydrationLogs]);
  const maxAmount = Math.max(250, ...hourly.map((item) => item.amount));

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
          <p className="top-date">Hydration</p>
          <p className="top-subtitle">{total}/{state.profile.waterTargetMl}ml • {percent}%</p>
        </div>
        <div className="icon-button">
          <Waves size={20} />
        </div>
      </header>

      <section className="content stack">
        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Theo giờ</p>
              <h1>Progress trong ngày</h1>
            </div>
            <strong>{percent}%</strong>
          </div>
          <div className="bar-chart hourly-chart">
            {hourly.map((item) => (
              <span key={item.hour} title={`${item.hour}:00 - ${item.amount}ml`} style={{ height: `${Math.max(6, (item.amount / maxAmount) * 100)}%` }} />
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <h2>Filter</h2>
            <span className="sync-pill">{filteredLogs.length} logs</span>
          </div>
          <div className="template-row">
            {(["all", "water", "coffee", "tea", "other"] as const).map((item) => (
              <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="timeline editable">
            {filteredLogs
              .slice()
              .reverse()
              .map((log) => (
                <div key={log.id}>
                  <span>{new Date(log.loggedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  <strong>{log.amountMl}ml</strong>
                  <div className="row-actions">
                    <button onClick={() => updateLog(log.id, -50)} aria-label="Giảm">
                      <Minus size={14} />
                    </button>
                    <button onClick={() => updateLog(log.id, 50)} aria-label="Tăng">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => deleteLog(log.id)} aria-label="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </section>
    </main>
  );
}
