import { expect, test } from "vite-plus/test";
import { BOARD_SCHEDULE_COLORS, boardScheduleColorValidator } from "~domain/boardScheduleColors";

import { BOARD_SCHEDULE_COLORS as CLIENT_BOARD_SCHEDULE_COLORS } from "~/features/board/schemas/board-schedule-event-schema";

test("board schedule colors are defined once in domain", () => {
  expect([...CLIENT_BOARD_SCHEDULE_COLORS]).toEqual([...BOARD_SCHEDULE_COLORS]);
  expect(boardScheduleColorValidator).toBeDefined();
});
