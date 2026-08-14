import { NextResponse } from "next/server";
import { coachRecommend } from "@/lib/api";

export function POST() {
  return NextResponse.json(coachRecommend());
}
