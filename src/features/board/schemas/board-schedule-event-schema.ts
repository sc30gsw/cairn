import * as v from "valibot";
import { BOARD_SCHEDULE_COLORS, type BoardScheduleColor } from "~domain/boardScheduleColors";

import type { BoardRow, BoardScheduleBlock } from "~/features/board/types/board";

export { BOARD_SCHEDULE_COLORS, type BoardScheduleColor };

const BoardScheduleColorSchema = v.picklist(BOARD_SCHEDULE_COLORS);

const BlockIdSchema = v.custom<BoardScheduleBlock["_id"]>(
  (value) => typeof value === "string" && value.length > 0,
);

const RowIdSchema = v.custom<BoardRow["_id"]>(
  (value) => typeof value === "string" && value.length > 0,
  "項目を選んでください",
);

export const BoardScheduleEventSchema = v.pipe(
  v.object({
    blockId: v.optional(BlockIdSchema),
    color: BoardScheduleColorSchema,
    end: v.date(),
    rowId: RowIdSchema,
    start: v.date(),
  }),
  v.forward(
    v.partialCheck(
      [["start"], ["end"]],
      (input) => input.end.getTime() > input.start.getTime(),
      "終了は開始より後にしてください",
    ),
    ["end"],
  ),
);

export type BoardScheduleEventInput = v.InferInput<typeof BoardScheduleEventSchema>;
export type BoardScheduleEventOutput = v.InferOutput<typeof BoardScheduleEventSchema>;
