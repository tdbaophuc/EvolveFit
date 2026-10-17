"use client";

import { Activity, Award, CalendarCheck, Dumbbell, Home, Settings } from "lucide-react";
import type { ComponentType } from "react";
import React from "react";

export type AppSection = "today" | "workout" | "routines" | "library" | "progress" | "settings";

export const primaryTabs: { id: AppSection; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "today", label: "H\u00f4m nay", icon: Home },
  { id: "workout", label: "T\u1eadp luy\u1ec7n", icon: Dumbbell },
  { id: "routines", label: "L\u1ecbch t\u1eadp", icon: CalendarCheck },
  { id: "library", label: "Th\u01b0 vi\u1ec7n", icon: Award },
  { id: "progress", label: "Ti\u1ebfn \u0111\u1ed9", icon: Activity },
  { id: "settings", label: "C\u00e0i \u0111\u1eb7t", icon: Settings }
];

const text = {
  nav: "\u0110i\u1ec1u h\u01b0\u1edbng ch\u00ednh"
};

export function routeForSection(section: AppSection) {
  return section === "today" ? "/today" : `/${section}`;
}

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
