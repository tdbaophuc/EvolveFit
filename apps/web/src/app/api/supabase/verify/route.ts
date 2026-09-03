import { verifySupabaseProduction } from "@/lib/integrations";
import { jsonOk, withApiErrorHandling } from "@/lib/server-response";

export const dynamic = "force-dynamic";

export function GET() {
  return withApiErrorHandling({ method: "GET", path: "/api/supabase/verify" }, async () =>
    jsonOk({ method: "GET", path: "/api/supabase/verify" }, await verifySupabaseProduction())
  );
}
