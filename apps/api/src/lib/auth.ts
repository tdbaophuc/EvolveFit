import { sessionSecrets } from "./config";
import { sealJson, unsealJson } from "./session-crypto";
import { normalizeSupabaseProjectUrl } from "./supabase-url";

export type AuthMode = "local" | "email" | "google";

export type AuthSession = {
  mode: AuthMode;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  oauthUrl?: string;
  emailVerified?: boolean;
  needsEmailVerification?: boolean;
};

export const authCookieName = "evolvefit_session";
export const oauthCodeVerifierCookieName = "evolvefit_oauth_verifier";
export const oauthStateCookieName = "evolvefit_oauth_state";

export const defaultSessionMaxAgeSeconds = 60 * 60 * 24 * 7;
const anonymousEmail = "local@evolvefit.app";

/** Auth failures whose message is safe to show to clients (no upstream details). */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 401
  ) {
    super(message);
  }
}

type SealedSession = AuthSession & { iat: number; exp: number };

/** Anonymous placeholder session. Never carries tokens and is never shared between requests. */
export function getAuthSession(): AuthSession {
  return { mode: "local", email: anonymousEmail };
}

/** Strips tokens before a session is sent to browser JavaScript (the cookie itself stays httpOnly). */
export function publicSession(session: AuthSession, exposeTokens = false): AuthSession & { authenticated: boolean } {
  const authenticated = Boolean(session.accessToken) || (session.mode === "local" && session.email !== anonymousEmail);
  if (exposeTokens) return { ...session, authenticated };
  return {
    mode: session.mode,
    email: session.email,
    expiresAt: session.expiresAt,
    oauthUrl: session.oauthUrl,
    emailVerified: session.emailVerified,
    needsEmailVerification: session.needsEmailVerification,
    authenticated
  };
}

export async function signIn(input: {
  email: string;
  password?: string;
  mode?: AuthMode;
  oauthStartUrl?: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<AuthSession> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  const mode = input.mode ?? "email";

  if (mode === "google") {
    return { mode: "google", email: input.email, oauthUrl: input.oauthStartUrl };
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (!input.password) throw new AuthError("Invalid email or password");
    const supabaseUrl = normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL);
    const response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: input.email, password: input.password })
    });

    if (!response.ok) {
      if (response.status === 429) throw new AuthError("Too many sign-in attempts", 429);
      throw new AuthError("Invalid email or password");
    }

    return sessionFromSupabaseAuthPayload(await response.json(), input.email, "email");
  }

  // Local demo mode (memory repository only; production refuses to start without Supabase).
  return { mode, email: input.email };
}

export async function signUp(input: {
  email: string;
  password: string;
  redirectTo?: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<AuthSession> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { mode: "email", email: input.email };
  }

  const supabaseUrl = normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      options: input.redirectTo ? { emailRedirectTo: input.redirectTo } : undefined
    })
  });

  if (!response.ok) {
    if (response.status === 429) throw new AuthError("Too many sign-up attempts", 429);
    throw new AuthError("Sign-up failed", 400);
  }

  return sessionFromSupabaseAuthPayload(await response.json(), input.email, "email");
}

export async function refreshSession(input: {
  refreshToken: string;
  previous?: AuthSession;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<AuthSession> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!input.refreshToken) throw new AuthError("refresh token is required");
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (!input.previous) throw new AuthError("No session to refresh");
    return input.previous;
  }
  const supabaseUrl = normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token: input.refreshToken })
  });
  if (!response.ok) throw new AuthError("Session refresh failed");
  return sessionFromSupabaseAuthPayload(await response.json(), input.previous?.email ?? "user@evolvefit.app", input.previous?.mode === "google" ? "google" : "email");
}

export async function requestPasswordReset(input: {
  email: string;
  redirectTo?: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ email: string; sent: boolean; mode: "supabase" | "local" }> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!input.email.trim()) throw new Error("email is required");
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { email: input.email, sent: true, mode: "local" };
  }
  const supabaseUrl = normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/recover`, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: input.email, redirect_to: input.redirectTo })
  });
  if (!response.ok) {
    if (response.status === 429) throw new AuthError("Too many password reset requests", 429);
    throw new AuthError("Password reset request failed", 400);
  }
  return { email: input.email, sent: true, mode: "supabase" };
}

export async function resetPassword(input: {
  accessToken: string;
  password: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ updated: boolean }> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!input.accessToken) throw new Error("access token is required");
  if (!input.password || input.password.length < 8) throw new Error("password must be at least 8 characters");
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { updated: true };
  const supabaseUrl = normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password: input.password })
  });
  if (!response.ok) throw new AuthError("Password reset failed", 400);
  return { updated: true };
}

export function signOut(): AuthSession {
  return getAuthSession();
}

/** Session cookies are AES-256-GCM sealed with SESSION_SECRET: clients can neither read nor forge them. */
export function createSessionCookieValue(
  session: AuthSession,
  env: NodeJS.ProcessEnv = process.env,
  maxAgeSeconds = sessionMaxAgeSeconds(env),
  now = Date.now()
): string {
  const iat = Math.floor(now / 1000);
  const sealed: SealedSession = {
    mode: session.mode,
    email: session.email,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    emailVerified: session.emailVerified,
    iat,
    exp: iat + maxAgeSeconds
  };
  return sealJson(sealed, sessionSecrets(env));
}

export function parseSessionCookieValue(value: string | undefined, env: NodeJS.ProcessEnv = process.env, now = Date.now()): AuthSession | undefined {
  if (!value) return undefined;
  try {
    const parsed = unsealJson<Partial<SealedSession>>(value, sessionSecrets(env));
    if (!parsed || typeof parsed.email !== "string" || !isAuthMode(parsed.mode)) return undefined;
    if (typeof parsed.exp !== "number" || parsed.exp <= Math.floor(now / 1000)) return undefined;
    return {
      mode: parsed.mode,
      email: parsed.email,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      emailVerified: parsed.emailVerified
    };
  } catch {
    return undefined;
  }
}

export function sessionMaxAgeSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const configured = Number(env.SESSION_MAX_AGE_SECONDS);
  return Number.isInteger(configured) && configured > 0 ? configured : defaultSessionMaxAgeSeconds;
}

function isAuthMode(value: unknown): value is AuthMode {
  return value === "local" || value === "email" || value === "google";
}

export function bearerTokenFromAuthorization(value: string | undefined): string | undefined {
  const match = value?.match(/^Bearer\s+([A-Za-z0-9._~+/=-]{1,4096})$/i);
  return match?.[1];
}

export async function verifySupabaseJwt(input: {
  token: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ id: string; email: string }> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase auth env is missing");
  }
  const supabaseUrl = normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${input.token}`
    }
  });
  if (!response.ok) throw new Error(`Supabase JWT verification failed with status ${response.status}`);
  const payload = (await response.json()) as { id?: string; sub?: string; email?: string };
  const id = payload.id ?? payload.sub;
  if (!id) throw new Error("Supabase JWT payload is missing user id");
  return { id, email: payload.email ?? "user@evolvefit.app" };
}

export async function deleteSupabaseUser(input: {
  userId: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ deleted: boolean; mode: "service-role" | "missing-env" }> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { deleted: false, mode: "missing-env" };
  const supabaseUrl = normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(input.userId)}`, {
    method: "DELETE",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!response.ok && response.status !== 404) throw new Error(`Supabase user deletion failed with status ${response.status}`);
  return { deleted: response.ok, mode: "service-role" };
}

export function sessionFromSupabaseTokens(input: {
  email?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  mode?: AuthMode;
  emailVerified?: boolean;
  needsEmailVerification?: boolean;
}): AuthSession {
  return {
    mode: input.mode ?? "google",
    email: input.email ?? "user@evolvefit.app",
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt,
    emailVerified: input.emailVerified,
    needsEmailVerification: input.needsEmailVerification
  };
}

function sessionFromSupabaseAuthPayload(payload: unknown, fallbackEmail: string, mode: AuthMode): AuthSession {
  const data = payload as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
    user?: { email?: string; email_confirmed_at?: string; confirmed_at?: string };
  };
  const hasAccessToken = Boolean(data.access_token);
  const emailVerified = Boolean(data.user?.email_confirmed_at ?? data.user?.confirmed_at);
  return sessionFromSupabaseTokens({
    mode,
    email: data.user?.email ?? fallbackEmail,
    accessToken: data.access_token ?? "",
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ?? (data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined),
    emailVerified,
    needsEmailVerification: !hasAccessToken
  });
}

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function createOauthState(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(16)));
}

export function createCodeVerifier(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return Buffer.from(digest).toString("base64url");
}

export function createSupabaseOAuthUrl(
  provider: "google",
  redirectTo: string,
  env: NodeJS.ProcessEnv = process.env,
  options: { codeChallenge?: string; state?: string } = {}
): string | undefined {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return undefined;
  const url = new URL(`${normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL)}/auth/v1/authorize`);
  url.searchParams.set("provider", provider);
  url.searchParams.set("redirect_to", redirectTo);
  if (options.codeChallenge) {
    url.searchParams.set("code_challenge", options.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  if (options.state) url.searchParams.set("state", options.state);
  return url.toString();
}

export async function exchangeSupabaseOAuthCode(input: {
  code: string;
  codeVerifier: string;
  redirectTo: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<AuthSession> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase env is missing");
  }
  const supabaseUrl = normalizeSupabaseProjectUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ auth_code: input.code, code_verifier: input.codeVerifier, redirect_to: input.redirectTo })
  });
  if (!response.ok) {
    throw new AuthError("OAuth sign-in failed", 400);
  }
  return sessionFromSupabaseAuthPayload(await response.json(), "user@evolvefit.app", "google");
}
