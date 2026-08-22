import { expect, test } from "vite-plus/test";

import {
  CATALOG_SAMPLES,
  ONBOARDING_CATALOG_SAMPLES,
} from "~/features/onboarding/constants/catalog-samples";

test("オンボーディング用カタログ例は5件の代表サンプル", () => {
  expect(ONBOARDING_CATALOG_SAMPLES).toHaveLength(5);
  expect(CATALOG_SAMPLES).toEqual(ONBOARDING_CATALOG_SAMPLES);
});

test("カタログ例は中立な表示カテゴリと活動名を持つ", () => {
  const categories = ONBOARDING_CATALOG_SAMPLES.map((sample) => sample.category);
  expect(categories).toEqual(["試験対策", "多聴", "多読", "英会話", "その他"]);
  expect(categories).not.toContain("TOEIC対策");

  const names = ONBOARDING_CATALOG_SAMPLES.map((sample) => sample.name);
  expect(names).toEqual(["文法問題", "リスニング", "多読", "英会話", "その他"]);
  expect(names.some((name) => name.includes("Distinction"))).toBe(false);
});

test("カタログ例は各項目に内容と分数を持つ", () => {
  for (const sample of ONBOARDING_CATALOG_SAMPLES) {
    expect(sample.content.length).toBeGreaterThan(0);
    expect(sample.minutes).toBeGreaterThan(0);
  }
});
