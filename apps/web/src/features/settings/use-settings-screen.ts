"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { allRestoreSections, type RestoreSection } from "@evolvefit/shared";
import type { HealthDashboard, SettingsView } from "@/app/_features/settings/settings-view";
import { evolveFitApiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store/app-store";
import * as auth from "../auth/actions";
import { useAuthStore } from "../auth/store";
import { updateDrinkModule } from "../hydration/actions";
import { selectHydration } from "../hydration/selectors";
import { requestNotifications, sendTestPushNotification, subscribeWebPush, unsubscribeWebPush } from "../notifications/actions";
import { useNotificationStore } from "../notifications/store";
import * as settings from "./actions";

export function useSettingsScreen(): ComponentProps<typeof SettingsView> {
  const state = useAppStore((store) => store.state);
  const account = useAppStore((store) => store.account);
  const authStore = useAuthStore();
  const notifications = useNotificationStore();
  const [restoreSections, setRestoreSections] = useState<RestoreSection[]>(allRestoreSections());
  const [healthDashboard, setHealthDashboard] = useState<HealthDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    void evolveFitApiClient.health().then((body) => {
      if (!cancelled && body.ok && body.data) setHealthDashboard({ ...(body.data as HealthDashboard), requestId: body.requestId });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    state,
    updateProfile: settings.updateProfile,
    account,
    sessionExpired: authStore.sessionExpired,
    authPending: authStore.pending,
    refreshAuthSession: () => void auth.refreshAuthSession(),
    signOutAccount: (options: { removeLocalData: boolean }) => void auth.signOutAccount(options),
    deleteCloudAccount: () => void auth.deleteCloudAccount(),
    reset: settings.resetDemoData,
    deletePersonalData: settings.deleteLocalPersonalData,
    notificationPermission: notifications.permission,
    pushConfigured: notifications.pushConfigured,
    pushSubscriptionStatus: notifications.pushStatus,
    healthDashboard,
    requestNotifications: () => void requestNotifications(),
    subscribeWebPush: () => void subscribeWebPush(),
    unsubscribeWebPush: () => void unsubscribeWebPush(),
    sendTestPushNotification: () => void sendTestPushNotification(),
    markQueue: settings.markQueue,
    retryQueueItem: settings.retryQueueItem,
    confirmRoutineConflict: settings.confirmRoutineConflict,
    clearQueue: settings.clearQueue,
    downloadExport: settings.downloadExport,
    downloadCsvExport: settings.downloadCsvExport,
    importJsonExport: (file: File) => settings.importJsonExport(file, restoreSections),
    restoreSections,
    setRestoreSections,
    updateNotificationSettings: settings.updateNotificationSettings,
    updatePlateSettings: settings.updatePlateSettings,
    updateSocialPrivacy: settings.updateSocialPrivacy,
    updateHealthIntegration: settings.updateHealthIntegration,
    requestHealthPermission: settings.requestHealthPermission,
    revokeHealthPermission: settings.revokeHealthPermission,
    addFriend: settings.addFriend,
    updateFriend: settings.updateFriend,
    drinkModules: selectHydration(state, new Date()).drinkModules,
    updateDrinkModule,
    reopenOnboarding: () => settings.updateProfile({ onboardingCompleted: false })
  };
}
