"use client";

import { useMemo, useState } from "react";
import { isUserOwnedExercise, listMarketplaceExercises, normalizeExerciseDefinition, type EquipmentType, type ExerciseDefinition, type MovementPattern } from "@evolvefit/shared";
import { equipmentLabel, muscleBucketOf, type MuscleBucketId } from "@/lib/i18n/vi";
import { useAppStore } from "@/lib/store/app-store";
import { useMarketplaceCatalog } from "../catalog/queries";
import { selectWorkout } from "../workout/selectors";
import * as library from "./actions";

export type LibraryTab = "catalog" | "mine";
export type LibraryFilters = { bucket: "all" | MuscleBucketId; equipment: "all" | EquipmentType; difficulty: "all" | "beginner" | "intermediate" | "advanced"; tag: string };
export type CustomExerciseInput = { name: string; muscleGroup: string; equipment: EquipmentType; movementPattern: MovementPattern };

const allFilters: LibraryFilters = { bucket: "all", equipment: "all", difficulty: "all", tag: "all" };
const noServerFilters = { query: "", muscleGroup: "all", equipment: "all", difficulty: "all", tag: "all" };
const pageSize = 30;

function matches(exercise: ExerciseDefinition, query: string, filters: LibraryFilters): boolean {
  if (query) {
    const haystack = [exercise.name, exercise.muscleGroup, ...(exercise.primaryMuscles ?? []), ...(exercise.tags ?? []), equipmentLabel[exercise.equipment] ?? exercise.equipment]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.bucket !== "all") {
    const buckets = [exercise.muscleGroup, ...(exercise.primaryMuscles ?? [])].map(muscleBucketOf);
    if (!buckets.includes(filters.bucket)) return false;
  }
  if (filters.equipment !== "all" && exercise.equipment !== filters.equipment) return false;
  if (filters.difficulty !== "all" && exercise.difficulty !== filters.difficulty) return false;
  if (filters.tag !== "all" && !(exercise.tags ?? []).includes(filters.tag)) return false;
  return true;
}

export function useLibraryScreen() {
  const state = useAppStore((store) => store.state);
  const [tab, setTab] = useState<LibraryTab>("catalog");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LibraryFilters>(allFilters);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The whole catalog is small (~100 items): load it once and filter on the device for instant results.
  const catalog = useMarketplaceCatalog(noServerFilters, listMarketplaceExercises(state.exerciseLibrary, {}));
  // Built-in exercises ship with the app; marketplace items come from the shared catalog (server or built-in copy).
  const builtIn = useMemo(
    () => state.exerciseLibrary.map(normalizeExerciseDefinition).filter((exercise) => exercise.catalogSource === "built-in" && exercise.status !== "archived"),
    [state.exerciseLibrary]
  );
  const catalogItems = useMemo(() => {
    const marketplaceIds = new Set(catalog.items.map((exercise) => exercise.id));
    return [...catalog.items, ...builtIn.filter((exercise) => !marketplaceIds.has(exercise.id))].sort((a, b) => a.name.localeCompare(b.name));
  }, [builtIn, catalog.items]);
  const ownExercises = useMemo(() => state.exerciseLibrary.filter(isUserOwnedExercise).map(normalizeExerciseDefinition), [state.exerciseLibrary]);
  const source = tab === "catalog" ? catalogItems : ownExercises;
  const query = search.trim().toLowerCase();
  const results = useMemo(() => source.filter((exercise) => matches(exercise, query, filters)), [source, query, filters]);
  const tags = useMemo(() => [...new Set(catalogItems.flatMap((exercise) => exercise.tags ?? []))].sort().slice(0, 20), [catalogItems]);
  const selected = [...catalogItems, ...ownExercises].find((exercise) => exercise.id === selectedId) ?? null;
  const { activeWorkoutDay, activeRoutine } = selectWorkout(state, new Date());
  const activeFilterCount = [filters.equipment, filters.difficulty, filters.tag].filter((value) => value !== "all").length;

  const resetPaging = () => setVisibleCount(pageSize);

  return {
    tab,
    setTab: (next: LibraryTab) => {
      setTab(next);
      resetPaging();
    },
    search,
    setSearch: (value: string) => {
      setSearch(value);
      resetPaging();
    },
    filters,
    setFilters: (next: Partial<LibraryFilters>) => {
      setFilters((current) => ({ ...current, ...next }));
      resetPaging();
    },
    resetFilters: () => {
      setFilters(allFilters);
      resetPaging();
    },
    activeFilterCount,
    tags,
    results: results.slice(0, visibleCount),
    totalResults: results.length,
    showMore: () => setVisibleCount((count) => count + pageSize),
    catalogUnavailable: tab === "catalog" && catalog.unavailable,
    ownCount: ownExercises.length,
    selected,
    open: (id: string) => setSelectedId(id),
    close: () => setSelectedId(null),
    targetDayName: activeRoutine && activeWorkoutDay ? activeWorkoutDay.name : undefined,
    addToDay: (exercise: ExerciseDefinition) => library.addExerciseFromLibrary(exercise),
    cloneToMine: (exercise: ExerciseDefinition) => library.cloneExerciseFromMarketplace(exercise),
    createCustom: (input: CustomExerciseInput) => library.addCustomExerciseDefinition(input),
    updateCustom: (id: string, input: CustomExerciseInput) => library.updateExerciseDefinition(id, input),
    deleteCustom: (id: string) => {
      library.deleteExerciseDefinition(id);
      setSelectedId(null);
    }
  };
}
