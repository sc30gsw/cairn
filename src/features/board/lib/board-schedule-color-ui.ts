import { boardScheduleGoogleColor, type BoardScheduleColor } from "~domain/boardScheduleColors";

export function boardScheduleColorCss(color: BoardScheduleColor) {
  return boardScheduleGoogleColor(color).color;
}
