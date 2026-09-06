import { expect, test } from "vite-plus/test";

import { calendarsToPull } from "./calendarsToPull";

test("書き込み先のカレンダーは表示から外されていても取り込む（アプリ発の予定の移動・削除を拾うため）", () => {
  expect(
    calendarsToPull({ calendarId: "primary@example.com", visibleCalendarIds: ["holidays"] }),
  ).toEqual(["holidays", "primary@example.com"]);
});

test("書き込み先が表示中でも二重には取り込まない", () => {
  expect(
    calendarsToPull({
      calendarId: "primary@example.com",
      visibleCalendarIds: ["primary@example.com", "holidays"],
    }),
  ).toEqual(["primary@example.com", "holidays"]);
});
