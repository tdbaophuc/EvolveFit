import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import AppPage from "./page";
import { initialState } from "@/lib/seed";

describe("Live Workout session queue", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("parks a skipped exercise and lets the user return to it from the session queue", async () => {
    const user = userEvent.setup();
    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Workout" }));
    await user.click(screen.getByRole("button", { name: /Start workout/i }));

    expect(screen.getByRole("heading", { name: "Incline Bench Press" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Skip exercise/i }));

    expect(screen.getByRole("heading", { name: "Seated Shoulder Press" })).toBeInTheDocument();
    const queue = screen.getByRole("heading", { name: "Workout queue" }).closest("section");
    expect(queue).not.toBeNull();
    expect(within(queue as HTMLElement).getByText("2 remaining")).toBeInTheDocument();
    expect(within(queue as HTMLElement).getByText("1 parked")).toBeInTheDocument();

    await user.click(within(queue as HTMLElement).getByRole("button", { name: /Incline Bench Press.*Parked/i }));

    expect(screen.getByRole("heading", { name: "Incline Bench Press" })).toBeInTheDocument();
  });

  it("shows plate guidance and a live PR badge after a new record set", async () => {
    const user = userEvent.setup();
    render(<AppPage />);

    await user.click(screen.getByRole("button", { name: "Workout" }));
    await user.click(screen.getByRole("button", { name: /Start workout/i }));

    expect(screen.getByLabelText("Plate calculator")).toHaveTextContent("Bar 20kg");

    await user.click(screen.getByRole("button", { name: /Hoàn thành set/i }));

    expect(await screen.findByRole("status", { name: "Live PR notification" })).toHaveTextContent("New PR");
    expect(screen.getByText(/New PR:/)).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Progress" }));

    expect(screen.getByRole("heading", { name: "Hydration trend" })).toBeInTheDocument();
    expect(screen.queryByText("Creatine consistency")).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Progress" }));
    await user.click(within(screen.getByLabelText("Body metric range")).getByRole("button", { name: "90d" }));
    const weightInput = screen.getByLabelText("Weight (kg)");
    await user.clear(weightInput);
    await user.type(weightInput, "0");

    expect(screen.getByRole("alert")).toHaveTextContent("Weight must be greater than 0.");
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

    await user.click(screen.getByRole("button", { name: "Progress" }));

    expect(screen.getByText("Guarded coach")).toBeInTheDocument();
    expect(screen.getByText(/AI insight is hidden until at least 3 useful working sets/i)).toBeInTheDocument();
    expect(screen.getByText(/Training guidance only/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent sets: no completed working sets yet/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Too heavy/i), "looks good");
    await user.click(screen.getByRole("button", { name: "Accept" }));

    expect(screen.getByRole("heading", { name: "Recommendation history" })).toBeInTheDocument();
    expect(screen.getByText("accepted")).toBeInTheDocument();
    expect(screen.getByText(/looks good/)).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByText("Current Athlete")).toBeInTheDocument();

    const file = new File(
      [JSON.stringify({ metadata: { schemaVersion: 2 }, data: { hydrationLogs: [{ id: "bad", amountMl: "wrong", loggedAt: "2026-08-21T00:00:00.000Z" }] } })],
      "bad-export.json",
      { type: "application/json" }
    );
    await user.upload(screen.getByLabelText("Import JSON"), file);

    expect(await screen.findByText(/không hợp lệ/i)).toBeInTheDocument();
    expect(screen.getByText("Current Athlete")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("evolvefit-state-v1") ?? "{}").profile.name).toBe("Current Athlete");
    expect(screen.getByRole("button", { name: "Delete personal data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset demo data" })).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Progress" }));

    expect(screen.getByText(/Friend leaderboard is private and disabled/i)).toBeInTheDocument();
    expect(screen.getAllByText("Sharing is off.").length).toBeGreaterThan(0);
    expect(screen.getByText(/redact weight, body fat, email, and workout details/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bench Press.*RPE/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Publish" })[0]);
    expect(await screen.findByText(/Turn on the matching share permission/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByText("Social privacy")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Share badges"));
    await user.click(screen.getByLabelText("Friend leaderboard"));

    await user.click(screen.getByRole("button", { name: "Progress" }));
    expect(screen.getByText("Private friend leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Badge share")).toBeInTheDocument();
    expect(screen.getByText(/Redacted: weight, body fat, exercise details, email/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Publish" })[0]);
    expect(await screen.findByText(/Shared to private friends/i)).toBeInTheDocument();
    expect(screen.getByText("private-friends")).toBeInTheDocument();
  });
});
