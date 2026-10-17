import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppDataExport, initialState } from "@evolvefit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recoveryTokenFromUrl, safeNextPath } from "@/features/auth/redirect";
import { mergePulledState } from "@/features/sync/merge";
import { renderApp, seedAccount, seedGuest, sessionResponse, storedState } from "@/test/render-app";

const cloudLog = { id: "cloud-water", amountMl: 700, drinkType: "water" as const, loggedAt: "2026-10-16T08:00:00.000Z" };

describe("Account namespaces and two-way sync (P2)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("pulls data saved on other devices when an account is reopened", async () => {
    seedAccount("phuc@example.com", { hydrationLogs: [] });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/auth/session")) return sessionResponse("phuc@example.com");
        if (url.endsWith("/api/account/export")) return Response.json({ ok: true, data: createAppDataExport({ ...initialState, hydrationLogs: [cloudLog] }) });
        return Response.json({ ok: true, data: {} });
      })
    );
    renderApp();
    await waitFor(() => expect(storedState("phuc@example.com").hydrationLogs.map((log: { id: string }) => log.id)).toContain("cloud-water"));
  });

  it("ignores a malformed cloud export instead of crashing or corrupting local data", async () => {
    const localLog = { ...cloudLog, id: "local-only" };
    seedAccount("phuc@example.com", { hydrationLogs: [localLog] });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/session")) return sessionResponse("phuc@example.com");
      if (url.endsWith("/api/account/export")) return Response.json({ ok: true, data: {} });
      return Response.json({ ok: true, data: {} });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp();
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/account/export"))).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(storedState("phuc@example.com").hydrationLogs.map((log: { id: string }) => log.id)).toEqual(["local-only"]);
  });

  it("signs out to the guest data and removes the account's copy from a shared device", async () => {
    const user = userEvent.setup();
    seedGuest({ hydrationLogs: [] });
    seedAccount("phuc@example.com", { hydrationLogs: [cloudLog] });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/auth/session")) return sessionResponse("phuc@example.com");
        if (url.endsWith("/api/auth/sign-out")) return Response.json({ ok: true, data: { mode: "local", email: "local@evolvefit.app" } });
        return Response.json({ ok: true, data: {} });
      })
    );
    renderApp("/settings");
    await user.click(await screen.findByRole("button", { name: "sign-out-cloud" }));
    expect(screen.getByRole("dialog", { name: "Đăng xuất khỏi tài khoản?" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Đăng xuất" }));

    await waitFor(() => expect(window.localStorage.getItem("evolvefit-active-account")).toBeNull());
    expect(window.localStorage.getItem("evolvefit-state-v1:account:phuc@example.com")).toBeNull();
    expect(storedState().profile.authMode).toBe("local");
    expect(await screen.findByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/sign-in?next=/settings");
  });

  it("can keep the account's copy on the device when signing out", async () => {
    const user = userEvent.setup();
    seedAccount("phuc@example.com", { hydrationLogs: [cloudLog] });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => (String(input).endsWith("/api/auth/session") ? sessionResponse("phuc@example.com") : Response.json({ ok: true, data: {} }))));
    renderApp("/settings");
    await user.click(await screen.findByRole("button", { name: "sign-out-cloud" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Đăng xuất" }));
    await waitFor(() => expect(window.localStorage.getItem("evolvefit-active-account")).toBeNull());
    expect(storedState("phuc@example.com").hydrationLogs).toHaveLength(1);
  });

  it("replaces the device copy with the cloud data and skips onboarding for an existing account", async () => {
    const user = userEvent.setup();
    seedGuest({}, { onboardingCompleted: false, email: "" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/auth/sign-in")) return Response.json({ ok: true, data: { mode: "email", email: "phuc@example.com" } });
        if (url.endsWith("/api/account/export")) return Response.json({ ok: true, data: createAppDataExport({ ...initialState, hydrationLogs: [cloudLog] }) });
        return sessionResponse();
      })
    );
    renderApp("/sign-in?next=/today");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "phuc@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret123");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await user.click(await screen.findByRole("button", { name: "replace-local-with-cloud" }));

    await waitFor(() => expect(storedState("phuc@example.com").profile.onboardingCompleted).toBe(true));
    expect(storedState("phuc@example.com").hydrationLogs.map((log: { id: string }) => log.id)).toEqual(["cloud-water"]);
    expect(screen.queryByText(/Bước 1\//)).not.toBeInTheDocument();
  });

  it("reads the recovery token from the reset link and clears it from the address bar", async () => {
    const user = userEvent.setup();
    seedGuest();
    const fetchMock = vi.fn(async () => Response.json({ ok: true, data: { updated: true } }));
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/reset-password#access_token=recovery-token&type=recovery");
    renderApp("/reset-password");
    await user.type(await screen.findByLabelText("Mật khẩu mới"), "new-secret-1");
    await user.click(screen.getByRole("button", { name: "Cập nhật mật khẩu" }));
    expect(await screen.findByText(/Mật khẩu đã được cập nhật/)).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    const resetCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/api/auth/password/reset")) as unknown[] | undefined;
    expect(JSON.parse(String((resetCall?.[1] as RequestInit).body))).toEqual({ accessToken: "recovery-token", password: "new-secret-1" });
  });

  it("shows a clear message for reset links without a token", async () => {
    seedGuest();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true, data: {} })));
    window.history.replaceState(null, "", "/reset-password");
    renderApp("/reset-password");
    expect(await screen.findByRole("heading", { name: "Liên kết không hợp lệ" })).toBeInTheDocument();
  });
});

describe("P2 helpers", () => {
  it("merges pulled cloud collections without touching local settings or the pending queue", () => {
    const local = {
      ...initialState,
      plateSettings: { ...initialState.plateSettings, customBarbellKg: 17 },
      syncQueue: [{ id: "pending", type: "hydration.log", payload: {}, status: "pending" as const, createdAt: "2026-10-17T00:00:00.000Z" }],
      hydrationLogs: [{ ...cloudLog, amountMl: 900, loggedAt: "2026-10-17T09:00:00.000Z" }]
    };
    const cloud = { ...initialState, hydrationLogs: [cloudLog, { ...cloudLog, id: "other-device" }] };
    const merged = mergePulledState(local, cloud);
    expect(merged.plateSettings.customBarbellKg).toBe(17);
    expect(merged.syncQueue).toHaveLength(1);
    expect(merged.hydrationLogs.find((log) => log.id === "cloud-water")?.amountMl).toBe(900); // fresher local edit wins
    expect(merged.hydrationLogs.some((log) => log.id === "other-device")).toBe(true);
  });

  it("only allows same-app redirect targets", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("//evil.example")).toBe("/today");
    expect(safeNextPath("https://evil.example")).toBe("/today");
    expect(safeNextPath("/\\evil.example")).toBe("/today");
    expect(safeNextPath("/sign-in")).toBe("/today");
    expect(safeNextPath(null)).toBe("/today");
  });

  it("extracts recovery tokens from Supabase links", () => {
    expect(recoveryTokenFromUrl("https://app.test/reset-password#access_token=abc&type=recovery")).toBe("abc");
    expect(recoveryTokenFromUrl("https://app.test/reset-password#access_token=abc&type=signup")).toBeNull();
    expect(recoveryTokenFromUrl("https://app.test/reset-password?token=xyz")).toBe("xyz");
    expect(recoveryTokenFromUrl("https://app.test/reset-password")).toBeNull();
  });
});
