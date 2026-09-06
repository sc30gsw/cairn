export const GOOGLE_CALENDAR_EVENT_COLORS = [
  { id: "1", label: "Lavender", appColor: "indigo", color: "#a4bdfc" },
  { id: "2", label: "Sage", appColor: "lime", color: "#7ae7bf" },
  { id: "3", label: "Grape", appColor: "grape", color: "#dbadff" },
  { id: "4", label: "Flamingo", appColor: "pink", color: "#ff887c" },
  { id: "5", label: "Banana", appColor: "yellow", color: "#fbd75b" },
  { id: "6", label: "Tangerine", appColor: "orange", color: "#ffb878" },
  { id: "7", label: "Peacock", appColor: "cyan", color: "#46d6db" },
  { id: "8", label: "Graphite", appColor: "gray", color: "#e1e1e1" },
  { id: "9", label: "Blueberry", appColor: "blue", color: "#5484ed" },
  { id: "10", label: "Basil", appColor: "green", color: "#51b749" },
  { id: "11", label: "Tomato", appColor: "red", color: "#dc2127" },
] as const satisfies readonly {
  id: string;
  label: string;
  appColor: string;
  color: `#${string}`;
}[];

export const DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR = GOOGLE_CALENDAR_EVENT_COLORS[0];

export function googleCalendarEventColor(colorId: string | null | undefined) {
  return (
    GOOGLE_CALENDAR_EVENT_COLORS.find((entry) => entry.id === colorId)?.color ??
    DEFAULT_GOOGLE_CALENDAR_EVENT_COLOR.color
  );
}
