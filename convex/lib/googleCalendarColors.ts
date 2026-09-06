import type { MantineColor } from "@mantine/core";
export const GOOGLE_CALENDAR_EVENT_COLORS = [
  { id: "1", label: "ラベンダー", color: "indigo" },
  { id: "2", label: "セージ", color: "lime" },
  { id: "3", label: "ブドウ", color: "grape" },
  { id: "4", label: "フラミンゴ", color: "pink" },
  { id: "5", label: "バナナ", color: "yellow" },
  { id: "6", label: "ミカン", color: "orange" },
  { id: "7", label: "ピーコック", color: "cyan" },
  { id: "8", label: "グラファイト", color: "gray" },
  { id: "9", label: "ブルーベリー", color: "blue" },
  { id: "10", label: "バジル", color: "green" },
  { id: "11", label: "トマト", color: "red" },
] as const satisfies readonly { id: string; label: string; color: MantineColor }[];

export const DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR = GOOGLE_CALENDAR_EVENT_COLORS[0];

export function googleCalendarEventColor(colorId: string | null | undefined): MantineColor {
  return (
    GOOGLE_CALENDAR_EVENT_COLORS.find((entry) => entry.id === colorId)?.color ??
    DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR.color
  );
}
