"use client";

import { Activity } from "lucide-react";
import React from "react";

export function MetricCard(props: { label: string; value: string; accent: "hydration" | "training" | "coach" | "neutral"; icon?: React.ReactNode }) {
  return (
    <div className={`metric-card ${props.accent}`}>
      {props.icon && <span className="metric-icon">{props.icon}</span>}
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function EmptyState(props: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Activity size={18} />
      </div>
      <strong>{props.title}</strong>
      <p>{props.text}</p>
    </div>
  );
}
