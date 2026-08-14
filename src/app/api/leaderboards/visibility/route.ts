import { NextResponse } from "next/server";
import { readJson, updateLeaderboardVisibility } from "@/lib/api";

export async function PATCH(request: Request) {
  const body = await readJson<{ isPublic?: boolean }>(request);
  return NextResponse.json(updateLeaderboardVisibility(Boolean(body?.isPublic)));
}
