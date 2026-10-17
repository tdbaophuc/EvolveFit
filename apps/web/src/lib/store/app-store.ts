import { create } from "zustand";
import { enqueueSync, initialState, type AppState } from "@evolvefit/shared";
import { activeAccount, loadState, saveState, setActiveAccount, type AccountId } from "@/lib/storage";

type StateUpdate = AppState | ((current: AppState) => AppState);

type AppStore = {
  state: AppState;
  /** Namespace currently open: null = guest, otherwise the signed-in account's email. */
  account: AccountId;
  /** False until the persisted state has been read on the client (avoids hydration mismatches). */
  hydrated: boolean;
  toast: string | null;
  hydrate: () => void;
  setState: (update: StateUpdate) => void;
  /** Opens another namespace (sign-in / sign-out) with the given state. */
  switchAccount: (account: AccountId, state: AppState) => void;
  notify: (message: string | null) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  state: initialState,
  account: null,
  hydrated: false,
  toast: null,
  hydrate: () => {
    const account = activeAccount();
    set({ account, state: loadState(account), hydrated: true, toast: null });
  },
  setState: (update) => set((store) => ({ state: typeof update === "function" ? update(store.state) : update })),
  switchAccount: (account, state) => {
    setActiveAccount(account);
    set({ account, state });
  },
  notify: (message) => set({ toast: message })
}));

// Persist every committed change into the namespace of the account it belongs to.
useAppStore.subscribe((store, previous) => {
  if (store.hydrated && (store.state !== previous.state || store.account !== previous.account)) saveState(store.state, store.account);
});

/** Latest state at call time - actions must use this instead of a render-time snapshot. */
export function currentState(): AppState {
  return useAppStore.getState().state;
}

export function currentAccount(): AccountId {
  return useAppStore.getState().account;
}

export function notify(message: string | null) {
  useAppStore.getState().notify(message);
}

export function commit(next: StateUpdate, message?: string) {
  useAppStore.getState().setState(next);
  if (message) notify(message);
}

/** Commits a change and queues it for cloud sync. */
export function commitSynced(next: AppState, type: string, payload: unknown, message?: string) {
  commit({ ...next, syncQueue: enqueueSync(next.syncQueue, { type, payload }) }, message);
}

/** Commits a change that the user can undo from the toast. */
export function withUndo(next: AppState, label: string, message: string) {
  const previous = { ...currentState(), undo: undefined };
  commit({ ...next, undo: { label, state: previous } }, message);
}

export function undo() {
  const snapshot = currentState().undo;
  if (!snapshot) return;
  commit(snapshot.state, `Đã hoàn tác ${snapshot.label}`);
}
