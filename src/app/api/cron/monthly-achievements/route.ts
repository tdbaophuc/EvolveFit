import { NextResponse } from "next/server";
import { sendMonthlyAchievementEvents } from "@/lib/api";

export async function POST() {
  return NextResponse.json(await sendMonthlyAchievementEvents());
}
