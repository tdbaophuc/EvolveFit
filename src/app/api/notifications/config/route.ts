import { NextResponse } from "next/server";
import { notificationConfig } from "@/lib/api";

export function GET() {
  return NextResponse.json(notificationConfig());
}
