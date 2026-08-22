import { v } from "convex/values";

export const BOARD_SCHEDULE_COLORS = [
  "blue",
  "green",
  "violet",
  "orange",
  "cyan",
  "grape",
  "red",
  "teal",
] as const;

export type BoardScheduleColor = (typeof BOARD_SCHEDULE_COLORS)[number];

export const boardScheduleColorValidator = v.union(
  ...BOARD_SCHEDULE_COLORS.map((color) => v.literal(color)),
);

export const DEFAULT_BOARD_SCHEDULE_COLOR: BoardScheduleColor = "blue";
