import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { RECOMMENDED_RULES, TANSTACK_START_RULES } from "oxlint-plugin-react-doctor";
import { defineConfig } from "vite-plus";

const reactDoctorRules = {
  ...RECOMMENDED_RULES,
  ...TANSTACK_START_RULES,
};

const isVitest = process.env.VITEST === "true";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "convex/_generated/**",
      "convex/betterAuth/_generated/**",
      "convex/betterAuth/schema.ts",
      ".agents/**",
      ".claude/**",
      ".scratch/**",
      "docs/**",
      "**/*.md",
    ],
    sortImports: {
      partitionByComment: true,
    },
    sortPackageJson: {
      sortScripts: true,
    },
    sortTailwindcss: {
      functions: ["cn"],
    },
  },
  lint: {
    categories: {
      correctness: "error",
    },
    env: {
      browser: true,
      node: true,
    },
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "convex/_generated/**",
      "convex/betterAuth/_generated/**",
      "convex/betterAuth/schema.ts",
      ".agents/**",
      ".claude/**",
      ".scratch/**",
      "docs/**",
      "**/*.md",
    ],
    jsPlugins: [{ name: "react-doctor", specifier: "oxlint-plugin-react-doctor" }],
    options: {
      denyWarnings: true,
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: [
          "src/router.tsx",
          "*.config.ts",
          "convex/schema.ts",
          "convex/http.ts",
          "convex/auth.config.ts",
          "convex/convex.config.ts",
          "convex/crons.ts",
          "convex/betterAuth/**",
        ],
        rules: {
          "no-default-export": "off",
          "react-doctor/no-multi-comp": "off",
          "react-doctor/no-multi-component-file": "off",
          "react-doctor/no-nested-component-definition": "off",
          "react-doctor/only-export-components": "off",
        },
      },
      {
        files: ["src/routes/**"],
        rules: {
          "react-doctor/no-multi-comp": "off",
          "react-doctor/no-multi-component-file": "off",
          "react-doctor/only-export-components": "off",
        },
      },
      {
        files: ["src/test-utils/**", "src/**/*.test.ts", "src/**/*.test.tsx", "src/features/**"],
        rules: {
          "react-doctor/no-derived-useState": "off",
          "react-doctor/no-multi-comp": "off",
          "react-doctor/no-multi-component-file": "off",
          "react-doctor/only-export-components": "off",
        },
      },
    ],
    plugins: ["react", "react-perf", "import", "jsx-a11y", "promise"],
    rules: {
      ...reactDoctorRules,
      "no-default-export": "error",
      //? React Compiler がメモ化する。Mantine の onClick / data / fallback と相性が悪い。
      "react-doctor/jsx-max-depth": "off",
      "react-doctor/jsx-no-jsx-as-prop": "off",
      "react-doctor/jsx-no-new-array-as-prop": "off",
      "react-doctor/jsx-no-new-function-as-prop": "off",
      "react-doctor/jsx-no-new-object-as-prop": "off",
    },
  },
  staged: {
    "*.{js,jsx,ts,tsx,json,css}": "vp check --fix",
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    //? Vitest では tanstackStart / nitro が React の CJS を edge-runtime に引き込み、`module is not defined` とプロセス残留を起こす。
    ...(isVitest ? [] : [tanstackStart()]),
    // react's vite plugin must come after start's vite plugin
    react({
      include: /\.[jt]sx$/,
    }),
    ...(isVitest ? [] : [nitro()]),
    babel({
      include: /\.[jt]sx$/,
      presets: [reactCompilerPreset()],
    }),
  ],
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
  test: {
    coverage: {
      exclude: [
        "**/_generated/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        //? 薄い composition/wiring 層(hooks 経由の呼び出しのみ)。他フィーチャの
        //? *-page.tsx / *-pending.tsx / *-mutations.ts / *-queries.ts / *-shimmer-template.ts と同様、
        //? リポジトリ全体でユニットテスト対象外の慣習(GoalsBoard 等の結合テストで間接的に確認)。
        "src/features/goals/components/goals-page.tsx",
        "src/features/goals/components/goals-pending.tsx",
      ],
      include: [
        "convex/lib/concreteActionCore.ts",
        "convex/lib/concreteAction.ts",
        "convex/lib/catalog.ts",
        "convex/lib/domain.ts",
        "convex/lib/minutesByDate.ts",
        "convex/lib/qualifyingDays.ts",
        "convex/lib/validators.ts",
        "convex/services/goals/**/*.ts",
        "convex/queries/goals/**/*.ts",
        "convex/mutations/goals/**/*.ts",
        "convex/services/targets/**/*.ts",
        "convex/queries/targets/**/*.ts",
        "convex/mutations/targets/**/*.ts",
        "src/lib/validation/**/*.ts",
        "src/features/**/schemas/**/*.ts",
        "src/features/today/lib/validate-confirm-row.ts",
        "src/features/goals/components/**/*.tsx",
        "src/features/goals/hooks/use-week-snapshot.ts",
        "src/features/goals/lib/goal-guards.ts",
        "src/features/goals/lib/goal-selectors.ts",
        "src/features/goals/lib/goal-type-labels.ts",
        "src/features/goals/lib/target-metric-labels.ts",
        "src/features/goals/lib/weekly-trend-chart-data.ts",
        "src/features/goals/lib/weekly-trend-format.ts",
        "src/features/goals/lib/weekly-trend-streak.ts",
        "src/components/weekly-progress-card.tsx",
      ],
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          environment: "happy-dom",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          name: "frontend",
        },
      },
      {
        extends: true,
        test: {
          environment: "node",
          include: ["convex/lib/**/*.test.ts"],
          name: "convex-lib",
        },
      },
      {
        extends: true,
        test: {
          environment: "edge-runtime",
          exclude: ["convex/lib/**", "convex/betterAuth/**"],
          include: ["convex/**/*.test.ts"],
          name: "convex-integration",
        },
      },
    ],
  },
});
