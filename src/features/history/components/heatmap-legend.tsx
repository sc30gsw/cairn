import { Group, Stack, Text } from "@mantine/core";

import { HEATMAP_LEGEND } from "~/features/history/lib/heatmap-colors";

export function HeatmapLegend() {
  return (
    <Stack align="center" gap={4}>
      <Text c="dimmed" size="xs" ta="center">
        色の濃さは1日の学習時間です。
      </Text>
      <Group gap="md" justify="center" wrap="wrap">
        {HEATMAP_LEGEND.map((entry) => (
          <Group gap={6} key={entry.label} wrap="nowrap">
            <span
              aria-hidden
              style={{
                backgroundColor: entry.backgroundColor,
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: 4,
                display: "inline-block",
                height: 16,
                width: 16,
              }}
            />
            <Text size="xs">{entry.label}</Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}
