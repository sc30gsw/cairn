import { Badge, Group, Text, Title } from "@mantine/core";
import type { Condition } from "~domain/conditions";

import { ConditionBadge } from "~/components/condition-badge";
import { formatJstDateLabel } from "~/features/history/lib/format-jst-date";

type DayMemoMetaProps = {
  condition: Condition | null;
  dateJst: string;
  minutes: number;
  variant?: "compact" | "highlight";
};

function ConfirmedMinutes({ minutes, variant }: Pick<DayMemoMetaProps, "minutes" | "variant">) {
  if (minutes <= 0) {
    return null;
  }

  if (variant === "highlight") {
    return (
      <Badge color="blue" variant="light">
        確定 {minutes}分
      </Badge>
    );
  }

  return (
    <Text c="dimmed" size="sm">
      確定 {minutes}分
    </Text>
  );
}

export function DayMemoMeta({
  condition,
  dateJst,
  minutes,
  variant = "compact",
}: DayMemoMetaProps) {
  const dateLabel = formatJstDateLabel(dateJst);

  return (
    <Group gap="xs" wrap="wrap">
      {variant === "highlight" ? (
        <Title order={4}>{dateLabel}</Title>
      ) : (
        <Text fw={600} size="sm">
          {dateLabel}
        </Text>
      )}
      {condition === null ? null : (
        <ConditionBadge condition={condition} size={variant === "highlight" ? "md" : undefined} />
      )}
      <ConfirmedMinutes minutes={minutes} variant={variant} />
    </Group>
  );
}
