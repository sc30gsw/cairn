import type { MantineColor } from "@mantine/core";
import { v } from "convex/values";

export const BOARD_SCHEDULE_COLORS = [
  "blue",
  "cyan",
  "indigo",
  "green",
  "lime",
  "red",
  "orange",
  "pink",
  "yellow",
  "teal",
  "violet",
  "grape",
] as const satisfies readonly MantineColor[];

export type BoardScheduleColor = (typeof BOARD_SCHEDULE_COLORS)[number];

export const boardScheduleColorValidator = v.union(
  ...BOARD_SCHEDULE_COLORS.map((color) => v.literal(color)),
);

export const DEFAULT_BOARD_SCHEDULE_COLOR = "blue" satisfies BoardScheduleColor;
