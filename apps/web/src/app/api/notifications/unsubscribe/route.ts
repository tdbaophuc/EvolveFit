import { NextResponse } from "next/server";
import { readJson, unsubscribeNotifications } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ endpoint?: string }>(request);
  return NextResponse.json(unsubscribeNotifications(body?.endpoint ?? ""));
}
