import { NextResponse } from "next/server";
import { coachRecommend } from "@/lib/api";

export async function POST() {
  return NextResponse.json(await coachRecommend());
}
