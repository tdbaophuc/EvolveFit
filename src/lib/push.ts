import webpush, { type PushSubscription } from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
};

export function isWebPushConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload,
  env: NodeJS.ProcessEnv = process.env
): Promise<"sent" | "missing-env"> {
  if (!isWebPushConfigured(env)) return "missing-env";

  webpush.setVapidDetails(
    env.VAPID_SUBJECT ?? "mailto:admin@evolvefit.local",
    env.VAPID_PUBLIC_KEY as string,
    env.VAPID_PRIVATE_KEY as string
  );

  await webpush.sendNotification(subscription, JSON.stringify(payload));
  return "sent";
}
