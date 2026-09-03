import { jsonOk, withApiErrorHandling } from "@/lib/server-response";
import { getIntegrationStatus } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withApiErrorHandling({ method: "GET", path: "/api/health", request }, () =>
    jsonOk({ method: "GET", path: "/api/health", request }, {
      app: "evolvefit",
      version: process.env.npm_package_version ?? "0.1.0",
      runtime: "nextjs",
      checkedAt: new Date().toISOString(),
      integrations: getIntegrationStatus(),
      storageAdapter: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase-ready" : "memory-fallback"
    })
  );
}
