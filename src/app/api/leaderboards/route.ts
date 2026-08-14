import { NextResponse } from "next/server";
import { getAchievementsAndLeaderboard } from "@/lib/api";

export function GET() {
  return NextResponse.json(getAchievementsAndLeaderboard());
}
