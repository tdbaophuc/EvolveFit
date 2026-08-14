import { NextResponse } from "next/server";
import { getWorkoutToday } from "@/lib/api";

export function GET() {
  return NextResponse.json(getWorkoutToday());
}
