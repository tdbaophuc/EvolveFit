"use client";

import { useState, type ComponentProps } from "react";
import type { HydrationLog } from "@evolvefit/shared";
import type { HydrationDetailView } from "@/app/_features/hydration/hydration-detail";
import { useAppStore } from "@/lib/store/app-store";
import { updateNotificationSettings, updateProfile } from "../settings/actions";
import { deleteHydrationLog, deleteQuickAmount, editHydrationLog, logCreatine, logWater, updateQuickAmount } from "./actions";
import { selectHydration } from "./selectors";

export function useHydrationScreen(): ComponentProps<typeof HydrationDetailView> {
  const state = useAppStore((store) => store.state);
  const [waterAmount, setWaterAmount] = useState(650);
  const [creatineAmount, setCreatineAmount] = useState(5);
  const [drinkType, setDrinkType] = useState<HydrationLog["drinkType"]>("water");
  const hydration = selectHydration(state, new Date());

  return {
    totalWater: hydration.totalWater,
    percent: hydration.percent,
    target: state.profile.waterTargetMl,
    pace: hydration.pace,
    quickWater: hydration.quickWater,
    waterAmount,
    setWaterAmount,
    // Defaults to the drink type chosen on this screen, as before.
    logWater: (amountMl: number, pin = false, type: HydrationLog["drinkType"] = drinkType) => logWater(amountMl, pin, type),
    drinkType,
    setDrinkType,
    quickAmounts: state.quickAmounts.filter((item) => item.category === "hydration"),
    updateQuickAmount,
    deleteQuickAmount,
    quickCreatine: hydration.quickCreatine,
    creatineAmount,
    setCreatineAmount,
    logCreatine,
    creatineLogged: hydration.creatineLogged,
    creatineReminder: hydration.creatineReminder,
    activeOptionalDrinkModules: hydration.activeOptionalDrinkModules,
    hydrationLogs: hydration.activeHydrationLogs,
    editHydrationLog,
    deleteHydrationLog,
    waterReminderEnabled: hydration.waterReminderEnabled,
    waterReminderLabel: hydration.hydrationReminderLabel,
    updateProfile,
    updateNotificationSettings
  };
}
