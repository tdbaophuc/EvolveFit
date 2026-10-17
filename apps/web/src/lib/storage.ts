import { initialState, migrateImportedAppData, type AppState } from "@evolvefit/shared";

/**
 * Local persistence, namespaced per account:
 * - guest (not signed in) keeps the original key, so data saved before accounts existed stays where it was;
 * - each signed-in account caches its own copy under `evolvefit-state-v1:account:<email>`;
 * - `evolvefit-active-account` remembers which namespace the app should open.
 */
const guestKey = "evolvefit-state-v1";
const activeAccountKey = "evolvefit-active-account";

/** Lower-cased account email, or null for the guest namespace. */
export type AccountId = string | null;

export function normalizeAccount(email: string | null | undefined): AccountId {
  const value = email?.trim().toLowerCase();
  return value ? value : null;
}

export function storageKeyFor(account: AccountId): string {
  return account ? `${guestKey}:account:${account}` : guestKey;
}

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // private mode / blocked storage
  }
}

export function activeAccount(): AccountId {
  return normalizeAccount(storage()?.getItem(activeAccountKey));
}

export function setActiveAccount(account: AccountId): void {
  const store = storage();
  if (!store) return;
  if (account) store.setItem(activeAccountKey, account);
  else store.removeItem(activeAccountKey);
}

export function hasAccountCache(account: AccountId): boolean {
  return Boolean(account && storage()?.getItem(storageKeyFor(account)));
}

export function loadState(account: AccountId = activeAccount()): AppState {
  const raw = storage()?.getItem(storageKeyFor(account));
  if (!raw) return initialState;
  try {
    const migrated = migrateImportedAppData(JSON.parse(raw));
    return migrated.ok ? migrated.data : initialState;
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState, account: AccountId = activeAccount()): void {
  try {
    storage()?.setItem(storageKeyFor(account), JSON.stringify(state));
  } catch {
    // Quota exceeded or storage blocked: keep running from memory.
  }
}

/** Removes an account's cached data from this device (used on sign-out from a shared device and account deletion). */
export function removeAccountCache(account: AccountId): void {
  if (account) storage()?.removeItem(storageKeyFor(account));
}

export function resetState(account: AccountId = activeAccount()): AppState {
  storage()?.removeItem(storageKeyFor(account));
  return initialState;
}
