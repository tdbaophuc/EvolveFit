import { NextResponse } from "next/server";
import { logSupplement, readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ name?: string; amount?: number; unit?: "g" | "mg" | "capsule" }>(request);
  return NextResponse.json(logSupplement({ name: body?.name ?? "", amount: body?.amount ?? 0, unit: body?.unit }));
}
