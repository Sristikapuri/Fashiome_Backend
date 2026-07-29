import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,

  {
    rules: {
      // ignoreRestSiblings: true so the common `const { password, ...rest } = doc`
      // "omit a field via rest destructuring" idiom doesn't get flagged just
      // because the omitted binding itself is never read.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // allowDeclarations: true so the standard Express `declare global { namespace
      // Express { interface Request {...} } }` type-augmentation pattern is allowed.
      // There is no ES2015-module equivalent for merging into an existing ambient
      // namespace like `Express`, so this is the officially documented approach.
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  },

  {
    files: ["tests/**/*.ts", "tests/**/*.js"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  globalIgnores([
    "node_modules/**",
    "dist/**",
    "coverage/**",
    "uploads/**",
  ]),
]);

export default eslintConfig;
