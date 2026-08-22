import { Badge, type BadgeProps } from "@mantine/core";
import { IconMoodEmpty, IconMoodSad, IconMoodSmile, type IconProps } from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { Condition } from "~domain/conditions";

import { CONDITION_MANTINE_COLOR } from "~/lib/condition-colors";

const CONDITION_ICON = {
  好調: IconMoodSmile,
  普通: IconMoodEmpty,
  崩れた: IconMoodSad,
} as const satisfies Record<Condition, ComponentType<IconProps>>;

type ConditionBadgeProps = {
  condition: Condition;
  size?: BadgeProps["size"];
};

export function ConditionBadge({ condition, size = "sm" }: ConditionBadgeProps) {
  const Icon = CONDITION_ICON[condition];

  return (
    <Badge
      color={CONDITION_MANTINE_COLOR[condition]}
      leftSection={<Icon aria-hidden size={14} stroke={1.75} />}
      size={size}
      variant="light"
    >
      {condition}
    </Badge>
  );
}
