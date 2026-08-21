import { expect, test } from "vite-plus/test";

import {
  countByWeekday,
  digestRate,
  plannedCount,
  suggestWeekdays,
  suggestionReason,
} from "./presetDigest";

test("渡された記録だけを曜日ごとに数える", () => {
  const counted = countByWeekday([
    { dateJst: "2026-08-17", status: "スキップ" },
    { dateJst: "2026-08-18", status: "確定" },
  ]);
  const monday = counted.find((row) => row.weekday === 1);
  const tuesday = counted.find((row) => row.weekday === 2);
  expect(monday).toEqual({ confirmed: 0, leftover: 0, skipped: 1, weekday: 1 });
  expect(tuesday).toEqual({ confirmed: 1, leftover: 0, skipped: 0, weekday: 2 });
});

test("確定・見送り・未着手を曜日ごとに数える", () => {
  const counted = countByWeekday([
    { dateJst: "2026-08-17", status: "確定" },
    { dateJst: "2026-08-17", status: "スキップ" },
    { dateJst: "2026-08-24", status: "未着手" },
  ]);
  const monday = counted.find((row) => row.weekday === 1);
  expect(monday).toEqual({ confirmed: 1, leftover: 1, skipped: 1, weekday: 1 });
  expect(plannedCount(monday!)).toBe(3);
  expect(digestRate(monday!)).toBeCloseTo(1 / 3);
});

test("未着手が多い曜日は leftoverHeavy", () => {
  expect(suggestionReason({ confirmed: 1, leftover: 4, skipped: 1, weekday: 1 })).toBe(
    "leftoverHeavy",
  );
});

test("見送りが同数以上なら skipHeavy", () => {
  expect(suggestionReason({ confirmed: 1, leftover: 2, skipped: 2, weekday: 1 })).toBe("skipHeavy");
});

test("消化が半分未満の曜日だけ提案する", () => {
  const suggestions = suggestWeekdays([
    { confirmed: 8, leftover: 0, skipped: 0, weekday: 1 },
    { confirmed: 1, leftover: 3, skipped: 2, weekday: 2 },
    { confirmed: 0, leftover: 0, skipped: 0, weekday: 3 },
  ]);
  expect(suggestions).toEqual([{ reason: "leftoverHeavy", weekday: 2 }]);
});

test("件数が足りない曜日は提案しない", () => {
  const suggestions = suggestWeekdays([{ confirmed: 0, leftover: 1, skipped: 1, weekday: 1 }]);
  expect(suggestions).toEqual([]);
});

test("他曜日より明らかに低い消化だけを最大2件出す", () => {
  const suggestions = suggestWeekdays([
    { confirmed: 10, leftover: 0, skipped: 0, weekday: 1 },
    { confirmed: 9, leftover: 0, skipped: 1, weekday: 2 },
    { confirmed: 3, leftover: 0, skipped: 7, weekday: 3 },
    { confirmed: 2, leftover: 8, skipped: 0, weekday: 4 },
    { confirmed: 4, leftover: 6, skipped: 0, weekday: 5 },
  ]);
  expect(suggestions).toEqual([
    { reason: "leftoverHeavy", weekday: 4 },
    { reason: "skipHeavy", weekday: 3 },
  ]);
});
