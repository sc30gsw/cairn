import { expect, test } from "vite-plus/test";

import { formatJstDateLabel } from "~/features/history/lib/format-jst-date";

test("formatJstDateLabel は JST の日付ラベルを返す", () => {
  expect(formatJstDateLabel("2026-08-17")).toMatch(/8月17日/);
});
