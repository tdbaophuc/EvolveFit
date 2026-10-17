// Read-only production readiness probe: `npm run verify:supabase -w @evolvefit/api -- <env-file>`
import { existsSync } from "node:fs";
import { assertApiConfig } from "../src/lib/config";
import { verifySupabaseProduction } from "../src/lib/integrations";

const envFile = process.argv[2];
if (envFile) {
  if (!existsSync(envFile)) throw new Error(`env file not found: ${envFile}`);
  process.loadEnvFile(envFile);
}

try {
  assertApiConfig(process.env);
  console.log("config: ok");
} catch (error) {
  console.log(error instanceof Error ? error.message : error);
}

const result = await verifySupabaseProduction(process.env);
console.log(`supabase: ${result.ok ? "ready" : "NOT ready"} (${result.mode})`);
for (const check of result.checks) console.log(`  ${check.ok ? "ok  " : "FAIL"} ${check.table}${check.status ? ` (${check.status})` : ""}`);

const rpc = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "").replace(/\/(?:rest|auth)\/v1$/, "")}/rest/v1/rpc/evolvefit_admin_user_id_by_email`, {
  method: "POST",
  headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ target_email: "nobody@invalid.example" })
}).catch(() => undefined);
console.log(`  ${rpc?.ok ? "ok  " : "FAIL"} rpc evolvefit_admin_user_id_by_email${rpc ? ` (${rpc.status})` : ""}`);
process.exit(result.ok && rpc?.ok ? 0 : 1);
