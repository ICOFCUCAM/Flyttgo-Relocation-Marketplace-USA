import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      /* Promoted to "error" once the original 329-`any` debt was
       * paid down to zero (see commit "any cleanup"). The rule now
       * locks in the gains: any new explicit `any` blocks CI. Add
       * a unit-tested service-layer type or use `unknown` instead. */
      "@typescript-eslint/no-explicit-any": "error",
      /* Unused vars stays at "warn" because TypeScript itself enforces
       * noUnusedLocals + noUnusedParameters at the compiler level —
       * ESLint here is the editor-time pre-flight, not the gate. */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-empty-pattern": "warn",
      "no-case-declarations": "warn",
      "prefer-const": "warn",
    },
  }
);
