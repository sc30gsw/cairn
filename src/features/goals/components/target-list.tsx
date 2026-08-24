import { ActionIcon, Group, Paper, Progress, Stack, Text, VisuallyHidden } from "@mantine/core";
import { IconCircleCheck, IconTrash } from "@tabler/icons-react";

import type { TargetId, TargetProgress } from "~/features/goals/types/target";
import { TARGET_METRIC_LABELS, TARGET_METRIC_UNITS } from "~/lib/target-metric-labels";

type TargetListProps = {
  onRemove: (targetId: TargetId) => void;
  targets: TargetProgress[];
};

export function TargetList({ onRemove, targets }: TargetListProps) {
  return (
    <Stack gap="xs">
      {targets.map((target) => (
        <TargetRow key={target._id} onRemove={() => onRemove(target._id)} target={target} />
      ))}
    </Stack>
  );
}

type TargetRowProps = {
  onRemove: () => void;
  target: TargetProgress;
};

function TargetRow({ onRemove, target }: TargetRowProps) {
  //? 超過分は 100% で止める。棒が伸び続けても「達成した」以上の情報にならない
  const percent =
    target.targetValue <= 0
      ? 0
      : Math.min(100, Math.round((target.current / target.targetValue) * 100));
  const unit = TARGET_METRIC_UNITS[target.metric];

  return (
    <Paper p="sm" radius="md" withBorder>
      <Stack gap={6}>
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            {target.achieved && (
              <>
                <IconCircleCheck aria-hidden color="var(--mantine-color-green-6)" size={18} />
                {/*? チェックマークは色と形だけの情報なので、読み上げ用の文言を添える */}
                <VisuallyHidden>{target.categoryName}は達成</VisuallyHidden>
              </>
            )}
            <Text fw={500}>{target.categoryName}</Text>
            <Text c="dimmed" size="xs">
              {TARGET_METRIC_LABELS[target.metric]}
            </Text>
          </Group>
          <ActionIcon
            aria-label={`${target.categoryName}のターゲットを削除`}
            color="red"
            onClick={onRemove}
            variant="subtle"
          >
            <IconTrash aria-hidden size={16} />
          </ActionIcon>
        </Group>
        <Progress
          aria-label={`${target.categoryName}の進捗`}
          color={target.achieved ? "green" : "orange"}
          value={percent}
        />
        <Text size="sm">
          {target.current} / {target.targetValue} {unit}（{percent}%）
        </Text>
      </Stack>
    </Paper>
  );
}
