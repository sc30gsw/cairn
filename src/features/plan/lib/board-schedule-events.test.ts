import type { ScheduleEventData } from "@mantine/schedule";
import { expect, test } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  BOARD_ALL_DAY_MORE_PREFIX,
  allDayEventsForDay,
  boardExternalEventId,
  isBoardExternalEvent,
  movedScheduleRange,
  timedEventsForDay,
  toExternalScheduleEvents,
  toPlanScheduleEvents,
  withAllDayOverflow,
  withoutAllDayEvents,
} from "~/features/plan/lib/board-schedule-events";
import type { PlanExternalEvent, PlanScheduleBlock } from "~/features/plan/types/plan";

function block(overrides: Partial<PlanScheduleBlock> = {}): PlanScheduleBlock {
  return {
    _id: "b1" as Id<"planEvents">,
    color: "yellow",
    endAt: "2026-08-17 10:30:00",
    frozen: false,
    itemId: undefined,
    priority: "high",
    sourceTitle: "Morning Standup",
    startAt: "2026-08-17 09:00:00",
    title: "Morning Standup",
    ...overrides,
  };
}

test("記録の終日チップは出さず、予定ブロックだけを出す", () => {
  expect(toPlanScheduleEvents([block()])).toEqual([
    {
      color: "#fbd75b",
      end: "2026-08-17 10:30:00",
      id: "b1",
      start: "2026-08-17 09:00:00",
      title: "Morning Standup",
      variant: "filled",
    },
  ]);
});

test("終日イベントが多い日は +N件 を追加する", () => {
  const events: ScheduleEventData[] = [
    {
      color: "green",
      end: "2026-08-17 23:59:59",
      id: "a",
      start: "2026-08-17 00:00:00",
      title: "A",
    },
    {
      color: "green",
      end: "2026-08-17 23:59:59",
      id: "b",
      start: "2026-08-17 00:00:00",
      title: "B",
    },
    {
      color: "green",
      end: "2026-08-17 23:59:59",
      id: "c",
      start: "2026-08-17 00:00:00",
      title: "C",
    },
    {
      color: "green",
      end: "2026-08-17 23:59:59",
      id: "d",
      start: "2026-08-17 00:00:00",
      title: "D",
    },
  ];
  const overflow = withAllDayOverflow(events, 2, (count) => `+${count}件`, ["2026-08-17"]);

  expect(overflow.events.map((event) => event.title)).toEqual(["A", "B", "+2件"]);
  expect(overflow.events.at(-1)?.id).toBe(`${BOARD_ALL_DAY_MORE_PREFIX}2026-08-17`);
  expect(overflow.hiddenEventsByDay.get("2026-08-17")?.map((event) => event.title)).toEqual([
    "C",
    "D",
  ]);
});

test("timedEventsForDay は終日とmoreを除いた予定だけ返す", () => {
  const timed = toPlanScheduleEvents([block()]);
  const allDay: ScheduleEventData = {
    color: "green",
    end: "2026-08-17 23:59:59",
    id: "all",
    start: "2026-08-17 00:00:00",
    title: "A",
  };
  const overflow = withAllDayOverflow([...timed, allDay], 2, (count) => `+${count}件`, [
    "2026-08-17",
  ]);

  expect(timedEventsForDay(overflow.events, "2026-08-17")).toEqual(timed);
  expect(timedEventsForDay(overflow.events, "2026-08-18")).toEqual([]);
});

test("終日イベントだけを除外できる", () => {
  const timed = toPlanScheduleEvents([block()]);
  const allDay: ScheduleEventData = {
    color: "green",
    end: "2026-08-17 23:59:59",
    id: "all",
    start: "2026-08-17 00:00:00",
    title: "A",
  };
  expect(withoutAllDayEvents([...timed, allDay])).toEqual(timed);
});

const EXTERNAL_EVENT = {
  _id: "ext1" as Id<"externalCalendarEvents">,
  allDay: false,
  calendarEmail: "owner@example.com",
  calendarId: "owner@example.com",
  calendarName: "owner@example.com",
  canEdit: true,
  color: "#9fe1cb",
  colorId: null,
  endAt: "2026-08-17 11:00:00",
  externalReadOnly: false,
  meetingUrl: null,
  startAt: "2026-08-17 10:00:00",
  title: "歯医者",
} as const satisfies PlanExternalEvent;

test("色が未指定の外部予定はラベンダーの予定になり、印付きの id で見分けられる", () => {
  const [event] = toExternalScheduleEvents([EXTERNAL_EVENT]);
  expect(event).toEqual({
    color: "#a4bdfc",
    end: "2026-08-17 11:00:00",
    id: "external:ext1",
    start: "2026-08-17 10:00:00",
    title: "歯医者",
    variant: "filled",
  });
  expect(isBoardExternalEvent("external:ext1")).toBe(true);
  expect(isBoardExternalEvent("r1")).toBe(false);
  expect(boardExternalEventId("external:ext1")).toBe("ext1");
});

test("追加アカウントの色が未指定の外部予定はフラミンゴになる", () => {
  const [event] = toExternalScheduleEvents([{ ...EXTERNAL_EVENT, externalReadOnly: true }]);
  expect(event?.color).toBe("#ff887c");
});

test("Google が色を付けた予定は、追加アカウントでもその色を保つ", () => {
  const events = toExternalScheduleEvents([
    { ...EXTERNAL_EVENT, colorId: "10" },
    { ...EXTERNAL_EVENT, colorId: "10", externalReadOnly: true },
  ]);
  expect(events.map((event) => event.color)).toEqual(["#51b749", "#51b749"]);
});

test("複数日にわたる終日予定は各日の一覧とoverflowに含まれる", () => {
  const spanning: ScheduleEventData = {
    color: "gray",
    end: "2026-08-19 23:59:59",
    id: "external:trip",
    start: "2026-08-16 00:00:00",
    title: "旅行",
  };
  const events = [
    ...toPlanScheduleEvents([
      block({
        _id: "r1" as Id<"planEvents">,
        endAt: "2026-08-17 23:59:59",
        startAt: "2026-08-17 00:00:00",
        title: "A",
      }),
      block({
        _id: "r2" as Id<"planEvents">,
        color: "lime",
        endAt: "2026-08-17 23:59:59",
        priority: "medium",
        startAt: "2026-08-17 00:00:00",
        title: "B",
      }),
    ]),
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
    end: "2026-08-18 23:59:59",
    start: "2026-08-18 00:00:00",
  });
  expect(new Set(overflow.events.map((event) => event.id)).size).toBe(overflow.events.length);
  expect(boardExternalEventId("external:trip|2026-08-18")).toBe("trip");
});

test("日跨ぎ予定は翌日に表示し、終了ちょうどの日には含めない", () => {
  const event: ScheduleEventData = {
    color: "gray",
    end: "2026-08-18 00:00:00",
    id: "external:night",
    start: "2026-08-16 23:00:00",
    title: "夜間作業",
  };
  expect(timedEventsForDay([event], "2026-08-17")).toEqual([event]);
  expect(timedEventsForDay([event], "2026-08-18")).toEqual([]);
});

test("複数日予定の途中の日をドラッグしても元の期間を維持する", () => {
  const external = {
    endAt: "2026-08-19 23:59:59",
    startAt: "2026-08-16 00:00:00",
    title: "旅行",
  };
  expect(movedScheduleRange(external, "2026-08-18 00:00:00", "2026-08-20 00:00:00")).toEqual({
    endAt: "2026-08-21 23:59:59",
    startAt: "2026-08-18 00:00:00",
  });
});
