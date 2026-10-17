import {
  applySelectiveRestore,
  cryptoSafeId,
  deletePersonalData,
  latestBodyMetric,
  markSyncQueue,
  normalizeDrinkModules,
  normalizePlateInventory,
  parseImportedAppData,
  requestHealthIntegrationPermission,
  revokeHealthIntegrationPermission,
  stringifyAppDataExport,
  toCsv,
  type AppState,
  type BodyMetric,
  type Friend,
  type HealthIntegrationSettings,
  type PlateSettings,
  type RestoreSection,
  type SocialPrivacySettings,
  type SyncQueueItem
} from "@evolvefit/shared";
import { commit, commitSynced, currentState, notify } from "@/lib/store/app-store";
import { resetState } from "@/lib/storage";
import type { CsvDataset } from "@/app/_features/settings/settings-view";

export function updateProfile(next: Partial<AppState["profile"]>) {
  const state = currentState();
  const nextProfile = { ...state.profile, ...next };
  const nextDrinkModules = normalizeDrinkModules(state.drinkModules, nextProfile.waterTargetMl, nextProfile.creatineAmountG).map((module) => {
    if (module.id === "water" && next.waterTargetMl !== undefined) return { ...module, goal: nextProfile.waterTargetMl };
    if (module.id === "creatine" && next.creatineAmountG !== undefined) return { ...module, goal: nextProfile.creatineAmountG };
    return module;
  });
  commit({ ...state, profile: nextProfile, drinkModules: nextDrinkModules });
}

export function updateNotificationSettings(next: Partial<AppState["notificationSettings"]>) {
  commit((state) => ({ ...state, notificationSettings: { ...state.notificationSettings, ...next } }));
}

export function updateSocialPrivacy(next: Partial<SocialPrivacySettings>) {
  const state = currentState();
  const socialPrivacy = { ...state.socialPrivacy, ...next };
  commitSynced({ ...state, socialPrivacy }, "social.privacy.update", socialPrivacy, "Đã cập nhật quyền riêng tư");
}

export function updateHealthIntegration(next: Partial<HealthIntegrationSettings>) {
  const state = currentState();
  const healthIntegration = { ...state.healthIntegration, ...next };
  commitSynced({ ...state, healthIntegration }, "health.permission.update", healthIntegration, "Đã cập nhật quyền sức khỏe");
}

export function requestHealthPermission() {
  const state = currentState();
  const healthIntegration = requestHealthIntegrationPermission(state.healthIntegration, state.healthIntegration.selectedDataTypes);
  commitSynced({ ...state, healthIntegration }, "health.permission.request", healthIntegration, "Đã lưu yêu cầu quyền sức khỏe");
  if (!healthIntegration.nativeBridgeAvailable) notify("Đã lưu lựa chọn quyền sức khỏe. Cần cầu nối ứng dụng trước khi đồng bộ.");
}

export function revokeHealthPermission() {
  const state = currentState();
  const healthIntegration = revokeHealthIntegrationPermission(state.healthIntegration);
  commitSynced({ ...state, healthIntegration }, "health.permission.revoke", healthIntegration, "Đã thu hồi quyền sức khỏe");
}

export function addFriend() {
  const state = currentState();
  const friend: Friend = {
    id: cryptoSafeId(),
    displayName: "New friend",
    handle: `@friend${state.friends.length + 1}`,
    status: "pending",
    badgeStreakMonths: 0,
    score: 0,
    addedAt: new Date().toISOString()
  };
  commitSynced({ ...state, friends: [friend, ...state.friends] }, "social.friend.add", friend, "Đã thêm lời mời kết bạn");
}

export function updateFriend(id: string, patch: Partial<Friend>) {
  const state = currentState();
  commitSynced(
    { ...state, friends: state.friends.map((friend) => (friend.id === id ? { ...friend, ...patch } : friend)) },
    "social.friend.update",
    { id, patch },
    "Đã cập nhật bạn bè"
  );
}

export function updatePlateSettings(next: Partial<PlateSettings>) {
  commit((state) => ({
    ...state,
    plateSettings: {
      ...state.plateSettings,
      ...next,
      plateInventoryKg: next.plateInventoryKg ? normalizePlateInventory(next.plateInventoryKg) : state.plateSettings.plateInventoryKg
    }
  }));
}

export function completeOnboarding() {
  const state = currentState();
  const { profile } = state;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email);
  const hoursOk = profile.wakeHour >= 0 && profile.wakeHour <= 23 && profile.sleepHour >= 0 && profile.sleepHour <= 23 && profile.wakeHour !== profile.sleepHour;
  const equipmentOk = Boolean(profile.availableEquipment?.length);
  if (!profile.name.trim() || !emailOk || profile.waterTargetMl < 1000 || profile.waterTargetMl > 6000 || !hoursOk || profile.workoutDays.length < 1 || !equipmentOk) {
    notify("Onboarding chưa hợp lệ: kiểm tra email, mục tiêu nước, giờ ngủ/dậy và ngày tập");
    return;
  }
  const metric: BodyMetric = {
    id: cryptoSafeId(),
    measuredAt: new Date().toISOString(),
    weightKg: profile.bodyWeightKg,
    heightCm: profile.heightCm,
    bodyFatPercent: latestBodyMetric(state.bodyMetrics)?.bodyFatPercent
  };
  commitSynced(
    { ...state, profile: { ...profile, onboardingCompleted: true }, bodyMetrics: [...state.bodyMetrics, metric] },
    "onboarding.complete",
    { profile, bodyMetric: metric },
    "Onboarding hoàn tất"
  );
}

// --- Sync queue maintenance ---------------------------------------------------------------------

export function markQueue(status: "synced" | "failed") {
  commit((state) => ({ ...state, syncQueue: markSyncQueue(state.syncQueue, status) }), status === "synced" ? "Đã đánh dấu đồng bộ xong" : "Đã đánh dấu đồng bộ lỗi");
}

export function retryQueueItem(id: string) {
  commit(
    (state) => ({
      ...state,
      syncQueue: state.syncQueue.map((item) =>
        item.id === id ? { ...item, status: "pending", nextRetryAt: undefined, lastError: undefined, updatedAt: new Date().toISOString() } : item
      )
    }),
    "Đã đưa mục vào hàng đợi thử lại"
  );
}

export function confirmRoutineConflict(id: string) {
  commit(
    (state) => ({
      ...state,
      syncQueue: state.syncQueue.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "pending",
              payload: { ...(item.payload as Record<string, unknown>), conflictResolution: "confirm" },
              conflict: undefined,
              lastError: undefined,
              nextRetryAt: undefined,
              updatedAt: new Date().toISOString()
            }
          : item
      )
    }),
    "Đã xác nhận lịch tập để đồng bộ"
  );
}

export function syncQueueStatusLabel(status: SyncQueueItem["status"]) {
  if (status === "pending") return "Đang chờ";
  if (status === "syncing") return "Đang đồng bộ";
  if (status === "synced") return "Đã đồng bộ";
  if (status === "failed") return "Lỗi";
  return "Xung đột";
}

export function clearQueue(status?: SyncQueueItem["status"]) {
  commit(
    (state) => ({ ...state, syncQueue: status ? state.syncQueue.filter((item) => item.status !== status) : [] }),
    status ? `Đã xóa mục ${syncQueueStatusLabel(status).toLowerCase()} trong hàng đợi` : "Đã xóa toàn bộ hàng đợi đồng bộ"
  );
}

// --- Data export / import ---------------------------------------------------------------------

export function downloadFile(content: string, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadExport() {
  downloadFile(stringifyAppDataExport(currentState(), new Date(), process.env.NEXT_PUBLIC_APP_VERSION), "application/json", "evolvefit-export.json");
}

export function downloadCsvExport(dataset?: CsvDataset) {
  const state = currentState();
  const datasets: Record<CsvDataset, Record<string, unknown>[]> = {
    hydration: state.hydrationLogs.map((row) => ({ ...row })),
    creatine: state.supplementLogs.filter((row) => row.name === "Creatine").map((row) => ({ ...row })),
    workouts: state.workoutSets.map((row) => ({ ...row })),
    "body-metrics": state.bodyMetrics.map((row) => ({ ...row }))
  };
  const selected = dataset ? ([[dataset, datasets[dataset]]] as const) : Object.entries(datasets);
  selected.forEach(([name, rows]) => downloadFile(toCsv(rows), "text/csv", `evolvefit-${name}.csv`));
}

function readTextFile(file: File) {
  if (typeof file.text === "function") return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function importJsonExport(file: File, restoreSections: RestoreSection[]) {
  readTextFile(file)
    .then((text) => {
      const imported = parseImportedAppData(text);
      if (!imported.ok) {
        notify(`Import JSON không hợp lệ: ${imported.errors[0]}`);
        return;
      }
      if (!restoreSections.length) {
        notify("Chọn ít nhất một nhóm dữ liệu để khôi phục");
        return;
      }
      commit((state) => applySelectiveRestore(state, imported.data, restoreSections), "Đã khôi phục JSON theo lựa chọn");
    })
    .catch(() => notify("Không import được JSON"));
}

export function deleteLocalPersonalData() {
  commit((state) => deletePersonalData(state), "Đã xóa dữ liệu cá nhân trên máy");
}

export function resetDemoData() {
  commit(resetState(), "Đã khôi phục dữ liệu mẫu");
}
