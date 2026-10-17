import {
  expectedHydrationByNow,
  hydrationPaceStatus,
  hydrationPercent,
  hydrationTotal,
  isDrinkModuleActive,
  normalizeDrinkModules,
  shouldSendCreatineReminder,
  shouldSendHydrationReminder,
  visibleHydrationLogs,
  visibleQuickAmounts,
  type AppState
} from "@evolvefit/shared";

/** Derived hydration/supplement figures shared by Today, Hydration and the app shell. */
export function selectHydration(state: AppState, now: Date) {
  const drinkModules = normalizeDrinkModules(state.drinkModules, state.profile.waterTargetMl, state.profile.creatineAmountG);
  const activeHydrationLogs = visibleHydrationLogs(state.hydrationLogs, drinkModules);
  const waterModule = drinkModules.find((module) => module.id === "water");
  const creatineModule = drinkModules.find((module) => module.id === "creatine");
  const creatineActive = isDrinkModuleActive(drinkModules, "creatine");
  const activeOptionalDrinkModules = drinkModules.filter((module) => module.category === "drink" && module.active);
  const totalWater = hydrationTotal(state.hydrationLogs, now, drinkModules);
  const percent = hydrationPercent(totalWater, state.profile.waterTargetMl);
  const expectedWater = expectedHydrationByNow(state.profile.waterTargetMl, state.profile.wakeHour, state.profile.sleepHour, now);
  const pace = hydrationPaceStatus(totalWater, expectedWater);
  const lastHydrationLog = activeHydrationLogs[activeHydrationLogs.length - 1];
  const settings = state.notificationSettings;
  const quietHours = { start: settings.quietHoursStart, end: settings.quietHoursEnd };

  const hydrationReminder =
    waterModule?.reminderEnabled !== false &&
    settings.hydrationEnabled &&
    shouldSendHydrationReminder({
      totalMl: totalWater,
      expectedMl: expectedWater,
      lastLogAt: lastHydrationLog?.loggedAt,
      lastReminderAt: settings.lastHydrationReminderAt,
      now,
      quietHours,
      quietHoursEnabled: settings.quietHoursEnabled,
      mode: settings.hydrationMode,
      times: settings.hydrationTimes,
      intervalHours: settings.hydrationIntervalHours,
      snoozeUntil: settings.snoozeUntil,
      enabled: isDrinkModuleActive(drinkModules, "water")
    });

  const creatineReminder =
    creatineActive &&
    creatineModule?.reminderEnabled !== false &&
    settings.creatineEnabled &&
    shouldSendCreatineReminder({
      logs: state.supplementLogs,
      scheduledHour: state.profile.creatineHour,
      scheduleHours: settings.creatineTimes,
      remindBeforeMinutes: state.profile.remindBeforeMinutes,
      lastReminderAt: settings.lastCreatineReminderAt,
      now,
      quietHours,
      quietHoursEnabled: settings.quietHoursEnabled,
      mode: settings.creatineMode,
      intervalHours: settings.creatineIntervalHours,
      snoozeUntil: settings.snoozeUntil,
      enabled: creatineActive
    });

  const today = now.toISOString().slice(0, 10);
  const creatineLogged = state.supplementLogs.some((log) => log.name === "Creatine" && log.status !== "skipped" && log.loggedAt.startsWith(today));

  const hydrationReminderLabel =
    settings.snoozeUntil && new Date(settings.snoozeUntil).getTime() > now.getTime()
      ? `Tạm hoãn đến ${new Date(settings.snoozeUntil).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
      : settings.hydrationMode === "fixed"
        ? `Giờ cố định ${settings.hydrationTimes.join(", ")}h`
        : `Mỗi ${settings.hydrationIntervalHours} giờ`;

  return {
    drinkModules,
    activeHydrationLogs,
    waterModule,
    creatineActive,
    activeOptionalDrinkModules,
    totalWater,
    percent,
    pace,
    hydrationReminder,
    creatineReminder,
    creatineLogged,
    hydrationReminderLabel,
    waterReminderEnabled: waterModule?.reminderEnabled !== false && settings.hydrationEnabled,
    quickWater: visibleQuickAmounts(state.quickAmounts, "hydration", 3),
    quickCreatine: visibleQuickAmounts(state.quickAmounts, "supplement", 2)
  };
}
