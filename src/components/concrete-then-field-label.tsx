import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type ConcreteThenFieldLabelProps = {
  label?: ReactNode;
  tooltipExample?: string;
};

export function ConcreteThenFieldLabel({
  label = "なら",
  tooltipExample = "例: 机に向かって金のフレーズを1 Unit だけ開く",
}: ConcreteThenFieldLabelProps) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text span>{label}</Text>
      <Tooltip label={tooltipExample} multiline w={280}>
        <ActionIcon aria-label="具体的手順の書き方" size="xs" tabIndex={-1} variant="subtle">
          <IconInfoCircle aria-hidden size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
