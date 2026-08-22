import { describe, expect, test } from "vite-plus/test";

import {
  BOARD_ALL_DAY_SLOT_ROWS,
  boardAllDayRowStyle,
  mergeAllDayEventStyle,
  parseMantineAllDayRow,
} from "~/features/board/lib/board-schedule-all-day-layout";

describe("board-schedule-all-day-layout", () => {
  test("maps Mantine 50% rows into three compact all-day slots", () => {
    expect(parseMantineAllDayRow("calc(0% + 1px)")).toBe(0);
    expect(parseMantineAllDayRow("calc(50% + 1px)")).toBe(1);
    expect(parseMantineAllDayRow("calc(2 * 50% + 1px)")).toBe(2);
    expect(parseMantineAllDayRow("calc(100% + 1px)")).toBe(2);
    expect(boardAllDayRowStyle(2)).toEqual({
      top: `calc(${(100 / BOARD_ALL_DAY_SLOT_ROWS) * 2}% + 1px)`,
      height: `calc(${100 / BOARD_ALL_DAY_SLOT_ROWS}% - 2px)`,
      maxHeight: `calc(${100 / BOARD_ALL_DAY_SLOT_ROWS}% - 2px)`,
    });
  });

  test("ignores non all-day positioning", () => {
    expect(parseMantineAllDayRow("12px")).toBeNull();
    expect(parseMantineAllDayRow(undefined)).toBeNull();
  });

  test("merges converted row styles onto the event style object", () => {
    expect(
      mergeAllDayEventStyle(
        {
          left: "calc(0% + 1px)",
          top: "calc(1 * 50% + 1px)",
          width: "calc(14.2857% - 1px)",
        },
        1,
      ),
    ).toMatchObject({
      left: "calc(0% + 1px)",
      top: `calc(${100 / BOARD_ALL_DAY_SLOT_ROWS}% + 1px)`,
      width: "calc(14.2857% - 1px)",
    });
  });
});
