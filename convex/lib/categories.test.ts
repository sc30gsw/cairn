import { expect, test } from "vite-plus/test";

import { CATEGORIES } from "./categories";

test("カテゴリは CONTEXT の5つで固定順", () => {
  expect(CATEGORIES).toEqual(["TOEIC対策", "多聴", "多読", "英会話", "その他"]);
});
