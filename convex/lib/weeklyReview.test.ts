import { expect, test } from "vite-plus/test";

import {
  buildWeeklyDigest,
  buildWeeklyReviewDays,
  digestCountedDates,
  elapsedDaysInWeek,
  type WeeklyStatusRow,
} from "./weeklyReview";

const WEEK_DATES = [
  "2026-08-17",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
  "2026-08-22",
  "2026-08-23",
] as const;

function row(dateJst: string, status: WeeklyStatusRow["status"], minutes = 30): WeeklyStatusRow {
  return { dateJst, minutes, status };
}

test("digestCountedDates は今日と未来を落とす", () => {
  expect(digestCountedDates(WEEK_DATES, "2026-08-20")).toEqual([
    "2026-08-17",
    "2026-08-18",
    "2026-08-19",
  ]);
});

test("digestCountedDates は過去週なら7日すべて残す", () => {
  expect(digestCountedDates(WEEK_DATES, "2026-08-31")).toHaveLength(7);
});

test("buildWeeklyDigest は今日の行を分母にも分子にも入れない", () => {
  const digest = buildWeeklyDigest(
    WEEK_DATES,
    [row("2026-08-17", "確定"), row("2026-08-18", "未着手"), row("2026-08-20", "確定")],
    "2026-08-20",
  );
  expect(digest.plannedCount).toBe(2);
  expect(digest.confirmedCount).toBe(1);
  expect(digest.digestRate).toBeCloseTo(0.5);
});

test("buildWeeklyDigest は並んだ件数0なら digestRate 0", () => {
  const digest = buildWeeklyDigest(WEEK_DATES, [], "2026-08-20");
  expect(digest.plannedCount).toBe(0);
  expect(digest.digestRate).toBe(0);
});

test("buildWeeklyDigest は今週なら isPartial、過去週なら false", () => {
  expect(buildWeeklyDigest(WEEK_DATES, [], "2026-08-20").isPartial).toBe(true);
  expect(buildWeeklyDigest(WEEK_DATES, [], "2026-08-31").isPartial).toBe(false);
});

test("buildWeeklyDigest は週初日が今日なら countedThrough が null", () => {
  const digest = buildWeeklyDigest(WEEK_DATES, [], "2026-08-17");
  expect(digest.countedThrough).toBeNull();
  expect(digest.countedFrom).toBe("2026-08-17");
});

test("buildWeeklyDigest は過去週で数えた範囲を週の両端にする", () => {
  const digest = buildWeeklyDigest(WEEK_DATES, [], "2026-08-31");
  expect(digest.countedFrom).toBe("2026-08-17");
  expect(digest.countedThrough).toBe("2026-08-23");
});

test("buildWeeklyDigest は状態ごとの件数を分ける", () => {
  const digest = buildWeeklyDigest(
    WEEK_DATES,
    [
      row("2026-08-17", "確定"),
      row("2026-08-17", "未着手"),
      row("2026-08-18", "進行中"),
      row("2026-08-19", "スキップ"),
    ],
    "2026-08-31",
  );
  expect(digest).toMatchObject({
    confirmedCount: 1,
    leftoverCount: 1,
    ongoingCount: 1,
    plannedCount: 4,
    skippedCount: 1,
  });
});

test("buildWeeklyReviewDays は7件返し、休養・未記録・今日を書き分ける", () => {
  const days = buildWeeklyReviewDays({
    conditionByDate: { "2026-08-17": "好調" },
    liveDayDates: new Set(["2026-08-17", "2026-08-20"]),
    rows: [row("2026-08-17", "確定", 120), row("2026-08-17", "未着手"), row("2026-08-20", "確定")],
    todayJst: "2026-08-20",
    weekDates: WEEK_DATES,
  });

  expect(days).toHaveLength(7);
  expect(days[0]).toMatchObject({
    condition: "好調",
    confirmedCount: 1,
    confirmedMinutes: 120,
    kind: "live",
    plannedCount: 2,
  });
  expect(days[0]?.digestRate).toBeCloseTo(0.5);
  //? 火曜は記録が無い過去日 → 休養。並んだ件数0 なので消化は出さない
  expect(days[1]).toMatchObject({ condition: null, digestRate: null, kind: "rest" });
  //? 今日は学習量を出すが消化は出さない
  expect(days[3]).toMatchObject({ confirmedMinutes: 30, digestRate: null, kind: "live" });
  //? 未来日は未記録
  expect(days[6]).toMatchObject({ digestRate: null, kind: "unrecorded" });
});

test("buildWeeklyReviewDays は記録の無い今日を todayEmpty にする", () => {
  const days = buildWeeklyReviewDays({
    conditionByDate: {},
    liveDayDates: new Set(),
    rows: [],
    todayJst: "2026-08-17",
    weekDates: WEEK_DATES,
  });
  expect(days[0]?.kind).toBe("todayEmpty");
});

test("elapsedDaysInWeek は過去週で7、今週で経過日数", () => {
  expect(elapsedDaysInWeek(WEEK_DATES, "2026-08-31")).toBe(7);
  expect(elapsedDaysInWeek(WEEK_DATES, "2026-08-20")).toBe(4);
});
