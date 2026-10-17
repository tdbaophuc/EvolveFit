import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
});

const eslintConfig = [
  { settings: { next: { rootDir: "apps/web/" } } },
  { ignores: [".next/**", "apps/web/.next/**", "apps/api/dist/**", "node_modules/**", "coverage/**", "next-env.d.ts", "apps/web/next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { rules: { "@next/next/no-html-link-for-pages": "off" } }
];

export default eslintConfig;
