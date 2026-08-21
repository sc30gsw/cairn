import type { Condition } from "~domain/conditions";

/** Mantine color names shared by week badges and month-view underlines. */
export const CONDITION_MANTINE_COLOR = {
  崩れた: "red",
  普通: "blue",
  好調: "teal",
} as const satisfies Record<Condition, string>;
