import type { AppState, WorkoutSetType } from "@evolvefit/shared";

export const weekdays = [
  ["Mon", "T2"],
  ["Tue", "T3"],
  ["Wed", "T4"],
  ["Thu", "T5"],
  ["Fri", "T6"],
  ["Sat", "T7"],
  ["Sun", "CN"]
] as const;

export const templateLabels: Record<AppState["activeTemplate"], string> = {
  ppl: "PPL",
  "upper-lower": "Trên/Dưới",
  "full-body": "Toàn thân",
  custom: "Tùy chỉnh"
};

export const muscleFilterLabels: Record<string, string> = {
  all: "Tất cả",
  Chest: "Ngực",
  Back: "Lưng",
  Legs: "Chân",
  Shoulders: "Vai",
  Arms: "Tay",
  Core: "Core",
  Custom: "Tùy chỉnh",
  "Ngực": "Ngực",
  "Lưng": "Lưng",
  "Chân": "Chân",
  Vai: "Vai",
  Tay: "Tay",
  "Tùy chỉnh": "Tùy chỉnh"
};

export const equipmentLabels: Record<string, string> = {
  all: "Tất cả",
  barbell: "Đòn tạ",
  dumbbell: "Tạ đơn",
  cable: "Cáp",
  machine: "Máy",
  bodyweight: "Trọng lượng cơ thể",
  kettlebell: "Kettlebell",
  other: "Khác"
};

export const movementPatternLabels: Record<string, string> = {
  push: "Đẩy",
  pull: "Kéo",
  squat: "Squat",
  hinge: "Gập hông",
  lunge: "Lunge",
  carry: "Mang vác",
  isolation: "Cô lập",
  core: "Core"
};

export const setTypeLabels: Record<WorkoutSetType, string> = {
  warmup: "Khởi động",
  working: "Chính",
  drop: "Drop",
  failure: "Thất bại"
};

export function sessionStatusLabel(status: string) {
  if (status === "active") return "Đang tập";
  if (status === "finished" || status === "completed") return "Hoàn tất";
  if (status === "paused") return "Tạm dừng";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

export function muscleGroupLabel(group: string) {
  return muscleFilterLabels[group] ?? group;
}
