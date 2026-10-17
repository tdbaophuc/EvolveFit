import webpush, { type PushSubscription } from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
};

/** Push services operated by browser vendors. Subscriptions pointing anywhere else are rejected (SSRF guard). */
const defaultPushHostSuffixes = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com"
];
const base64UrlPattern = /^[A-Za-z0-9_-]+={0,2}$/;

export function getVapidPublicKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
}

export function isWebPushConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(getVapidPublicKey(env) && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export function allowedPushHostSuffixes(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.PUSH_ENDPOINT_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return configured.length ? configured : defaultPushHostSuffixes;
}

export function validatePushSubscriptionInput(
  input: { endpoint: string; p256dh: string; auth: string },
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const endpointError = validatePushEndpoint(input.endpoint, env);
  if (endpointError) return endpointError;
  if (input.p256dh.length < 40 || input.p256dh.length > 200 || !base64UrlPattern.test(input.p256dh)) return "p256dh must be a base64url public key";
  if (input.auth.length < 8 || input.auth.length > 64 || !base64UrlPattern.test(input.auth)) return "auth must be a base64url secret";
  return undefined;
}

export function validatePushEndpoint(endpoint: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return "endpoint must be a valid URL";
  }
  if (url.protocol !== "https:") return "endpoint must use https";
  if (url.username || url.password) return "endpoint must not contain credentials";
  if (url.port && url.port !== "443") return "endpoint must use the default https port";
  const host = url.hostname.toLowerCase();
  const allowed = allowedPushHostSuffixes(env).some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  if (!allowed) return "endpoint is not a supported push service";
  return undefined;
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload,
  env: NodeJS.ProcessEnv = process.env
): Promise<"sent" | "missing-env"> {
  if (!isWebPushConfigured(env)) return "missing-env";
  // Defence in depth: never make outbound requests to endpoints that would fail validation today.
  const endpointError = validatePushEndpoint(subscription.endpoint, env);
  if (endpointError) throw new Error(endpointError);

  webpush.setVapidDetails(
    env.VAPID_SUBJECT as string,
    getVapidPublicKey(env) as string,
    env.VAPID_PRIVATE_KEY as string
  );

  await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60, timeout: 10_000 });
  return "sent";
}
