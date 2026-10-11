import { configuredSiteOrigin, isProductionLike, trustedOrigins } from "./config";

export function createAppUrl(path: string, requestUrl: string, env: NodeJS.ProcessEnv = process.env): URL {
  return new URL(path, appOrigin(requestUrl, env));
}

export class RedirectNotAllowedError extends Error {
  constructor() {
    super("redirectTo is not an allowed application URL");
  }
}

/**
 * Resolves the URL Supabase should send users back to after email confirmation / recovery.
 * Client-supplied values are only honoured when their origin is in the trusted allowlist.
 */
export function resolveAuthRedirect(requested: string | undefined, requestUrl: string, env: NodeJS.ProcessEnv = process.env): string {
  const fallback = createAppUrl("/", requestUrl, env).toString();
  if (!requested) return fallback;
  let url: URL;
  try {
    url = new URL(requested);
  } catch {
    throw new RedirectNotAllowedError();
  }
  if (url.username || url.password || !trustedOrigins(env).includes(url.origin)) throw new RedirectNotAllowedError();
  return url.toString();
}

function appOrigin(requestUrl: string, env: NodeJS.ProcessEnv): string {
  const configured = configuredSiteOrigin(env);
  if (configured) return configured;
  // Never derive redirect targets from Host / X-Forwarded-* headers outside local development.
  if (isProductionLike(env)) throw new Error("APP_BASE_URL is required in production");
  return new URL(requestUrl).origin;
}
