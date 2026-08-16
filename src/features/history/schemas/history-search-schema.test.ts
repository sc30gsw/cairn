import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { HistorySearchSchema } from "~/features/history/schemas/history-search-schema";

test("HistorySearchSchema は正しい日付・週・月を受け入れる", () => {
  const result = v.safeParse(HistorySearchSchema, {
    date: "2026-08-17",
    month: "2026-08",
    week: "2026-08-17",
  });

  expect(result.success).toBe(true);
});

test.each([
  ["date", "invalid"],
  ["date", "2026-02-30"],
  ["week", "2026-13-01"],
  ["month", "2026-13"],
  ["month", "2026-8"],
] as const)("HistorySearchSchema は不正な %s=%s を拒否する", (key, value) => {
  const result = v.safeParse(HistorySearchSchema, { [key]: value });

  expect(result.success).toBe(false);
});
