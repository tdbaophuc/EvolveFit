import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { guestStorageKey, renderApp, seedAccount, seedGuest, sessionResponse, storedState } from "@/test/render-app";

const queuedItem = (id: string) => ({
  id,
  type: "hydration.log",
  payload: { id: `h-${id}`, amountMl: 250 },
  status: "pending" as const,
  createdAt: "2026-10-17T00:00:00.000Z"
});

describe("App shell (P1/P2)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("syncs the signed-in account's queue in batches instead of leaving items stuck in 'syncing'", async () => {
    seedAccount("phuc@example.com", { syncQueue: [queuedItem("q1"), queuedItem("q2")] });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/session")) return sessionResponse("phuc@example.com");
      if (url.endsWith("/api/sync/batch")) {
        const body = JSON.parse(String(init?.body));
        return Response.json({ ok: true, data: { results: body.items.map((item: { id: string; type: string }) => ({ id: item.id, type: item.type, status: "synced" })) } });
      }
      return Response.json({ ok: true, data: {} });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp();
    await waitFor(() => expect(storedState("phuc@example.com").syncQueue.map((item: { status: string }) => item.status)).toEqual(["synced", "synced"]));
    const batches = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/sync/batch"));
    expect(batches).toHaveLength(1);
    expect(JSON.parse(String(batches[0][1]?.body)).items).toHaveLength(2);
  });

  it("never syncs guest data to the API (guests are local-first)", async () => {
    seedGuest({ syncQueue: [queuedItem("q1")] });
    const fetchMock = vi.fn(async () => sessionResponse());
    vi.stubGlobal("fetch", fetchMock);
    renderApp();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/sync/batch"))).toBe(false);
    expect(storedState().syncQueue[0].status).toBe("pending");
  });

  it("pauses the queue and asks to sign in again when the API rejects the session", async () => {
    seedAccount("phuc@example.com", { syncQueue: [queuedItem("q1")] });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/auth/session")) return sessionResponse("phuc@example.com");
        if (url.endsWith("/api/sync/batch")) return Response.json({ ok: false, error: "Unauthorized", errorCode: "unauthorized" }, { status: 401 });
        return Response.json({ ok: true, data: {} });
      })
    );
    renderApp();
    expect(await screen.findByText(/đã hết hạn/)).toBeInTheDocument();
    expect(storedState("phuc@example.com").syncQueue[0].status).toBe("pending");
  });

  it("ignores a slow session check that finishes after the user signed in", async () => {
    const user = userEvent.setup();
    seedGuest();
    // The first (cold-start) session check hangs; checks made after signing in see the valid cookie.
    let answerFirstSession: (response: Response) => void = () => undefined;
    let signedIn = false;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/auth/session")) {
          if (signedIn) return Promise.resolve(sessionResponse("phuc@example.com"));
          return new Promise<Response>((resolve) => (answerFirstSession = resolve));
        }
        if (url.endsWith("/api/auth/sign-in")) {
          signedIn = true;
          return Promise.resolve(Response.json({ ok: true, data: { mode: "email", email: "phuc@example.com" } }));
        }
        return Promise.resolve(Response.json({ ok: true, data: {} }));
      })
    );
    // Start inside the app so the (slow) cold-start session check is in flight, then go sign in.
    renderApp("/today");
    const { setTestUrl } = await import("@/test/next-navigation-mock");
    setTestUrl("/sign-in");
    await user.type(await screen.findByRole("textbox", { name: "Email" }), "phuc@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await waitFor(() => expect(storedState("phuc@example.com").profile?.authMode).toBe("email"));

    answerFirstSession(sessionResponse());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(storedState("phuc@example.com").profile.authMode).toBe("email");
    expect(screen.queryByText(/đã hết hạn/)).not.toBeInTheDocument();
  });

  it("keeps a live workout running while navigating to another tab and back", async () => {
    const user = userEvent.setup();
    seedGuest();
    vi.stubGlobal("fetch", vi.fn(async () => sessionResponse()));
    renderApp("/workout");
    await user.click(screen.getByRole("button", { name: /Bắt đầu tập/i }));
    const sessionId = storedState().activeWorkoutSessionId;
    expect(sessionId).toBeTruthy();

    const { setTestUrl } = await import("@/test/next-navigation-mock");
    setTestUrl("/settings");
    expect(await screen.findByRole("button", { name: "Hồ sơ" })).toBeInTheDocument();
    setTestUrl("/workout");
    expect(await screen.findByRole("button", { name: /Hoàn thành set/i })).toBeInTheDocument();
    expect(storedState().activeWorkoutSessionId).toBe(sessionId);
  });

  it("shows onboarding on every route until setup is complete, with a sign-in shortcut", async () => {
    seedGuest({}, { onboardingCompleted: false });
    vi.stubGlobal("fetch", vi.fn(async () => sessionResponse()));
    renderApp("/progress");
    expect(await screen.findByText(/Bước 1\//)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Đăng nhập để khôi phục dữ liệu/ })).toHaveAttribute("href", "/sign-in?next=/today");
    expect(window.localStorage.getItem(guestStorageKey)).toBeTruthy();
  });
});
