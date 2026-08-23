import { NextResponse } from "next/server";
import { readJson, syncBatch, type SyncBatchItem } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ items?: SyncBatchItem[]; idempotencyKey?: string }>(request);
  if (!body) return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  const result = syncBatch(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
