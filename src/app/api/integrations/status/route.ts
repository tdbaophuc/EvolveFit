import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/integrations";

export function GET() {
  return NextResponse.json({ ok: true, data: getIntegrationStatus() });
}
