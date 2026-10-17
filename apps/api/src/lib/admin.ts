import {
  createCustomExerciseDefinition,
  cryptoSafeId,
  normalizeExerciseDefinition,
  normalizeRoutineTemplate,
  routineMarketplaceTemplates,
  type AppState,
  type ExerciseDefinition,
  type RoutineTemplate
} from "@evolvefit/shared";
import type { AdminAuditLog, AdminRole, AdminRoleAssignment, AdminStore, AuditFilters } from "./admin-store";
import type { ApiUser } from "./repositories";

export type { AdminAuditLog, AdminRole, AdminRoleAssignment } from "./admin-store";
export type AdminPermission =
  | "admin:dashboard"
  | "content:read"
  | "content:write"
  | "support:read"
  | "audit:read"
  | "roles:write"
  | "ops:read";

export type AdminActor = {
  user: ApiUser;
  roles: AdminRole[];
  permissions: AdminPermission[];
};

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  "super-admin": ["admin:dashboard", "content:read", "content:write", "support:read", "audit:read", "roles:write", "ops:read"],
  "content-admin": ["admin:dashboard", "content:read", "content:write", "audit:read"],
  support: ["admin:dashboard", "support:read", "audit:read"]
};

export async function resolveAdminActor(user: ApiUser, env: NodeJS.ProcessEnv, store: AdminStore): Promise<AdminActor | undefined> {
  const roles = new Set<AdminRole>(await store.rolesForUser(user));
  if (bootstrapEmails(env).includes(user.email.toLowerCase())) roles.add("super-admin");
  if (!roles.size) return undefined;
  return {
    user,
    roles: [...roles],
    permissions: [...new Set([...roles].flatMap((role) => rolePermissions[role]))]
  };
}

export function requireAdminPermission(actor: AdminActor | undefined, permission: AdminPermission): { ok: true; actor: AdminActor } | { ok: false; status: 401 | 403; error: string } {
  if (!actor) return { ok: false, status: 401, error: "Unauthorized" };
  if (!actor.permissions.includes(permission)) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, actor };
}

export function adminDashboardSummary(state: AppState, auditLogCount: number) {
  return {
    marketplaceExercises: state.exerciseLibrary.filter((exercise) => normalizeExerciseDefinition(exercise).catalogSource === "marketplace").length,
    publishedExercises: state.exerciseLibrary.filter((exercise) => normalizeExerciseDefinition(exercise).catalogSource === "marketplace" && normalizeExerciseDefinition(exercise).status === "published").length,
    routineTemplates: state.routineTemplatesMarketplace.length,
    publishedRoutineTemplates: state.routineTemplatesMarketplace.filter((template) => template.status === "published").length,
    auditLogs: auditLogCount,
    pendingReports: 0,
    syncEventsVisibleToAdmin: state.syncQueue.length
  };
}

export function listAdminMarketplaceExercises(state: AppState, filters: { query?: string; status?: string; page?: number | string; pageSize?: number | string } = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const items = state.exerciseLibrary
    .map(normalizeExerciseDefinition)
    .filter((exercise) => exercise.catalogSource === "marketplace")
    .filter((exercise) => !filters.status || filters.status === "all" || exercise.status === filters.status)
    .filter((exercise) => !query || [exercise.name, exercise.slug, exercise.muscleGroup, ...(exercise.tags ?? [])].join(" ").toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
  return paginate(items, filters);
}

export function createAdminMarketplaceExercise(state: AppState, input: Partial<ExerciseDefinition>): ExerciseDefinition {
  const exercise = normalizeExerciseDefinition({
    ...createCustomExerciseDefinition({
      name: input.name ?? "Marketplace exercise",
      muscleGroup: input.muscleGroup ?? "General",
      equipment: input.equipment ?? "other",
      movementPattern: input.movementPattern ?? "isolation",
      primaryMuscles: input.primaryMuscles,
      secondaryMuscles: input.secondaryMuscles,
      cues: input.cues,
      commonMistakes: input.commonMistakes,
      substitutions: input.substitutions,
      mediaUrl: input.mediaUrl,
      difficulty: input.difficulty,
      unilateral: input.unilateral,
      equipmentAlternatives: input.equipmentAlternatives,
      forceType: input.forceType,
      contraindications: input.contraindications,
      source: input.source,
      license: input.license,
      tags: input.tags
    }),
    id: input.id ?? `market-${cryptoSafeId()}`,
    slug: input.slug ?? slugify(input.name ?? "marketplace-exercise"),
    builtIn: true,
    catalogSource: "marketplace",
    status: input.status ?? "draft",
    createdBy: input.createdBy,
    reviewedBy: input.reviewedBy,
    publishedAt: input.status === "published" ? new Date().toISOString() : input.publishedAt,
    version: input.version ?? 1
  });
  state.exerciseLibrary.push(exercise);
  return exercise;
}

export function updateAdminMarketplaceExercise(state: AppState, id: string, input: Partial<ExerciseDefinition>): ExerciseDefinition | undefined {
  const index = state.exerciseLibrary.findIndex((exercise) => exercise.id === id || normalizeExerciseDefinition(exercise).slug === id);
  if (index < 0) return undefined;
  const before = normalizeExerciseDefinition(state.exerciseLibrary[index]);
  if (before.catalogSource !== "marketplace") return undefined;
  const next = normalizeExerciseDefinition({
    ...before,
    ...input,
    catalogSource: "marketplace",
    builtIn: true,
    updatedAt: new Date().toISOString(),
    publishedAt: input.status === "published" && before.status !== "published" ? new Date().toISOString() : (input.publishedAt ?? before.publishedAt),
    slug: input.slug ?? before.slug ?? slugify(input.name ?? before.name)
  });
  state.exerciseLibrary[index] = next;
  return next;
}

export function listAdminRoutineTemplates(state: AppState, filters: { query?: string; status?: string; page?: number | string; pageSize?: number | string } = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const items = state.routineTemplatesMarketplace
    .map(normalizeRoutineTemplate)
    .filter((template) => !filters.status || filters.status === "all" || template.status === filters.status)
    .filter((template) => !query || [template.name, template.slug, template.targetGoal, ...template.tags].join(" ").toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
  return paginate(items, filters);
}

export function createAdminRoutineTemplate(state: AppState, input: Partial<RoutineTemplate>): RoutineTemplate {
  const base = routineMarketplaceTemplates[0];
  const now = new Date().toISOString();
  const template = normalizeRoutineTemplate({
    ...base,
    ...input,
    id: input.id ?? `template-${cryptoSafeId()}`,
    slug: input.slug ?? slugify(input.name ?? "routine-template"),
    name: input.name ?? "Routine Template",
    summary: input.summary ?? "",
    creatorName: input.creatorName ?? "EvolveFit Admin",
    license: input.license ?? "EvolveFit original",
    status: input.status ?? "draft",
    visibility: input.visibility ?? "admin-curated",
    version: input.version ?? 1,
    updatedAt: now,
    publishedAt: input.status === "published" ? now : input.publishedAt,
    days: input.days?.length ? input.days : base.days
  });
  state.routineTemplatesMarketplace.push(template);
  return template;
}

export function updateAdminRoutineTemplate(state: AppState, id: string, input: Partial<RoutineTemplate>): RoutineTemplate | undefined {
  const index = state.routineTemplatesMarketplace.findIndex((template) => template.id === id || template.slug === id);
  if (index < 0) return undefined;
  const before = normalizeRoutineTemplate(state.routineTemplatesMarketplace[index]);
  const now = new Date().toISOString();
  const next = normalizeRoutineTemplate({
    ...before,
    ...input,
    slug: input.slug ?? before.slug,
    updatedAt: now,
    publishedAt: input.status === "published" && before.status !== "published" ? now : (input.publishedAt ?? before.publishedAt),
    version: input.version ?? before.version
  });
  state.routineTemplatesMarketplace[index] = next;
  return next;
}

export function adminSupportUserLookup(users: ApiUser[], query = "") {
  const normalized = query.trim().toLowerCase();
  return users
    .filter((user) => !normalized || user.email.toLowerCase().includes(normalized) || user.id.toLowerCase().includes(normalized))
    .map((user) => ({
      id: user.id,
      email: redactEmail(user.email),
      mode: user.mode
    }));
}

export function listAdminAuditLogs(store: AdminStore, filters: AuditFilters = {}) {
  return store.listAudit(filters);
}

export function recordAdminAuditLog(store: AdminStore, input: Omit<AdminAuditLog, "id" | "createdAt">): Promise<AdminAuditLog> {
  return store.recordAudit({
    ...input,
    actorEmail: redactEmail(input.actorEmail),
    before: redactSensitive(input.before),
    after: redactSensitive(input.after)
  });
}

export async function listAdminRoles(env: NodeJS.ProcessEnv, store: AdminStore): Promise<AdminRoleAssignment[]> {
  const bootstrap: AdminRoleAssignment[] = bootstrapEmails(env).map((email) => ({
    email,
    role: "super-admin" as const,
    grantedBy: "env:ADMIN_BOOTSTRAP_EMAILS",
    grantedAt: "bootstrap"
  }));
  return [...bootstrap, ...(await store.listRoles())];
}

export function redactEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "redacted";
  return `${name.slice(0, 2)}***@${domain}`;
}

function bootstrapEmails(env: NodeJS.ProcessEnv): string[] {
  return (env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function paginate<T>(items: T[], input: { page?: number | string; pageSize?: number | string }) {
  const page = Math.max(1, Math.floor(Number(input.page ?? 1) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(input.pageSize ?? 25) || 25)));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || cryptoSafeId();
}

function redactSensitive(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactSensitive);
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      if (/token|secret|password|auth|p256dh/i.test(key)) return [key, "[redacted]"];
      if (/email/i.test(key) && typeof child === "string") return [key, redactEmail(child)];
      return [key, redactSensitive(child)];
    })
  );
}
