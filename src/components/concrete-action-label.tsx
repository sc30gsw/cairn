import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type ConcreteActionLabelProps = {
  infoAriaLabel?: string;
  label?: ReactNode;
  tooltipExample?: string;
};

export function ConcreteActionLabel({
  infoAriaLabel = "具体的手順の書き方",
  label = "具体的手順",
  tooltipExample = "「〜を勉強する」ではなく、何をどうするかを書きます。例: アプリを開いて単語カードを10枚めくる",
}: ConcreteActionLabelProps) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text size="sm" span>
        {label}
      </Text>
      <Tooltip label={tooltipExample} multiline w={280}>
        <ActionIcon aria-label={infoAriaLabel} size="xs" tabIndex={-1} variant="subtle">
          <IconInfoCircle aria-hidden size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
