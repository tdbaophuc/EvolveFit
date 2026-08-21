import webpush, { type PushSubscription } from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
};

export function getVapidPublicKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
}

export function isWebPushConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(getVapidPublicKey(env) && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload,
  env: NodeJS.ProcessEnv = process.env
): Promise<"sent" | "missing-env"> {
  if (!isWebPushConfigured(env)) return "missing-env";

  webpush.setVapidDetails(
    env.VAPID_SUBJECT as string,
    getVapidPublicKey(env) as string,
    env.VAPID_PRIVATE_KEY as string
  );

  await webpush.sendNotification(subscription, JSON.stringify(payload));
  return "sent";
}
