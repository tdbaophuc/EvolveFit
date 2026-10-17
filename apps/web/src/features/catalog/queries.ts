"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { normalizeExerciseDefinition, normalizeRoutineTemplate, type ExerciseDefinition, type RoutineTemplate } from "@evolvefit/shared";
import { evolveFitApiClient, type ApiResult } from "@/lib/api-client";

/** Where the catalog shown on screen came from: the shared server catalog, or the built-in copy (offline / error). */
export type CatalogSource = "server" | "local";

const pageSize = 50;
const maxPages = 5;
const staleTimeMs = 5 * 60_000;

type Page<T> = { items: T[]; page: number; total: number };

class CatalogUnavailableError extends Error {}

/** Fetches every page of a paginated catalog endpoint (bounded), validating the response shape. */
async function fetchAllPages<T>(load: (page: number) => Promise<ApiResult<Page<T>>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await load(page);
    if (!result.ok || !Array.isArray(result.data?.items)) throw new CatalogUnavailableError(result.ok ? "Unexpected catalog response" : result.error);
    items.push(...result.data.items);
    if (items.length >= result.data.total || result.data.items.length < pageSize) break;
  }
  return items;
}

export type ExerciseCatalogFilters = { query: string; muscleGroup: string; equipment: string; difficulty: string; tag: string };

/** Published marketplace exercises from the shared catalog, falling back to the built-in copy. */
export function useMarketplaceCatalog(filters: ExerciseCatalogFilters, fallback: ExerciseDefinition[]) {
  const query = useQuery({
    queryKey: ["catalog", "exercises", filters],
    queryFn: () =>
      fetchAllPages((page) => evolveFitApiClient.marketplaceExercises({ ...filters, page, pageSize })).then((items) => items.map(normalizeExerciseDefinition)),
    staleTime: staleTimeMs,
    placeholderData: keepPreviousData
  });
  return {
    items: query.data ?? fallback,
    source: (query.data ? "server" : "local") as CatalogSource,
    unavailable: query.isError && !query.data
  };
}

export type TemplateCatalogFilters = { query: string; goal: "all" | RoutineTemplate["targetGoal"]; equipment: string };

/** Published routine templates from the shared catalog, falling back to the built-in copy. */
export function useRoutineTemplateCatalog(filters: TemplateCatalogFilters, fallback: RoutineTemplate[]) {
  const query = useQuery({
    queryKey: ["catalog", "templates", filters],
    queryFn: () =>
      fetchAllPages((page) => evolveFitApiClient.routineTemplates({ ...filters, page, pageSize })).then((items) => items.map(normalizeRoutineTemplate)),
    staleTime: staleTimeMs,
    placeholderData: keepPreviousData
  });
  return {
    items: query.data ?? fallback,
    source: (query.data ? "server" : "local") as CatalogSource,
    unavailable: query.isError && !query.data
  };
}
