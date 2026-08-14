export type AuthMode = "local" | "email" | "google";

export type AuthSession = {
  mode: AuthMode;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

export const authCookieName = "evolvefit_session";

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
}): Promise<AuthSession> {
  const env = input.env ?? process.env;
  const mode = input.mode ?? "email";

  if (mode === "google") {
    localSession = { mode: "google", email: input.email };
    return localSession;
  }

  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && input.password) {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: input.email, password: input.password })
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_at?: number;
        user?: { email?: string };
      };
      localSession = {
        mode: "email",
        email: payload.user?.email ?? input.email,
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: payload.expires_at
      };
      return localSession;
    }
  }

  localSession = { mode, email: input.email };
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
      expiresAt: parsed.expiresAt
    };
  } catch {
    return undefined;
  }
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

export function createSupabaseOAuthUrl(provider: "google", redirectTo: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return undefined;
  const url = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1/authorize`);
  url.searchParams.set("provider", provider);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}
