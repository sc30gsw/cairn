import { Card, Grid, Group, Text } from "@mantine/core";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconMinus,
  type IconProps,
} from "@tabler/icons-react";
import type { ComponentType, ReactNode } from "react";

import { previousMonthLabel } from "~/features/review/lib/monthly-review-labels";
import { dailyAverageMinutes, deltaDirection } from "~/features/review/lib/weekly-review-labels";
import type { MonthlyReview } from "~/features/review/types/monthly-review";
import { NUMERAL_FONT } from "~/lib/theme";

const DELTA_ICON = {
  down: IconArrowDownRight,
  flat: IconMinus,
  up: IconArrowUpRight,
} as const satisfies Record<ReturnType<typeof deltaDirection>, ComponentType<IconProps>>;

function DeltaLine({
  current,
  previous,
  unit,
}: {
  current: number;
  previous: number;
  unit: string;
}) {
  const Icon = DELTA_ICON[deltaDirection(current, previous)];

  return (
    <Group gap={4} wrap="nowrap">
      {previous === 0 ? null : <Icon aria-hidden color="var(--cairn-muted-2)" size={14} />}
      <Text c="var(--cairn-muted-2)" ff={NUMERAL_FONT} size="xs">
        {previousMonthLabel(current, previous, unit)}
      </Text>
    </Group>
  );
}

function SummaryCard({
  children,
  label,
  value,
}: {
  children: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card h="100%" padding="md">
      <Text c="var(--cairn-muted-2)" size="sm">
        {label}
      </Text>
      <Text ff={NUMERAL_FONT} fw={600} fz={32} lh={1.1}>
        {value}
      </Text>
      {children}
    </Card>
  );
}

type MonthlyReviewSummaryCardsProps = Pick<
  MonthlyReview,
  | "activeDays"
  | "confirmedMinutes"
  | "digest"
  | "elapsedDays"
  | "previousActiveDays"
  | "previousConfirmedMinutes"
>;

export function MonthlyReviewSummaryCards({
  activeDays,
  confirmedMinutes,
  digest,
  elapsedDays,
  previousActiveDays,
  previousConfirmedMinutes,
}: MonthlyReviewSummaryCardsProps) {
  const hasDigest = digest.plannedCount > 0;

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 4 }}>
        <SummaryCard label="学習量" value={`${confirmedMinutes}分`}>
          <Text c="var(--cairn-muted-2)" ff={NUMERAL_FONT} size="xs">
            1日平均 {dailyAverageMinutes(confirmedMinutes, elapsedDays)}分（{elapsedDays}日）
          </Text>
          <DeltaLine current={confirmedMinutes} previous={previousConfirmedMinutes} unit="分" />
        </SummaryCard>
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 4 }}>
        <SummaryCard label="実施日" value={`${activeDays}日`}>
          <DeltaLine current={activeDays} previous={previousActiveDays} unit="日" />
        </SummaryCard>
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 4 }}>
        <SummaryCard
          label="消化"
          value={hasDigest ? `${Math.round(digest.digestRate * 100)}%` : "—"}
        >
          <Text c="var(--cairn-muted-2)" ff={NUMERAL_FONT} size="xs">
            {hasDigest ? `${digest.confirmedCount}/${digest.plannedCount}件` : "まだ数えられません"}
          </Text>
          {digest.isPartial && digest.countedThrough !== null ? (
            <Text c="var(--cairn-muted-2)" ff={NUMERAL_FONT} size="xs">
              今日は数えません
            </Text>
          ) : null}
        </SummaryCard>
      </Grid.Col>
    </Grid>
  );
}
