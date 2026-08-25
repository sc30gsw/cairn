import type { MantineColor } from "@mantine/core";
import type { Condition } from "~domain/conditions";

//? teal は Flexoki 由来の theme.ts カラータプルに存在しない。好調は success 系の green を使う
//? (design-live-board.md ルール2)。
/** Mantine color names shared by week badges and month-view underlines. */
export const CONDITION_MANTINE_COLOR = {
  崩れた: "red",
  普通: "blue",
  好調: "green",
} as const satisfies Record<Condition, MantineColor>;
