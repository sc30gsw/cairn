import { BOARD_ALL_DAY_VISIBLE_LIMIT } from "~/features/board/lib/board-schedule-events";

export const ALL_DAY_ROW_HEIGHT = "1.25rem";
export const ALL_DAY_VISIBLE_ROWS = BOARD_ALL_DAY_VISIBLE_LIMIT + 1;
const ALL_DAY_GRID_GAP_PX = 2;
const ALL_DAY_GRID_PADDING_PX = 2;
const ALL_DAY_GRID_CHROME_PX =
  (ALL_DAY_VISIBLE_ROWS - 1) * ALL_DAY_GRID_GAP_PX + ALL_DAY_GRID_PADDING_PX * 2;

export const DAY_VIEW_ALL_DAY_SLOT_HEIGHT = `calc(${ALL_DAY_ROW_HEIGHT} * ${ALL_DAY_VISIBLE_ROWS} + ${ALL_DAY_GRID_CHROME_PX}px)`;
export const BOARD_MONTH_MAX_EVENTS_PER_DAY = BOARD_ALL_DAY_VISIBLE_LIMIT + 1;
export const DEFAULT_DAY_BLOCK_START = "09:00:00";
export const DEFAULT_DAY_BLOCK_END = "10:00:00";

export const boardMoreLabel = (hiddenEventsCount: number) => `+${hiddenEventsCount}件`;

export const BOARD_SCHEDULE_WITHOUT_HEADER = { withHeader: false as const };
