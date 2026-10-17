import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

const actor = {
  id: "admin-1",
  email: "admin@example.com",
  roles: ["super-admin"],
  permissions: ["admin:dashboard", "content:read", "content:write", "support:read", "audit:read", "roles:write"]
};

const summary = {
  marketplaceExercises: 2,
  publishedExercises: 1,
  routineTemplates: 1,
  publishedRoutineTemplates: 1,
  pendingReports: 2,
  syncEventsVisibleToAdmin: 0,
  auditLogs: 4
};

function json(data: unknown) {
  return Response.json(data);
}

function mockAdminFetch(options: { forbidden?: boolean; permissions?: string[] } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];

    if (path === "/api/admin/dashboard") {
      if (options.forbidden) return json({ ok: false, error: "Forbidden", requestId: "req_forbidden" });
      return json({ ok: true, data: { actor: { ...actor, permissions: options.permissions ?? actor.permissions }, summary } });
    }
    if (path === "/api/auth/sign-in") return json({ ok: true, data: { mode: "local", email: "admin@example.com" } });
    if (path === "/api/admin/exercises" && init?.method === "GET") {
      return json({
        ok: true,
        data: {
          items: [{ id: "ex1", slug: "bench-press", name: "Bench Press", muscleGroup: "Chest", equipment: "barbell", movementPattern: "push", builtIn: true, status: "draft", license: "EvolveFit original" }],
          total: 1,
          page: 1,
          pageSize: 25
        }
      });
    }
    if (path === "/api/admin/exercises" && init?.method === "POST") {
      return json({ ok: true, data: { id: "ex2", name: "Incline Press", muscleGroup: "Chest", equipment: "dumbbell", movementPattern: "push", builtIn: true, status: "draft" } });
    }
    if (path === "/api/admin/exercises/ex1") return json({ ok: true, data: { id: "ex1", name: "Bench Press", status: "published" } });
    if (path === "/api/admin/routine-templates" && init?.method === "GET") {
      return json({
        ok: true,
        data: {
          items: [{ id: "tpl1", slug: "starter", name: "Starter Strength", summary: "Base", targetGoal: "strength", daysPerWeek: 3, minutesPerSession: 60, status: "draft", license: "EvolveFit original", days: [{ id: "d1", name: "Day 1", day: "Mon", order: 1, estimatedMinutes: 60, exercises: [] }] }],
          total: 1,
          page: 1,
          pageSize: 25
        }
      });
    }
    if (path === "/api/admin/routine-templates/tpl1") return json({ ok: true, data: { id: "tpl1", name: "Starter Strength", status: "archived" } });
    if (path === "/api/admin/users") return json({ ok: true, data: { items: [{ id: "user-1", email: "a***@example.com", mode: "cloud" }], redacted: true } });
    if (path === "/api/admin/feedback") return json({ ok: true, data: { items: [], total: 2, redacted: true } });
    if (path === "/api/admin/roles") return json({ ok: true, data: { items: [{ email: "support@example.com", role: "support", grantedBy: "admin@example.com", grantedAt: "2026-09-28T00:00:00.000Z" }], total: 1 } });
    if (path === "/api/admin/audit-logs") {
      return json({ ok: true, data: { items: [{ id: "log1", actorEmail: "admin@example.com", action: "exercise.publish", resourceType: "exercise", resourceId: "ex1", requestId: "req_1", createdAt: "2026-09-28T00:00:00.000Z" }], total: 1, page: 1, pageSize: 25 } });
    }
    if (path === "/api/admin/governance/health") return json({ ok: true, data: { actor, mode: "memory", bootstrapConfigured: true, checkedAt: "2026-09-28T00:00:00.000Z" } });

    return json({ ok: false, error: `Unhandled ${init?.method ?? "GET"} ${path}` });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Admin operations dashboard", () => {
  it("shows a guarded sign-in state when the user is forbidden", async () => {
    mockAdminFetch({ forbidden: true });

    render(<AdminPage />);

    expect(await screen.findByRole("heading", { name: "Admin access" })).toBeInTheDocument();
    expect(screen.getByText("Forbidden")).toBeInTheDocument();
  });

  it("renders role-aware navigation and hides unavailable sections", async () => {
    mockAdminFetch({ permissions: ["admin:dashboard", "content:read"] });

    render(<AdminPage />);

    expect(await screen.findByText("EvolveFit Admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exercises/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Roles/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Support/ })).not.toBeInTheDocument();
  });

  it("loads content governance lists and calls publish/archive admin APIs", async () => {
    const user = userEvent.setup();
    const fetchMock = mockAdminFetch();

    render(<AdminPage />);

    await user.click(await screen.findByRole("button", { name: /Exercises/ }));
    expect(await screen.findByText("Bench Press")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/exercises/ex1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "published" }) }));
    });

    await user.click(screen.getByRole("button", { name: /Templates/ }));
    expect(await screen.findByText("Starter Strength")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/routine-templates/tpl1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "archived" }) }));
    });
  });

  it("shows support redaction, audit search and governance health", async () => {
    const user = userEvent.setup();
    mockAdminFetch();

    render(<AdminPage />);

    await user.click(await screen.findByRole("button", { name: /Support/ }));
    expect(await screen.findByText("a***@example.com")).toBeInTheDocument();
    expect(screen.getByText(/Open reports: 2/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Audit/ }));
    expect(await screen.findByText("exercise.publish")).toBeInTheDocument();
    expect(screen.getByText("req_1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Governance/ }));
    expect(await screen.findByText("memory")).toBeInTheDocument();
    expect(screen.getByText("set")).toBeInTheDocument();
  });
});
