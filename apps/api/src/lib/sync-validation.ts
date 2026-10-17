/**
 * Per-type schemas for offline sync items. Each schema returns a fresh payload that only contains
 * known, type-checked fields (unknown properties are dropped), or a validation error.
 */

type Result = { ok: true; payload: Record<string, unknown> } | { ok: false; error: string };
type FieldRule = (value: unknown, field: string) => string | undefined;
type Shape = Record<string, { rule: FieldRule; required?: boolean }>;

export const maxSyncPayloadBytes = 64 * 1024;
const maxDepth = 8;
const maxArrayLength = 200;
const maxKeys = 200;

const text =
  (max: number, min = 0): FieldRule =>
  (value, field) =>
    typeof value !== "string" ? `${field} must be a string` : value.length < min || value.length > max ? `${field} must be ${min}-${max} characters` : undefined;
const id = text(200, 1);
const isoDate = text(80, 1);
const num =
  (min: number, max: number, integer = false): FieldRule =>
  (value, field) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return `${field} must be a finite number`;
    if (value < min || value > max) return `${field} must be between ${min} and ${max}`;
    if (integer && !Number.isInteger(value)) return `${field} must be an integer`;
    return undefined;
  };
const bool: FieldRule = (value, field) => (typeof value === "boolean" ? undefined : `${field} must be a boolean`);
const oneOf =
  (...allowed: string[]): FieldRule =>
  (value, field) =>
    typeof value === "string" && allowed.includes(value) ? undefined : `${field} must be one of: ${allowed.join(", ")}`;
const arrayOf =
  (rule: FieldRule, max = maxArrayLength): FieldRule =>
  (value, field) => {
    if (!Array.isArray(value)) return `${field} must be an array`;
    if (value.length > max) return `${field} must contain at most ${max} items`;
    for (const [index, item] of value.entries()) {
      const error = rule(item, `${field}.${index}`);
      if (error) return error;
    }
    return undefined;
  };
const object =
  (shape: Shape): FieldRule =>
  (value, field) => {
    const result = pick(value, shape, field);
    return result.ok ? undefined : result.error;
  };
const both =
  (...rules: FieldRule[]): FieldRule =>
  (value, field) => {
    for (const rule of rules) {
      const error = rule(value, field);
      if (error) return error;
    }
    return undefined;
  };
/** Free-form nested JSON (routines/exercises are normalised further by domain code), bounded in size and depth. */
const boundedJson: FieldRule = (value, field) => checkBounds(value, field, 0);

const hydrationLog: Shape = {
  id: { rule: id, required: true },
  amountMl: { rule: num(1, 10000), required: true },
  drinkType: { rule: oneOf("water", "coffee", "tea", "electrolyte", "protein", "other") },
  loggedAt: { rule: isoDate }
};
const supplementLog: Shape = {
  id: { rule: id, required: true },
  supplementId: { rule: text(200) },
  name: { rule: text(120, 1), required: true },
  amount: { rule: num(0, 100000), required: true },
  unit: { rule: oneOf("g", "mg", "capsule") },
  loggedAt: { rule: isoDate },
  status: { rule: oneOf("taken", "skipped") },
  skippedReason: { rule: text(500) }
};
const workoutSetFields: Shape = {
  id: { rule: id },
  sessionId: { rule: text(200) },
  exerciseId: { rule: id },
  exerciseName: { rule: text(160, 1) },
  setType: { rule: oneOf("warmup", "working", "drop", "failure", "skipped") },
  targetWeightKg: { rule: num(0, 10000) },
  targetReps: { rule: num(0, 1000) },
  actualWeightKg: { rule: num(0, 10000) },
  actualReps: { rule: num(0, 1000) },
  rpe: { rule: num(0, 10) },
  completedAt: { rule: isoDate }
};
const workoutSet: Shape = {
  ...workoutSetFields,
  id: { rule: id, required: true },
  exerciseId: { rule: id, required: true },
  exerciseName: { rule: text(160, 1), required: true },
  targetWeightKg: { rule: num(0, 10000), required: true },
  targetReps: { rule: num(0, 1000), required: true },
  actualWeightKg: { rule: num(0, 10000), required: true },
  actualReps: { rule: num(0, 1000), required: true }
};
const queueItem = object({ exerciseId: { rule: id, required: true }, status: { rule: oneOf("queued", "completed", "parked"), required: true } });
const workoutSession: Shape = {
  id: { rule: id, required: true },
  routineId: { rule: text(200) },
  workoutDayId: { rule: text(200) },
  sessionName: { rule: text(160) },
  startedAt: { rule: isoDate, required: true },
  endedAt: { rule: isoDate },
  durationSeconds: { rule: num(0, 7 * 24 * 3600) },
  status: { rule: oneOf("active", "paused", "finished", "cancelled"), required: true },
  sessionExerciseOrder: { rule: arrayOf(id) },
  exerciseQueue: { rule: arrayOf(queueItem) }
};
const bodyMetric: Shape = {
  id: { rule: id, required: true },
  measuredAt: { rule: isoDate, required: true },
  weightKg: { rule: num(1, 700), required: true },
  heightCm: { rule: num(30, 300), required: true },
  bodyFatPercent: { rule: num(0, 100) },
  waistCm: { rule: num(0, 400) },
  chestCm: { rule: num(0, 400) },
  armCm: { rule: num(0, 200) },
  thighCm: { rule: num(0, 300) },
  note: { rule: text(1000) }
};
/** Identity fields (email, authMode) are owned by the auth provider and are never accepted from sync. */
const profile: Shape = {
  name: { rule: text(120) },
  timezone: { rule: text(80) },
  onboardingCompleted: { rule: bool },
  unitWeight: { rule: oneOf("kg", "lb") },
  unitVolume: { rule: oneOf("ml", "oz") },
  bodyWeightKg: { rule: num(0, 700) },
  goalWeightKg: { rule: num(0, 700) },
  goalBodyFatPercent: { rule: num(0, 100) },
  heightCm: { rule: num(0, 300) },
  waterTargetMl: { rule: num(0, 20000) },
  wakeHour: { rule: num(0, 23, true) },
  sleepHour: { rule: num(0, 23, true) },
  workoutDays: { rule: arrayOf(text(20), 14) },
  trainingGoal: { rule: oneOf("strength", "muscle", "fat-loss", "health") },
  experienceLevel: { rule: oneOf("beginner", "intermediate", "advanced") },
  availableEquipment: { rule: arrayOf(oneOf("barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"), 10) },
  syncPreference: { rule: oneOf("local-first", "account-sync") },
  creatineAmountG: { rule: num(0, 100) },
  creatineHour: { rule: num(0, 23, true) },
  remindBeforeMinutes: { rule: num(0, 24 * 60, true) },
  leaderboardPublic: { rule: bool }
};
const socialPrivacy: Shape = {
  friendLeaderboardEnabled: { rule: bool },
  shareBadges: { rule: bool },
  shareWorkoutSummaries: { rule: bool },
  shareBodyMetrics: { rule: bool },
  shareWorkoutDetails: { rule: bool }
};
const friendFields: Shape = {
  displayName: { rule: text(120, 1) },
  handle: { rule: text(80, 1) },
  status: { rule: oneOf("pending", "accepted", "blocked") },
  badgeStreakMonths: { rule: num(0, 1200, true) },
  score: { rule: num(0, 1_000_000) },
  addedAt: { rule: isoDate }
};
const friend: Shape = {
  id: { rule: id, required: true },
  ...friendFields,
  displayName: { rule: text(120, 1), required: true },
  handle: { rule: text(80, 1), required: true },
  status: { rule: oneOf("pending", "accepted", "blocked"), required: true }
};
const sharedPost: Shape = {
  id: { rule: id, required: true },
  kind: { rule: oneOf("badge", "workout-summary"), required: true },
  title: { rule: text(160, 1), required: true },
  summary: { rule: text(1000), required: true },
  visibleFields: { rule: arrayOf(text(80), 50) },
  redactedFields: { rule: arrayOf(text(80), 50) },
  createdAt: { rule: isoDate },
  publishedAt: { rule: isoDate },
  audience: { rule: oneOf("private-friends") }
};
const byId: Shape = { id: { rule: id, required: true } };
const routineExercise = both(
  boundedJson,
  object({
    id: { rule: id, required: true },
    name: { rule: text(160, 1), required: true },
    muscleGroup: { rule: text(120) },
    supersetGroup: { rule: text(80) },
    targetSets: { rule: num(0, 50, true) },
    targetRepsMin: { rule: num(0, 1000, true) },
    targetRepsMax: { rule: num(0, 1000, true) },
    targetWeightKg: { rule: num(0, 10000) },
    restSeconds: { rule: num(0, 3600) },
    lastSession: { rule: text(200) },
    definitionId: { rule: text(200) },
    order: { rule: num(0, 1000) }
  })
);
const workoutDay = both(
  boundedJson,
  object({
    id: { rule: id, required: true },
    name: { rule: text(160) },
    day: { rule: text(40) },
    order: { rule: num(0, 1000) },
    exercises: { rule: arrayOf(routineExercise, 60) }
  })
);
const routineFields: Shape = {
  id: { rule: text(200) },
  name: { rule: text(160, 1) },
  daysPerWeek: { rule: num(1, 14, true) },
  days: { rule: arrayOf(workoutDay, 14) },
  createdAt: { rule: isoDate },
  updatedAt: { rule: isoDate }
};
const routineRef: Shape = {
  id: { rule: text(200) },
  routineId: { rule: text(200) },
  routine: { rule: object(routineFields) },
  patch: { rule: object(routineFields) },
  baseUpdatedAt: { rule: text(80) },
  conflictResolution: { rule: oneOf("confirm") }
};

const schemas: Record<string, Shape> = {
  "hydration.log": hydrationLog,
  "hydration.patch": {
    id: { rule: id, required: true },
    amountMl: { rule: num(1, 10000) },
    deltaMl: { rule: num(-10000, 10000) },
    drinkType: hydrationLog.drinkType,
    loggedAt: { rule: isoDate }
  },
  "hydration.delete": byId,
  "profile.update": profile,
  "supplement.log": supplementLog,
  "supplement.skip": supplementLog,
  "workout.set.create": workoutSet,
  "workout.set.skip": workoutSet,
  "workout.set.patch": { id: { rule: id, required: true }, patch: { rule: object(workoutSetFields), required: true } },
  "workout.set.delete": byId,
  "workout.session.start": workoutSession,
  "workout.session.finish": byId,
  "workout.session.pause": byId,
  "workout.session.resume": byId,
  "workout.session.reorder": { sessionId: { rule: id, required: true }, queue: { rule: arrayOf(queueItem), required: true } },
  "routine.create": { ...routineFields, name: { rule: text(160, 1), required: true } },
  "routine.update": routineRef,
  "routine.saveSessionOrder": routineRef,
  "routine.delete": { id: { rule: text(200) }, routineId: { rule: text(200) } },
  "exercise.create": { ...exerciseShape(), name: { rule: text(160, 1), required: true } },
  "exercise.update": { id: { rule: id, required: true }, patch: { rule: object(exerciseShape()), required: true } },
  "exercise.delete": byId,
  "bodyMetric.upsert": bodyMetric,
  "social.privacy.update": socialPrivacy,
  "social.friend.add": friend,
  "social.friend.update": { id: { rule: id, required: true }, patch: { rule: object(friendFields), required: true } },
  "social.share.publish": sharedPost
};

export const supportedSyncTypes = Object.keys(schemas);

export function validateSyncItemEnvelope(item: unknown, index: number): string | undefined {
  const field = `body.items.${index}`;
  if (!isPlainObject(item)) return `${field} must be an object`;
  if (typeof item.type !== "string" || item.type.length > 64) return `${field}.type must be a string`;
  if (item.id !== undefined && (typeof item.id !== "string" || item.id.length > 200)) return `${field}.id must be a string of at most 200 characters`;
  if (item.idempotencyKey !== undefined && (typeof item.idempotencyKey !== "string" || item.idempotencyKey.length > 200)) {
    return `${field}.idempotencyKey must be a string of at most 200 characters`;
  }
  if (!isPlainObject(item.payload)) return `${field}.payload must be an object`;
  return undefined;
}

export function validateSyncPayload(type: string, payload: unknown): Result {
  const shape = schemas[type];
  if (!shape) return { ok: false, error: `unsupported sync type: ${type}` };
  let size: number;
  try {
    size = Buffer.byteLength(JSON.stringify(payload ?? null), "utf8");
  } catch {
    return { ok: false, error: "payload must be JSON" };
  }
  if (size > maxSyncPayloadBytes) return { ok: false, error: `payload must be at most ${maxSyncPayloadBytes} bytes` };
  return pick(payload, shape, "payload");
}

function pick(value: unknown, shape: Shape, field: string): Result {
  if (!isPlainObject(value)) return { ok: false, error: `${field} must be an object` };
  const output: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(shape)) {
    const child = value[key];
    if (child === undefined || child === null) {
      if (spec.required) return { ok: false, error: `${field}.${key} is required` };
      continue;
    }
    const error = spec.rule(child, `${field}.${key}`);
    if (error) return { ok: false, error };
    output[key] = child;
  }
  return { ok: true, payload: output };
}

function checkBounds(value: unknown, field: string, depth: number): string | undefined {
  if (depth > maxDepth) return `${field} is nested too deeply`;
  if (value === null || typeof value === "boolean") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? undefined : `${field} must be a finite number`;
  if (typeof value === "string") return value.length > 4000 ? `${field} is too long` : undefined;
  if (Array.isArray(value)) {
    if (value.length > maxArrayLength) return `${field} must contain at most ${maxArrayLength} items`;
    for (const [index, item] of value.entries()) {
      const error = checkBounds(item, `${field}.${index}`, depth + 1);
      if (error) return error;
    }
    return undefined;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length > maxKeys) return `${field} has too many properties`;
    for (const [key, child] of entries) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") return `${field} contains a forbidden key`;
      const error = checkBounds(child, `${field}.${key}`, depth + 1);
      if (error) return error;
    }
    return undefined;
  }
  return `${field} contains an unsupported value`;
}

function exerciseShape(): Shape {
  const strings = arrayOf(text(200), 50);
  return {
    id: { rule: text(200) },
    name: { rule: text(160, 1) },
    slug: { rule: text(200) },
    muscleGroup: { rule: text(120) },
    equipment: { rule: oneOf("barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other") },
    movementPattern: { rule: oneOf("push", "pull", "squat", "hinge", "lunge", "carry", "isolation", "core") },
    notes: { rule: text(1000) },
    primaryMuscles: { rule: strings },
    secondaryMuscles: { rule: strings },
    cues: { rule: strings },
    commonMistakes: { rule: strings },
    substitutions: { rule: strings },
    contraindications: { rule: strings },
    equipmentAlternatives: { rule: strings },
    tags: { rule: strings },
    mediaUrl: { rule: httpsUrl },
    difficulty: { rule: oneOf("beginner", "intermediate", "advanced") },
    forceType: { rule: oneOf("push", "pull", "static", "mixed") },
    unilateral: { rule: bool },
    source: { rule: text(240) },
    license: { rule: text(240) },
    createdAt: { rule: isoDate },
    updatedAt: { rule: isoDate }
  };
}

function httpsUrl(value: unknown, field: string): string | undefined {
  if (typeof value !== "string" || value.length > 2048) return `${field} must be a URL`;
  if (value === "") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? undefined : `${field} must use https`;
  } catch {
    return `${field} must be a URL`;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
