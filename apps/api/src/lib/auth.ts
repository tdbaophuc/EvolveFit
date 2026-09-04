import { normalizeSupabaseProjectUrl } from "./supabase-url";

export type AuthMode = "local" | "email" | "google";

export type AuthSession = {
  mode: AuthMode;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  oauthUrl?: string;
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
    body: JSON.stringify({ email: input.email, password: input.password })
  });

  if (!response.ok) {
    throw new Error(`Supabase sign-up failed with status ${response.status}`);
  }

  localSession = sessionFromSupabaseAuthPayload(await response.json(), input.email, "email");
  return localSession;
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
      oauthUrl: parsed.oauthUrl
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

export function sessionFromSupabaseTokens(input: {
  email?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  mode?: AuthMode;
}): AuthSession {
  localSession = {
    mode: input.mode ?? "google",
    email: input.email ?? "user@evolvefit.app",
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt
  };
  return localSession;
}

function sessionFromSupabaseAuthPayload(payload: unknown, fallbackEmail: string, mode: AuthMode): AuthSession {
  const data = payload as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
    user?: { email?: string };
  };
  return sessionFromSupabaseTokens({
    mode,
    email: data.user?.email ?? fallbackEmail,
    accessToken: data.access_token ?? "",
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ?? (data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined)
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
