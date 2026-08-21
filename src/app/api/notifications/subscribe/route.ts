import { NextResponse } from "next/server";
import { readJson, subscribeNotifications } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    keys?: { p256dh?: string; auth?: string };
    userId?: string;
    localProfileId?: string;
    platform?: string;
  }>(request);
  return NextResponse.json(subscribeNotifications(body ?? {}));
}
