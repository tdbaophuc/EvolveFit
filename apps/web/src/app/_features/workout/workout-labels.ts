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
  "upper-lower": "Tr\u00ean/D\u01b0\u1edbi",
  "full-body": "To\u00e0n th\u00e2n",
  custom: "T\u00f9y ch\u1ec9nh"
};

export const muscleFilterLabels: Record<string, string> = {
  all: "T\u1ea5t c\u1ea3",
  Chest: "Ng\u1ef1c",
  Back: "L\u01b0ng",
  Legs: "Ch\u00e2n",
  Shoulders: "Vai",
  Arms: "Tay",
  Core: "Core",
  Custom: "T\u00f9y ch\u1ec9nh",
  "Ng\u1ef1c": "Ng\u1ef1c",
  "L\u01b0ng": "L\u01b0ng",
  "Ch\u00e2n": "Ch\u00e2n",
  Vai: "Vai",
  Tay: "Tay",
  "T\u00f9y ch\u1ec9nh": "T\u00f9y ch\u1ec9nh"
};

export const equipmentLabels: Record<string, string> = {
  all: "T\u1ea5t c\u1ea3",
  barbell: "\u0110\u00f2n t\u1ea1",
  dumbbell: "T\u1ea1 \u0111\u01a1n",
  cable: "C\u00e1p",
  machine: "M\u00e1y",
  bodyweight: "Tr\u1ecdng l\u01b0\u1ee3ng c\u01a1 th\u1ec3",
  kettlebell: "Kettlebell",
  other: "Kh\u00e1c"
};

export const movementPatternLabels: Record<string, string> = {
  push: "\u0110\u1ea9y",
  pull: "K\u00e9o",
  squat: "Squat",
  hinge: "G\u1eadp h\u00f4ng",
  lunge: "Lunge",
  carry: "Mang v\u00e1c",
  isolation: "C\u00f4 l\u1eadp",
  core: "Core"
};

export const setTypeLabels: Record<WorkoutSetType, string> = {
  warmup: "Kh\u1edfi \u0111\u1ed9ng",
  working: "Ch\u00ednh",
  drop: "Drop",
  failure: "Th\u1ea5t b\u1ea1i"
};

export function sessionStatusLabel(status: string) {
  if (status === "active") return "\u0110ang t\u1eadp";
  if (status === "finished" || status === "completed") return "Ho\u00e0n t\u1ea5t";
  if (status === "paused") return "T\u1ea1m d\u1eebng";
  if (status === "cancelled") return "\u0110\u00e3 h\u1ee7y";
  return status;
}

export function muscleGroupLabel(group: string) {
  return muscleFilterLabels[group] ?? group;
}
