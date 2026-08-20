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
});
