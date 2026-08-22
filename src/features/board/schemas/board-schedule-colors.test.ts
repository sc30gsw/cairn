import { expect, test } from "vite-plus/test";

import { BOARD_SCHEDULE_COLORS as CLIENT_BOARD_SCHEDULE_COLORS } from "~/features/board/schemas/board-schedule-event-schema";

import { BOARD_SCHEDULE_COLORS as CONVEX_BOARD_SCHEDULE_COLORS } from "../../../../convex/lib/boardScheduleColors";

test("board schedule colors are shared between client and Convex", () => {
  expect([...CLIENT_BOARD_SCHEDULE_COLORS]).toEqual([...CONVEX_BOARD_SCHEDULE_COLORS]);
});
