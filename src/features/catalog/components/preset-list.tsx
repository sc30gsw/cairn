import { Button, Group, Stack, Text } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

type PresetDto = FunctionReturnType<typeof api.presets.list>[number];

type PresetListProps = {
  onRemove: (presetId: PresetDto["_id"]) => void;
  presets: PresetDto[];
};

export function PresetList({ onRemove, presets }: PresetListProps) {
  return (
    <Stack gap="sm">
      {presets.map((preset) => (
        <Group key={preset._id} justify="space-between">
          <Text>
            {preset.name}:{" "}
            {preset.lines.map((line: PresetDto["lines"][number]) => line.itemName).join("、") ||
              "行なし"}
          </Text>
          <Button color="red" onClick={() => onRemove(preset._id)} variant="subtle">
            {preset.name}を削除
          </Button>
        </Group>
      ))}
    </Stack>
  );
}
