"use client";

import { useRouter } from "next/navigation";
export type AppSection = "today" | "workout" | "routines" | "library" | "progress" | "settings";
export type AppRoute = AppSection | "hydration";

export function routeFor(section: AppRoute): string {
  return `/${section}`;
}

/** Client-side navigation between app screens (keeps the shell and in-memory UI state mounted). */
export function useNavigate() {
  const router = useRouter();
  return (section: AppRoute) => router.push(routeFor(section));
}
