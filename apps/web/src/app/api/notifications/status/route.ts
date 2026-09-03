import { NextResponse } from "next/server";
import { notificationStatus } from "@/lib/api";

export function GET(request: Request) {
  const localProfileId = new URL(request.url).searchParams.get("localProfileId") ?? undefined;
  return NextResponse.json(notificationStatus(localProfileId));
}
