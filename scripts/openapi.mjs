import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const specPath = resolve("docs/api-v1.openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));

if (spec.openapi !== "3.1.0") {
  throw new Error("OpenAPI spec must use 3.1.0");
}

const routeFile = resolve("apps/api/src/routes/api-routes.ts");
const routeSource = readFileSync(routeFile, "utf8");
const routeEntries = [...routeSource.matchAll(/app\.(get|post|put|patch|delete)(?:<[^>]+>)?\(\s*"([^"]+)"/g)].map((match) => ({
  method: match[1],
  path: fastifyPathToOpenApiPath(match[2]),
  filePath: routeFile
}));

for (const { method, path, filePath } of routeEntries) {
  if (!spec.paths?.[path]) {
    throw new Error(`OpenAPI spec missing ${path} from ${filePath}`);
  }
  if (!spec.paths[path][method]) {
    throw new Error(`OpenAPI spec missing ${method.toUpperCase()} ${path} from ${filePath}`);
  }
}

for (const [path, operations] of Object.entries(spec.paths ?? {})) {
  for (const method of Object.keys(operations).filter((key) => ["get", "post", "put", "patch", "delete"].includes(key))) {
    if (!routeEntries.some((entry) => entry.path === path && entry.method === method)) {
      throw new Error(`Fastify routes missing ${method.toUpperCase()} ${path} from OpenAPI spec`);
    }
  }
}

console.log(
  `OpenAPI ${spec.info.title} ${spec.info.version}: ${Object.keys(spec.paths).length} spec paths, ${routeEntries.length} Fastify route operations`
);

function fastifyPathToOpenApiPath(path) {
  return path.replace(/:([^/]+)/g, "{$1}");
}
