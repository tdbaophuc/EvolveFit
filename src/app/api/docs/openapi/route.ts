import { NextResponse } from "next/server";
import openApiSpec from "@/../docs/api-v1.openapi.json";
import { requestIdFromHeaders, requestIdResponseHeader } from "@/lib/observability";

export function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  return NextResponse.json(openApiSpec, {
    headers: {
      [requestIdResponseHeader()]: requestId,
      "cache-control": "public, max-age=300"
    }
  });
}
