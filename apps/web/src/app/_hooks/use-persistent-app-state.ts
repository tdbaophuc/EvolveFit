"use client";

import { useEffect, useState } from "react";
import { initialState, type AppState } from "@evolvefit/shared";
import { loadState, saveState } from "@/lib/storage";

export function usePersistentAppState() {
  const [state, setState] = useState<AppState>(initialState);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveState(state);
  }, [mounted, state]);

  return { state, setState, mounted };
}
