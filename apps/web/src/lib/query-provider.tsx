"use client";

import React, { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Server-state cache (TanStack Query). Feature data hooks are added from P2/P3 onwards. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
          mutations: { retry: 0 }
        }
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
