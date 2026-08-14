import { getIntegrationStatus } from "@/lib/integrations";
import { jsonOk, withApiErrorHandling } from "@/lib/server-response";

export function GET() {
  return withApiErrorHandling({ method: "GET", path: "/api/integrations/status" }, () =>
    jsonOk({ method: "GET", path: "/api/integrations/status" }, getIntegrationStatus())
  );
}
