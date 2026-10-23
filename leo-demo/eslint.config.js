import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", ".pwa-test-dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": [
        "error",
        {
          allowConstantExport: true,
          allowExportNames: ["useAuth"],
        },
      ],
    },
  },

  // -- Layer boundaries -------------------------------------------------------------
  // Pages and components -> services -> data -> Supabase, with pure rules in
  // domain. Each rule below keeps one layer from reaching past its neighbour.

  // 1. Only src/data talks to Supabase.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/data/**", "src/supabase-client.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/supabase-client"],
              message:
                "Only src/data may import the Supabase client. Use a function from src/data or src/services instead.",
            },
          ],
        },
      ],
    },
  },

  // 2. src/domain holds pure rules: no React, no Supabase, no data or services.
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-*", "**/supabase-client", "../data/*", "../services/*"],
              message: "src/domain must stay pure: no React, Supabase, data or service imports.",
            },
          ],
        },
      ],
    },
  },

  // 3. src/services never touches the UI.
  {
    files: ["src/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-*", "react-router-dom"],
              message: "src/services must not depend on React or the router.",
            },
          ],
        },
      ],
    },
  },

  // 4. src/data never touches the UI, and never calls up into services.
  {
    files: ["src/data/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-*", "react-router-dom"],
              message: "src/data must not depend on React or the router.",
            },
            {
              group: ["../services/*"],
              message: "src/data must not import from src/services: dependencies point downwards.",
            },
          ],
        },
      ],
    },
  },
]);
