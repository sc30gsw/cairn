import { expect, test } from "vite-plus/test";

import { dayViewKind, isRestCalendarDate } from "./dayView";

const TODAY = "2026-08-17";

test("過去で日が無い暦日は休養", () => {
  expect(isRestCalendarDate("2026-08-15", TODAY, false)).toBe(true);
  expect(dayViewKind({ dateJst: "2026-08-15", hasLiveDay: false, todayJst: TODAY })).toBe("rest");
});

test("今日で日が無い暦日は休養ではない", () => {
  expect(isRestCalendarDate(TODAY, TODAY, false)).toBe(false);
  expect(dayViewKind({ dateJst: TODAY, hasLiveDay: false, todayJst: TODAY })).toBe("todayEmpty");
});

test("未来は未記録であり休養ではない", () => {
  expect(isRestCalendarDate("2026-08-20", TODAY, false)).toBe(false);
  expect(dayViewKind({ dateJst: "2026-08-20", hasLiveDay: false, todayJst: TODAY })).toBe(
    "unrecorded",
  );
});

test("日がある過去は休養ではない", () => {
  expect(isRestCalendarDate("2026-08-15", TODAY, true)).toBe(false);
  expect(dayViewKind({ dateJst: "2026-08-15", hasLiveDay: true, todayJst: TODAY })).toBe("live");
});
