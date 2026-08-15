import { expect, test } from "vite-plus/test";

import { isPurgeDue, TRASH_TTL_MS } from "./trash";

test("ゴミ箱は 30 日後に完全削除対象", () => {
  expect(isPurgeDue(0, TRASH_TTL_MS)).toBe(true);
  expect(isPurgeDue(0, TRASH_TTL_MS - 1)).toBe(false);
});
