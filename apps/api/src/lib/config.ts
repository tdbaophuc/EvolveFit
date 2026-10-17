import { randomBytes } from "node:crypto";

const minSessionSecretLength = 32;
const devSessionSecrets = new WeakMap<NodeJS.ProcessEnv, string>();

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid API configuration:\n- ${problems.join("\n- ")}`);
  }
}

/** Production and staging must run fail-closed: real auth, explicit CORS, signed sessions. */
export function isProductionLike(env: NodeJS.ProcessEnv): boolean {
  const appEnv = (env.APP_ENV ?? env.NODE_ENV ?? "").trim().toLowerCase();
  return env.NODE_ENV === "production" || appEnv === "production" || appEnv === "staging";
}

export function assertApiConfig(env: NodeJS.ProcessEnv): void {
  if (!isProductionLike(env)) return;
  const problems: string[] = [];
  if (env.API_DATA_MODE !== "supabase") problems.push("API_DATA_MODE must be 'supabase' (memory/demo mode is not allowed in production)");
  if (!env.NEXT_PUBLIC_SUPABASE_URL) problems.push("NEXT_PUBLIC_SUPABASE_URL is required");
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) problems.push("SUPABASE_SERVICE_ROLE_KEY is required");
  if ((env.SESSION_SECRET ?? "").length < minSessionSecretLength) problems.push(`SESSION_SECRET must be at least ${minSessionSecretLength} characters`);
  if (!corsAllowlist(env).length) problems.push("API_CORS_ORIGIN must list the allowed web origins");
  const siteUrl = configuredSiteOrigin(env);
  if (!siteUrl) problems.push("APP_BASE_URL (or NEXT_PUBLIC_SITE_URL) is required");
  else if (!siteUrl.startsWith("https://")) problems.push("APP_BASE_URL must use https in production");
  if (env.CRON_SECRET && env.CRON_SECRET.length < 32) problems.push("CRON_SECRET must be at least 32 characters");
  if (problems.length) throw new ConfigError(problems);
}

export function sessionSecrets(env: NodeJS.ProcessEnv): string[] {
  const current = env.SESSION_SECRET?.trim();
  const previous = (env.SESSION_SECRET_PREVIOUS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (current) return [current, ...previous];
  if (isProductionLike(env)) throw new ConfigError(["SESSION_SECRET is required"]);
  // Development only: an ephemeral per-process secret, so sessions reset on restart.
  let secret = devSessionSecrets.get(env);
  if (!secret) {
    secret = randomBytes(32).toString("base64url");
    devSessionSecrets.set(env, secret);
  }
  return [secret, ...previous];
}

export function corsAllowlist(env: NodeJS.ProcessEnv): string[] {
  return splitOrigins(env.API_CORS_ORIGIN);
}

export function defaultDevOrigins(): string[] {
  return ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"];
}

/** Origins trusted for CSRF checks and auth redirects. */
export function trustedOrigins(env: NodeJS.ProcessEnv): string[] {
  const origins = new Set<string>([...corsAllowlist(env), ...splitOrigins(env.AUTH_REDIRECT_ORIGINS)]);
  const site = configuredSiteOrigin(env);
  if (site) origins.add(site);
  if (!isProductionLike(env) && !corsAllowlist(env).length) defaultDevOrigins().forEach((origin) => origins.add(origin));
  return [...origins];
}

const siteUrlEnvKeys = ["APP_BASE_URL", "NEXT_PUBLIC_SITE_URL", "SITE_URL", "NEXT_PUBLIC_APP_URL", "APP_URL"] as const;

export function configuredSiteOrigin(env: NodeJS.ProcessEnv): string | undefined {
  for (const key of siteUrlEnvKeys) {
    const value = env[key]?.trim();
    if (value) return normalizeOrigin(value, key);
  }
  const vercelUrl = env.VERCEL_URL?.trim();
  if (vercelUrl) return normalizeOrigin(vercelUrl.includes("://") ? vercelUrl : `https://${vercelUrl}`, "VERCEL_URL");
  return undefined;
}

export function normalizeOrigin(value: string, key = "origin"): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError([`${key} must be a valid absolute URL`]);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ConfigError([`${key} must use http or https`]);
  return url.origin;
}

/** TRUST_PROXY: "false" (default), "true", a hop count such as "1", or a comma-separated list of proxy IPs/CIDRs. */
export function trustProxySetting(env: NodeJS.ProcessEnv): boolean | string[] | ((address: string, hop: number) => boolean) {
  const value = env.TRUST_PROXY?.trim();
  if (!value || value === "false") return false;
  if (value === "true") return true;
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    return (_address: string, hop: number) => hop < hops;
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function splitOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin, "API_CORS_ORIGIN"));
}
