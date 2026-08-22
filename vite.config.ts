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

const FEATURE_NAMES = ["auth", "board", "catalog", "goals", "history", "today", "trash"] as const;

const featureBoundaryLintOverrides = FEATURE_NAMES.map((feature) => ({
  files: [`src/features/${feature}/**`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            message:
              "Feature modules cannot import from other features. Extract shared code to src/components, src/hooks, src/lib, or src/types.",
            regex: `^~/features/(?!${feature}/)`,
          },
        ],
      },
    ],
  },
}));

const sharedBoundaryLintOverride = {
  files: ["src/components/**", "src/hooks/**", "src/lib/**", "src/types/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            message: "Shared modules cannot import from features.",
            regex: "^~/features/",
          },
        ],
      },
    ],
  },
};

const featureLibBoundaryLintOverride = {
  files: ["src/features/**/lib/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            message:
              "Feature lib modules cannot import from feature components. Move render adapters into components/ or extract shared logic.",
            regex: "^~/features/[^/]+/components/",
          },
        ],
      },
    ],
  },
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
      // @ts-expect-error vite-plus lint override typing is narrower than oxlint's no-restricted-imports patterns
      ...featureBoundaryLintOverrides,
      // @ts-expect-error vite-plus lint override typing is narrower than oxlint's no-restricted-imports patterns
      featureLibBoundaryLintOverride,
      // @ts-expect-error vite-plus lint override typing is narrower than oxlint's no-restricted-imports patterns
      sharedBoundaryLintOverride,
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
        //? Formisch Field の render prop が branch 数を水増しする。挙動は各 *.test.tsx で確認済み。
        "src/features/goals/components/obstacle-section.tsx",
        "src/features/goals/components/goal-form-fields.tsx",
        "src/features/goals/components/target-form.tsx",
        "src/features/goals/components/target-list.tsx",
        "src/features/my-page/hooks/use-avatar-upload-deps.ts",
      ],
      include: [
        "convex/lib/setupStatus.ts",
        "convex/services/setup/**/*.ts",
        "convex/queries/setup/**/*.ts",
        "convex/mutations/profile/**/*.ts",
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
        "src/features/onboarding/lib/**/*.ts",
        "src/features/my-page/lib/profile-actions.ts",
        "src/features/my-page/lib/avatar-upload.ts",
        "src/features/**/schemas/**/*.ts",
        "src/features/today/lib/validate-confirm-row.ts",
        "convex/lib/dayView.ts",
        "convex/services/days/getDayPage.ts",
        "convex/services/days/openDay.ts",
        "convex/services/rows/copyYesterdayConfirmed.ts",
        "convex/services/rows/switchPreset.ts",
        "src/features/today/lib/empty-day-copy.ts",
        "src/features/today/lib/day-route-search.ts",
        "src/lib/calendar-day-style.ts",
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
