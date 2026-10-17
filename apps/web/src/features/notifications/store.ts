import { create } from "zustand";
import type { PushSubscriptionStatus } from "@/app/_features/settings/settings-view";

type NotificationStore = {
  permission: NotificationPermission;
  pushStatus: PushSubscriptionStatus;
  pushConfigured: boolean;
  vapidPublicKey: string | null;
  patch: (next: Partial<Omit<NotificationStore, "patch">>) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  permission: "default",
  pushStatus: "unsupported",
  pushConfigured: false,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
  patch: (next) => set(next)
}));
