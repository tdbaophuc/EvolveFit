"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button, Sheet } from "@/components/ui";
import type { AuthAction } from "@/features/auth/store";
import {
  canSyncHealthData,
  healthIntegrationPrivacyCopy,
  healthSyncDataTypes,
  normalizePlateInventory,
  type AppState,
  type DrinkModule,
  type HealthIntegrationSettings,
  type HealthProvider,
  type HealthSyncDataType,
  type Friend,
  type PlateSettings,
  type RestoreSection,
  type SocialPrivacySettings,
  type SyncQueueItem
} from "@evolvefit/shared";
import React from "react";
import { ConfirmActionButton } from "../ui/confirm-action-button";
import { SwitchField } from "../ui/switch-field";

type CsvDataset = "hydration" | "creatine" | "workouts" | "body-metrics";
type PushSubscriptionStatus = "unsupported" | "missing-env" | "unsubscribed" | "subscribed";
type HealthDashboard = {
  requestId?: string;
  app?: string;
  version?: string;
  checkedAt?: string;
  storageAdapter?: string;
  integrations?: Record<string, string>;
};

const restoreSectionLabels: Record<RestoreSection, string> = {
  profile: "Hồ sơ",
  hydration: "Nước & creatine",
  workouts: "Buổi tập",
  bodyMetrics: "Chỉ số cơ thể",
  settings: "Cài đặt"
};

const csvDatasetLabels: Record<CsvDataset, string> = {
  hydration: "Nước",
  creatine: "Creatine",
  workouts: "Buổi tập",
  "body-metrics": "Chỉ số cơ thể"
};

const healthDataTypeLabels: Record<HealthSyncDataType, string> = {
  weight: "Cân nặng",
  workout: "Buổi tập",
  hydration: "Nước"
};

const friendStatusLabels: Record<Friend["status"], string> = {
  pending: "Đang chờ",
  accepted: "Đã chấp nhận",
  blocked: "Đã chặn"
};

function syncQueueStatusLabel(status: SyncQueueItem["status"]) {
  if (status === "pending") return "Đang chờ";
  if (status === "syncing") return "Đang đồng bộ";
  if (status === "synced") return "Đã đồng bộ";
  if (status === "conflict") return "Xung đột";
  return "Lỗi";
}

function syncQueueItemSummary(item: SyncQueueItem) {
  const typeLabels: Record<string, string> = {
    "hydration.log": "Log nước",
    "hydration.patch": "Cập nhật log nước",
    "hydration.delete": "Xóa log nước",
    "supplement.log": "Log supplement",
    "workout.set.create": "Ghi set tập",
    "workout.set.patch": "Sửa set tập",
    "workout.set.delete": "Xóa set tập",
    "workout.session.start": "Bắt đầu buổi tập",
    "workout.session.finish": "Kết thúc buổi tập",
    "routine.update": "Cập nhật lịch tập",
    "routine.template.apply": "Áp dụng mẫu lịch"
  };
  const syncKey = item.idempotencyKey ?? item.id;
  return {
    label: typeLabels[item.type] ?? item.type,
    syncKey: syncKey.length > 34 ? `${syncKey.slice(0, 18)}...${syncKey.slice(-10)}` : syncKey
  };
}

function healthPermissionStatusLabel(status: HealthIntegrationSettings["permissionStatus"]) {
  if (status === "not_requested") return "Chưa yêu cầu";
  if (status === "requested") return "Đã lưu yêu cầu";
  if (status === "granted") return "Đã cấp quyền";
  if (status === "denied") return "Bị từ chối";
  return "Đã thu hồi";
}

function healthSyncContractLabel(settings: HealthIntegrationSettings, dataType: HealthSyncDataType) {
  return canSyncHealthData(settings, dataType) ? "Được phép theo quyền đã chọn" : "Chưa đồng bộ";
}

function authModeLabel(mode: AppState["profile"]["authMode"]) {
  if (mode === "email") return "Email";
  if (mode === "google") return "Google";
  return "Trên máy này";
}

function integrationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    configured: "Đã cấu hình",
    "missing-env": "Thiếu cấu hình",
    "rule-fallback": "Dùng luật nội bộ",
    "native-bridge-required": "Cần cầu nối ứng dụng",
    "supabase-ready": "Supabase sẵn sàng"
  };
  return labels[status] ?? status;
}

export function AccountProfileSection(props: {
  profile: AppState["profile"];
  account: string | null;
  sessionExpired: boolean;
  updateProfile: (next: Partial<AppState["profile"]>) => void;
  authPending: AuthAction | null;
  refreshAuthSession: () => void;
  signOutAccount: (options: { removeLocalData: boolean }) => void;
  reopenOnboarding: () => void;
}) {
  const busy = props.authPending !== null;
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);
  const [removeLocalData, setRemoveLocalData] = React.useState(true);
  return (
    <section className="card settings-profile-card">
      <div className="settings-profile-head">
        <div className="settings-avatar">{(props.profile.name || "A").slice(0, 1).toUpperCase()}</div>
        <div>
          <strong>{props.profile.name || "Người tập"}</strong>
          <p>{props.account ?? "Chưa đăng nhập - dữ liệu chỉ lưu trên máy này"}</p>
        </div>
        <ChevronRight size={18} />
      </div>
      <h2>Hồ sơ</h2>
      <div className="setting-row">
        <span>Tài khoản</span>
        <strong>{props.account ? (props.sessionExpired ? "Cần đăng nhập lại" : authModeLabel(props.profile.authMode)) : "Chưa đăng nhập"}</strong>
      </div>
      {props.account ? (
        <div className="auth-signed-in" aria-label="Tài khoản đã đăng nhập">
          <p>
            {props.sessionExpired ? "Phiên đăng nhập đã hết hạn. Dữ liệu vẫn được lưu trên máy." : "Dữ liệu được sao lưu và đồng bộ với tài khoản"} <strong>{props.account}</strong>.
          </p>
          <div className="split-actions">
            {props.sessionExpired ? (
              <Link className="primary-button" href={`/sign-in?email=${encodeURIComponent(props.account)}&next=/settings`}>
                Đăng nhập lại
              </Link>
            ) : (
              <button type="button" className="secondary-button" onClick={props.refreshAuthSession} disabled={busy} aria-label="refresh-auth-session">
                {props.authPending === "refresh" ? "Đang làm mới…" : "Làm mới phiên"}
              </button>
            )}
            <button type="button" className="secondary-button" onClick={() => setConfirmSignOut(true)} disabled={busy} aria-label="sign-out-cloud">
              Đăng xuất
            </button>
          </div>
        </div>
      ) : (
        <div className="auth-signed-in" aria-label="Chưa đăng nhập">
          <p>Đăng nhập để sao lưu dữ liệu và dùng trên nhiều thiết bị. Không đăng nhập thì dữ liệu chỉ nằm trên máy này.</p>
          <div className="split-actions">
            <Link className="primary-button" href="/sign-in?next=/settings">
              Đăng nhập
            </Link>
            <Link className="secondary-button" href="/sign-up?next=/settings">
              Tạo tài khoản
            </Link>
          </div>
        </div>
      )}
      <Sheet
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Đăng xuất khỏi tài khoản?"
        description="Thay đổi chưa đồng bộ trên máy này sẽ được gửi khi bạn đăng nhập lại (nếu bạn giữ dữ liệu trên máy)."
        footer={
          <Button
            fullWidth
            variant={removeLocalData ? "danger" : "primary"}
            loading={props.authPending === "sign-out"}
            onClick={() => {
              props.signOutAccount({ removeLocalData });
              setConfirmSignOut(false);
            }}
          >
            Đăng xuất
          </Button>
        }
      >
        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-6">
          <input type="checkbox" className="mt-1 size-4" checked={removeLocalData} onChange={(event) => setRemoveLocalData(event.target.checked)} />
          <span>
            Xoá dữ liệu của tài khoản khỏi thiết bị này
            <span className="block text-sm leading-5 text-muted-foreground">Nên bật nếu đây là máy dùng chung. Dữ liệu đã đồng bộ vẫn còn trên tài khoản.</span>
          </span>
        </label>
      </Sheet>
      <button className="secondary-button export-button" onClick={props.reopenOnboarding}>
        Mở lại thiết lập
      </button>
      <label className="setting-row">
        <span>Mục tiêu nước</span>
        <input
          type="number"
          value={props.profile.waterTargetMl}
          onChange={(event) => props.updateProfile({ waterTargetMl: Number(event.target.value) })}
        />
      </label>
      <label className="setting-row">
        <span>Giờ uống creatine</span>
        <input
          type="number"
          min="0"
          max="23"
          value={props.profile.creatineHour}
          onChange={(event) => props.updateProfile({ creatineHour: Number(event.target.value) })}
        />
      </label>
      <label className="setting-row">
        <span>Nhắc trước</span>
        <input
          type="number"
          min="0"
          max="120"
          value={props.profile.remindBeforeMinutes}
          onChange={(event) => props.updateProfile({ remindBeforeMinutes: Number(event.target.value) })}
        />
      </label>
    </section>
  );
}

function notificationPermissionLabel(status: NotificationPermission) {
  if (status === "granted") return "Đã cấp quyền";
  if (status === "denied") return "Bị từ chối";
  return "Chưa hỏi quyền";
}

function pushSubscriptionStatusLabel(status: PushSubscriptionStatus) {
  if (status === "unsupported") return "Không hỗ trợ";
  if (status === "missing-env") return "Thiếu cấu hình";
  if (status === "subscribed") return "Đã đăng ký";
  return "Chưa đăng ký";
}

function parseHours(value: string): number[] {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)
    .filter((hour, index, list) => list.indexOf(hour) === index)
    .sort((a, b) => a - b);
}

export function NotificationSettingsSection(props: {
  notificationPermission: NotificationPermission;
  pushConfigured: boolean;
  pushSubscriptionStatus: PushSubscriptionStatus;
  notificationSettings: AppState["notificationSettings"];
  creatineActive: boolean;
  requestNotifications: () => void;
  subscribeWebPush: () => void;
  unsubscribeWebPush: () => void;
  sendTestPushNotification: () => void;
  updateNotificationSettings: (next: Partial<AppState["notificationSettings"]>) => void;
}) {
  const [showNotificationAdvanced, setShowNotificationAdvanced] = React.useState(false);

  function snooze(minutes: number) {
    props.updateNotificationSettings({ snoozeUntil: new Date(Date.now() + minutes * 60000).toISOString() });
  }

  return (
    <section className="card">
      <h2>Thông báo</h2>
      <div className="setting-row">
        <span>Quyền trình duyệt</span>
        <strong>{notificationPermissionLabel(props.notificationPermission)}</strong>
      </div>
      <button className="secondary-button export-button" onClick={props.requestNotifications}>
        Bật thông báo
      </button>
      <div className="setting-row">
        <span>Môi trường Web Push</span>
        <strong>{props.pushConfigured ? "đã cấu hình" : "dùng dự phòng"}</strong>
      </div>
      <div className="setting-row">
        <span>Đăng ký push</span>
        <strong>{pushSubscriptionStatusLabel(props.pushSubscriptionStatus)}</strong>
      </div>
      <div className="split-actions">
        <button className="secondary-button" onClick={props.subscribeWebPush} disabled={props.notificationPermission !== "granted" || props.pushSubscriptionStatus === "subscribed"}>
          Đăng ký push
        </button>
        <button className="secondary-button" onClick={props.unsubscribeWebPush} disabled={props.pushSubscriptionStatus !== "subscribed"}>
          Hủy đăng ký push
        </button>
      </div>
      <button className="secondary-button export-button" onClick={props.sendTestPushNotification}>
        Gửi thông báo thử
      </button>
      <button className="secondary-button disclosure-toggle" onClick={() => setShowNotificationAdvanced(!showNotificationAdvanced)} aria-expanded={showNotificationAdvanced}>
        {showNotificationAdvanced ? "Ẩn lịch nhắc nâng cao" : "Cấu hình lịch nhắc"}
      </button>
      {showNotificationAdvanced && (
        <>
          <SwitchField
            label="Nhắc uống nước"
            checked={props.notificationSettings.hydrationEnabled}
            onChange={(checked) => props.updateNotificationSettings({ hydrationEnabled: checked })}
          />
          <div className="settings-inline-grid">
            <label>
              <span>Chế độ nhắc nước</span>
              <select
                value={props.notificationSettings.hydrationMode}
                onChange={(event) => props.updateNotificationSettings({ hydrationMode: event.target.value as AppState["notificationSettings"]["hydrationMode"] })}
              >
                <option value="interval">Theo khoảng cách</option>
                <option value="fixed">Giờ cố định</option>
              </select>
            </label>
            <label>
              <span>Giờ cố định</span>
              <input
                value={props.notificationSettings.hydrationTimes.join(", ")}
                onChange={(event) => props.updateNotificationSettings({ hydrationTimes: parseHours(event.target.value) })}
                aria-label="Giờ nhắc nước cố định"
              />
            </label>
            <label>
              <span>Khoảng cách giờ</span>
              <input
                type="number"
                min="1"
                max="8"
                step="0.5"
                value={props.notificationSettings.hydrationIntervalHours}
                onChange={(event) => props.updateNotificationSettings({ hydrationIntervalHours: Number(event.target.value) })}
              />
            </label>
          </div>
          <SwitchField
            label="Nhắc creatine"
            checked={props.creatineActive && props.notificationSettings.creatineEnabled}
            disabled={!props.creatineActive}
            onChange={(checked) => props.updateNotificationSettings({ creatineEnabled: checked })}
          />
          <div className="settings-inline-grid">
            <label>
              <span>Chế độ nhắc creatine</span>
              <select
                value={props.notificationSettings.creatineMode}
                disabled={!props.creatineActive}
                onChange={(event) => props.updateNotificationSettings({ creatineMode: event.target.value as AppState["notificationSettings"]["creatineMode"] })}
              >
                <option value="fixed">Giờ cố định</option>
                <option value="interval">Theo khoảng cách</option>
              </select>
            </label>
            <label>
              <span>Giờ cố định</span>
              <input
                value={props.notificationSettings.creatineTimes.join(", ")}
                disabled={!props.creatineActive}
                onChange={(event) => props.updateNotificationSettings({ creatineTimes: parseHours(event.target.value) })}
                aria-label="Giờ nhắc creatine cố định"
              />
            </label>
            <label>
              <span>Khoảng cách giờ</span>
              <input
                type="number"
                min="1"
                max="24"
                value={props.notificationSettings.creatineIntervalHours}
                disabled={!props.creatineActive}
                onChange={(event) => props.updateNotificationSettings({ creatineIntervalHours: Number(event.target.value) })}
              />
            </label>
          </div>
          <SwitchField
            label="Giờ yên lặng"
            checked={props.notificationSettings.quietHoursEnabled}
            onChange={(checked) => props.updateNotificationSettings({ quietHoursEnabled: checked })}
          />
          <div className="settings-inline-grid">
            <label>
              <span>Bắt đầu yên lặng</span>
              <input
                type="number"
                min="0"
                max="23"
                value={props.notificationSettings.quietHoursStart}
                onChange={(event) => props.updateNotificationSettings({ quietHoursStart: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Kết thúc yên lặng</span>
              <input
                type="number"
                min="0"
                max="23"
                value={props.notificationSettings.quietHoursEnd}
                onChange={(event) => props.updateNotificationSettings({ quietHoursEnd: Number(event.target.value) })}
              />
            </label>
            <SwitchField
              className="compact-toggle"
              label="Dự phòng trong app"
              checked={props.notificationSettings.inAppFallbackEnabled}
              onChange={(checked) => props.updateNotificationSettings({ inAppFallbackEnabled: checked })}
            />
          </div>
          <div className="split-actions">
            <button className="secondary-button" onClick={() => snooze(30)}>
              Tạm hoãn 30 phút
            </button>
            <button className="secondary-button" onClick={() => snooze(120)}>
              Tạm hoãn 2 giờ
            </button>
          </div>
          <button className="secondary-button export-button" onClick={() => props.updateNotificationSettings({ snoozeUntil: undefined })}>
            Xóa tạm hoãn {props.notificationSettings.snoozeUntil ? `(${new Date(props.notificationSettings.snoozeUntil).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})` : ""}
          </button>
        </>
      )}
      <p className="privacy-note">Web Push thật cần thông tin xác thực VAPID/FCM; app hiện đã có dịch vụ nền và API đăng ký thông báo.</p>
    </section>
  );
}

export function HealthIntegrationSection(props: {
  healthIntegration: HealthIntegrationSettings;
  updateHealthIntegration: (next: Partial<HealthIntegrationSettings>) => void;
  requestHealthPermission: () => void;
  revokeHealthPermission: () => void;
}) {
  const healthPrivacyCopy = healthIntegrationPrivacyCopy(props.healthIntegration);

  function toggleHealthDataType(dataType: HealthSyncDataType, enabled: boolean) {
    const selectedDataTypes = enabled
      ? Array.from(new Set([...props.healthIntegration.selectedDataTypes, dataType]))
      : props.healthIntegration.selectedDataTypes.filter((selected) => selected !== dataType);
    props.updateHealthIntegration({ selectedDataTypes });
  }

  return (
    <section className="card">
      <h2>Quyền nền tảng sức khỏe</h2>
      <p className="privacy-note">{healthPrivacyCopy}</p>
      <div className="settings-inline-grid">
        <label>
          <span>Nền tảng</span>
          <select
            value={props.healthIntegration.provider}
            onChange={(event) => props.updateHealthIntegration({ provider: event.target.value as HealthProvider, permissionStatus: "not_requested" })}
          >
            <option value="health-connect">Health Connect</option>
            <option value="apple-health">Apple Health</option>
          </select>
        </label>
        <label>
          <span>Đơn vị cân nặng</span>
          <select
            value={props.healthIntegration.unitMapping.weight}
            onChange={(event) =>
              props.updateHealthIntegration({
                unitMapping: { ...props.healthIntegration.unitMapping, weight: event.target.value as HealthIntegrationSettings["unitMapping"]["weight"] }
              })
            }
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <label>
          <span>Đơn vị nước</span>
          <select
            value={props.healthIntegration.unitMapping.hydration}
            onChange={(event) =>
              props.updateHealthIntegration({
                unitMapping: { ...props.healthIntegration.unitMapping, hydration: event.target.value as HealthIntegrationSettings["unitMapping"]["hydration"] }
              })
            }
          >
            <option value="ml">ml</option>
            <option value="oz">oz</option>
          </select>
        </label>
        <label>
          <span>Quãng đường tập luyện</span>
          <select
            value={props.healthIntegration.unitMapping.workoutDistance}
            onChange={(event) =>
              props.updateHealthIntegration({
                unitMapping: { ...props.healthIntegration.unitMapping, workoutDistance: event.target.value as HealthIntegrationSettings["unitMapping"]["workoutDistance"] }
              })
            }
          >
            <option value="km">km</option>
            <option value="mi">mi</option>
          </select>
        </label>
      </div>
      <div className="restore-section-grid" aria-label="Điều khiển loại dữ liệu sức khỏe">
        {healthSyncDataTypes.map((dataType) => (
          <SwitchField
            key={dataType}
            className="compact-toggle"
            label={`Đồng bộ ${healthDataTypeLabels[dataType].toLowerCase()}`}
            checked={props.healthIntegration.selectedDataTypes.includes(dataType)}
            onChange={(checked) => toggleHealthDataType(dataType, checked)}
          />
        ))}
        <SwitchField
          className="compact-toggle"
          label="Đồng ý quyền riêng tư sức khỏe"
          checked={props.healthIntegration.privacyAccepted}
          onChange={(checked) => props.updateHealthIntegration({ privacyAccepted: checked })}
        />
      </div>
      <div className="readiness-list">
        <span>Quyền: {healthPermissionStatusLabel(props.healthIntegration.permissionStatus)}</span>
        <span>Cầu nối ứng dụng: {props.healthIntegration.nativeBridgeAvailable ? "khả dụng" : "cần thiết"}</span>
        {healthSyncDataTypes.map((dataType) => (
          <span key={dataType}>
            {healthDataTypeLabels[dataType]}: {healthSyncContractLabel(props.healthIntegration, dataType)}
          </span>
        ))}
      </div>
      <div className="split-actions">
        <button className="secondary-button" onClick={props.requestHealthPermission} disabled={!props.healthIntegration.selectedDataTypes.length}>
          Yêu cầu quyền sức khỏe
        </button>
        <ConfirmActionButton
          className="secondary-button danger-button"
          label="Thu hồi quyền sức khỏe"
          confirmLabel="Xác nhận thu hồi"
          ariaLabel="Thu hồi quyền sức khỏe"
          onConfirm={props.revokeHealthPermission}
        />
      </div>
    </section>
  );
}

export function SocialPrivacySection(props: {
  leaderboardPublic: boolean;
  socialPrivacy: SocialPrivacySettings;
  friends: Friend[];
  updateProfile: (next: { leaderboardPublic: boolean }) => void;
  updateSocialPrivacy: (next: Partial<SocialPrivacySettings>) => void;
  addFriend: () => void;
  updateFriend: (id: string, patch: Partial<Friend>) => void;
}) {
  const socialPrivacyControls: [keyof SocialPrivacySettings, string][] = [
    ["friendLeaderboardEnabled", "Bảng xếp hạng bạn bè"],
    ["shareBadges", "Chia sẻ huy hiệu"],
    ["shareWorkoutSummaries", "Chia sẻ tóm tắt tập luyện"],
    ["shareWorkoutDetails", "Đồng ý chia sẻ chi tiết tập"],
    ["shareBodyMetrics", "Đồng ý chia sẻ chỉ số cơ thể"]
  ];

  return (
    <>
      <section className="card">
        <h2>Quyền riêng tư</h2>
        <SwitchField
          label="Tham gia bảng xếp hạng"
          checked={props.leaderboardPublic}
          onChange={(checked) => props.updateProfile({ leaderboardPublic: checked })}
        />
        <p className="privacy-note">Mặc định riêng tư. Bảng xếp hạng chỉ hiển thị tên, ảnh đại diện, thứ hạng và huy hiệu chuỗi.</p>
      </section>
      <section className="card">
        <h2>Quyền riêng tư xã hội</h2>
        <p className="privacy-note">Mặc định riêng tư. Chia sẻ cần bật quyền trước và không bao giờ gồm cân nặng, mỡ cơ thể, email hoặc chi tiết bài tập trừ khi đúng quyền đó được bật.</p>
        <div className="restore-section-grid" aria-label="Điều khiển quyền riêng tư xã hội">
          {socialPrivacyControls.map(([key, label]) => (
            <SwitchField
              key={key}
              className="compact-toggle"
              label={label}
              checked={Boolean(props.socialPrivacy[key])}
              onChange={(checked) => props.updateSocialPrivacy({ [key]: checked } as Partial<SocialPrivacySettings>)}
            />
          ))}
        </div>
        <div className="section-heading">
          <h3>Bạn bè</h3>
          <button className="secondary-button" onClick={props.addFriend}>Thêm bạn</button>
        </div>
        <div className="leaderboard">
          {props.friends.map((friend) => (
            <div key={friend.id}>
              <span>{friendStatusLabels[friend.status]}</span>
              <strong>{friend.displayName}</strong>
              <em>{friend.handle} - {friend.score} điểm</em>
              <div className="split-actions">
                <button className="secondary-button" onClick={() => props.updateFriend(friend.id, { status: "accepted" })}>Chấp nhận</button>
                <ConfirmActionButton
                  className="secondary-button danger-button"
                  label="Chặn"
                  confirmLabel="Xác nhận chặn"
                  ariaLabel={`Chặn ${friend.displayName}`}
                  onConfirm={() => props.updateFriend(friend.id, { status: "blocked" })}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function PlateSettingsSection(props: {
  plateSettings: PlateSettings;
  updatePlateSettings: (next: Partial<PlateSettings>) => void;
}) {
  function parsePlateInventory(value: string): number[] {
    return normalizePlateInventory(
      value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((plate) => Number.isFinite(plate) && plate > 0)
    );
  }

  return (
    <section className="card">
      <h2>Bộ tính đĩa tạ</h2>
      <div className="settings-inline-grid">
        <label>
          <span>Thanh đòn</span>
          <select
            value={props.plateSettings.barbellDefault}
            onChange={(event) => props.updatePlateSettings({ barbellDefault: event.target.value as PlateSettings["barbellDefault"] })}
          >
            <option value="20kg">20kg</option>
            <option value="15kg">15kg</option>
            <option value="custom">Tùy chỉnh</option>
          </select>
        </label>
        <label>
          <span>Thanh tùy chỉnh kg</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={props.plateSettings.customBarbellKg}
            disabled={props.plateSettings.barbellDefault !== "custom"}
            onChange={(event) => props.updatePlateSettings({ customBarbellKg: Number(event.target.value) })}
          />
        </label>
        <label className="wide-field">
          <span>Đĩa tạ hiện có kg</span>
          <input
            value={props.plateSettings.plateInventoryKg.join(", ")}
            onChange={(event) => props.updatePlateSettings({ plateInventoryKg: parsePlateInventory(event.target.value) })}
            aria-label="Đĩa tạ hiện có kg"
          />
        </label>
      </div>
      <p className="privacy-note">Buổi tập live dùng cấu hình này để hiển thị đĩa mỗi bên từ tạ mục tiêu hoặc tạ đang ghi.</p>
    </section>
  );
}

export function DrinkModulesSection(props: {
  drinkModules: DrinkModule[];
  updateProfile: (next: Partial<AppState["profile"]>) => void;
  updateDrinkModule: (id: DrinkModule["id"], patch: Partial<DrinkModule>) => void;
}) {
  function updateModuleGoal(module: DrinkModule, goal: number) {
    if (module.id === "water") {
      props.updateProfile({ waterTargetMl: goal });
      return;
    }
    if (module.id === "creatine") {
      props.updateProfile({ creatineAmountG: goal });
      return;
    }
    props.updateDrinkModule(module.id, { goal });
  }

  return (
    <section className="card">
      <h2>Thức uống & bổ sung</h2>
      <div className="readiness-list drink-module-list">
        {props.drinkModules.map((module) => (
          <div key={module.id} className="drink-module-row">
            <SwitchField
              label={module.name}
              helpText={module.id === "water" ? "Chính" : module.category === "drink" ? "Thức uống" : "Bổ sung"}
              checked={module.id === "water" ? true : module.active}
              disabled={module.id === "water"}
              onChange={(checked) => props.updateDrinkModule(module.id, { active: checked })}
            />
            <div className="settings-inline-grid">
              <label>
                <span>{module.unit === "ml" ? "Mục tiêu ml" : "Mục tiêu g"}</span>
                <input type="number" min="0" value={module.goal} onChange={(event) => updateModuleGoal(module, Number(event.target.value))} />
              </label>
              {module.category === "drink" && (
                <label>
                  <span>Hệ số tính nước</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={module.hydrationFactor ?? 0}
                    disabled={!module.active}
                    onChange={(event) => props.updateDrinkModule(module.id, { hydrationFactor: Number(event.target.value) })}
                  />
                </label>
              )}
              <SwitchField
                className="compact-toggle"
                label="Nhắc"
                checked={module.reminderEnabled}
                disabled={module.id === "water" || !module.active}
                onChange={(checked) => props.updateDrinkModule(module.id, { reminderEnabled: checked })}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="privacy-note">Nước luôn là thức uống chính; module tắt sẽ rời khỏi UI hằng ngày nhưng dữ liệu cũ vẫn nằm trong bản xuất.</p>
    </section>
  );
}

export function ServerReadinessSection(props: { healthDashboard: HealthDashboard | null }) {
  return (
    <section className="card">
      <h2>Sẵn sàng máy chủ</h2>
      <div className="readiness-list">
        <span>Lưu trữ: {props.healthDashboard?.storageAdapter ?? "đang kiểm tra"}</span>
        <span>Mã yêu cầu: {props.healthDashboard?.requestId ?? "đang kiểm tra"}</span>
        <span>
          Đã kiểm tra:{" "}
          {props.healthDashboard?.checkedAt
            ? new Date(props.healthDashboard.checkedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
            : "đang kiểm tra"}
        </span>
        {Object.entries(props.healthDashboard?.integrations ?? {}).map(([name, status]) => (
          <span key={name}>
            {name}: {integrationStatusLabel(status)}
          </span>
        ))}
      </div>
    </section>
  );
}

export function SyncQueueSection(props: {
  syncQueue: SyncQueueItem[];
  markQueue: (status: "synced" | "failed") => void;
  retryQueueItem: (id: string) => void;
  confirmRoutineConflict: (id: string) => void;
  clearQueue: (status?: SyncQueueItem["status"]) => void;
}) {
  const [showQueueDetails, setShowQueueDetails] = React.useState(false);
  const pendingQueue = props.syncQueue.filter((item) => item.status === "pending" || item.status === "syncing").length;
  const syncedQueue = props.syncQueue.filter((item) => item.status === "synced").length;
  const failedQueue = props.syncQueue.filter((item) => item.status === "failed" || item.status === "conflict").length;
  const needsAttention = failedQueue > 0 || pendingQueue > 0;

  return (
    <section className="card">
      <h2>Hàng đợi đồng bộ ngoại tuyến</h2>
      <div className="readiness-list">
        <span>{pendingQueue} đang chờ</span>
        <span>{syncedQueue} đã đồng bộ</span>
        <span>{failedQueue} lỗi</span>
      </div>
      <div className="split-actions">
        <button className="secondary-button" onClick={() => props.markQueue("synced")} disabled={!pendingQueue}>
          Thử lại / đánh dấu đã đồng bộ
        </button>
        <button className="secondary-button" onClick={() => props.markQueue("failed")} disabled={!pendingQueue}>
          Đánh dấu lỗi
        </button>
      </div>
      <div className="split-actions">
        <button className="secondary-button" onClick={() => props.clearQueue("synced")} disabled={!syncedQueue}>
          Xóa mục đã đồng bộ
        </button>
        <button className="secondary-button" onClick={() => props.clearQueue("failed")} disabled={!failedQueue}>
          Xóa mục lỗi
        </button>
        <button className="secondary-button" onClick={() => props.clearQueue("conflict")} disabled={!props.syncQueue.some((item) => item.status === "conflict")}>
          Xóa xung đột
        </button>
      </div>
      <button className="secondary-button disclosure-toggle" onClick={() => setShowQueueDetails(!showQueueDetails)} aria-expanded={showQueueDetails}>
        {showQueueDetails ? "Ẩn chi tiết hàng đợi" : needsAttention ? "Xem mục cần xử lý" : "Xem chi tiết hàng đợi"}
      </button>
      {showQueueDetails && (
        <div className="sync-preview">
          {props.syncQueue.map((item) => (
            <div key={item.id}>
              <span>{syncQueueStatusLabel(item.status)}</span>
              <strong>{syncQueueItemSummary(item).label}</strong>
              <em>
                {item.attempts ?? 0} lần thử
                {item.nextRetryAt ? ` - thử lại ${new Date(item.nextRetryAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </em>
              {item.lastError && <small>{item.lastError}</small>}
              {item.conflict && (
                <small>
                  Xung đột: {item.conflict.message}. Hãy xác nhận cách xử lý trước khi đồng bộ lại.
                </small>
              )}
              <small>Mã đồng bộ: {syncQueueItemSummary(item).syncKey}</small>
              <div className="split-actions">
                <button className="secondary-button" onClick={() => props.retryQueueItem(item.id)} disabled={item.status === "pending" || item.status === "syncing"}>
                  Thử lại
                </button>
                <button className="secondary-button" onClick={() => props.confirmRoutineConflict(item.id)} disabled={item.status !== "conflict"}>
                  Xác nhận lịch tập
                </button>
              </div>
            </div>
          ))}
          {!props.syncQueue.length && <div>Không có thay đổi nào trong hàng đợi</div>}
        </div>
      )}
      <p className="privacy-note">Hàng đợi hiện lưu trên máy trước để chuẩn bị đồng bộ máy chủ và xử lý thử lại/xung đột ở môi trường thật.</p>
    </section>
  );
}

export function DataPrivacySection(props: {
  restoreSections: RestoreSection[];
  setRestoreSections: (sections: RestoreSection[]) => void;
  downloadExport: () => void;
  downloadCsvExport: (dataset?: CsvDataset) => void;
  importJsonExport: (file: File) => void;
  deletePersonalData: () => void;
  deleteCloudAccount: () => void;
  reset: () => void;
}) {
  const [showRestoreOptions, setShowRestoreOptions] = React.useState(false);
  const [showCsvExports, setShowCsvExports] = React.useState(false);
  const [showDangerActions, setShowDangerActions] = React.useState(false);

  function toggleRestoreSection(section: RestoreSection, checked: boolean) {
    props.setRestoreSections(
      checked
        ? [...props.restoreSections, section].filter((item, index, list) => list.indexOf(item) === index)
        : props.restoreSections.filter((item) => item !== section)
    );
  }

  return (
    <section className="card">
      <h2>Dữ liệu & quyền riêng tư</h2>
      <p className="privacy-note">Xuất JSON gồm thông tin phiên bản, thời điểm xuất, phiên bản dữ liệu và mã hồ sơ trên máy. Nhập JSON được kiểm tra trước khi khôi phục nên file sai không ghi đè dữ liệu hiện tại.</p>
      <div className="settings-actions">
        <button className="secondary-button" onClick={props.downloadExport}>
          Xuất JSON
        </button>
        <button className="secondary-button" onClick={() => props.downloadCsvExport()}>
          Xuất tất cả CSV
        </button>
        <label className="secondary-button import-button">
          Nhập JSON
          <input type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && props.importJsonExport(event.target.files[0])} />
        </label>
      </div>
      <div className="danger-zone">
        <div>
          <h3>Vùng nguy hiểm</h3>
          <p className="privacy-note">Xuất JSON trước nếu bạn cần bản sao lưu. Các thao tác bên dưới có thể xóa dữ liệu trên máy hoặc tài khoản cloud.</p>
        </div>
        <button className="secondary-button danger-button disclosure-toggle" onClick={() => setShowDangerActions(!showDangerActions)} aria-expanded={showDangerActions}>
          {showDangerActions ? "Ẩn vùng nguy hiểm" : "Mở vùng nguy hiểm"}
        </button>
        {showDangerActions && (
          <div className="settings-actions">
        <ConfirmActionButton
          className="secondary-button danger-button"
          label="Xóa dữ liệu cá nhân"
          confirmLabel="Xác nhận xóa"
          ariaLabel="Xóa dữ liệu cá nhân"
          onConfirm={props.deletePersonalData}
        />
        <ConfirmActionButton
          className="secondary-button danger-button"
          label="Xóa tài khoản cloud"
          confirmLabel="Xác nhận xóa"
          ariaLabel="delete-cloud-account"
          onConfirm={props.deleteCloudAccount}
        />
        <ConfirmActionButton
          className="secondary-button danger-button"
          label="Đặt lại dữ liệu demo"
          confirmLabel="Xác nhận đặt lại"
          ariaLabel="Đặt lại dữ liệu demo"
          onConfirm={props.reset}
        />
          </div>
        )}
      </div>
      <button className="secondary-button disclosure-toggle" onClick={() => setShowRestoreOptions(!showRestoreOptions)} aria-expanded={showRestoreOptions}>
        {showRestoreOptions ? "Ẩn nhóm khôi phục" : "Chọn nhóm khôi phục"}
      </button>
      {showRestoreOptions && (
        <div className="restore-section-grid" aria-label="Chọn nhóm dữ liệu khôi phục">
          {(Object.entries(restoreSectionLabels) as [RestoreSection, string][]).map(([section, label]) => (
            <label key={section} className="toggle-row compact-toggle">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={props.restoreSections.includes(section)}
                onChange={(event) => toggleRestoreSection(section, event.target.checked)}
              />
            </label>
          ))}
        </div>
      )}
      <p className="privacy-note">Bảng xếp hạng mặc định tắt; khi bật chỉ gửi trạng thái công khai cho hồ sơ xếp hạng. Dữ liệu cá nhân như email, số đo cơ thể, lịch sử uống nước và buổi tập chỉ nằm trên máy hoặc trong file JSON xuất ra cho đến khi bạn khôi phục hoặc xóa.</p>
      <button className="secondary-button disclosure-toggle" onClick={() => setShowCsvExports(!showCsvExports)} aria-expanded={showCsvExports}>
        {showCsvExports ? "Ẩn xuất CSV từng nhóm" : "Xuất CSV từng nhóm"}
      </button>
      {showCsvExports && (
        <div className="dataset-export-grid" aria-label="Xuất CSV theo nhóm dữ liệu">
          {(Object.entries(csvDatasetLabels) as [CsvDataset, string][]).map(([dataset, label]) => (
            <button key={dataset} onClick={() => props.downloadCsvExport(dataset)}>
              <span>{label}</span>
              <em>CSV</em>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
