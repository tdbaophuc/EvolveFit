import { NextResponse } from "next/server";

export type ApiHandlerContext = {
  method: string;
  path: string;
};

export function jsonOk<T>(context: ApiHandlerContext, data: T, init?: ResponseInit) {
  logApi(context, init?.status ?? 200);
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonFail(context: ApiHandlerContext, error: string, status = 400) {
  logApi(context, status, error);
  return NextResponse.json({ ok: false, error }, { status });
}

export async function withApiErrorHandling<T>(
  context: ApiHandlerContext,
  handler: () => T | Promise<T>
): Promise<T | NextResponse<{ ok: false; error: string }>> {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    logApi(context, 500, message);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

function logApi(context: ApiHandlerContext, status: number, error?: string) {
  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  const payload = {
    at: new Date().toISOString(),
    method: context.method,
    path: context.path,
    status,
    errorCode: error ? normalizeErrorCode(error) : undefined
  };

  if (level === "error") {
    console.error("[api]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[api]", payload);
    return;
  }

  console.info("[api]", payload);
}

function normalizeErrorCode(message: string) {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}
