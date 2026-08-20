import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import AppPage from "./page";

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
