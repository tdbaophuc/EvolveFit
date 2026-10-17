"use client";

import React, { useState } from "react";
import { CalendarDays, Check, ChevronRight, Droplets, Dumbbell, Pill, Play } from "lucide-react";
import { Button, EmptyState, Sheet, cn } from "@/components/ui";
import { formatNumberVi, formatTimeVi } from "@/lib/i18n/vi";
import { useTodayScreen } from "./use-today-screen";

const paceLabel = { ahead: "Đi trước tiến độ", "on-pace": "Đúng tiến độ", behind: "Đang chậm hơn tiến độ" } as const;

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-secondary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${value}%` }} />
    </div>
  );
}

/** Today dashboard (spec 9.1): one hero answering "what now?", one-tap daily actions, details in sheets. */
export function TodayScreen() {
  const model = useTodayScreen();
  const [hydrationOpen, setHydrationOpen] = useState(false);
  const { workout, water, creatine } = model;
  const lastLog = model.todayLogs[0];

  return (
    <div className="grid gap-4">
      <section aria-label="Việc quan trọng nhất" className="rounded-3xl bg-gradient-to-br from-[#173E2A] to-[#10251B] p-5 text-white shadow-lg">
        <p className="m-0 text-sm font-medium text-white/70">Hôm nay</p>
        <h1 className="m-0 mt-1 text-2xl font-semibold leading-8">{workout.title}</h1>
        <p className="m-0 mt-1 text-sm leading-5 text-white/70">
          {workout.hasPlan ? `${workout.exerciseCount} bài${workout.progressPercent ? ` • ${workout.progressPercent}% hoàn tất` : ""}` : "Chọn một lịch tập để bắt đầu."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="lg"
            leadingIcon={workout.inProgress ? <Play size={18} /> : <Dumbbell size={18} />}
            onClick={workout.hasPlan ? model.startWorkout : model.openSchedule}
          >
            {workout.inProgress ? "Tiếp tục tập" : workout.hasPlan ? "Bắt đầu tập" : "Chọn lịch tập"}
          </Button>
          {workout.hasPlan && (
            <button
              type="button"
              onClick={model.openSchedule}
              className="inline-flex h-12 cursor-pointer items-center gap-1 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <CalendarDays size={16} aria-hidden /> Xem lịch
            </button>
          )}
        </div>
      </section>

      <section aria-label="Việc hằng ngày" className={cn("grid gap-3", creatine.active ? "grid-cols-2" : "grid-cols-1")}>
        <article className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Droplets size={18} className="text-secondary" aria-hidden /> Nước
          </div>
          <div>
            <p className="m-0 text-xl font-semibold tabular-nums leading-7">
              {formatNumberVi(water.total)}
              <span className="text-sm font-medium text-muted-foreground"> / {formatNumberVi(water.target)}ml</span>
            </p>
            <p className="m-0 text-xs leading-4 text-muted-foreground">{paceLabel[water.pace]}</p>
          </div>
          <ProgressBar percent={water.percent} label={`Nước: ${water.percent}% mục tiêu`} />
          <div className="mt-auto grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" onClick={() => model.logWater(250)}>
              +250ml
            </Button>
            <Button size="sm" variant="secondary" onClick={() => model.logWater(500)}>
              +500ml
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setHydrationOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1 self-start border-0 bg-transparent p-0 text-sm font-semibold text-primary hover:underline"
          >
            Chi tiết <ChevronRight size={14} aria-hidden />
          </button>
        </article>

        {creatine.active && (
          <article className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Pill size={18} className="text-warning" aria-hidden /> Creatine
            </div>
            <div>
              <p className="m-0 text-xl font-semibold leading-7">{creatine.logged ? "Đã uống" : "Chưa uống"}</p>
              <p className="m-0 text-xs leading-4 text-muted-foreground">{creatine.amount}g mỗi ngày</p>
            </div>
            <div className="mt-auto">
              {creatine.logged ? (
                <p className="m-0 inline-flex h-9 items-center gap-1.5 text-sm font-medium text-primary-soft-foreground">
                  <Check size={16} aria-hidden /> Xong hôm nay
                </p>
              ) : (
                <Button size="sm" fullWidth onClick={model.logCreatine}>
                  Đã uống
                </Button>
              )}
            </div>
          </article>
        )}
      </section>

      <section aria-label="Hoạt động gần đây" className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-base font-semibold leading-6">Hoạt động gần đây</h2>
            <p className="m-0 truncate text-sm leading-5 text-muted-foreground">
              {lastLog ? `${formatTimeVi(lastLog.loggedAt)} • +${lastLog.amountMl}ml nước` : "Chưa có hoạt động hôm nay"}
            </p>
          </div>
          {model.todayLogs.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setHydrationOpen(true)}>
              Xem tất cả
            </Button>
          )}
        </div>
      </section>

      <Sheet
        open={hydrationOpen}
        onClose={() => setHydrationOpen(false)}
        title="Nước hôm nay"
        description={`${formatNumberVi(water.total)} / ${formatNumberVi(water.target)}ml • ${water.percent}% mục tiêu`}
        footer={
          <Button fullWidth variant="secondary" onClick={model.openHydration}>
            Quản lý nước và đồ uống
          </Button>
        }
      >
        {model.todayLogs.length ? (
          <ul className="m-0 grid list-none gap-0 p-0">
            {model.todayLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between border-b border-border/60 py-3 text-[15px] last:border-b-0">
                <span className="tabular-nums text-muted-foreground">{formatTimeVi(log.loggedAt)}</span>
                <span className="font-semibold tabular-nums">+{log.amountMl}ml</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Chưa có log nước" description="Bấm +250ml hoặc +500ml để ghi nhanh." />
        )}
      </Sheet>
    </div>
  );
}
