import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const specPath = resolve("docs/api-v1.openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));

if (spec.openapi !== "3.1.0") {
  throw new Error("OpenAPI spec must use 3.1.0");
}

const routeDir = resolve("apps/web/src/app/api");
const routeFiles = collectRouteFiles(routeDir);
const routeEntries = routeFiles.flatMap((filePath) => {
  const source = readFileSync(filePath, "utf8");
  const methods = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((match) =>
    match[1].toLowerCase()
  );
  const openApiPath = routeFileToOpenApiPath(filePath);
  return methods.map((method) => ({ method, path: openApiPath, filePath }));
});

for (const { method, path, filePath } of routeEntries) {
  if (!spec.paths?.[path]) {
    throw new Error(`OpenAPI spec missing ${path} from ${filePath}`);
  }
  if (!spec.paths[path][method]) {
    throw new Error(`OpenAPI spec missing ${method.toUpperCase()} ${path} from ${filePath}`);
  }
}

console.log(
  `OpenAPI ${spec.info.title} ${spec.info.version}: ${Object.keys(spec.paths).length} spec paths, ${routeEntries.length} route operations`
);

function collectRouteFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(path);
    return entry.isFile() && entry.name === "route.ts" ? [path] : [];
  });
}

function routeFileToOpenApiPath(filePath) {
  const relative = filePath
    .slice(routeDir.length)
    .replace(/\\/g, "/")
    .replace(/\/route\.ts$/, "");
  return `/api${relative}`.replace(/\[([^\]]+)\]/g, "{$1}");
}
