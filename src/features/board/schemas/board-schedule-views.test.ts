import { expect, test } from "vite-plus/test";
import { BOARD_SCHEDULE_VIEWS } from "~domain/boardScheduleRange";

import type { BoardScheduleView } from "~/features/board/schemas/board-search-schema";

test("board schedule views are defined once in domain", () => {
  const clientViews: BoardScheduleView[] = ["day", "week", "month", "year"];
  expect([...clientViews]).toEqual([...BOARD_SCHEDULE_VIEWS]);
});
