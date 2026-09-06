import { expect, test } from "vite-plus/test";

import { dayViewKind, isRestCalendarDate } from "./dayView";

const TODAY = "2026-08-17";

test("過去で日が無い暦日は休養", () => {
  expect(isRestCalendarDate("2026-08-15", TODAY, false, "2026-01-01")).toBe(true);
  expect(
    dayViewKind({
      serviceStartDateJst: "2026-01-01",
      dateJst: "2026-08-15",
      hasLiveDay: false,
      todayJst: TODAY,
    }),
  ).toBe("rest");
});

test("今日で日が無い暦日は休養ではない", () => {
  expect(isRestCalendarDate(TODAY, TODAY, false, "2026-01-01")).toBe(false);
  expect(
    dayViewKind({
      serviceStartDateJst: "2026-01-01",
      dateJst: TODAY,
      hasLiveDay: false,
      todayJst: TODAY,
    }),
  ).toBe("todayEmpty");
});

test("未来は未記録であり休養ではない", () => {
  expect(isRestCalendarDate("2026-08-20", TODAY, false, "2026-01-01")).toBe(false);
  expect(
    dayViewKind({
      serviceStartDateJst: "2026-01-01",
      dateJst: "2026-08-20",
      hasLiveDay: false,
      todayJst: TODAY,
    }),
  ).toBe("unrecorded");
});

test("日がある過去は休養ではない", () => {
  expect(isRestCalendarDate("2026-08-15", TODAY, true, "2026-01-01")).toBe(false);
  expect(
    dayViewKind({
      serviceStartDateJst: "2026-01-01",
      dateJst: "2026-08-15",
      hasLiveDay: true,
      todayJst: TODAY,
    }),
  ).toBe("live");
});

test("日がある今日は live", () => {
  expect(
    dayViewKind({
      serviceStartDateJst: "2026-01-01",
      dateJst: TODAY,
      hasLiveDay: true,
      todayJst: TODAY,
    }),
  ).toBe("live");
});

test.each([
  ["2026-08-15", false, "beforeRegistration"],
  ["2026-08-15", true, "live"],
  ["2026-08-16", false, "rest"],
  ["2026-08-17", false, "todayEmpty"],
  ["2026-08-18", false, "unrecorded"],
] as const)("登録日境界 %s / 記録 %s は %s", (dateJst, hasLiveDay, kind) => {
  expect(
    dayViewKind({ dateJst, hasLiveDay, serviceStartDateJst: "2026-08-16", todayJst: TODAY }),
  ).toBe(kind);
});
