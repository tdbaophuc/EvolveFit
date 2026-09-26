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

let localSession: AuthSession = {
  mode: "local",
  email: "phuc@example.com"
};

export function getAuthSession(): AuthSession {
  return localSession;
}

export async function signIn(input: {
  email: string;
  password?: string;
  mode?: AuthMode;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<AuthSession> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  const mode = input.mode ?? "email";

  if (mode === "google") {
    const oauthUrl = createSupabaseOAuthUrl("google", input.email, env);
    localSession = { mode: "google", email: input.email, oauthUrl };
    return localSession;
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && input.password) {
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
      throw new Error(`Supabase sign-in failed with status ${response.status}`);
    }

    localSession = sessionFromSupabaseAuthPayload(await response.json(), input.email, "email");
    return localSession;
  }

  localSession = { mode, email: input.email };
  return localSession;
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
    localSession = { mode: "email", email: input.email };
    return localSession;
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
    throw new Error(`Supabase sign-up failed with status ${response.status}`);
  }

  localSession = sessionFromSupabaseAuthPayload(await response.json(), input.email, "email");
  return localSession;
}

export async function refreshSession(input: {
  refreshToken: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<AuthSession> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (!input.refreshToken) throw new Error("refresh token is required");
    return localSession;
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
  if (!response.ok) throw new Error(`Supabase refresh failed with status ${response.status}`);
  return sessionFromSupabaseAuthPayload(await response.json(), localSession.email, localSession.mode === "google" ? "google" : "email");
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
  if (!response.ok) throw new Error(`Supabase password reset request failed with status ${response.status}`);
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
  if (!response.ok) throw new Error(`Supabase password reset failed with status ${response.status}`);
  return { updated: true };
}

export function signOut(): AuthSession {
  localSession = { mode: "local", email: "local@evolvefit.app" };
  return localSession;
}

export function createSessionCookieValue(session: AuthSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function parseSessionCookieValue(value: string | undefined): AuthSession | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AuthSession>;
    if (!parsed.email || !parsed.mode) return undefined;
    return {
      mode: parsed.mode,
      email: parsed.email,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      oauthUrl: parsed.oauthUrl,
      emailVerified: parsed.emailVerified,
      needsEmailVerification: parsed.needsEmailVerification
    };
  } catch {
    return undefined;
  }
}

export function bearerTokenFromAuthorization(value: string | undefined): string | undefined {
  const match = value?.match(/^Bearer\s+(.+)$/i);
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
  const response = await fetchImpl(`${supabaseUrl}/auth/v1/admin/users/${input.userId}`, {
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
  localSession = {
    mode: input.mode ?? "google",
    email: input.email ?? "user@evolvefit.app",
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt,
    emailVerified: input.emailVerified,
    needsEmailVerification: input.needsEmailVerification
  };
  return localSession;
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
    throw new Error(`Supabase OAuth exchange failed with status ${response.status}`);
  }
  return sessionFromSupabaseAuthPayload(await response.json(), "user@evolvefit.app", "google");
}
