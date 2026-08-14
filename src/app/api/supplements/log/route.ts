import { NextResponse } from "next/server";
import { logSupplement, readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{
    supplementId?: string;
    name?: string;
    amount?: number;
    unit?: "g" | "mg" | "capsule";
    status?: "taken" | "skipped";
    skippedReason?: string;
  }>(request);
  return NextResponse.json(
    logSupplement({
      supplementId: body?.supplementId,
      name: body?.name ?? "",
      amount: body?.amount ?? 0,
      unit: body?.unit,
      status: body?.status,
      skippedReason: body?.skippedReason
    })
  );
}
