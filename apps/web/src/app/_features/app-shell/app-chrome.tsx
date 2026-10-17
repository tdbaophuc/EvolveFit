"use client";

import { Bell, RotateCcw, User } from "lucide-react";
import React from "react";
import { MainNavigation, type AppSection } from "./app-navigation";

const text = {
  avatar: "\u1ea2nh \u0111\u1ea1i di\u1ec7n ng\u01b0\u1eddi d\u00f9ng",
  localFirst: "L\u01b0u tr\u00ean m\u00e1y tr\u01b0\u1edbc",
  notifications: "Th\u00f4ng b\u00e1o"
};

type AppChromeProps = {
  active: AppSection | "hydration";
  children: React.ReactNode;
  hasReminder: boolean;
  isInkShell: boolean;
  now: Date;
  onNavigate: (section: AppSection) => void;
  onUndo: () => void;
  showNavigation: boolean;
  showUndo: boolean;
  syncStatus: string;
  syncStatusLabel: string;
  timezone: string;
  toast: string | null;
};

export function AppChrome(props: AppChromeProps) {
  return (
    <main className={`app-shell ${props.isInkShell ? "ink-shell" : ""}`}>
      <header className="top-bar">
        <button className="avatar" aria-label={text.avatar} onClick={() => props.onNavigate("settings")}>
          <User size={18} />
        </button>
        <div>
          <p className="top-date">{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "short" }).format(props.now)}</p>
          <p className="top-subtitle">{text.localFirst} - {props.timezone}</p>
          <span className={`sync-status ${props.syncStatus}`}>{props.syncStatusLabel}</span>
        </div>
        <button className={`icon-button ${props.hasReminder ? "attention" : ""}`} aria-label={text.notifications}>
          <Bell size={20} />
        </button>
      </header>

      {props.showNavigation && <MainNavigation active={props.active} className="desktop-tabs" onNavigate={props.onNavigate} />}

      <section className="content">{props.children}</section>

      {props.toast && (
        <div className="toast" role="status">
          <span>{props.toast}</span>
          {props.showUndo && (
            <button onClick={props.onUndo}>
              <RotateCcw size={16} /> Undo
            </button>
          )}
        </div>
      )}

      {props.showNavigation && <MainNavigation active={props.active} className="bottom-tabs" onNavigate={props.onNavigate} />}
    </main>
  );
}
