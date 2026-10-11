import { describe, expect, it, vi } from "vitest";
import { AdminStoreError, SupabaseAdminStore } from "./admin-store";
import { recordAdminAuditLog, resolveAdminActor } from "./admin";

const env = {
  API_DATA_MODE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service-role"
};
const adminId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";

function recordingFetch(handler: (url: string, init: { method: string; body?: string; headers: Headers }) => Response) {
  const calls: { url: string; method: string; body?: string; headers: Headers }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const request = input as Request;
    const call = { url: request.url, method: request.method, body: request.method === "GET" ? undefined : await request.text(), headers: request.headers };
    calls.push(call);
    return handler(call.url, call);
  });
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

describe("Supabase admin store", () => {
  it("resolves roles by verified user id with the service role, plus env bootstrap", async () => {
    const { calls, fetchImpl } = recordingFetch(() => Response.json([{ role: "content-admin" }]));
    const store = new SupabaseAdminStore(env, fetchImpl);
    const actor = await resolveAdminActor({ id: adminId, email: "Boss@Example.com", mode: "supabase" }, { ...env, ADMIN_BOOTSTRAP_EMAILS: "boss@example.com" }, store);
    expect(actor?.roles.sort()).toEqual(["content-admin", "super-admin"]);
    expect(calls[0].url).toContain(`user_roles?select=role&user_id=eq.${adminId}&revoked_at=is.null`);
    expect(calls[0].headers.get("authorization")).toBe("Bearer service-role");

    // Non-Supabase / malformed ids never reach the database.
    expect(await store.rolesForUser({ id: "demo:x", email: "x@example.com", mode: "demo" })).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("grants roles by email via the restricted RPC and upserts on (user_id, role)", async () => {
    const { calls, fetchImpl } = recordingFetch((url) => {
      if (url.includes("rpc/evolvefit_admin_user_id_by_email")) return Response.json(targetId);
      return Response.json([{ email: "editor@example.com", role: "content-admin", granted_by: adminId, granted_at: "2026-10-11T00:00:00Z", revoked_at: null }]);
    });
    const store = new SupabaseAdminStore(env, fetchImpl);
    const granted = await store.grantRole({ email: "Editor@Example.com", role: "content-admin", grantedBy: { id: adminId, email: "boss@example.com", mode: "supabase" } });
    expect(granted).toMatchObject({ email: "editor@example.com", role: "content-admin" });
    expect(JSON.parse(calls[0].body ?? "{}")).toEqual({ target_email: "editor@example.com" });
    expect(calls[1].url).toContain("user_roles?on_conflict=user_id,role");
    expect(calls[1].headers.get("prefer")).toContain("resolution=merge-duplicates");
    expect(JSON.parse(calls[1].body ?? "[]")[0]).toMatchObject({ user_id: targetId, role: "content-admin", granted_by: adminId, revoked_at: null });
  });

  it("returns 404 for unknown users and 503 when migration 0010 is missing", async () => {
    const unknown = new SupabaseAdminStore(env, recordingFetch(() => Response.json(null)).fetchImpl);
    await expect(unknown.grantRole({ email: "ghost@example.com", role: "support", grantedBy: { id: adminId, email: "b@example.com", mode: "supabase" } })).rejects.toMatchObject({
      status: 404
    });
    const unmigrated = new SupabaseAdminStore(env, recordingFetch(() => new Response("", { status: 404 })).fetchImpl);
    const error = await unmigrated.grantRole({ email: "a@example.com", role: "support", grantedBy: { id: adminId, email: "b@example.com", mode: "supabase" } }).catch((e) => e);
    expect(error).toBeInstanceOf(AdminStoreError);
    expect(error.status).toBe(503);
  });

  it("writes redacted audit logs and paginates them with an exact count", async () => {
    const { calls, fetchImpl } = recordingFetch((_url, init) => {
      if (init.method === "POST") return Response.json([{ id: "a1", action: "admin.role.write", resource_type: "admin_role", created_at: "2026-10-11T00:00:00Z" }]);
      return new Response(JSON.stringify([]), { status: 200, headers: { "content-range": "0-0/42" } });
    });
    const store = new SupabaseAdminStore(env, fetchImpl);
    await recordAdminAuditLog(store, {
      actorUserId: adminId,
      actorEmail: "boss@example.com",
      action: "admin.role.write",
      resourceType: "admin_role",
      after: { email: "editor@example.com", accessToken: "secret" },
      requestId: "req_1",
      ip: "203.0.113.5"
    });
    const row = JSON.parse(calls[0].body ?? "[]")[0];
    expect(row).toMatchObject({ actor_user_id: adminId, actor_email: "bo***@example.com", ip: "203.0.113.5" });
    expect(row.after_json).toEqual({ email: "ed***@example.com", accessToken: "[redacted]" });

    const page = await store.listAudit({ action: "admin.role.write", page: 3, pageSize: 10 });
    expect(page).toMatchObject({ page: 3, pageSize: 10, total: 42 });
    expect(calls[1].url).toContain("offset=20");
    expect(calls[1].url).toContain("action=eq.admin.role.write");
    expect(calls[1].headers.get("prefer")).toContain("count=exact");
  });
});
