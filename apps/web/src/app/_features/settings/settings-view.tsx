"use client";

import { Bell, ChevronRight, Database, HeartPulse, Lock, Settings2, Share2, SlidersHorizontal, User } from "lucide-react";
import React from "react";
import type {
  AppState,
  DrinkModule,
  Friend,
  HealthIntegrationSettings,
  PlateSettings,
  SocialPrivacySettings,
  SyncQueueItem
} from "@evolvefit/shared";
import { isDrinkModuleActive, type CloudMergePreview, type RestoreSection } from "@evolvefit/shared";
import {
  AccountProfileSection,
  DataPrivacySection,
  DrinkModulesSection,
  HealthIntegrationSection,
  NotificationSettingsSection,
  PlateSettingsSection,
  ServerReadinessSection,
  SocialPrivacySection,
  SyncQueueSection
} from "./settings-sections";

export type CsvDataset = "hydration" | "creatine" | "workouts" | "body-metrics";
export type PushSubscriptionStatus = "unsupported" | "missing-env" | "unsubscribed" | "subscribed";
export type HealthDashboard = {
  requestId?: string;
  app?: string;
  version?: string;
  checkedAt?: string;
  storageAdapter?: string;
  integrations?: Record<string, string>;
};

type SettingsPanel = "profile" | "training" | "social" | "integrations" | "notifications" | "sync" | "data";

const settingsPanels: { id: SettingsPanel; label: string; summary: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "profile", label: "Hồ sơ", summary: "Tên, email, đăng nhập, tài khoản local/cloud", icon: User },
  { id: "training", label: "Tập luyện", summary: "Mục tiêu, lịch, nước, creatine, đĩa tạ", icon: SlidersHorizontal },
  { id: "social", label: "Xã hội", summary: "Bảng xếp hạng, quyền chia sẻ, bạn bè", icon: Share2 },
  { id: "integrations", label: "Tích hợp", summary: "Health Connect, Apple Health, quyền dữ liệu", icon: HeartPulse },
  { id: "notifications", label: "Thông báo", summary: "Nhắc nước, creatine, quiet hours, push", icon: Bell },
  { id: "sync", label: "Đồng bộ", summary: "Trạng thái cloud, hàng đợi, xung đột", icon: Settings2 },
  { id: "data", label: "Dữ liệu", summary: "Export, import, CSV, vùng nguy hiểm", icon: Database }
];

export function SettingsView(props: {
  state: AppState;
  updateProfile: (next: Partial<AppState["profile"]>) => void;
  signInLocal: (mode: AppState["profile"]["authMode"]) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  authResetToken: string;
  setAuthResetToken: (value: string) => void;
  cloudMergePreview: CloudMergePreview | null;
  authenticateEmail: (mode: "sign-in" | "sign-up") => void;
  startGoogleOAuth: () => void;
  refreshAuthSession: () => void;
  requestPasswordResetEmail: () => void;
  resetAccountPassword: () => void;
  mergeLocalAccountToCloud: () => void;
  replaceLocalWithCloud: () => void;
  keepLocalAccountData: () => void;
  signOutAccount: () => void;
  deleteCloudAccount: () => void;
  reset: () => void;
  deletePersonalData: () => void;
  notificationPermission: NotificationPermission;
  pushConfigured: boolean;
  pushSubscriptionStatus: PushSubscriptionStatus;
  healthDashboard: HealthDashboard | null;
  requestNotifications: () => void;
  subscribeWebPush: () => void;
  unsubscribeWebPush: () => void;
  sendTestPushNotification: () => void;
  markQueue: (status: "synced" | "failed") => void;
  retryQueueItem: (id: string) => void;
  confirmRoutineConflict: (id: string) => void;
  clearQueue: (status?: SyncQueueItem["status"]) => void;
  downloadExport: () => void;
  downloadCsvExport: (dataset?: CsvDataset) => void;
  importJsonExport: (file: File) => void;
  restoreSections: RestoreSection[];
  setRestoreSections: (sections: RestoreSection[]) => void;
  updateNotificationSettings: (next: Partial<AppState["notificationSettings"]>) => void;
  updatePlateSettings: (next: Partial<PlateSettings>) => void;
  updateSocialPrivacy: (next: Partial<SocialPrivacySettings>) => void;
  updateHealthIntegration: (next: Partial<HealthIntegrationSettings>) => void;
  requestHealthPermission: () => void;
  revokeHealthPermission: () => void;
  addFriend: () => void;
  updateFriend: (id: string, patch: Partial<Friend>) => void;
  drinkModules: DrinkModule[];
  updateDrinkModule: (id: DrinkModule["id"], patch: Partial<DrinkModule>) => void;
  reopenOnboarding: () => void;
}) {
  const creatineActive = isDrinkModuleActive(props.drinkModules, "creatine");
  const [activePanel, setActivePanel] = React.useState<SettingsPanel>("profile");

  return (
    <div className="stack settings-screen">
      <section className="settings-section-list" aria-label="Nhóm cài đặt">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cài đặt</p>
            <h2>Quản lý theo nhóm</h2>
          </div>
          <Lock size={20} />
        </div>
        {settingsPanels.map((panel) => {
          const Icon = panel.icon;
          return (
            <button key={panel.id} className={activePanel === panel.id ? "settings-section-row active" : "settings-section-row"} onClick={() => setActivePanel(panel.id)} aria-expanded={activePanel === panel.id} aria-label={panel.label}>
              <span className="settings-section-icon">
                <Icon size={18} />
              </span>
              <span className="settings-section-copy">
                <strong>{panel.label}</strong>
                <em>{panel.summary}</em>
              </span>
              <ChevronRight size={18} />
            </button>
          );
        })}
      </section>

      <section className="settings-detail-panel" aria-live="polite">
        {activePanel === "profile" && (
          <AccountProfileSection
            profile={props.state.profile}
            authPassword={props.authPassword}
            setAuthPassword={props.setAuthPassword}
            authResetToken={props.authResetToken}
            setAuthResetToken={props.setAuthResetToken}
            cloudMergePreview={props.cloudMergePreview}
            updateProfile={props.updateProfile}
            signInLocal={props.signInLocal}
            authenticateEmail={props.authenticateEmail}
            startGoogleOAuth={props.startGoogleOAuth}
            refreshAuthSession={props.refreshAuthSession}
            requestPasswordResetEmail={props.requestPasswordResetEmail}
            resetAccountPassword={props.resetAccountPassword}
            mergeLocalAccountToCloud={props.mergeLocalAccountToCloud}
            replaceLocalWithCloud={props.replaceLocalWithCloud}
            keepLocalAccountData={props.keepLocalAccountData}
            signOutAccount={props.signOutAccount}
            reopenOnboarding={props.reopenOnboarding}
          />
        )}

        {activePanel === "training" && (
          <>
            <DrinkModulesSection drinkModules={props.drinkModules} updateProfile={props.updateProfile} updateDrinkModule={props.updateDrinkModule} />
            <PlateSettingsSection plateSettings={props.state.plateSettings} updatePlateSettings={props.updatePlateSettings} />
          </>
        )}

        {activePanel === "social" && (
          <SocialPrivacySection
            leaderboardPublic={props.state.profile.leaderboardPublic}
            socialPrivacy={props.state.socialPrivacy}
            friends={props.state.friends}
            updateProfile={(next) => props.updateProfile(next)}
            updateSocialPrivacy={props.updateSocialPrivacy}
            addFriend={props.addFriend}
            updateFriend={props.updateFriend}
          />
        )}

        {activePanel === "integrations" && (
          <HealthIntegrationSection
            healthIntegration={props.state.healthIntegration}
            updateHealthIntegration={props.updateHealthIntegration}
            requestHealthPermission={props.requestHealthPermission}
            revokeHealthPermission={props.revokeHealthPermission}
          />
        )}

        {activePanel === "notifications" && (
          <NotificationSettingsSection
            notificationPermission={props.notificationPermission}
            pushConfigured={props.pushConfigured}
            pushSubscriptionStatus={props.pushSubscriptionStatus}
            notificationSettings={props.state.notificationSettings}
            creatineActive={creatineActive}
            requestNotifications={props.requestNotifications}
            subscribeWebPush={props.subscribeWebPush}
            unsubscribeWebPush={props.unsubscribeWebPush}
            sendTestPushNotification={props.sendTestPushNotification}
            updateNotificationSettings={props.updateNotificationSettings}
          />
        )}

        {activePanel === "sync" && (
          <>
            <ServerReadinessSection healthDashboard={props.healthDashboard} />
            <SyncQueueSection
              syncQueue={props.state.syncQueue}
              markQueue={props.markQueue}
              retryQueueItem={props.retryQueueItem}
              confirmRoutineConflict={props.confirmRoutineConflict}
              clearQueue={props.clearQueue}
            />
          </>
        )}

        {activePanel === "data" && (
          <DataPrivacySection
            restoreSections={props.restoreSections}
            setRestoreSections={props.setRestoreSections}
            downloadExport={props.downloadExport}
            downloadCsvExport={props.downloadCsvExport}
            importJsonExport={props.importJsonExport}
            deletePersonalData={props.deletePersonalData}
            deleteCloudAccount={props.deleteCloudAccount}
            reset={props.reset}
          />
        )}
      </section>
    </div>
  );
}
