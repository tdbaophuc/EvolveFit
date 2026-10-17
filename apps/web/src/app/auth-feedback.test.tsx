import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp, seedAccount, seedGuest, sessionResponse, storedState } from "@/test/render-app";

/** Routes fetch by path; `/api/auth/sign-in` is answered by the provided handler. */
function stubApi(signIn: () => Promise<Response>, session: () => Response = () => sessionResponse()) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/auth/sign-in")) return signIn();
    if (url.endsWith("/api/auth/session")) return session();
    return Response.json({ ok: true, data: {} });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function fillSignIn(user: ReturnType<typeof userEvent.setup>, password = "secret123") {
  await user.type(screen.getByRole("textbox", { name: "Email" }), "phuc@example.com");
  await user.type(screen.getByLabelText("Mật khẩu"), password);
}

describe("Auth pages (P0/P2)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("shows a pending state, blocks double submits, then a specific inline error", async () => {
    const user = userEvent.setup();
    seedGuest();
    let respond: (response: Response) => void = () => undefined;
    const fetchMock = stubApi(() => new Promise<Response>((resolve) => (respond = resolve)));
    renderApp("/sign-in");
    await fillSignIn(user);

    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    const pending = await screen.findByRole("button", { name: "Đang đăng nhập…" });
    expect(pending).toBeDisabled();
    await user.click(pending);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/auth/sign-in"))).toHaveLength(1);

    respond(Response.json({ ok: false, error: "Invalid email or password", errorCode: "invalid_email_or_password" }, { status: 401 }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email hoặc mật khẩu không đúng.");
    expect(screen.getByRole("button", { name: "Đăng nhập" })).toBeEnabled();
  });

  it("reports unreachable servers instead of failing silently", async () => {
    const user = userEvent.setup();
    seedGuest();
    stubApi(async () => Promise.reject(new TypeError("Failed to fetch")));
    renderApp("/sign-in");
    await fillSignIn(user);
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(/Không kết nối được máy chủ/);
  });

  it("validates the password length before calling the API on sign-up", async () => {
    const user = userEvent.setup();
    seedGuest();
    const fetchMock = stubApi(async () => Response.json({ ok: true, data: {} }));
    renderApp("/sign-up");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "phuc@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), "short");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Mật khẩu cần ít nhất 8 ký tự.");
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/auth/sign-up"))).toBe(false);
  });

  it("asks to verify the email when sign-up needs confirmation", async () => {
    const user = userEvent.setup();
    seedGuest();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).endsWith("/api/auth/sign-up")
          ? Response.json({ ok: true, data: { mode: "email", email: "new@example.com", needsEmailVerification: true } })
          : sessionResponse()
      )
    );
    renderApp("/sign-up");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "new@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret123");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(await screen.findByRole("heading", { name: "Kiểm tra email của bạn" })).toBeInTheDocument();
  });

  it("keeps the account's data and pauses sync when the server session has expired", async () => {
    seedAccount("phuc@example.com", {
      syncQueue: [{ id: "q1", type: "hydration.log", payload: { id: "h1", amountMl: 250 }, status: "pending", createdAt: "2026-10-17T00:00:00.000Z" }]
    });
    const fetchMock = stubApi(async () => Response.json({ ok: true, data: {} }));
    renderApp();

    expect(await screen.findByText(/Phiên đăng nhập của phuc@example.com đã hết hạn/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Đăng nhập lại" })).toHaveAttribute("href", expect.stringContaining("/sign-in"));
    const stored = storedState("phuc@example.com");
    expect(stored.profile.authMode).toBe("email");
    expect(stored.syncQueue[0].status).toBe("pending");
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/sync/batch"))).toBe(false);
  });

  it("hides Google sign-in until it is enabled for a same-site API", async () => {
    seedGuest();
    stubApi(async () => Response.json({ ok: true, data: {} }));
    renderApp("/sign-in");
    expect(await screen.findByRole("button", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
  });

  it("returns to the requested page after sign-in and rejects external next targets", async () => {
    const user = userEvent.setup();
    seedGuest();
    stubApi(async () => Response.json({ ok: true, data: { mode: "email", email: "phuc@example.com" } }));
    const { getTestUrl } = await import("@/test/next-navigation-mock");
    renderApp("/sign-in?next=//evil.example");
    await fillSignIn(user);
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await waitFor(() => expect(getTestUrl()).toBe("/today"));
  });
});
