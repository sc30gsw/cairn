import { expect, test } from "vite-plus/test";

import {
  bucketRangeLabel,
  historyMonthAnalysisLink,
  monthlyDigestBucketLabel,
  previousMonthLabel,
  yearMonthLabel,
} from "~/features/review/lib/monthly-review-labels";

test("yearMonthLabel は先頭0を落とした和暦風の表記", () => {
  expect(yearMonthLabel("2026-08")).toBe("2026年8月");
  expect(yearMonthLabel("2026-12")).toBe("2026年12月");
});

test("previousMonthLabel は増・減・同で符号を変える", () => {
  expect(previousMonthLabel(620, 540, "分")).toBe("先月 540分（+80分）");
  expect(previousMonthLabel(500, 540, "分")).toBe("先月 540分（-40分）");
  expect(previousMonthLabel(540, 540, "分")).toBe("先月 540分（±0分）");
});

test("previousMonthLabel は前月0なら記録なしと言う", () => {
  expect(previousMonthLabel(620, 0, "分")).toBe("先月の記録はありません");
});

test("monthlyDigestBucketLabel は部分週に注記を足す", () => {
  expect(monthlyDigestBucketLabel(0, false)).toBe("第1週");
  expect(monthlyDigestBucketLabel(4, true)).toBe("第5週（一部）");
});

test("bucketRangeLabel は1日だけの部分週なら範囲にしない", () => {
  expect(bucketRangeLabel("2026-08-01", "2026-08-02")).toBe("08/01〜08/02");
  expect(bucketRangeLabel("2026-08-31", "2026-08-31")).toBe("08/31");
});

test("historyMonthAnalysisLink は履歴の分析タブ・月スコープを指す", () => {
  expect(historyMonthAnalysisLink("2026-08")).toEqual({
    search: { month: "2026-08", scope: "month", tab: "analysis" },
    to: "/history",
  });
});
