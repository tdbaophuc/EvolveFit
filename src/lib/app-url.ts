const siteUrlEnvKeys = ["NEXT_PUBLIC_SITE_URL", "SITE_URL", "NEXT_PUBLIC_APP_URL", "APP_URL"] as const;

export function createAppUrl(path: string, requestUrl: string, env: NodeJS.ProcessEnv = process.env): URL {
  return new URL(path, appOrigin(requestUrl, env));
}

function appOrigin(requestUrl: string, env: NodeJS.ProcessEnv): string {
  const configuredUrl = configuredSiteUrl(env);
  if (configuredUrl) return configuredUrl;
  return new URL(requestUrl).origin;
}

function configuredSiteUrl(env: NodeJS.ProcessEnv): string | undefined {
  for (const key of siteUrlEnvKeys) {
    const value = env[key]?.trim();
    if (value) return normalizeHttpOrigin(value, key);
  }

  const vercelUrl = env.VERCEL_URL?.trim();
  if (vercelUrl) return normalizeHttpOrigin(vercelUrl.includes("://") ? vercelUrl : `https://${vercelUrl}`, "VERCEL_URL");

  return undefined;
}

function normalizeHttpOrigin(value: string, key: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid absolute URL`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${key} must use http or https`);
  }

  return url.origin;
}
