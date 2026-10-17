import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTestUrl } from "@/test/next-navigation-mock";
import { renderApp, seedGuest, sessionResponse, storedState } from "@/test/render-app";

function stubOfflineApi() {
  // Catalog endpoints fail so screens use the built-in copy; everything else is a guest session.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/exercises/marketplace") || url.includes("/api/routine-templates")) return Response.json({ ok: false, error: "offline" }, { status: 503 });
      return sessionResponse();
    })
  );
}

describe("App shell redesign (P4)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("shows five core destinations and opens settings from the avatar", async () => {
    const user = userEvent.setup();
    seedGuest();
    stubOfflineApi();
    renderApp("/today");
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(within(nav).getAllByRole("button").map((button) => button.textContent)).toEqual(["Hôm nay", "Tập luyện", "Lịch tập", "Thư viện", "Tiến độ"]);
    expect(within(nav).getByRole("button", { name: "Hôm nay" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Cài đặt" }));
    expect(getTestUrl()).toBe("/settings");
  });

  it("does not show a sync pill for guests (local-only is the normal state)", async () => {
    seedGuest();
    stubOfflineApi();
    renderApp("/today");
    expect(screen.queryByText("Đang chờ đồng bộ")).not.toBeInTheDocument();
    expect(screen.queryByText("Đồng bộ lỗi")).not.toBeInTheDocument();
  });

  it("opens reminders from the bell", async () => {
    const user = userEvent.setup();
    seedGuest();
    stubOfflineApi();
    renderApp("/today");
    await user.click(screen.getByRole("button", { name: /^Thông báo/ }));
    expect(screen.getByRole("dialog", { name: "Nhắc nhở" })).toBeInTheDocument();
  });
});

describe("Today screen (spec 9.1)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("puts the next action first and logs water/creatine in one tap", async () => {
    const user = userEvent.setup();
    seedGuest({ hydrationLogs: [], supplementLogs: [] });
    stubOfflineApi();
    renderApp("/today");

    const hero = screen.getByRole("region", { name: "Việc quan trọng nhất" });
    await user.click(within(hero).getByRole("button", { name: "Bắt đầu tập" }));
    expect(getTestUrl()).toBe("/workout");
    const { setTestUrl } = await import("@/test/next-navigation-mock");
    setTestUrl("/today");

    await user.click(await screen.findByRole("button", { name: "+250ml" }));
    expect(storedState().hydrationLogs).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Xem tất cả" }));
    const sheet = screen.getByRole("dialog", { name: "Nước hôm nay" });
    expect(within(sheet).getByText("+250ml")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Đã uống" }));
    expect(await screen.findByText("Xong hôm nay")).toBeInTheDocument();
  });
});

describe("Library screen (spec 9.5)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("opens details on tap instead of adding the exercise, then adds it intentionally", async () => {
    const user = userEvent.setup();
    seedGuest();
    stubOfflineApi();
    renderApp("/library");
    const before = JSON.stringify(storedState().routines);
    const firstRow = within(screen.getByRole("list", { name: "Kết quả bài tập" })).getAllByRole("button")[0];
    await user.click(firstRow);
    const dialog = screen.getByRole("dialog");
    expect(JSON.stringify(storedState().routines)).toBe(before);

    await user.click(within(dialog).getByRole("button", { name: /^Thêm vào / }));
    await waitFor(() => expect(JSON.stringify(storedState().routines)).not.toBe(before));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("filters by canonical muscle group and shows the offline notice", async () => {
    const user = userEvent.setup();
    seedGuest();
    stubOfflineApi();
    renderApp("/library");
    // Shown once the catalog request has failed (after TanStack Query's single retry).
    expect(await screen.findByText(/Đang hiển thị bản có sẵn trên thiết bị/, {}, { timeout: 5000 })).toBeInTheDocument();
    const resultCount = () => screen.getByText(/^\d+ bài phù hợp$/).textContent;
    const total = resultCount();
    await user.click(screen.getByRole("button", { name: "Ngực" }));
    expect(resultCount()).not.toBe(total);
    const rows = within(screen.getByRole("list", { name: "Kết quả bài tập" })).getAllByRole("button");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("creates, renames and deletes a custom exercise with confirmation", async () => {
    const user = userEvent.setup();
    seedGuest();
    stubOfflineApi();
    renderApp("/library");
    await user.click(screen.getByRole("button", { name: "Tạo bài" }));
    await user.type(screen.getByLabelText("Tên bài tập"), "Cable Y Raise");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Tạo bài" }));
    expect(await screen.findByRole("button", { name: "Cable Y Raise: xem chi tiết" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cable Y Raise: xem chi tiết" }));
    await user.click(screen.getByRole("button", { name: "Sửa" }));
    const nameField = screen.getByLabelText("Tên bài tập");
    await user.clear(nameField);
    await user.type(nameField, "Cable Y Raise (nghiêng)");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(storedState().exerciseLibrary.some((exercise: { name: string }) => exercise.name === "Cable Y Raise (nghiêng)")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Xoá bài" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận xoá" }));
    expect(storedState().exerciseLibrary.some((exercise: { name: string }) => exercise.name.startsWith("Cable Y Raise"))).toBe(false);
  });
});
