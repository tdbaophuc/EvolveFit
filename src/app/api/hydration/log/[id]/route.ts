import { NextResponse } from "next/server";
import { deleteHydrationLog, patchHydrationLog, readJson } from "@/lib/api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const [{ id }, body] = await Promise.all([context.params, readJson<{ amountMl?: number }>(request)]);
  return NextResponse.json(patchHydrationLog(id, body?.amountMl ?? 0));
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json(deleteHydrationLog(id));
}
