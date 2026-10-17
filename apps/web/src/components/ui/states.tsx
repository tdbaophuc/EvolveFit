import React, { type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="m-0 text-base font-semibold">{title}</p>
      {description && <p className="m-0 max-w-sm text-sm leading-5 text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Không tải được dữ liệu", description, onRetry }: { title?: ReactNode; description?: ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-2xl border border-destructive-border bg-destructive-soft p-4">
      <p className="m-0 text-base font-semibold text-destructive">{title}</p>
      {description && <p className="m-0 text-sm leading-5 text-foreground">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

const noticeTones = {
  info: "border-info/30 bg-info-soft text-info-foreground",
  warning: "border-warning/40 bg-warning-soft text-warning-foreground",
  success: "border-primary/30 bg-primary-soft text-primary-soft-foreground"
};

export function InlineNotice({ tone = "info", children }: { tone?: keyof typeof noticeTones; children: ReactNode }) {
  return (
    <p role="status" className={cn("m-0 rounded-xl border px-3 py-2 text-sm leading-5", noticeTones[tone])}>
      {children}
    </p>
  );
}
