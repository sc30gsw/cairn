import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { MouseEvent, ReactNode } from "react";

import { useConcreteActionTour } from "~/components/concrete-action-tour";

type ConcreteThenFieldLabelProps = {
  label?: ReactNode;
  tooltipExample?: string;
};

export function ConcreteThenFieldLabel({
  label = "なら",
  tooltipExample = "例: 机に向かって金のフレーズを1 Unit だけ開く",
}: ConcreteThenFieldLabelProps) {
  const tour = useConcreteActionTour();

  function handleHelpClick(event: MouseEvent<HTMLButtonElement>) {
    if (tour === null) {
      return;
    }
    event.preventDefault();
    tour.startTour();
  }

  return (
    <Group gap={4} wrap="nowrap">
      <Text span>{label}</Text>
      <Tooltip label={tooltipExample} multiline w={280}>
        <ActionIcon
          aria-label="具体的手順のガイドを表示"
          onClick={handleHelpClick}
          size="xs"
          variant="subtle"
        >
          <IconInfoCircle aria-hidden size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
