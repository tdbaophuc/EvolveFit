import React, { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  trailing?: ReactNode;
};

/** Label above, 44px input, optional hint and error wired to aria-describedby / aria-invalid. */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField({ label, hint, error, trailing, id, className, ...rest }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium leading-5">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={cn(
            "h-11 w-full rounded-lg border bg-card px-3 text-[15px] text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-60",
            error ? "border-destructive" : "border-input",
            trailing ? "pr-11" : undefined,
            className
          )}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {hint && !error && (
        <p id={hintId} className="m-0 text-xs leading-4 text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="m-0 text-xs font-medium leading-4 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});
