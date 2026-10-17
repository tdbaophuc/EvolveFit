import React, { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-2xl border border-border/70 bg-card p-4 text-card-foreground shadow-sm sm:p-5", className)} {...rest} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="m-0 text-base font-semibold leading-6">{title}</h2>
        {description && <p className="m-0 text-sm leading-5 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Label/value row for settings and summaries. */
export function DataRow({ label, value, description }: { label: ReactNode; value?: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="m-0 text-[15px] leading-6">{label}</p>
        {description && <p className="m-0 text-sm leading-5 text-muted-foreground">{description}</p>}
      </div>
      {value !== undefined && <div className="shrink-0 text-sm font-medium tabular-nums">{value}</div>}
    </div>
  );
}

/** Large tabular number for metrics (ml, kg, reps, timers). */
export function StatNumber({ value, unit, label, size = "md" }: { value: ReactNode; unit?: string; label?: ReactNode; size?: "md" | "lg" }) {
  return (
    <div>
      {label && <p className="m-0 text-xs font-medium leading-4 text-muted-foreground">{label}</p>}
      <p className={cn("m-0 font-semibold tabular-nums", size === "lg" ? "text-4xl leading-[44px]" : "text-3xl leading-9")}>
        {value}
        {unit && <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}
