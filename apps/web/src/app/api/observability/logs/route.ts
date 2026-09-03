import { jsonOk, withApiErrorHandling } from "@/lib/server-response";
import { listClientErrors, listRequestLogs, observabilitySnapshot } from "@/lib/observability";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId") ?? undefined;
  return withApiErrorHandling({ method: "GET", path: "/api/observability/logs", request }, () =>
    jsonOk(
      { method: "GET", path: "/api/observability/logs", request },
      {
        ...observabilitySnapshot(),
        requestId,
        logs: listRequestLogs(requestId),
        clientErrors: listClientErrors(requestId)
      }
    )
  );
}
