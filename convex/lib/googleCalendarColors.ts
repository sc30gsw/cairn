import type { MantineColor } from "@mantine/core";
export const GOOGLE_CALENDAR_EVENT_COLORS = [
  { id: "1", label: "Lavender", color: "indigo" },
  { id: "2", label: "Sage", color: "lime" },
  { id: "3", label: "Grape", color: "grape" },
  { id: "4", label: "Flamingo", color: "pink" },
  { id: "5", label: "Banana", color: "yellow" },
  { id: "6", label: "Tangerine", color: "orange" },
  { id: "7", label: "Peacock", color: "cyan" },
  { id: "8", label: "Graphite", color: "gray" },
  { id: "9", label: "Blueberry", color: "blue" },
  { id: "10", label: "Basil", color: "green" },
  { id: "11", label: "Tomato", color: "red" },
] as const satisfies readonly { id: string; label: string; color: MantineColor }[];

export const DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR = GOOGLE_CALENDAR_EVENT_COLORS[0];

export function googleCalendarEventColor(colorId: string | null | undefined) {
  return (
    GOOGLE_CALENDAR_EVENT_COLORS.find((entry) => entry.id === colorId)?.color ??
    DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR.color
  );
}
