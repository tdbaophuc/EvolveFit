export type AuthMode = "local" | "email" | "google";

export type AuthSession = {
  mode: AuthMode;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

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

export function createSupabaseOAuthUrl(provider: "google", redirectTo: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return undefined;
  const url = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1/authorize`);
  url.searchParams.set("provider", provider);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}
