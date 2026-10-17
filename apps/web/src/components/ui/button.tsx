import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "border-0 bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
  secondary: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "border-0 bg-transparent text-foreground hover:bg-muted",
  danger: "border-0 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover",
  "danger-soft": "border border-destructive-border bg-destructive-soft text-destructive hover:bg-destructive-soft/70"
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and announces the busy state. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, leadingIcon, fullWidth, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "m-0 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading ? <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : leadingIcon}
      {children}
    </button>
  );
});

export type IconButtonProps = Omit<ButtonProps, "leadingIcon" | "children"> & { label: string; icon: ReactNode };

/** Square icon-only button; `label` is required so screen readers can announce it. */
export function IconButton({ label, icon, size = "md", className, variant = "ghost", ...rest }: IconButtonProps) {
  return (
    <Button aria-label={label} title={label} variant={variant} size={size} className={cn(size === "sm" ? "w-9 px-0" : "w-11 px-0", className)} {...rest}>
      {icon}
    </Button>
  );
}
