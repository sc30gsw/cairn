import { expect, test } from "vite-plus/test";

import { toPulledEvent } from "./pulledEvent";

const CALENDAR = "owner@example.com";

test("取り消された予定は削除、開始の無い予定は無視", () => {
  expect(toPulledEvent(CALENDAR, { id: "a", status: "cancelled" })).toEqual({
    calendarId: CALENDAR,
    googleEventId: "a",
    kind: "delete",
  });
  expect(toPulledEvent(CALENDAR, { id: "b", status: "confirmed" })).toBeNull();
});

test("終日は 00:00:00〜23:59:59、複数日は最終日（排他的終端の前日）まで、題名が無ければ仮の題名", () => {
  expect(
    toPulledEvent(CALENDAR, {
      end: { date: "2026-08-20" },
      id: "c",
      start: { date: "2026-08-18" },
      updated: "2026-08-17T00:00:00.000Z",
    }),
  ).toEqual({
    allDay: true,
    calendarId: CALENDAR,
    endAt: "2026-08-19 23:59:59",
    googleEventId: "c",
    kind: "upsert",
    startAt: "2026-08-18 00:00:00",
    title: "（タイトルなし）",
    updated: "2026-08-17T00:00:00.000Z",
  });
});

test("時刻つきは JST の schedule instant に直し、終了が開始以前なら 1 分の長さにする", () => {
  const moved = toPulledEvent(CALENDAR, {
    end: { dateTime: "2026-08-18T02:30:00Z" },
    id: "d",
    start: { dateTime: "2026-08-18T01:00:00Z" },
    summary: "歯医者",
  });
  expect(moved).toMatchObject({ endAt: "2026-08-18 11:30:00", startAt: "2026-08-18 10:00:00" });

  const zero = toPulledEvent(CALENDAR, {
    end: { dateTime: "2026-08-18T10:00:00+09:00" },
    id: "e",
    start: { dateTime: "2026-08-18T10:00:00+09:00" },
    summary: "点",
  });
  expect(zero).toMatchObject({ endAt: "2026-08-18 10:01:00", startAt: "2026-08-18 10:00:00" });
});

test("hangoutLink があれば meetingUrl として引き継ぎ、無ければ含めない", () => {
  const withMeeting = toPulledEvent(CALENDAR, {
    end: { dateTime: "2026-08-18T02:30:00Z" },
    hangoutLink: "https://meet.google.com/abc-defg-hij",
    id: "f",
    start: { dateTime: "2026-08-18T01:00:00Z" },
    summary: "定例会議",
  });
  expect(withMeeting).toMatchObject({ meetingUrl: "https://meet.google.com/abc-defg-hij" });

  const withoutMeeting = toPulledEvent(CALENDAR, {
    end: { dateTime: "2026-08-18T02:30:00Z" },
    id: "g",
    start: { dateTime: "2026-08-18T01:00:00Z" },
    summary: "歯医者",
  });
  expect(withoutMeeting && "meetingUrl" in withoutMeeting).toBe(false);
});
