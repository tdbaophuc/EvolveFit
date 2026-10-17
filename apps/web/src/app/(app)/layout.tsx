import type { ReactNode } from "react";
import { AppShell } from "@/features/app/app-shell";

export default function UserAppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
