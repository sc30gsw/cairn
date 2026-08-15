export type HeatmapLegendEntry = {
  backgroundColor: string;
  label: string;
};

export function heatmapBackgroundColor(minutes: number, isRest: boolean): string | undefined {
  if (isRest) {
    return "var(--mantine-color-yellow-1)";
  }
  return heatmapColor(minutes);
}

export function heatmapColor(minutes: number): string | undefined {
  if (minutes === 0) {
    return undefined;
  }
  if (minutes < 30) {
    return "var(--mantine-color-blue-1)";
  }
  if (minutes < 60) {
    return "var(--mantine-color-blue-2)";
  }
  if (minutes < 120) {
    return "var(--mantine-color-blue-3)";
  }
  return "var(--mantine-color-blue-4)";
}

export const HEATMAP_LEGEND: HeatmapLegendEntry[] = [
  { backgroundColor: "var(--mantine-color-yellow-1)", label: "休養（記録なし）" },
  { backgroundColor: "var(--mantine-color-blue-1)", label: "1〜29分" },
  { backgroundColor: "var(--mantine-color-blue-2)", label: "30〜59分" },
  { backgroundColor: "var(--mantine-color-blue-3)", label: "60〜119分" },
  { backgroundColor: "var(--mantine-color-blue-4)", label: "120分+" },
];
