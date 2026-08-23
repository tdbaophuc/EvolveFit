import { jsonFail, jsonOk, withApiErrorHandling } from "@/lib/server-response";
import { readJson } from "@/lib/api";
import { recordClientError, requestIdFromHeaders } from "@/lib/observability";

export async function POST(request: Request) {
  return withApiErrorHandling({ method: "POST", path: "/api/client-errors", request }, async () => {
    const body = await readJson<{
      requestId?: string;
      message?: string;
      digest?: string;
      stack?: string;
      path?: string;
      userAgent?: string;
    }>(request);
    if (!body?.message?.trim()) return jsonFail({ method: "POST", path: "/api/client-errors", request }, "message is required", 400);
    const report = recordClientError({
      requestId: body.requestId ?? requestIdFromHeaders(request.headers),
      message: body.message.trim(),
      digest: body.digest,
      stack: body.stack?.slice(0, 4000),
      path: body.path,
      userAgent: body.userAgent
    });
    return jsonOk({ method: "POST", path: "/api/client-errors", request }, { requestId: report.requestId, reportedAt: report.reportedAt });
  });
}
