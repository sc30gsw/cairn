import type { MantineTheme } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import { boardScheduleGoogleColor, type BoardScheduleColor } from "~domain/boardScheduleColors";

export function boardScheduleColorCss(color: BoardScheduleColor) {
  return boardScheduleGoogleColor(color).color;
}

export function boardScheduleEventColors({
  color,
  variant = "light",
  theme,
}: Pick<ScheduleEventData, "color" | "variant"> & { theme: MantineTheme }) {
  return theme.variantColorResolver({
    color,
    variant,
    autoContrast: true,
    theme: { ...theme, luminanceThreshold: 0.179 },
  });
}
