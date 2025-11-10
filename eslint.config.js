// ============================================
// ESLint Flat Config - Mercadito Online PY
// Migrado desde .eslintrc.cjs (ESLint 9 compatible)
// ============================================

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactPlugin from "eslint-plugin-react";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "public/sw.js",
      "scripts/**/*.js",
    ],

    plugins: {
      "react": reactPlugin,
      "react-hooks": reactHooks,
      "import": importPlugin,
    },

    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },

    overrides: [
      // Tests y mocks
      {
        files: ["**/*.test.*", "**/__tests__/**", "**/__mocks__/**"],
        rules: {
          "no-unused-vars": "off",
          "@typescript-eslint/no-unused-vars": "off",
          "@typescript-eslint/no-explicit-any": "off",
          "react-hooks/exhaustive-deps": "off",
        },
      },
      // App Router
      {
        files: ["src/app/**"],
        rules: {
          "@typescript-eslint/no-explicit-any": "warn",
          "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        },
      },
      // Legacy
      {
        files: ["src/legacy/**"],
        rules: {
          "@typescript-eslint/no-explicit-any": "warn",
          "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
          "no-console": "off",
        },
      },
      // Tipos
      {
        files: ["**/*.d.ts"],
        rules: { "@typescript-eslint/no-empty-interface": "off" },
      },
      // Supabase functions
      {
        files: ["supabase/functions/**/*"],
        rules: { "@typescript-eslint/no-explicit-any": "off" },
      },
    ],
  }
);
