import { render } from "@testing-library/react";
import React, { Suspense, useSyncExternalStore } from "react";
import { initialState, type AppState } from "@evolvefit/shared";
import { AppShell } from "@/features/app/app-shell";
import { HydrationScreen, ProgressScreen, SettingsScreen, TodayScreen, WorkoutScreen } from "@/features/app/screens";
import { ForgotPasswordForm, ResetPasswordForm, SignInForm, SignUpForm } from "@/features/auth/auth-forms";
import { AuthLayout } from "@/features/auth/auth-layout";
import { useAuthStore } from "@/features/auth/store";
import { useWorkoutUi } from "@/features/workout/ui-store";
import { useAppStore } from "@/lib/store/app-store";
import { resetPullThrottle } from "@/features/sync/pull";
import { QueryProvider } from "@/lib/query-provider";
import { storageKeyFor } from "@/lib/storage";
import { getTestUrl, setTestUrl, subscribeTestUrl } from "./next-navigation-mock";

const authPages: Record<string, () => React.ReactElement> = {
  "sign-in": () => <SignInForm />,
  "sign-up": () => <SignUpForm />,
  "forgot-password": () => <ForgotPasswordForm />,
  "reset-password": () => <ResetPasswordForm />
};

function appPageFor(segment: string) {
  if (segment === "hydration") return <HydrationScreen />;
  if (segment === "workout" || segment === "routines" || segment === "library") return <WorkoutScreen key={segment} section={segment} />;
  if (segment === "progress") return <ProgressScreen />;
  if (segment === "settings") return <SettingsScreen />;
  return <TodayScreen />;
}

function TestApp() {
  const url = useSyncExternalStore(subscribeTestUrl, getTestUrl, getTestUrl);
  const segment = url.split("?")[0].split("/")[1] || "today";
  const authPage = authPages[segment];
  return (
    <QueryProvider>
      {authPage ? (
        <AuthLayout>
          <Suspense>{authPage()}</Suspense>
        </AuthLayout>
      ) : (
        <AppShell>{appPageFor(segment)}</AppShell>
      )}
    </QueryProvider>
  );
}

/** Renders the real app (shell + page, or an auth page) for `url`, with client-side navigation working like the browser. */
export function renderApp(url = "/") {
  // Each test starts like a fresh page load: in-memory stores are reset and state is re-read from localStorage.
  resetPullThrottle();
  useWorkoutUi.getState().reset();
  useAuthStore.getState().reset();
  useAppStore.setState({ hydrated: false, toast: null });
  setTestUrl(url);
  return render(<TestApp />);
}

export const guestStorageKey = storageKeyFor(null);

/** Seeds the guest namespace (not signed in). */
export function seedGuest(patch: Partial<AppState> = {}, profile: Partial<AppState["profile"]> = {}) {
  window.localStorage.removeItem("evolvefit-active-account");
  window.localStorage.setItem(guestStorageKey, JSON.stringify({ ...initialState, ...patch, profile: { ...initialState.profile, onboardingCompleted: true, ...profile } }));
}

/** Seeds a signed-in account namespace and makes it the active one. */
export function seedAccount(email: string, patch: Partial<AppState> = {}, profile: Partial<AppState["profile"]> = {}) {
  window.localStorage.setItem("evolvefit-active-account", email);
  window.localStorage.setItem(
    storageKeyFor(email),
    JSON.stringify({ ...initialState, ...patch, profile: { ...initialState.profile, onboardingCompleted: true, email, authMode: "email", ...profile } })
  );
}

export function storedState(account: string | null = null) {
  return JSON.parse(window.localStorage.getItem(storageKeyFor(account)) ?? "{}");
}

/** fetch stub that answers /api/auth/session as a signed-in session for `email` (or anonymous). */
export function sessionResponse(email?: string) {
  return Response.json({ ok: true, data: email ? { mode: "email", email, authenticated: true } : { mode: "local", email: "local@evolvefit.app", authenticated: false } });
}
