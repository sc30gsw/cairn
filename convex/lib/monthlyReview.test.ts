import { expect, test } from "vite-plus/test";

import { calendarDatesInMonth } from "./jst";
import { bucketDatesByWeek, buildMonthlyDigestTrend, type DateStatusRow } from "./monthlyReview";

//? 2026-08 は 8/1(土) 始まり・8/31(月) 終わり。両端が部分週になる月
const AUGUST = calendarDatesInMonth("2026-08");
//? 2026-02 は 2/1(日) 始まり・2/28(土) 終わりの28日の月
const FEBRUARY = calendarDatesInMonth("2026-02");
//? 2026-06 は 6/1(月) 始まりで、第1週が月曜からそろう月
const JUNE = calendarDatesInMonth("2026-06");

function bucketShape(dates: readonly string[]) {
  return bucketDatesByWeek(dates).map((bucket) => ({
    end: bucket.end,
    length: bucket.dates.length,
    start: bucket.start,
  }));
}

test("月初が月曜でない月は先頭が部分週になる", () => {
  expect(bucketShape(AUGUST)).toEqual([
    { end: "2026-08-02", length: 2, start: "2026-08-01" },
    { end: "2026-08-09", length: 7, start: "2026-08-03" },
    { end: "2026-08-16", length: 7, start: "2026-08-10" },
    { end: "2026-08-23", length: 7, start: "2026-08-17" },
    { end: "2026-08-30", length: 7, start: "2026-08-24" },
    //? 月末が月曜なのでその1日だけの部分週になる
    { end: "2026-08-31", length: 1, start: "2026-08-31" },
  ]);
});

test("28日の2月も月内の日だけでバケット化する", () => {
  expect(bucketShape(FEBRUARY)).toEqual([
    { end: "2026-02-01", length: 1, start: "2026-02-01" },
    { end: "2026-02-08", length: 7, start: "2026-02-02" },
    { end: "2026-02-15", length: 7, start: "2026-02-09" },
    { end: "2026-02-22", length: 7, start: "2026-02-16" },
    //? 2/28(土) 終わりなので最後は6日の部分週
    { end: "2026-02-28", length: 6, start: "2026-02-23" },
  ]);
});

test("月初が月曜の月は先頭から7日そろう", () => {
  const buckets = bucketShape(JUNE);
  expect(buckets[0]).toEqual({ end: "2026-06-07", length: 7, start: "2026-06-01" });
  //? 6/30(火) 終わりなので最後は2日の部分週
  expect(buckets.at(-1)).toEqual({ end: "2026-06-30", length: 2, start: "2026-06-29" });
});

test("バケットの日数の合計は月の暦日数と一致する(前月・翌月の日を混ぜない)", () => {
  for (const dates of [AUGUST, FEBRUARY, JUNE]) {
    const total = bucketDatesByWeek(dates).reduce((sum, bucket) => sum + bucket.dates.length, 0);
    expect(total).toBe(dates.length);
  }
});

test("空の日付リストはバケット0件", () => {
  expect(bucketDatesByWeek([])).toEqual([]);
});

function row(dateJst: string, status: DateStatusRow["status"]): DateStatusRow {
  return { dateJst, status };
}

test("当日を含む週は当日の行を数えない", () => {
  //? 今日 = 2026-08-19(水)。第3週(8/17〜8/23)は 8/17・8/18 だけを数える
  const trend = buildMonthlyDigestTrend(
    AUGUST,
    [
      row("2026-08-17", "確定"),
      row("2026-08-18", "未着手"),
      row("2026-08-19", "確定"),
      row("2026-08-19", "確定"),
    ],
    "2026-08-19",
  );
  const third = trend[3];
  expect(third?.bucketStart).toBe("2026-08-17");
  expect(third?.confirmedCount).toBe(1);
  expect(third?.plannedCount).toBe(2);
  expect(third?.digestRate).toBe(0.5);
  expect(third?.isPartial).toBe(true);
});

test("記録が並んでいない週は plannedCount 0・digestRate 0 になる", () => {
  const trend = buildMonthlyDigestTrend(AUGUST, [], "2026-09-01");
  expect(trend.every((bucket) => bucket.plannedCount === 0)).toBe(true);
  expect(trend.every((bucket) => bucket.digestRate === 0)).toBe(true);
});

test("isPartial は月境界の部分週と当日以降を含む週の両方で立つ", () => {
  //? 月が丸ごと過去なら、7日そろった週だけ isPartial=false
  const past = buildMonthlyDigestTrend(AUGUST, [], "2026-09-01");
  expect(past.map((bucket) => bucket.isPartial)).toEqual([true, false, false, false, false, true]);

  //? 今日が 2026-08-19 なら、第3週(当日を含む)以降はすべて数えきれていない
  const current = buildMonthlyDigestTrend(AUGUST, [], "2026-08-19");
  expect(current.map((bucket) => bucket.isPartial)).toEqual([true, false, false, true, true, true]);
});

test("4状態を並んだ件数に数え、確定だけを分子にする", () => {
  const trend = buildMonthlyDigestTrend(
    AUGUST,
    [
      row("2026-08-03", "確定"),
      row("2026-08-04", "確定"),
      row("2026-08-05", "未着手"),
      row("2026-08-06", "進行中"),
      row("2026-08-07", "スキップ"),
    ],
    "2026-09-01",
  );
  expect(trend[1]).toMatchObject({
    bucketEnd: "2026-08-09",
    bucketStart: "2026-08-03",
    confirmedCount: 2,
    digestRate: 0.4,
    isPartial: false,
    plannedCount: 5,
  });
});

test("月外の日付の行はどのバケットにも数えない", () => {
  const trend = buildMonthlyDigestTrend(
    AUGUST,
    [row("2026-07-31", "確定"), row("2026-09-01", "確定")],
    "2026-09-30",
  );
  expect(trend.every((bucket) => bucket.plannedCount === 0)).toBe(true);
});
