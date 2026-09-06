import { expect, test } from "vite-plus/test";

import { overlapsWindow, syncWindow } from "./window";

test("写しの期間は過去 30 日〜未来 90 日（終端は排他的）", () => {
  const window = syncWindow("2026-08-17");
  expect(window.startAtMin).toBe("2026-07-18 00:00:00");
  expect(window.startAtMaxExclusive).toBe("2026-11-16 00:00:00");
  expect(window.timeMin).toBe("2026-07-18T00:00:00+09:00");
  expect(
    overlapsWindow({ endAt: "2026-07-18 01:00:00", startAt: "2026-07-18 00:00:00" }, window),
  ).toBe(true);
  expect(
    overlapsWindow({ endAt: "2026-07-18 00:00:00", startAt: "2026-07-17 23:00:00" }, window),
  ).toBe(false);
  expect(
    overlapsWindow({ endAt: "2026-07-18 01:00:00", startAt: "2026-07-17 23:00:00" }, window),
  ).toBe(true);
  expect(
    overlapsWindow({ endAt: "2026-11-16 01:00:00", startAt: "2026-11-16 00:00:00" }, window),
  ).toBe(false);
});
