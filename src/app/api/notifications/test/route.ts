import { NextResponse } from "next/server";
import { readJson, sendTestNotification } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ endpoint?: string; localProfileId?: string }>(request);
  return NextResponse.json(await sendTestNotification(body ?? {}));
}
