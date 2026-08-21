import { expect, test } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { toBoardScheduleEvents } from "~/features/board/lib/board-schedule-events";
import type { BoardMastery, BoardRow } from "~/features/board/types/board";

const [confirmed] = STATUSES;

test("今日の記録は終日イベントになる", () => {
  const row = {
    _id: "r1" as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: "Distinction 2000",
    minutes: 30,
    sortOrder: 0,
    status: confirmed,
  } satisfies BoardRow;

  expect(toBoardScheduleEvents("2026-08-17", [row], null)).toEqual([
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

  const events = toBoardScheduleEvents("2026-08-17", [], checkpoint);
  expect(events).toHaveLength(1);
  expect(events[0]?.start).toBe("2026-08-20 00:00:00");
  expect(events[0]?.title).toBe("Part 2 を聞き取る");
});
