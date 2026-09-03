import { getIntegrationStatus } from "@/lib/integrations";
import { jsonOk, withApiErrorHandling } from "@/lib/server-response";

export function GET(request: Request) {
  return withApiErrorHandling({ method: "GET", path: "/api/integrations/status", request }, () =>
    jsonOk({ method: "GET", path: "/api/integrations/status", request }, getIntegrationStatus())
  );
}
