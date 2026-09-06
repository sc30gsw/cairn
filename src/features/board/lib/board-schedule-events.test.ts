import type { ScheduleEventData } from "@mantine/schedule";
import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  BOARD_ALL_DAY_MORE_PREFIX,
  boardExternalEventId,
  allDayEventsForDay,
  movedScheduleRange,
  isBoardExternalEvent,
  timedEventsForDay,
  toExternalScheduleEvents,
  toBoardScheduleEvents,
  withoutAllDayEvents,
  withAllDayOverflow,
} from "~/features/board/lib/board-schedule-events";
import type { BoardRow, BoardScheduleBlock } from "~/features/board/types/board";

const [confirmed] = STATUSES;

function row(id: string, name: string, sortOrder: number): BoardRow {
  return {
    _id: id as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: name,
    minutes: 30,
    review: null,
    sortOrder,
    status: confirmed,
    timer: null,
  };
}

test("今日の記録は終日イベントになる", () => {
  const todayRow = row("r1", "Distinction 2000", 0);

  expect(toBoardScheduleEvents("2026-08-17", [todayRow], [])).toEqual([
    {
      color: "green",
      end: "2026-08-17 23:59:59",
      id: "r1",
      start: "2026-08-17 00:00:00",
      title: "Distinction 2000",
    },
  ]);
});

test("ユーザー予定ブロックは記録と並べて表示する", () => {
  const block = {
    _id: "b1" as Id<"boardScheduleEvents">,
    color: "blue",
    endAt: "2026-08-17 10:30:00",
    rowId: "r1" as Id<"rows">,
    startAt: "2026-08-17 09:00:00",
    title: "Morning Standup",
  } satisfies BoardScheduleBlock;

  const events = toBoardScheduleEvents("2026-08-17", [], [block]);
  expect(events).toEqual([
    {
      color: "blue",
      end: "2026-08-17 10:30:00",
      id: "b1",
      start: "2026-08-17 09:00:00",
      title: "Morning Standup",
    },
  ]);
});

test("終日イベントが多い日は +N件 を追加する", () => {
  const events = toBoardScheduleEvents(
    "2026-08-17",
    [row("r1", "A", 0), row("r2", "B", 1), row("r3", "C", 2), row("r4", "D", 3)],
    [],
  );
  const overflow = withAllDayOverflow(events, 2, (count) => `+${count}件`, ["2026-08-17"]);

  expect(overflow.events).toEqual([
    {
      color: "green",
      end: "2026-08-17 23:59:59",
      id: "r1",
      start: "2026-08-17 00:00:00",
      title: "A",
    },
    {
      color: "green",
      end: "2026-08-17 23:59:59",
      id: "r2",
      start: "2026-08-17 00:00:00",
      title: "B",
    },
    {
      color: "gray",
      end: "2026-08-17 23:59:59",
      id: `${BOARD_ALL_DAY_MORE_PREFIX}2026-08-17`,
      start: "2026-08-17 00:00:00",
      title: "+2件",
    },
  ]);
  expect(overflow.hiddenEventsByDay.get("2026-08-17")?.map((event) => event.title)).toEqual([
    "C",
    "D",
  ]);
});

test("終日7件は2件表示と+5件のみになる", () => {
  const events = toBoardScheduleEvents(
    "2026-08-22",
    [
      row("r1", "A", 0),
      row("r2", "B", 1),
      row("r3", "C", 2),
      row("r4", "D", 3),
      row("r5", "E", 4),
      row("r6", "F", 5),
      row("r7", "G", 6),
    ],
    [],
  );
  const overflow = withAllDayOverflow(events, 2, (count) => `+${count}件`, ["2026-08-22"]);
  const dayEvents = overflow.events.filter((event) => String(event.start).startsWith("2026-08-22"));

  expect(dayEvents).toHaveLength(3);
  expect(dayEvents.at(-1)?.title).toBe("+5件");
  expect(overflow.hiddenEventsByDay.get("2026-08-22")?.map((event) => event.title)).toEqual([
    "C",
    "D",
    "E",
    "F",
    "G",
  ]);
});

test("timedEventsForDay は終日とmoreを除いた予定だけ返す", () => {
  const events = toBoardScheduleEvents(
    "2026-08-17",
    [row("r1", "A", 0)],
    [
      {
        _id: "b1" as Id<"boardScheduleEvents">,
        color: "blue",
        endAt: "2026-08-17 10:30:00",
        rowId: "r1" as Id<"rows">,
        startAt: "2026-08-17 09:00:00",
        title: "Morning Standup",
      },
    ],
  );
  const overflow = withAllDayOverflow(events, 2, (count) => `+${count}件`, ["2026-08-17"]);

  expect(timedEventsForDay(overflow.events, "2026-08-17")).toEqual([
    {
      color: "blue",
      end: "2026-08-17 10:30:00",
      id: "b1",
      start: "2026-08-17 09:00:00",
      title: "Morning Standup",
    },
  ]);
  expect(timedEventsForDay(overflow.events, "2026-08-18")).toEqual([]);
});

test("終日イベントだけを除外できる", () => {
  const events = toBoardScheduleEvents(
    "2026-08-17",
    [row("r1", "A", 0)],
    [
      {
        _id: "b1" as Id<"boardScheduleEvents">,
        color: "blue",
        endAt: "2026-08-17 10:30:00",
        rowId: "r1" as Id<"rows">,
        startAt: "2026-08-17 09:00:00",
        title: "Morning Standup",
      },
    ],
  );

  expect(withoutAllDayEvents(events)).toEqual([
    {
      color: "blue",
      end: "2026-08-17 10:30:00",
      id: "b1",
      start: "2026-08-17 09:00:00",
      title: "Morning Standup",
    },
  ]);
});

test("外部予定は灰色の薄い予定になり、印付きの id で見分けられる", () => {
  const [event] = toExternalScheduleEvents([
    {
      _id: "ext1" as Id<"externalCalendarEvents">,
      allDay: false,
      calendarId: "owner@example.com",
      calendarName: "owner@example.com",
      calendarEmail: "owner@example.com",
      colorId: null,
      canEdit: true,
      color: "#9fe1cb",
      endAt: "2026-08-17 11:00:00",
      startAt: "2026-08-17 10:00:00",
      title: "歯医者",
    },
  ]);
  expect(event).toEqual({
    color: "gray",
    end: "2026-08-17 11:00:00",
    id: "external:ext1",
    start: "2026-08-17 10:00:00",
    title: "歯医者",
    variant: "light",
  });
  expect(isBoardExternalEvent("external:ext1")).toBe(true);
  expect(isBoardExternalEvent("r1")).toBe(false);
  expect(boardExternalEventId("external:ext1")).toBe("ext1");
});

test("複数日にわたる終日予定は各日の一覧とoverflowに含まれる", () => {
  const spanning: ScheduleEventData = {
    color: "gray",
    id: "external:trip",
    start: "2026-08-16 00:00:00",
    end: "2026-08-19 23:59:59",
    title: "旅行",
  };
  const events = [
    ...toBoardScheduleEvents("2026-08-17", [row("r1", "A", 0), row("r2", "B", 1)], []),
    spanning,
  ];
  expect(allDayEventsForDay(events, "2026-08-18")).toEqual([spanning]);
  expect(allDayEventsForDay(events, "2026-08-20")).toEqual([]);
  const overflow = withAllDayOverflow(events, 2, (count) => `+${count}件`, [
    "2026-08-17",
    "2026-08-18",
  ]);
  expect(overflow.hiddenEventsByDay.get("2026-08-17")).toEqual([spanning]);
  expect(overflow.events.find((event) => event.id === "external:trip|2026-08-18")).toMatchObject({
    start: "2026-08-18 00:00:00",
    end: "2026-08-18 23:59:59",
  });
  expect(new Set(overflow.events.map((event) => event.id)).size).toBe(overflow.events.length);
  expect(boardExternalEventId("external:trip|2026-08-18")).toBe("trip");
});

test("日跨ぎ予定は翌日に表示し、終了ちょうどの日には含めない", () => {
  const event: ScheduleEventData = {
    color: "gray",
    id: "external:night",
    start: "2026-08-16 23:00:00",
    end: "2026-08-18 00:00:00",
    title: "夜間作業",
  };
  expect(timedEventsForDay([event], "2026-08-17")).toEqual([event]);
  expect(timedEventsForDay([event], "2026-08-18")).toEqual([]);
});

test("複数日予定の途中の日をドラッグしても元の期間を維持する", () => {
  const external = {
    startAt: "2026-08-16 00:00:00",
    endAt: "2026-08-19 23:59:59",
    title: "旅行",
  };
  expect(movedScheduleRange(external, "2026-08-18 00:00:00", "2026-08-20 00:00:00")).toEqual({
    startAt: "2026-08-18 00:00:00",
    endAt: "2026-08-21 23:59:59",
  });
});
