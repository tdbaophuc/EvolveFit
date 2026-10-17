"use client";

import { useState, type ComponentProps } from "react";
import type { OnboardingPanel } from "@/app/_features/onboarding/onboarding-panel";
import { useAppStore } from "@/lib/store/app-store";
import { requestNotifications } from "../notifications/actions";
import { useNotificationStore } from "../notifications/store";
import { applyTemplate } from "../routines/actions";
import { completeOnboarding, updateNotificationSettings, updateProfile } from "../settings/actions";

export function useOnboardingScreen(): ComponentProps<typeof OnboardingPanel> {
  const state = useAppStore((store) => store.state);
  const permission = useNotificationStore((store) => store.permission);
  const [step, setStep] = useState(0);

  return {
    profile: state.profile,
    updateProfile,
    activeTemplate: state.activeTemplate,
    applyTemplate,
    step,
    setStep,
    notificationSettings: state.notificationSettings,
    notificationPermission: permission,
    updateNotificationSettings,
    requestNotifications,
    completeOnboarding
  };
}
