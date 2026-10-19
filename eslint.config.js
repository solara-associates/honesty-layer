// @ts-check
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import boundaries from "eslint-plugin-boundaries";

/**
 * A3 — Layer direction: domain <- application <- infrastructure/presentation.
 * Enforced for every package that has these directories (currently
 * packages/core/src/domain and the full 4-layer split in packages/proxy/src).
 * A package with only a domain layer (core) needs no rule to violate; the
 * contract below still applies if it grows the other layers later.
 */
export default [
  {
    files: ["**/*.ts"],
    ignores: ["**/dist/**", "**/dist-types/**", "**/node_modules/**", "**/*.generated.json"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: "module" },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "domain", pattern: "**/src/domain/**", mode: "full" },
        { type: "application", pattern: "**/src/application/**", mode: "full" },
        { type: "infrastructure", pattern: "**/src/infrastructure/**", mode: "full" },
        { type: "presentation", pattern: "**/src/presentation/**", mode: "full" },
      ],
      "import/resolver": {
        typescript: true,
      },
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            { from: "domain", disallow: ["application", "infrastructure", "presentation"], message: "A3: domain must not depend on application, infrastructure, or presentation." },
            { from: "application", disallow: ["infrastructure", "presentation"], message: "A3: application must not depend on infrastructure or presentation." },
            { from: "infrastructure", disallow: ["presentation"], message: "A3: infrastructure must not depend on presentation." },
          ],
        },
      ],
    },
  },
];
