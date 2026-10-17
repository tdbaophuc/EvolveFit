import {
  defaultExerciseCatalog,
  normalizeExerciseDefinition,
  normalizeRoutineTemplate,
  routineMarketplaceTemplates,
  type ExerciseDefinition,
  type RoutineTemplate
} from "@evolvefit/shared";
import { createSupabaseServiceRoleRequest } from "./integrations";
import { exerciseFromRow, exerciseToRow, type ExerciseLibraryRow } from "./repositories";

/** Shared, admin-curated catalog: the seed from packages/shared overlaid with everything admins saved. */
export type CatalogSnapshot = {
  /** Built-in + marketplace exercises (every status; callers filter what users may see). */
  exercises: ExerciseDefinition[];
  /** Routine templates (every status; callers filter what users may see). */
  templates: RoutineTemplate[];
};

export type CatalogStore = {
  readonly mode: "memory" | "supabase";
  snapshot(): Promise<CatalogSnapshot>;
  upsertExercise(exercise: ExerciseDefinition): Promise<ExerciseDefinition>;
  upsertTemplate(template: RoutineTemplate): Promise<RoutineTemplate>;
};

const cacheTtlMs = 30_000;

function overlay<T extends { id: string }>(seed: T[], saved: T[]): T[] {
  const byId = new Map(seed.map((item) => [item.id, item]));
  saved.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

function seedSnapshot(): CatalogSnapshot {
  return {
    exercises: defaultExerciseCatalog.map(normalizeExerciseDefinition).filter((exercise) => exercise.catalogSource !== "custom"),
    templates: routineMarketplaceTemplates.map(normalizeRoutineTemplate)
  };
}

export function createCatalogStore(env: NodeJS.ProcessEnv, fetchImpl: typeof fetch = fetch): CatalogStore {
  return env.API_DATA_MODE === "supabase" ? new SupabaseCatalogStore(env, fetchImpl) : new MemoryCatalogStore();
}

export class MemoryCatalogStore implements CatalogStore {
  readonly mode = "memory" as const;
  private readonly exercises = new Map<string, ExerciseDefinition>();
  private readonly templates = new Map<string, RoutineTemplate>();

  async snapshot(): Promise<CatalogSnapshot> {
    const seed = seedSnapshot();
    return { exercises: overlay(seed.exercises, [...this.exercises.values()]), templates: overlay(seed.templates, [...this.templates.values()]) };
  }

  async upsertExercise(exercise: ExerciseDefinition): Promise<ExerciseDefinition> {
    const normalized = normalizeExerciseDefinition(exercise);
    this.exercises.set(normalized.id, structuredClone(normalized));
    return normalized;
  }

  async upsertTemplate(template: RoutineTemplate): Promise<RoutineTemplate> {
    const normalized = normalizeRoutineTemplate(template);
    this.templates.set(normalized.id, structuredClone(normalized));
    return normalized;
  }
}

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  creator_name: string;
  source: string | null;
  license: string;
  target_goal: RoutineTemplate["targetGoal"];
  days_per_week: number;
  minutes_per_session: number;
  experience_level: RoutineTemplate["experienceLevel"];
  equipment: RoutineTemplate["equipment"];
  muscle_priority: string[];
  recovery_days: string[];
  progression_notes: string | null;
  deload_notes: string | null;
  muscle_distribution: Record<string, number> | null;
  tags: string[];
  status: RoutineTemplate["status"];
  visibility: RoutineTemplate["visibility"];
  version: number;
  published_at: string | null;
  updated_at: string;
};
type TemplateDayRow = { id: string; template_id: string; name: string; weekday: string; order_index: number; estimated_minutes: number; warmup: string | null; cooldown: string | null };
type TemplateSlotRow = {
  id: string;
  template_day_id: string;
  exercise_id: string;
  name: string;
  muscle_group: string;
  order_index: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  target_weight_kg: number | string;
  rest_seconds: number;
  tempo: string | null;
  rpe: number | string | null;
  note: string | null;
  substitutions: string[];
};

const isUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

/**
 * Stores the shared catalog in Supabase with the service role (admin permission is checked by the API).
 * Exercises: exercise_library rows with user_id null, keyed by external_id. Templates: routine_template* tables.
 */
export class SupabaseCatalogStore implements CatalogStore {
  readonly mode = "supabase" as const;
  private cache: { at: number; value: CatalogSnapshot } | undefined;

  constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async snapshot(): Promise<CatalogSnapshot> {
    if (this.cache && Date.now() - this.cache.at < cacheTtlMs) return this.cache.value;
    const [exerciseRows, templateRows, dayRows, slotRows] = await Promise.all([
      this.json<ExerciseLibraryRow[]>("exercise_library?select=*&user_id=is.null&catalog_source=eq.marketplace&order=name.asc"),
      this.json<TemplateRow[]>("routine_templates?select=*&order=name.asc"),
      this.json<TemplateDayRow[]>("routine_template_days?select=*&order=order_index.asc"),
      this.json<TemplateSlotRow[]>("routine_template_exercise_slots?select=*&order=order_index.asc")
    ]);
    const seed = seedSnapshot();
    const value: CatalogSnapshot = {
      exercises: overlay(seed.exercises, exerciseRows.map((row) => normalizeExerciseDefinition({ ...exerciseFromRow(row), catalogSource: "marketplace", builtIn: true }))),
      templates: overlay(seed.templates, templateRows.map((row) => templateFromRows(row, dayRows, slotRows)))
    };
    this.cache = { at: Date.now(), value };
    return value;
  }

  async upsertExercise(exercise: ExerciseDefinition): Promise<ExerciseDefinition> {
    const normalized = normalizeExerciseDefinition({ ...exercise, catalogSource: "marketplace", builtIn: true });
    const { id: _primaryKey, ...row } = exerciseToRow(null, normalized);
    void _primaryKey; // the uuid primary key is generated; the app id is stored in external_id
    await this.request("exercise_library?on_conflict=external_id", {
      method: "POST",
      headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify([
        {
          ...row,
          external_id: normalized.id,
          catalog_source: "marketplace",
          built_in: true,
          created_by: isUuid(normalized.createdBy) ? normalized.createdBy : null,
          reviewed_by: isUuid(normalized.reviewedBy) ? normalized.reviewedBy : null
        }
      ])
    });
    this.cache = undefined;
    return normalized;
  }

  async upsertTemplate(template: RoutineTemplate): Promise<RoutineTemplate> {
    const normalized = normalizeRoutineTemplate(template);
    await this.request("routine_templates?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify([templateToRow(normalized)])
    });
    // Replace the structure: deleting the days cascades to their slots.
    await this.request(`routine_template_days?template_id=eq.${encodeURIComponent(normalized.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    const days = normalized.days.map((day, index) => ({
      id: `${normalized.id}:${day.id}`,
      template_id: normalized.id,
      name: day.name,
      weekday: day.day,
      order_index: index,
      estimated_minutes: clamp(day.estimatedMinutes || normalized.minutesPerSession, 15, 180),
      warmup: day.warmup ?? null,
      cooldown: day.cooldown ?? null
    }));
    if (days.length) await this.request("routine_template_days", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(days) });
    const slots = normalized.days.flatMap((day) =>
      day.exercises.map((slot, index) => {
        const repsMin = clamp(slot.targetRepsMin, 1, 200);
        return {
          id: `${normalized.id}:${day.id}:${slot.id}`,
          template_day_id: `${normalized.id}:${day.id}`,
          exercise_id: slot.exerciseId,
          name: slot.name,
          muscle_group: slot.muscleGroup,
          order_index: index,
          target_sets: clamp(slot.targetSets, 1, 12),
          target_reps_min: repsMin,
          target_reps_max: Math.max(repsMin, clamp(slot.targetRepsMax, 1, 200)),
          target_weight_kg: Math.max(0, slot.targetWeightKg),
          rest_seconds: clamp(slot.restSeconds, 15, 600),
          tempo: slot.tempo ?? null,
          rpe: slot.rpe === undefined ? null : Math.min(10, Math.max(1, slot.rpe)),
          note: slot.note ?? null,
          substitutions: slot.substitutions ?? []
        };
      })
    );
    if (slots.length) await this.request("routine_template_exercise_slots", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(slots) });
    this.cache = undefined;
    return normalized;
  }

  private async json<T>(path: string): Promise<T> {
    const response = await this.request(path, { method: "GET" });
    return (await response.json()) as T;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await this.fetchImpl(createSupabaseServiceRoleRequest(path, init, this.env));
    if (!response.ok) throw new Error(`Supabase catalog request failed with status ${response.status}`);
    return response;
  }
}

function templateToRow(template: RoutineTemplate) {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    summary: template.summary ?? "",
    creator_name: template.creatorName,
    source: template.source ?? null,
    license: template.license,
    target_goal: template.targetGoal,
    days_per_week: clamp(template.daysPerWeek, 1, 7),
    minutes_per_session: clamp(template.minutesPerSession, 15, 180),
    experience_level: template.experienceLevel,
    equipment: template.equipment,
    muscle_priority: template.musclePriority ?? [],
    recovery_days: template.recoveryDays ?? [],
    progression_notes: template.progressionNotes ?? null,
    deload_notes: template.deloadNotes ?? null,
    muscle_distribution: template.muscleDistribution ?? {},
    tags: template.tags,
    status: template.status,
    visibility: template.visibility,
    version: Math.max(1, template.version),
    published_at: template.publishedAt ?? null
  };
}

function templateFromRows(row: TemplateRow, days: TemplateDayRow[], slots: TemplateSlotRow[]): RoutineTemplate {
  const prefix = `${row.id}:`;
  return normalizeRoutineTemplate({
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    creatorName: row.creator_name,
    source: row.source ?? undefined,
    license: row.license,
    targetGoal: row.target_goal,
    daysPerWeek: row.days_per_week,
    minutesPerSession: row.minutes_per_session,
    experienceLevel: row.experience_level,
    equipment: row.equipment,
    musclePriority: row.muscle_priority,
    recoveryDays: row.recovery_days,
    progressionNotes: row.progression_notes ?? undefined,
    deloadNotes: row.deload_notes ?? undefined,
    muscleDistribution: row.muscle_distribution ?? undefined,
    tags: row.tags,
    status: row.status,
    visibility: row.visibility,
    version: row.version,
    publishedAt: row.published_at ?? undefined,
    updatedAt: row.updated_at,
    days: days
      .filter((day) => day.template_id === row.id)
      .map((day) => ({
        id: day.id.startsWith(prefix) ? day.id.slice(prefix.length) : day.id,
        name: day.name,
        day: day.weekday,
        order: day.order_index,
        estimatedMinutes: day.estimated_minutes,
        warmup: day.warmup ?? undefined,
        cooldown: day.cooldown ?? undefined,
        exercises: slots
          .filter((slot) => slot.template_day_id === day.id)
          .map((slot) => ({
            id: slot.id.slice(slot.id.lastIndexOf(":") + 1),
            exerciseId: slot.exercise_id,
            name: slot.name,
            muscleGroup: slot.muscle_group,
            order: slot.order_index,
            targetSets: slot.target_sets,
            targetRepsMin: slot.target_reps_min,
            targetRepsMax: slot.target_reps_max,
            targetWeightKg: Number(slot.target_weight_kg),
            restSeconds: slot.rest_seconds,
            tempo: slot.tempo ?? undefined,
            rpe: slot.rpe === null ? undefined : Number(slot.rpe),
            note: slot.note ?? undefined,
            substitutions: slot.substitutions
          }))
      }))
  });
}
