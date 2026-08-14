import { NextResponse } from "next/server";
import { recalculateAchievements } from "@/lib/api";

export function POST() {
  return NextResponse.json(recalculateAchievements());
}
