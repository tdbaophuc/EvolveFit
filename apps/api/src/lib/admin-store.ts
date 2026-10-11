import { cryptoSafeId } from "@evolvefit/shared";
import { createSupabaseServiceRoleRequest } from "./integrations";
import type { ApiUser } from "./repositories";

export type AdminRole = "super-admin" | "content-admin" | "support";

export type AdminRoleAssignment = {
  email: string;
  role: AdminRole;
  grantedBy: string;
  grantedAt: string;
  revokedAt?: string;
};

export type AdminAuditLog = {
  id: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  requestId: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

export type AuditFilters = { action?: string; resourceType?: string; page?: number | string; pageSize?: number | string };
export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number };

export class AdminStoreError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Durable storage for admin role grants and the admin audit trail. */
export type AdminStore = {
  readonly mode: "memory" | "supabase";
  rolesForUser(user: ApiUser): Promise<AdminRole[]>;
  listRoles(): Promise<AdminRoleAssignment[]>;
  grantRole(input: { email: string; role: AdminRole; grantedBy: ApiUser }): Promise<AdminRoleAssignment>;
  revokeRole(input: { email: string; role: AdminRole }): Promise<AdminRoleAssignment | undefined>;
  recordAudit(log: Omit<AdminAuditLog, "id" | "createdAt">): Promise<AdminAuditLog>;
  listAudit(filters: AuditFilters): Promise<Paginated<AdminAuditLog>>;
  countAudit(): Promise<number>;
};

export function createAdminStore(env: NodeJS.ProcessEnv, fetchImpl: typeof fetch = fetch): AdminStore {
  return env.API_DATA_MODE === "supabase" ? new SupabaseAdminStore(env, fetchImpl) : new MemoryAdminStore();
}

export function pageWindow(input: { page?: number | string; pageSize?: number | string }) {
  const page = Math.max(1, Math.floor(Number(input.page ?? 1) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(input.pageSize ?? 25) || 25)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export class MemoryAdminStore implements AdminStore {
  readonly mode = "memory" as const;
  private readonly roles = new Map<string, AdminRoleAssignment>();
  private readonly audit: AdminAuditLog[] = [];

  async rolesForUser(user: ApiUser): Promise<AdminRole[]> {
    const email = user.email.toLowerCase();
    return [...this.roles.values()].filter((item) => !item.revokedAt && item.email === email).map((item) => item.role);
  }

  async listRoles(): Promise<AdminRoleAssignment[]> {
    return [...this.roles.values()].filter((item) => !item.revokedAt);
  }

  async grantRole(input: { email: string; role: AdminRole; grantedBy: ApiUser }): Promise<AdminRoleAssignment> {
    const assignment: AdminRoleAssignment = {
      email: input.email.toLowerCase(),
      role: input.role,
      grantedBy: input.grantedBy.email,
      grantedAt: new Date().toISOString()
    };
    this.roles.set(`${assignment.email}:${assignment.role}`, assignment);
    return assignment;
  }

  async revokeRole(input: { email: string; role: AdminRole }): Promise<AdminRoleAssignment | undefined> {
    const key = `${input.email.toLowerCase()}:${input.role}`;
    const existing = this.roles.get(key);
    if (!existing || existing.revokedAt) return undefined;
    const revoked = { ...existing, revokedAt: new Date().toISOString() };
    this.roles.set(key, revoked);
    return revoked;
  }

  async recordAudit(input: Omit<AdminAuditLog, "id" | "createdAt">): Promise<AdminAuditLog> {
    const log = { ...input, id: cryptoSafeId(), createdAt: new Date().toISOString() };
    this.audit.push(log);
    if (this.audit.length > 5000) this.audit.splice(0, this.audit.length - 5000);
    return log;
  }

  async listAudit(filters: AuditFilters): Promise<Paginated<AdminAuditLog>> {
    const { page, pageSize, offset } = pageWindow(filters);
    const items = this.audit
      .filter((log) => !filters.action || log.action === filters.action)
      .filter((log) => !filters.resourceType || log.resourceType === filters.resourceType)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items: items.slice(offset, offset + pageSize), page, pageSize, total: items.length };
  }

  async countAudit(): Promise<number> {
    return this.audit.length;
  }
}

type UserRoleRow = { email: string | null; role: AdminRole; granted_by: string | null; granted_at: string; revoked_at: string | null };
type AuditRow = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  before_json: unknown;
  after_json: unknown;
  request_id: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

/**
 * Uses the service role on purpose: authorization is enforced by the API (requireAdminPermission) and
 * env-bootstrapped super admins have no user_roles row, so RLS-scoped user tokens cannot bootstrap the system.
 */
export class SupabaseAdminStore implements AdminStore {
  readonly mode = "supabase" as const;

  constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async rolesForUser(user: ApiUser): Promise<AdminRole[]> {
    if (user.mode !== "supabase" || !isUuid(user.id)) return [];
    const rows = await this.json<UserRoleRow[]>(`user_roles?select=role&user_id=eq.${user.id}&revoked_at=is.null`, { method: "GET" });
    return rows.map((row) => row.role);
  }

  async listRoles(): Promise<AdminRoleAssignment[]> {
    const rows = await this.json<UserRoleRow[]>("user_roles?select=email,role,granted_by,granted_at,revoked_at&revoked_at=is.null&order=granted_at.desc&limit=500", {
      method: "GET"
    });
    return rows.map(roleFromRow);
  }

  async grantRole(input: { email: string; role: AdminRole; grantedBy: ApiUser }): Promise<AdminRoleAssignment> {
    const email = input.email.toLowerCase();
    const userId = await this.userIdForEmail(email);
    if (!userId) throw new AdminStoreError("user not found", 404);
    const rows = await this.json<UserRoleRow[]>("user_roles?on_conflict=user_id,role", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
      body: JSON.stringify([
        {
          user_id: userId,
          role: input.role,
          email,
          granted_by: isUuid(input.grantedBy.id) ? input.grantedBy.id : null,
          granted_at: new Date().toISOString(),
          revoked_at: null
        }
      ])
    });
    return roleFromRow(rows[0]);
  }

  async revokeRole(input: { email: string; role: AdminRole }): Promise<AdminRoleAssignment | undefined> {
    const userId = await this.userIdForEmail(input.email.toLowerCase());
    if (!userId) return undefined;
    const rows = await this.json<UserRoleRow[]>(`user_roles?user_id=eq.${userId}&role=eq.${encodeURIComponent(input.role)}&revoked_at=is.null`, {
      method: "PATCH",
      body: JSON.stringify({ revoked_at: new Date().toISOString() })
    });
    return rows[0] ? roleFromRow(rows[0]) : undefined;
  }

  async recordAudit(input: Omit<AdminAuditLog, "id" | "createdAt">): Promise<AdminAuditLog> {
    const rows = await this.json<AuditRow[]>("admin_audit_logs", {
      method: "POST",
      body: JSON.stringify([
        {
          actor_user_id: isUuid(input.actorUserId) ? input.actorUserId : null,
          actor_email: input.actorEmail,
          action: input.action,
          resource_type: input.resourceType,
          resource_id: input.resourceId ?? null,
          before_json: input.before ?? null,
          after_json: input.after ?? null,
          request_id: input.requestId,
          ip: isIp(input.ip) ? input.ip : null,
          user_agent: input.userAgent?.slice(0, 300) ?? null
        }
      ])
    });
    return auditFromRow(rows[0]);
  }

  async listAudit(filters: AuditFilters): Promise<Paginated<AdminAuditLog>> {
    const { page, pageSize, offset } = pageWindow(filters);
    const params = new URLSearchParams({ select: "*", order: "created_at.desc", offset: String(offset), limit: String(pageSize) });
    if (filters.action) params.set("action", `eq.${filters.action}`);
    if (filters.resourceType) params.set("resource_type", `eq.${filters.resourceType}`);
    const response = await this.request(`admin_audit_logs?${params.toString()}`, { method: "GET", headers: { Prefer: "count=exact" } });
    const rows = (await response.json()) as AuditRow[];
    return { items: rows.map(auditFromRow), page, pageSize, total: totalFromContentRange(response.headers.get("content-range"), rows.length) };
  }

  async countAudit(): Promise<number> {
    const response = await this.request("admin_audit_logs?select=id&limit=1", { method: "GET", headers: { Prefer: "count=exact" } });
    return totalFromContentRange(response.headers.get("content-range"), 0);
  }

  private async userIdForEmail(email: string): Promise<string | undefined> {
    const response = await this.fetchImpl(
      createSupabaseServiceRoleRequest("rpc/evolvefit_admin_user_id_by_email", { method: "POST", body: JSON.stringify({ target_email: email }) }, this.env)
    );
    if (response.status === 404) throw new AdminStoreError("Role management requires Supabase migration 0010_admin_store_production", 503);
    if (!response.ok) throw new Error(`Supabase admin user lookup failed with status ${response.status}`);
    const id = (await response.json()) as string | null;
    return typeof id === "string" && isUuid(id) ? id : undefined;
  }

  private async json<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.request(path, init);
    return (await response.json()) as T;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const response = await this.fetchImpl(createSupabaseServiceRoleRequest(path, init, this.env));
    if (!response.ok) throw new Error(`Supabase admin store request failed with status ${response.status}`);
    return response;
  }
}

function roleFromRow(row: UserRoleRow): AdminRoleAssignment {
  return {
    email: row.email ?? "unknown",
    role: row.role,
    grantedBy: row.granted_by ?? "system",
    grantedAt: row.granted_at,
    revokedAt: row.revoked_at ?? undefined
  };
}

function auditFromRow(row: AuditRow): AdminAuditLog {
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? "unknown",
    actorEmail: row.actor_email ?? "redacted",
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id ?? undefined,
    before: row.before_json ?? undefined,
    after: row.after_json ?? undefined,
    requestId: row.request_id ?? "",
    ip: row.ip ?? undefined,
    userAgent: row.user_agent ?? undefined,
    createdAt: row.created_at
  };
}

function totalFromContentRange(value: string | null, fallback: number): number {
  const total = Number(value?.split("/")[1]);
  return Number.isFinite(total) ? total : fallback;
}

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function isIp(value: string | undefined): value is string {
  return Boolean(value && (/^\d{1,3}(\.\d{1,3}){3}$/.test(value) || /^[0-9a-f:.]+$/i.test(value)));
}
