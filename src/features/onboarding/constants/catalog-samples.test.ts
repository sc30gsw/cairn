import { expect, test } from "vite-plus/test";

import { ONBOARDING_CATALOG_SAMPLES } from "~/features/onboarding/constants/catalog-samples";

test("オンボーディング用カタログ例は5件の代表サンプル", () => {
  expect(ONBOARDING_CATALOG_SAMPLES).toHaveLength(5);
});

test("カタログ例は中立な表示カテゴリと活動名を持つ", () => {
  const categories = ONBOARDING_CATALOG_SAMPLES.map((sample) => sample.category);
  expect(categories).toEqual(["演習", "試験対策", "暗記", "インプット", "復習"]);
  expect(categories).not.toContain("TOEIC対策");
  expect(categories).not.toContain("多聴");
  expect(categories).not.toContain("多読");

  const names = ONBOARDING_CATALOG_SAMPLES.map((sample) => sample.name);
  expect(names).toEqual(["問題集", "過去問", "暗記カード", "動画講義", "復習"]);
  expect(names.some((name) => name.includes("Distinction"))).toBe(false);
});

test("カタログ例は各項目に内容と分数を持つ", () => {
  for (const sample of ONBOARDING_CATALOG_SAMPLES) {
    expect(sample.content.length).toBeGreaterThan(0);
    expect(sample.minutes).toBeGreaterThan(0);
  }
});
