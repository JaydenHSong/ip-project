import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      // Prefer extracting long files into composable components/hooks.
      "max-lines": ["warn", { max: 250, skipBlankLines: true, skipComments: true }],
      // Prevent inline style hardcoding and enforce design token usage.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message: "Inline style is not allowed. Use Tailwind/design tokens or shared components.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated / external files:
    "playwright-report/**",
    "crawl-results/**",
  ]),
]);

export default eslintConfig;
