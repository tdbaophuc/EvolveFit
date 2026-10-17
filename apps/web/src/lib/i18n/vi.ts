/**
 * Vietnamese UI copy and labels for the redesigned screens (P4).
 * Screens rewritten in P4 read their text from here; legacy views still inline theirs until replaced.
 */

export const navLabels = {
  today: "Hôm nay",
  workout: "Tập luyện",
  routines: "Lịch tập",
  library: "Thư viện",
  progress: "Tiến độ",
  settings: "Cài đặt"
} as const;

/** Canonical muscle buckets. The catalog mixes English and Vietnamese group names, so filters use these. */
export const muscleBuckets = [
  { id: "chest", label: "Ngực", matches: ["chest", "upper chest", "ngực", "pecs"] },
  { id: "back", label: "Lưng", matches: ["back", "lats", "upper back", "lưng", "xô"] },
  { id: "legs", label: "Chân", matches: ["legs", "quads", "hamstrings", "glutes", "calves", "chân", "mông", "đùi"] },
  { id: "shoulders", label: "Vai", matches: ["shoulders", "delts", "rear delts", "vai"] },
  { id: "arms", label: "Tay", matches: ["arms", "biceps", "triceps", "forearms", "tay"] },
  { id: "core", label: "Core", matches: ["core", "abs", "obliques", "bụng"] }
] as const;

export type MuscleBucketId = (typeof muscleBuckets)[number]["id"];

export function muscleBucketOf(group: string): MuscleBucketId | undefined {
  const value = group.trim().toLowerCase();
  return muscleBuckets.find((bucket) => (bucket.matches as readonly string[]).includes(value))?.id;
}

/** "Chest" → "Ngực", "Hamstrings" → "Chân · Hamstrings" (bucket first, specific muscle kept when it adds detail). */
export function muscleLabel(group: string): string {
  const value = group.trim().toLowerCase();
  const bucket = muscleBuckets.find((item) => item.id === muscleBucketOf(group));
  if (!bucket) return group;
  const isGeneric = value === bucket.label.toLowerCase() || value === bucket.matches[0];
  return isGeneric ? bucket.label : `${bucket.label} · ${group}`;
}

export const equipmentLabel: Record<string, string> = {
  barbell: "Đòn tạ",
  dumbbell: "Tạ đơn",
  cable: "Cáp",
  machine: "Máy",
  bodyweight: "Trọng lượng cơ thể",
  kettlebell: "Kettlebell",
  other: "Khác"
};

export const difficultyLabel: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung bình",
  advanced: "Nâng cao"
};

export const movementLabel: Record<string, string> = {
  push: "Đẩy",
  pull: "Kéo",
  squat: "Squat",
  hinge: "Gập hông",
  lunge: "Lunge",
  carry: "Mang vác",
  isolation: "Cô lập",
  core: "Core"
};

export const syncPillLabel = {
  pending: "Đang chờ đồng bộ",
  failed: "Đồng bộ lỗi",
  offline: "Ngoại tuyến"
} as const;

export function formatDateVi(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export function formatTimeVi(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function formatNumberVi(value: number): string {
  return value.toLocaleString("vi-VN");
}
