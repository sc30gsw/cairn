import { expect, test } from "vite-plus/test";

import type { Id } from "../../_generated/dataModel";
import { creationDateJst, masteryProgressSince } from "./masteryProgress";

const SINCE = "2026-08-17";
const KINFURE = "item-kinfure" as Id<"items">;
const TADOKU = "item-tadoku" as Id<"items">;

test("起点日より前の記録は数えない(境界の当日は数える)", () => {
  expect(
    masteryProgressSince(
      [
        { dateJst: "2026-08-15", itemId: KINFURE, minutes: 90, status: "確定" },
        { dateJst: "2026-08-16", itemId: KINFURE, minutes: 60, status: "確定" },
        { dateJst: SINCE, itemId: KINFURE, minutes: 30, status: "確定" },
      ],
      SINCE,
      undefined,
    ),
  ).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("確定以外は分数も実施日も動かさない", () => {
  expect(
    masteryProgressSince(
      [
        { dateJst: SINCE, itemId: KINFURE, minutes: 999, status: "未着手" },
        { dateJst: SINCE, itemId: KINFURE, minutes: 999, status: "スキップ" },
      ],
      SINCE,
      undefined,
    ),
  ).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("同じ暦日に何件あっても実施日は1日、0分の確定でも1日", () => {
  expect(
    masteryProgressSince(
      [
        { dateJst: SINCE, itemId: KINFURE, minutes: 30, status: "確定" },
        { dateJst: SINCE, itemId: KINFURE, minutes: 20, status: "確定" },
        { dateJst: "2026-08-18", itemId: KINFURE, minutes: 0, status: "確定" },
      ],
      SINCE,
      undefined,
    ),
  ).toEqual({ activeDays: 2, confirmedMinutes: 50 });
});

test("対象項目を渡すと、対象外の確定は分数にも実施日にも入らない", () => {
  const rows = [
    { dateJst: SINCE, itemId: KINFURE, minutes: 30, status: "確定" as const },
    { dateJst: SINCE, itemId: TADOKU, minutes: 20, status: "確定" as const },
    //? この暦日は対象外の項目だけ。実施日にも数えない
    { dateJst: "2026-08-18", itemId: TADOKU, minutes: 240, status: "確定" as const },
  ];
  expect(masteryProgressSince(rows, SINCE, [KINFURE])).toEqual({
    activeDays: 1,
    confirmedMinutes: 30,
  });
  //? 未指定なら従来どおり全項目を数える
  expect(masteryProgressSince(rows, SINCE, undefined)).toEqual({
    activeDays: 2,
    confirmedMinutes: 290,
  });
  //? 該当が1件も無ければゼロ
  expect(masteryProgressSince(rows, SINCE, ["item-none" as Id<"items">])).toEqual({
    activeDays: 0,
    confirmedMinutes: 0,
  });
});

test("_creationTime は JST 暦日に写る(UTC 日跨ぎでも JST の日になる)", () => {
  expect(creationDateJst(new Date("2026-08-17T15:30:00+09:00").getTime())).toBe("2026-08-17");
  //? JST 00:30 は UTC ではまだ前日。JST 側の暦日を返す。
  expect(creationDateJst(new Date("2026-08-17T00:30:00+09:00").getTime())).toBe("2026-08-17");
});
