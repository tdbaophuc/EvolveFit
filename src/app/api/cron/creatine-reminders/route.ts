import { NextResponse } from "next/server";
import { sendCreatineReminderEvents } from "@/lib/api";

export async function POST() {
  return NextResponse.json(await sendCreatineReminderEvents());
}
