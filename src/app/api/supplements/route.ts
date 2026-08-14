import { NextResponse } from "next/server";
import { createSupplement, listSupplements, readJson } from "@/lib/api";

export function GET() {
  return NextResponse.json(listSupplements());
}

export async function POST(request: Request) {
  const body = await readJson<{ name?: string; defaultAmount?: number; unit?: "g" | "mg" | "capsule" }>(request);
  return NextResponse.json(
    createSupplement({ name: body?.name ?? "", defaultAmount: body?.defaultAmount ?? 0, unit: body?.unit }),
    { status: body?.name && body?.defaultAmount ? 200 : 400 }
  );
}
