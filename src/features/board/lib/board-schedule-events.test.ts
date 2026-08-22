import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  BOARD_ALL_DAY_MORE_PREFIX,
  toBoardScheduleEvents,
  withAllDayOverflow,
} from "~/features/board/lib/board-schedule-events";
import type { BoardMastery, BoardRow } from "~/features/board/types/board";

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
    sortOrder,
    status: confirmed,
  };
}

test("今日の記録は終日イベントになる", () => {
  const todayRow = row("r1", "Distinction 2000", 0);

  expect(toBoardScheduleEvents("2026-08-17", [todayRow], null, [])).toEqual([
    {
      color: "green",
      end: "2026-08-17 23:59:59",
      id: "r1",
      start: "2026-08-17 00:00:00",
      title: "Distinction 2000",
    },
  ]);
});

test("チェックポイントは期限の終日イベントになる", () => {
  const checkpoint = {
    _id: "g1" as BoardMastery["_id"],
    activeDays: 0,
    confirmedMinutes: 0,
    content: "Part 2 を聞き取る",
    criterion: "できる",
    deadline: "2026-08-20",
    type: "mastery",
  } satisfies BoardMastery;

  const events = toBoardScheduleEvents("2026-08-17", [], checkpoint, []);
  expect(events).toHaveLength(1);
  expect(events[0]?.start).toBe("2026-08-20 00:00:00");
  expect(events[0]?.title).toBe("Part 2 を聞き取る");
});

test("ユーザー予定ブロックは記録と並べて表示する", () => {
  const block = {
    _id: "b1" as Id<"boardScheduleEvents">,
    color: "blue",
    endAt: "2026-08-17 10:30:00",
    rowId: "r1" as Id<"rows">,
    startAt: "2026-08-17 09:00:00",
    title: "Morning Standup",
  };

  const events = toBoardScheduleEvents("2026-08-17", [], null, [block]);
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
    [row("r1", "A", 0), row("r2", "B", 1), row("r3", "C", 2)],
    null,
    [],
  );
  const overflow = withAllDayOverflow(events, 2, (count) => `+${count}件`);

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
      title: "+1件",
    },
  ]);
  expect(overflow.hiddenEventsByDay.get("2026-08-17")?.map((event) => event.title)).toEqual(["C"]);
});
