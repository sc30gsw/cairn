import { expect, test } from "vite-plus/test";

import { parseDateJst } from "~/lib/schemas/calendar-date-schema";

test("parseDateJst は暦日だけ通す", () => {
  expect(parseDateJst("2026-09-25")).toBe("2026-09-25");
  expect(parseDateJst("2026-02-30")).toBeUndefined();
  expect(parseDateJst("2026-9-25")).toBeUndefined();
  expect(parseDateJst(null)).toBeUndefined();
});
