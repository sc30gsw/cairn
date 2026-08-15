import { expect, test } from "vite-plus/test";

import { CATEGORIES, SEED_CATEGORIES } from "./categories";

test("初期カテゴリは CONTEXT の5つで固定順", () => {
  expect(CATEGORIES).toEqual(["TOEIC対策", "多聴", "多読", "英会話", "その他"]);
  expect(SEED_CATEGORIES.map((category) => category.name)).toEqual(CATEGORIES);
});
