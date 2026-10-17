import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true
  },
  resolve: {
    alias: {
      "@evolvefit/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  }
});
