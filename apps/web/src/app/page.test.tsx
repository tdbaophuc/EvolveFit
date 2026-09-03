import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import AppPage from "./page";
import { initialState } from "@evolvefit/shared";

describe("Live Workout session queue", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("parks a skipped exercise and lets the user return to it from the session queue", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "evolvefit-state-v1",
      JSON.stringify({
        ...initialState,
        profile: { ...initialState.profile, onboardingCompleted: true }
      })
    );
    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Tập luyện" }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu tập/i }));

    expect(screen.getByRole("heading", { name: "Incline Bench Press" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Bỏ qua bài/i }));

    expect(screen.getByRole("heading", { name: "Seated Shoulder Press" })).toBeInTheDocument();
    const queue = screen.getByRole("heading", { name: "Hàng đợi bài tập" }).closest("section");
    expect(queue).not.toBeNull();
    expect(within(queue as HTMLElement).getByText("2 còn lại")).toBeInTheDocument();
    expect(within(queue as HTMLElement).getByText("1 tạm dừng")).toBeInTheDocument();

    await user.click(within(queue as HTMLElement).getByRole("button", { name: /Incline Bench Press.*Tạm dừng/i }));

    expect(screen.getByRole("heading", { name: "Incline Bench Press" })).toBeInTheDocument();
  });

  it("shows plate guidance and a live PR badge after a new record set", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "evolvefit-state-v1",
      JSON.stringify({
        ...initialState,
        profile: { ...initialState.profile, onboardingCompleted: true }
      })
    );
    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Tập luyện" }));
    await user.click(screen.getByRole("button", { name: /Bắt đầu tập/i }));

    expect(screen.getByLabelText("Bộ tính đĩa tạ")).toHaveTextContent("Thanh đòn 20kg");

    await user.click(screen.getByRole("button", { name: /Hoàn thành set/i }));

    expect(await screen.findByRole("status", { name: "Thông báo PR live" })).toHaveTextContent("PR mới");
    expect(screen.getByText(/PR mới:/)).toBeInTheDocument();
  });
});

describe("Progress dashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hides creatine consistency when creatine is disabled", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "evolvefit-state-v1",
      JSON.stringify({
        ...initialState,
        profile: { ...initialState.profile, onboardingCompleted: true },
        drinkModules: initialState.drinkModules.map((module) => (module.id === "creatine" ? { ...module, active: false } : module)),
        supplements: initialState.supplements.map((supplement) =>
          supplement.name.toLowerCase() === "creatine" ? { ...supplement, active: false } : supplement
        ),
        notificationSettings: { ...initialState.notificationSettings, creatineEnabled: false }
      })
    );

    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Tiến độ" }));

    expect(screen.getByRole("heading", { name: "Xu hướng nước" })).toBeInTheDocument();
    expect(screen.queryByText("Độ đều creatine")).not.toBeInTheDocument();
  });

  it("shows body metric range toggles and warns on invalid metric input", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "evolvefit-state-v1",
      JSON.stringify({
        ...initialState,
        profile: { ...initialState.profile, onboardingCompleted: true }
      })
    );

    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Tiến độ" }));
    await user.click(within(screen.getByLabelText("Khoảng thời gian chỉ số cơ thể")).getByRole("button", { name: "90n" }));
    const weightInput = screen.getByLabelText("Cân nặng (kg)");
    await user.clear(weightInput);
    await user.type(weightInput, "0");

    expect(screen.getByRole("alert")).toHaveTextContent("Cân nặng phải lớn hơn 0.");
  });

  it("shows guarded coach insight and stores accept feedback history", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "evolvefit-state-v1",
      JSON.stringify({
        ...initialState,
        profile: { ...initialState.profile, onboardingCompleted: true },
        workoutSets: []
      })
    );

    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Tiến độ" }));

    expect(screen.getByText("Coach có kiểm soát")).toBeInTheDocument();
    expect(screen.getByText(/Gợi ý AI sẽ ẩn cho đến khi bài này có ít nhất 3 set chính hữu ích/i)).toBeInTheDocument();
    expect(screen.getByText(/Chỉ là gợi ý tập luyện/i)).toBeInTheDocument();
    expect(screen.getByText(/Set gần đây: chưa có set chính hoàn tất/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Quá nặng/i), "ổn");
    await user.click(screen.getByRole("button", { name: "Chấp nhận" }));

    expect(screen.getByRole("heading", { name: "Lịch sử gợi ý" })).toBeInTheDocument();
    expect(screen.getByText("Đã chấp nhận")).toBeInTheDocument();
    expect(screen.getByText(/ổn/)).toBeInTheDocument();
  });
});

describe("Settings import and privacy", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("rejects invalid JSON import without replacing existing state", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "evolvefit-state-v1",
      JSON.stringify({
        ...initialState,
        profile: { ...initialState.profile, name: "Current Athlete", onboardingCompleted: true }
      })
    );

    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Cài đặt" }));
    expect(screen.getByText("Current Athlete")).toBeInTheDocument();

    const file = new File(
      [JSON.stringify({ metadata: { schemaVersion: 2 }, data: { hydrationLogs: [{ id: "bad", amountMl: "wrong", loggedAt: "2026-08-21T00:00:00.000Z" }] } })],
      "bad-export.json",
      { type: "application/json" }
    );
    await user.upload(screen.getByLabelText("Nhập JSON"), file);

    expect(await screen.findByText(/không hợp lệ/i)).toBeInTheDocument();
    expect(screen.getByText("Current Athlete")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("evolvefit-state-v1") ?? "{}").profile.name).toBe("Current Athlete");
    expect(screen.getByRole("button", { name: "Xóa dữ liệu cá nhân" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đặt lại dữ liệu demo" })).toBeInTheDocument();
  });

  it("keeps social sharing private by default and requires opt-in before publishing", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "evolvefit-state-v1",
      JSON.stringify({
        ...initialState,
        profile: { ...initialState.profile, onboardingCompleted: true }
      })
    );

    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Tiến độ" }));

    expect(screen.getByText(/Bảng xếp hạng bạn bè đang riêng tư và tắt/i)).toBeInTheDocument();
    expect(screen.getAllByText("Chưa bật chia sẻ.").length).toBeGreaterThan(0);
    expect(screen.getByText(/ẩn cân nặng, mỡ cơ thể, email và chi tiết buổi tập/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bench Press.*RPE/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Đăng" })[0]);
    expect(await screen.findByText(/Bật quyền chia sẻ tương ứng/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cài đặt" }));
    expect(screen.getByText("Quyền riêng tư xã hội")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Chia sẻ huy hiệu"));
    await user.click(screen.getByLabelText("Bảng xếp hạng bạn bè"));

    await user.click(screen.getByRole("button", { name: "Tiến độ" }));
    expect(screen.getByText("Bảng xếp hạng bạn bè riêng tư")).toBeInTheDocument();
    expect(screen.getByText("Chia sẻ huy hiệu")).toBeInTheDocument();
    expect(screen.getByText(/Đã ẩn: cân nặng, mỡ cơ thể, chi tiết bài tập, email/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Đăng" })[0]);
    expect(await screen.findByText(/Đã chia sẻ với bạn bè riêng tư/i)).toBeInTheDocument();
    expect(screen.getByText("Bạn bè riêng tư")).toBeInTheDocument();
  });

  it("captures health platform permissions without starting sync", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "evolvefit-state-v1",
      JSON.stringify({
        ...initialState,
        profile: { ...initialState.profile, onboardingCompleted: true }
      })
    );

    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Cài đặt" }));
    expect(screen.getByText("Quyền nền tảng sức khỏe")).toBeInTheDocument();
    expect(screen.getByText(/không tự đồng bộ dữ liệu sức khỏe trong nền/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Nền tảng"), "apple-health");
    await user.selectOptions(screen.getByLabelText("Đơn vị cân nặng"), "lb");
    await user.selectOptions(screen.getByLabelText("Đơn vị nước"), "oz");
    await user.click(screen.getByLabelText("Đồng bộ cân nặng"));
    await user.click(screen.getByLabelText("Đồng bộ buổi tập"));
    await user.click(screen.getByLabelText("Đồng bộ nước"));
    await user.click(screen.getByLabelText("Đồng ý quyền riêng tư sức khỏe"));
    await user.click(screen.getByRole("button", { name: "Yêu cầu quyền sức khỏe" }));

    expect(await screen.findByText(/Cần cầu nối ứng dụng trước khi đồng bộ/i)).toBeInTheDocument();
    expect(screen.getByText("Quyền: Đã lưu yêu cầu")).toBeInTheDocument();
    expect(screen.getByText("Cân nặng: Chưa đồng bộ")).toBeInTheDocument();
    expect(screen.getByText("Buổi tập: Chưa đồng bộ")).toBeInTheDocument();
    expect(screen.getByText("Nước: Chưa đồng bộ")).toBeInTheDocument();
  });
});
