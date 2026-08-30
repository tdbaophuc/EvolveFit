import { NextResponse } from "next/server";
import { sendCreatineReminderEvents } from "@/lib/api";
import { requireCronAuth } from "../auth";

export async function POST(request: Request) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json(await sendCreatineReminderEvents());
}
