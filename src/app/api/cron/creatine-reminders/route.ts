import { NextResponse } from "next/server";
import { creatineReminderEvents } from "@/lib/api";

export function POST() {
  return NextResponse.json(creatineReminderEvents());
}
