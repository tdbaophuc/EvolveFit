import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const specPath = resolve("docs/api-v1.openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const requiredPaths = [
  "/api/health",
  "/api/integrations/status",
  "/api/docs/openapi",
  "/api/auth/sign-in",
  "/api/routines",
  "/api/exercises",
  "/api/workouts/sessions",
  "/api/workouts/sets",
  "/api/sync/batch",
  "/api/client-errors",
  "/api/observability/logs"
];

for (const path of requiredPaths) {
  if (!spec.paths?.[path]) {
    throw new Error(`OpenAPI spec missing ${path}`);
  }
}

if (spec.openapi !== "3.1.0") {
  throw new Error("OpenAPI spec must use 3.1.0");
}

console.log(`OpenAPI ${spec.info.title} ${spec.info.version}: ${Object.keys(spec.paths).length} paths`);
