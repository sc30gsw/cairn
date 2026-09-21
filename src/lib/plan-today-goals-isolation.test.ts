import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vite-plus/test";

const GOALS_FEATURE_IMPORT = /from ["']~\/features\/goals\//;
const SHARED_OBSTACLE_IMPORT = 'from "~/components/obstacle-section"';
const SHARED_GOALS_READ_IMPORT = 'from "~/components/plan-goals-read-card"';
const ENGLISH_ITEM_SPECIAL_CASE = /英語/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function featureSource(feature: "plan" | "today") {
  return walk(join("src/features", feature)).filter(
    (path) => /\.(ts|tsx)$/.test(path) && !path.includes(".test."),
  );
}

test("計画と日は goals フィーチャーを import しない", () => {
  for (const feature of ["plan", "today"] as const) {
    for (const file of featureSource(feature)) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(GOALS_FEATURE_IMPORT);
    }
  }
});

test("日と計画は同じ ObstacleSection を使う", () => {
  const plan = readFileSync("src/features/plan/components/plan-list-tab.tsx", "utf8");
  const today = readFileSync("src/features/today/components/day-board-tab.tsx", "utf8");
  expect(plan).toContain(SHARED_OBSTACLE_IMPORT);
  expect(today).toContain(SHARED_OBSTACLE_IMPORT);
  expect(existsSync("src/components/obstacle-section.tsx")).toBe(true);
});

test("計画は目標を本番日・期限・内容の読み取りカードで出す", () => {
  const plan = readFileSync("src/features/plan/components/plan-list-tab.tsx", "utf8");
  expect(plan).toContain(SHARED_GOALS_READ_IMPORT);
  expect(existsSync("src/components/plan-goals-read-card.tsx")).toBe(true);
});

test("英語を特別扱いする項目コードを日・計画・共有カードに置かない", () => {
  const shared = [
    "src/components/obstacle-section.tsx",
    "src/components/plan-goals-read-card.tsx",
    "src/hooks/use-obstacle-plans.ts",
  ];
  for (const file of [...featureSource("plan"), ...featureSource("today"), ...shared]) {
    if (!existsSync(file)) {
      continue;
    }
    expect(readFileSync(file, "utf8"), file).not.toMatch(ENGLISH_ITEM_SPECIAL_CASE);
  }
});
