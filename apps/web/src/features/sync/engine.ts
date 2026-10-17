"use client";

import { useEffect, useSyncExternalStore } from "react";
import { markSyncItemConflict, markSyncItemFailed, markSyncItemSynced, markSyncItemSyncing, type AppState, type SyncQueueItem } from "@evolvefit/shared";
import { evolveFitApiClient } from "@/lib/api-client";
import { notify, useAppStore } from "@/lib/store/app-store";
import { useAuthStore } from "../auth/store";
import { isUnauthorized, markSessionExpired } from "./pull";

export type SyncStatus = "offline" | "pending" | "failed" | "synced" | "local" | "expired";

/** Items sent per /api/sync/batch request (the API accepts up to 250). */
export const syncBatchSize = 50;

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

export function syncStatusOf(queue: AppState["syncQueue"], online: boolean, session: { signedIn: boolean; expired: boolean } = { signedIn: true, expired: false }): SyncStatus {
  if (!session.signedIn) return "local";
  if (session.expired) return "expired";
  if (!online) return "offline";
  if (queue.some((item) => item.status === "failed" || item.status === "conflict")) return "failed";
  if (queue.some((item) => item.status === "pending" || item.status === "syncing")) return "pending";
  return "synced";
}

export function syncStatusLabel(status: SyncStatus) {
  if (status === "local") return "Chỉ lưu trên máy";
  if (status === "expired") return "Cần đăng nhập lại";
  if (status === "offline") return "Ngoại tuyến";
  if (status === "pending") return "Đang chờ đồng bộ";
  if (status === "failed") return "Đồng bộ lỗi";
  return "Đã đồng bộ";
}

function setQueue(update: (queue: SyncQueueItem[]) => SyncQueueItem[]) {
  useAppStore.getState().setState((current) => ({ ...current, syncQueue: update(current.syncQueue) }));
}

/** Item ids with a request in flight. Module-level so re-renders never start a duplicate request. */
const inFlight = new Set<string>();

/**
 * Pushes queued local changes of the signed-in account to the API in batches, honouring retry backoff and
 * conflicts. Guests are local-first and never sync; an expired session pauses the queue without failing items.
 */
export function useSyncEngine() {
  const hydrated = useAppStore((store) => store.hydrated);
  const account = useAppStore((store) => store.account);
  const syncQueue = useAppStore((store) => store.state.syncQueue);
  const sessionExpired = useAuthStore((store) => store.sessionExpired);
  const sessionChecked = useAuthStore((store) => store.sessionChecked);
  const reconciling = useAuthStore((store) => store.cloudMergePreview !== null);
  const online = useOnline();

  useEffect(() => {
    if (!hydrated || !online || !account || !sessionChecked || sessionExpired || reconciling || inFlight.size) return;
    const now = Date.now();
    const retryable = syncQueue.filter((item) => item.status === "pending" || item.status === "failed");
    const due = retryable.filter((item) => !item.nextRetryAt || new Date(item.nextRetryAt).getTime() <= now).slice(0, syncBatchSize);
    if (!due.length) {
      // Wake up when the earliest backoff expires so failed items are retried without user action.
      const nextRetryAt = Math.min(...retryable.map((item) => (item.nextRetryAt ? new Date(item.nextRetryAt).getTime() : Infinity)));
      if (!Number.isFinite(nextRetryAt)) return;
      const timer = setTimeout(() => setQueue((queue) => [...queue]), Math.max(1000, nextRetryAt - now));
      return () => clearTimeout(timer);
    }

    const ids = due.map((item) => item.id);
    ids.forEach((id) => inFlight.add(id));
    setQueue((queue) => ids.reduce((next, id) => markSyncItemSyncing(next, id), queue));
    const batchKey = `batch:${ids[0]}:${ids.length}`;

    // Not cancelled on re-render: marking items "syncing" changes the queue and re-runs this effect,
    // and dropping the response there would leave them stuck in "syncing" forever.
    evolveFitApiClient
      .syncBatch({
        idempotencyKey: batchKey,
        items: due.map((item) => ({ id: item.id, type: item.type, payload: item.payload, idempotencyKey: item.idempotencyKey ?? item.id }))
      })
      .then((body) => {
        if (!body.ok) {
          if (isUnauthorized(body)) {
            // Pause, don't fail: the items are retried as-is after the user signs in again.
            setQueue((queue) => queue.map((item) => (ids.includes(item.id) ? { ...item, status: "pending" } : item)));
            markSessionExpired();
            return;
          }
          setQueue((queue) => ids.reduce((next, id) => markSyncItemFailed(next, id, body.error ?? "Yêu cầu đồng bộ thất bại"), queue));
          return;
        }
        const results = body.data?.results ?? [];
        let conflicts = 0;
        setQueue((queue) =>
          due.reduce((next, item, index) => {
            const result = results.find((entry) => entry.id === item.id) ?? results[index];
            if (result?.status === "conflict" && result.conflict) {
              conflicts += 1;
              return markSyncItemConflict(next, item.id, result.conflict);
            }
            if (result && result.status !== "synced") return markSyncItemFailed(next, item.id, result.error ?? "Đồng bộ thất bại");
            return markSyncItemSynced(next, item.id);
          }, queue)
        );
        if (conflicts) notify("Lịch tập bị xung đột, cần xem trước rồi xác nhận trong Cài đặt → Đồng bộ");
      })
      .finally(() => {
        ids.forEach((id) => inFlight.delete(id));
        // Nudge the effect so the next batch is picked up.
        setQueue((queue) => [...queue]);
      });
  }, [account, hydrated, online, reconciling, sessionChecked, sessionExpired, syncQueue]);
}
