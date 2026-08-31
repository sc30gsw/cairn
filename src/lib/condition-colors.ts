import type { MantineColor } from "@mantine/core";
import type { Condition } from "~domain/conditions";

export const CONDITION_MANTINE_COLOR = {
  崩れた: "red",
  普通: "blue",
  好調: "green",
} as const satisfies Record<Condition, MantineColor>;
