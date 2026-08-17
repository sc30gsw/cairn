import { expect, test } from "vite-plus/test";

import { creationDateJst, masteryProgressSince } from "./masteryProgress";

const SINCE = "2026-08-17";

test("起点日より前の記録は数えない(境界の当日は数える)", () => {
  expect(
    masteryProgressSince(
      [
        { dateJst: "2026-08-15", minutes: 90, status: "確定" },
        { dateJst: "2026-08-16", minutes: 60, status: "確定" },
        { dateJst: SINCE, minutes: 30, status: "確定" },
      ],
      SINCE,
    ),
  ).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("確定以外は分数も実施日も動かさない", () => {
  expect(
    masteryProgressSince(
      [
        { dateJst: SINCE, minutes: 999, status: "未着手" },
        { dateJst: SINCE, minutes: 999, status: "スキップ" },
      ],
      SINCE,
    ),
  ).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("同じ暦日に何件あっても実施日は1日、0分の確定でも1日", () => {
  expect(
    masteryProgressSince(
      [
        { dateJst: SINCE, minutes: 30, status: "確定" },
        { dateJst: SINCE, minutes: 20, status: "確定" },
        { dateJst: "2026-08-18", minutes: 0, status: "確定" },
      ],
      SINCE,
    ),
  ).toEqual({ activeDays: 2, confirmedMinutes: 50 });
});

test("_creationTime は JST 暦日に写る(UTC 日跨ぎでも JST の日になる)", () => {
  expect(creationDateJst(new Date("2026-08-17T15:30:00+09:00").getTime())).toBe("2026-08-17");
  //? JST 00:30 は UTC ではまだ前日。JST 側の暦日を返す。
  expect(creationDateJst(new Date("2026-08-17T00:30:00+09:00").getTime())).toBe("2026-08-17");
});
