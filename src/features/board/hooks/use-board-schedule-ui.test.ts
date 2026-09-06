import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { expect, test } from "vite-plus/test";

import { useBoardScheduleUi } from "~/features/board/hooks/use-board-schedule-ui";
import { allDayEventsForDay } from "~/features/board/lib/board-schedule-events";
import type { BoardScheduleBlock } from "~/features/board/types/board";

test("月表示では基準週以外の複数日予定も継続日ごとに表示する", () => {
  const block: BoardScheduleBlock = {
    _id: "trip" as BoardScheduleBlock["_id"],
    color: "blue",
    rowId: "row" as BoardScheduleBlock["rowId"],
    endAt: "2026-09-18 23:59:59",
    startAt: "2026-09-15 00:00:00",
    title: "旅行",
  };
  const { result } = renderHook(() =>
    useBoardScheduleUi({
      anchorDateJst: "2026-09-01",
      blocks: [block],
      externals: [],
      rows: [],
      scheduleRootRef: createRef<HTMLDivElement>(),
      scheduleView: "month",
      todayJst: "2026-09-06",
    }),
  );

  for (const day of ["2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"]) {
    expect(allDayEventsForDay(result.current.scheduleEvents, day)).toMatchObject([
      { title: "旅行" },
    ]);
  }
  expect(allDayEventsForDay(result.current.scheduleEvents, "2026-09-19")).toEqual([]);
  const [continuation] = allDayEventsForDay(result.current.scheduleEvents, "2026-09-17");
  if (continuation === undefined) throw new Error("missing continuation");
  act(() => result.current.openFromEvent(continuation));
  expect(result.current.formOpened).toBe(true);
  expect(result.current.formValues).toMatchObject({ blockId: block._id });
});
