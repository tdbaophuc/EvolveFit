"use client";

import { Activity, Award, CalendarCheck, Dumbbell, Home, Settings } from "lucide-react";
import type { ComponentType } from "react";
import React from "react";

export type AppSection = "today" | "workout" | "routines" | "library" | "progress" | "settings";

export const primaryTabs: { id: AppSection; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "today", label: "Hôm nay", icon: Home },
  { id: "workout", label: "Tập luyện", icon: Dumbbell },
  { id: "routines", label: "Lịch tập", icon: CalendarCheck },
  { id: "library", label: "Thư viện", icon: Award },
  { id: "progress", label: "Tiến độ", icon: Activity },
  { id: "settings", label: "Cài đặt", icon: Settings }
];

const text = {
  nav: "Điều hướng chính"
};

export function MainNavigation(props: {
  active: AppSection | "hydration";
  className: string;
  onNavigate: (section: AppSection) => void;
}) {
  const isBottomNavigation = props.className === "bottom-tabs";
  const visibleTabs = isBottomNavigation ? primaryTabs.filter((item) => item.id !== "settings") : primaryTabs;

  return (
    <nav className={props.className} aria-label={text.nav}>
      {visibleTabs.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            aria-label={isBottomNavigation ? `Mobile ${item.label}` : item.label}
            className={props.active === item.id ? "active" : ""}
            onClick={() => props.onNavigate(item.id)}
          >
            <Icon size={isBottomNavigation ? 20 : 18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
