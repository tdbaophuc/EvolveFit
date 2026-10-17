import { useSyncExternalStore } from "react";

/** In-memory stand-in for next/navigation so components can navigate inside tests. */
let currentUrl = "/";
const listeners = new Set<() => void>();

export function setTestUrl(url: string) {
  currentUrl = url;
  listeners.forEach((listener) => listener());
}

export function getTestUrl() {
  return currentUrl;
}

export function subscribeTestUrl(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const router = {
  push: (url: string) => setTestUrl(url),
  replace: (url: string) => setTestUrl(url),
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  prefetch: () => Promise.resolve()
};

export function useRouter() {
  return router;
}

export function usePathname() {
  return useSyncExternalStore(subscribeTestUrl, () => currentUrl.split("?")[0], () => currentUrl.split("?")[0]);
}

export function useSearchParams() {
  const url = useSyncExternalStore(subscribeTestUrl, () => currentUrl, () => currentUrl);
  return new URLSearchParams(url.split("?")[1] ?? "");
}

export function redirect(url: string) {
  setTestUrl(url);
}

export function notFound() {
  throw new Error("notFound()");
}
