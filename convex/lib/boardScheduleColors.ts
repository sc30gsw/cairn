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
  v.literal("blue"),
  v.literal("green"),
  v.literal("violet"),
  v.literal("orange"),
  v.literal("cyan"),
  v.literal("grape"),
  v.literal("red"),
  v.literal("teal"),
);
