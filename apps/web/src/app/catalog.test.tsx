import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAppDataExport, defaultExerciseCatalog, initialState, normalizeExerciseDefinition, routineMarketplaceTemplates } from "@evolvefit/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp, seedGuest, sessionResponse } from "@/test/render-app";

const serverExercise = normalizeExerciseDefinition({
  id: "market-admin-published",
  slug: "admin-published-press",
  name: "Admin Published Press",
  muscleGroup: "Vai",
  equipment: "dumbbell",
  movementPattern: "push",
  builtIn: true,
  catalogSource: "marketplace",
  status: "published"
});

function stubCatalog(options: { exercises?: unknown; templates?: unknown; fail?: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/exercises/marketplace")) {
        if (options.fail) return Response.json({ ok: false, error: "boom" }, { status: 500 });
        return Response.json({ ok: true, data: { items: options.exercises ?? [serverExercise], page: 1, pageSize: 50, total: 1 } });
      }
      if (url.includes("/api/routine-templates")) {
        if (options.fail) return Response.json({ ok: false, error: "boom" }, { status: 500 });
        const items = (options.templates as unknown[]) ?? routineMarketplaceTemplates;
        return Response.json({ ok: true, data: { items, page: 1, pageSize: 50, total: items.length } });
      }
      if (url.endsWith("/api/account/export")) return Response.json({ ok: true, data: createAppDataExport(initialState) });
      return sessionResponse();
    })
  );
}

describe("Shared catalog in the app (P3)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("shows exercises published by admins from the shared catalog", async () => {
    seedGuest();
    stubCatalog({});
    renderApp("/library");
    expect((await screen.findAllByText("Admin Published Press")).length).toBeGreaterThan(0);
  });

  it("falls back to the built-in catalog when the API is unavailable", async () => {
    seedGuest();
    stubCatalog({ fail: true });
    renderApp("/library");
    const builtInMarketplace = defaultExerciseCatalog.map(normalizeExerciseDefinition).find((exercise) => exercise.catalogSource === "marketplace" && exercise.status === "published");
    expect(builtInMarketplace).toBeTruthy();
    expect((await screen.findAllByText(builtInMarketplace!.name)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Admin Published Press")).not.toBeInTheDocument();
  });

  it("lists routine templates published in the shared catalog", async () => {
    seedGuest();
    const template = { ...routineMarketplaceTemplates[0], id: "template-admin-new", slug: "admin-new-plan", name: "Admin New Plan" };
    stubCatalog({ templates: [template] });
    renderApp("/routines");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Template" }));
    expect((await screen.findAllByText("Admin New Plan")).length).toBeGreaterThan(0);
  });
});
