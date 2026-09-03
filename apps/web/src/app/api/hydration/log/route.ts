import { NextResponse } from "next/server";
import { logHydration, readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ amountMl?: number }>(request);
  return NextResponse.json(logHydration(body?.amountMl ?? 0), { status: body?.amountMl ? 200 : 400 });
}
