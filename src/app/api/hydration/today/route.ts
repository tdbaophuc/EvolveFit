import { NextResponse } from "next/server";
import { getHydrationToday } from "@/lib/api";

export function GET() {
  return NextResponse.json(getHydrationToday());
}
