import { NextResponse } from "next/server";
import { sendHydrationReminderEvents } from "@/lib/api";

export async function POST() {
  return NextResponse.json(await sendHydrationReminderEvents());
}
