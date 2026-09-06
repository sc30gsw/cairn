import { v, type Infer } from "convex/values";

import {
  GOOGLE_CALENDAR_EVENT_COLORS,
  DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR,
} from "./googleCalendarColors";

export const BOARD_SCHEDULE_COLORS = GOOGLE_CALENDAR_EVENT_COLORS.map((color) => color.appColor);

export const boardScheduleColorValidator = v.union(
  ...BOARD_SCHEDULE_COLORS.map((color) => v.literal(color)),
  v.literal("teal"),
  v.literal("violet"),
);

export type BoardScheduleColor = Infer<typeof boardScheduleColorValidator>;

export const DEFAULT_BOARD_SCHEDULE_COLOR = DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR.appColor;

export function normalizeBoardScheduleColor(color: BoardScheduleColor) {
  if (color === "teal") return "cyan";
  if (color === "violet") return "grape";
  return color;
}

export function boardScheduleGoogleColor(color: BoardScheduleColor) {
  const appColor = normalizeBoardScheduleColor(color);
  return (
    GOOGLE_CALENDAR_EVENT_COLORS.find((entry) => entry.appColor === appColor) ??
    DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR
  );
}
