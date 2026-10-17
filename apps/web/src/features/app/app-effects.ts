"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { currentState, notify, useAppStore } from "@/lib/store/app-store";
import { bootstrapSession } from "../auth/actions";
import { logCreatine, logWater } from "../hydration/actions";
import { selectHydration } from "../hydration/selectors";
import { refreshPushStatus } from "../notifications/actions";
import { useNotificationStore } from "../notifications/store";
import { updateNotificationSettings } from "../settings/actions";
import { useSyncEngine } from "../sync/engine";
import { pullFromCloud } from "../sync/pull";
import { restSecondsRemaining, useWorkoutUi } from "../workout/ui-store";

const toastDurationMs = 5000;

/** App-wide side effects. Mounted exactly once by the AppShell. */
export function useAppEffects() {
  const hydrated = useAppStore((store) => store.hydrated);
  const toast = useAppStore((store) => store.toast);
  const email = useAppStore((store) => store.state.profile.email);
  const router = useRouter();

  // Load persisted state once per page load. The shell remounts when coming back from the auth pages, and
  // in-memory state (live workout UI, pending merge decision) must survive that.
  useEffect(() => {
    if (!useAppStore.getState().hydrated) useAppStore.getState().hydrate();
  }, []);

  // A single place dismisses toasts: a new message restarts the timer and replaces the previous one.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => notify(null), toastDurationMs);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if ("Notification" in window) useNotificationStore.getState().patch({ permission: Notification.permission });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void bootstrapSession();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshPushStatus();
  }, [hydrated, email]);

  // Actions forwarded from notification clicks (see public/sw.js): /?quickAction=... and /?tab=progress
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("quickAction");
    const tab = params.get("tab");
    if (!action && !tab) return;
    if (action === "log-water-250") logWater(250);
    if (action === "log-creatine") logCreatine(currentState().profile.creatineAmountG);
    if (action === "snooze-reminders") updateNotificationSettings({ snoozeUntil: new Date(Date.now() + 30 * 60000).toISOString() });
    params.delete("quickAction");
    params.delete("tab");
    const query = params.toString();
    const path = tab === "progress" ? "/progress" : window.location.pathname;
    router.replace(`${path}${query ? `?${query}` : ""}`);
  }, [hydrated, router]);

  useSyncEngine();
  usePullOnFocus();
  useInAppReminders();
  useRestTimer();
}

/** Refreshes cloud data when the user comes back to the app (throttled inside pullFromCloud). */
function usePullOnFocus() {
  const hydrated = useAppStore((store) => store.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void pullFromCloud();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated]);
}

/** Shows reminders inside the app when browser notifications are not granted. */
function useInAppReminders() {
  const hydrated = useAppStore((store) => store.hydrated);
  const state = useAppStore((store) => store.state);
  const permission = useNotificationStore((store) => store.permission);
  const { hydrationReminder, creatineReminder } = selectHydration(state, new Date());
  const fallbackEnabled = state.notificationSettings.inAppFallbackEnabled;

  useEffect(() => {
    if (!hydrated || !fallbackEnabled || permission === "granted") return;
    if (!hydrationReminder && !creatineReminder) return;
    const remindedAt = new Date().toISOString();
    if (hydrationReminder) {
      notify("Đến giờ uống nước. Hãy log khi bạn uống xong.");
      updateNotificationSettings({ lastHydrationReminderAt: remindedAt });
      return;
    }
    notify("Đến giờ creatine. Log đã uống hoặc bỏ qua để không nhắc lại hôm nay.");
    updateNotificationSettings({ lastCreatineReminderAt: remindedAt });
  }, [creatineReminder, fallbackEnabled, hydrated, hydrationReminder, permission]);
}

/** Ticks the rest timer during a live workout and announces when rest is over, on any screen. */
function useRestTimer() {
  const restEndsAt = useAppStore((store) => store.state.restEndsAt);
  const { mode, restPausedSeconds, restNotifiedFor, nowMs, patch } = useWorkoutUi();
  const permission = useNotificationStore((store) => store.permission);
  const onWorkout = usePathname() === "/workout";

  useEffect(() => {
    if (!onWorkout || mode !== "live" || !restEndsAt || restPausedSeconds !== null) return;
    const id = window.setInterval(() => patch({ nowMs: Date.now() }), 1000);
    return () => window.clearInterval(id);
  }, [mode, onWorkout, patch, restEndsAt, restPausedSeconds]);

  useEffect(() => {
    if (!restEndsAt || restPausedSeconds !== null) return;
    if (restSecondsRemaining(restEndsAt, null, nowMs) > 0 || restNotifiedFor === restEndsAt) return;
    patch({ restNotifiedFor: restEndsAt });
    notify("Đã hết giờ nghỉ. Sẵn sàng set tiếp theo.");
    if (permission === "granted") new Notification("EvolveFit", { body: "Đã hết giờ nghỉ. Sẵn sàng set tiếp theo." });
  }, [nowMs, patch, permission, restEndsAt, restNotifiedFor, restPausedSeconds]);
}
