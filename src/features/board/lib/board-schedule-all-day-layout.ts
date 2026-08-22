import type { CSSProperties } from "react";

import { BOARD_ALL_DAY_VISIBLE_LIMIT } from "~/features/board/lib/board-schedule-events";

export const BOARD_ALL_DAY_SLOT_ROWS = BOARD_ALL_DAY_VISIBLE_LIMIT + 1;

const MANTINE_ALL_DAY_ROW_TOP_MULTIPLIER = /calc\((\d+) \* 50% \+ 1px\)/;
const MANTINE_ALL_DAY_ROW_TOP_PERCENT = /calc\((\d+)% \+ 1px\)/;

export function parseMantineAllDayRow(top: unknown): number | null {
  if (typeof top !== "string") {
    return null;
  }

  const multiplierMatch = MANTINE_ALL_DAY_ROW_TOP_MULTIPLIER.exec(top);
  if (multiplierMatch !== null) {
    return Number(multiplierMatch[1]);
  }

  const percentMatch = MANTINE_ALL_DAY_ROW_TOP_PERCENT.exec(top);
  if (percentMatch === null) {
    return null;
  }

  const percent = Number(percentMatch[1]);
  if (percent % 50 !== 0) {
    return null;
  }
  return percent / 50;
}

export function boardAllDayRowStyle(
  row: number,
): Pick<CSSProperties, "height" | "maxHeight" | "top"> {
  const rowHeightPercent = 100 / BOARD_ALL_DAY_SLOT_ROWS;
  return {
    top: `calc(${row * rowHeightPercent}% + 1px)`,
    height: `calc(${rowHeightPercent}% - 2px)`,
    maxHeight: `calc(${rowHeightPercent}% - 2px)`,
  };
}

export function mergeAllDayEventStyle(
  style: CSSProperties | undefined,
  row: number,
): CSSProperties {
  return {
    ...style,
    ...boardAllDayRowStyle(row),
  };
}
