"use client";

import React, { useEffect, useState } from "react";

export function ConfirmActionButton(props: {
  className?: string;
  label: string;
  confirmLabel: string;
  ariaLabel: string;
  onConfirm: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timeout = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [armed]);

  return (
    <button
      className={props.className}
      onClick={() => {
        if (props.disabled) return;
        if (!armed) {
          setArmed(true);
          return;
        }
        props.onConfirm();
        setArmed(false);
      }}
      aria-label={armed ? props.confirmLabel : props.ariaLabel}
      aria-pressed={armed}
      disabled={props.disabled}
    >
      {armed ? props.confirmLabel : props.children ?? props.label}
    </button>
  );
}
