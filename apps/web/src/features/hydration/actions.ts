import {
  cryptoSafeId,
  enqueueSync,
  isDrinkModuleActive,
  normalizeDrinkModules,
  upsertQuickAmount,
  type DrinkModule,
  type HydrationLog
} from "@evolvefit/shared";
import { commit, commitSynced, currentState, notify, withUndo } from "@/lib/store/app-store";

function drinkModulesOf() {
  const state = currentState();
  return normalizeDrinkModules(state.drinkModules, state.profile.waterTargetMl, state.profile.creatineAmountG);
}

export function logWater(amountMl: number, pin = false, type: HydrationLog["drinkType"] = "water") {
  const state = currentState();
  const drinkModules = drinkModulesOf();
  if (!isDrinkModuleActive(drinkModules, type)) {
    const drinkName = drinkModules.find((module) => module.id === type)?.name ?? type;
    notify(`${drinkName} đang tắt trong Cài đặt thức uống.`);
    return;
  }
  const log = { id: cryptoSafeId(), amountMl, drinkType: type, loggedAt: new Date().toISOString() };
  const quickAmounts = upsertQuickAmount(state.quickAmounts, {
    category: "hydration",
    label: `+${amountMl}ml`,
    amount: amountMl,
    unit: "ml",
    pinned: pin || state.quickAmounts.some((item) => item.category === "hydration" && item.amount === amountMl)
  });
  withUndo(
    { ...state, hydrationLogs: [...state.hydrationLogs, log], quickAmounts, syncQueue: enqueueSync(state.syncQueue, { type: "hydration.log", payload: log }) },
    "water",
    `Đã ghi nhận ${amountMl}ml`
  );
}

export function editHydrationLog(id: string, deltaMl: number) {
  const state = currentState();
  const hydrationLogs = state.hydrationLogs.map((log) => (log.id === id ? { ...log, amountMl: Math.max(50, log.amountMl + deltaMl) } : log));
  withUndo({ ...state, hydrationLogs, syncQueue: enqueueSync(state.syncQueue, { type: "hydration.patch", payload: { id, deltaMl } }) }, "edit water", "Đã cập nhật log nước");
}

export function deleteHydrationLog(id: string) {
  const state = currentState();
  withUndo(
    { ...state, hydrationLogs: state.hydrationLogs.filter((log) => log.id !== id), syncQueue: enqueueSync(state.syncQueue, { type: "hydration.delete", payload: { id } }) },
    "delete water",
    "Đã xóa log nước"
  );
}

export function logCreatine(amount = currentState().profile.creatineAmountG, pin = false) {
  const state = currentState();
  if (!isDrinkModuleActive(drinkModulesOf(), "creatine")) {
    notify("Creatine đang tắt trong Cài đặt thức uống.");
    return;
  }
  const creatine = state.supplements.find((supplement) => supplement.name.toLowerCase() === "creatine");
  const log = {
    id: cryptoSafeId(),
    supplementId: creatine?.id,
    name: "Creatine",
    amount,
    unit: "g" as const,
    loggedAt: new Date().toISOString(),
    status: "taken" as const
  };
  const quickAmounts = upsertQuickAmount(state.quickAmounts, {
    category: "supplement",
    label: `${amount}g`,
    amount,
    unit: "g",
    pinned: pin || state.quickAmounts.some((item) => item.category === "supplement" && item.amount === amount)
  });
  withUndo(
    { ...state, supplementLogs: [...state.supplementLogs, log], quickAmounts, syncQueue: enqueueSync(state.syncQueue, { type: "supplement.log", payload: log }) },
    "creatine",
    `Đã ghi nhận Creatine ${amount}g`
  );
}

export function updateDrinkModule(id: DrinkModule["id"], patch: Partial<DrinkModule>) {
  const state = currentState();
  if (id === "water" && patch.active === false) {
    notify("Nước là đồ uống chính nên không thể tắt.");
    return;
  }
  const nextModules = drinkModulesOf().map((module) =>
    module.id === id ? { ...module, ...patch, active: id === "water" ? true : (patch.active ?? module.active) } : module
  );
  const nextSupplements =
    id === "creatine" && patch.active !== undefined
      ? state.supplements.map((supplement) => (supplement.name.toLowerCase() === "creatine" ? { ...supplement, active: Boolean(patch.active) } : supplement))
      : state.supplements;
  commitSynced(
    {
      ...state,
      drinkModules: nextModules,
      supplements: nextSupplements,
      notificationSettings: id === "creatine" && patch.active === false ? { ...state.notificationSettings, creatineEnabled: false } : state.notificationSettings
    },
    "drinkModule.update",
    { id, patch },
    "Đã cập nhật cài đặt thức uống"
  );
}

export function updateQuickAmount(id: string, patch: { pinned?: boolean }) {
  commit((state) => ({ ...state, quickAmounts: state.quickAmounts.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
}

export function deleteQuickAmount(id: string) {
  commit((state) => ({ ...state, quickAmounts: state.quickAmounts.filter((item) => item.id !== id) }));
}
