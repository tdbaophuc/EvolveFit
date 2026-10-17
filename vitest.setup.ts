import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Components navigate with next/navigation; tests use an in-memory router (see apps/web/src/test/render-app.tsx).
vi.mock("next/navigation", () => import("./apps/web/src/test/next-navigation-mock"));
