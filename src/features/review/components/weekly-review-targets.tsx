import {
  Alert,
  Anchor,
  Badge,
  EmptyState,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { IconCircleCheck, IconTarget } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { percentOf } from "~/features/review/lib/weekly-review-labels";
import type { WeeklyReview, WeeklyReviewTarget } from "~/features/review/types/weekly-review";
import { TARGET_METRIC_LABELS, TARGET_METRIC_UNITS } from "~/lib/target-metric-labels";

//? 達成の判別を色に載せない(達成の緑と未達のオレンジは protan で事実上同色)。
//? IconCircleCheck・VisuallyHidden の文言・(100%) の数値が判別子であり、この3つは省略不可。
function TargetRow({ target }: Record<"target", WeeklyReviewTarget>) {
  const percent = percentOf(target.current, target.targetValue);

  return (
    <Paper p="sm" radius="md" withBorder>
      <Stack gap={6}>
        <Group gap={6} wrap="nowrap">
          {target.achieved && (
            <>
              <IconCircleCheck aria-hidden color="var(--mantine-color-green-6)" size={18} />
              <VisuallyHidden>{target.categoryName}は達成</VisuallyHidden>
            </>
          )}
          <Text fw={500}>{target.categoryName}</Text>
          <Text c="dimmed" size="xs">
            {TARGET_METRIC_LABELS[target.metric]}
          </Text>
        </Group>
        <Progress
          aria-label={`${target.categoryName}の進捗`}
          color={target.achieved ? "green" : "orange"}
          value={percent}
        />
        <Text size="sm">
          {target.current} / {target.targetValue} {TARGET_METRIC_UNITS[target.metric]}（{percent}%）
        </Text>
      </Stack>
    </Paper>
  );
}

export function WeeklyReviewTargets({ targets }: Pick<WeeklyReview, "targets">) {
  if (targets === null) {
    return (
      <Stack gap="sm">
        <Title order={3}>週間ターゲット</Title>
        <Alert color="blue" title="週間ターゲットは今週だけの計器です">
          <Stack gap="xs">
            <Text size="sm">
              過去の週にはターゲットの達成状況を出しません（週ごとの目標値を保存していないため、いまの目標値で過去を裁くことになります）。
            </Text>
            <Anchor component={Link} to="/goals">
              今週のターゲットを見る
            </Anchor>
          </Stack>
        </Alert>
      </Stack>
    );
  }

  const achievedCount = targets.filter((target) => target.achieved).length;

  return (
    <Stack gap="sm">
      <Group gap="xs" wrap="nowrap">
        <Title order={3}>週間ターゲット</Title>
        {targets.length > 0 && (
          <Badge color={achievedCount === targets.length ? "green" : "gray"} variant="light">
            {achievedCount}/{targets.length} 達成
          </Badge>
        )}
      </Group>
      {targets.length === 0 ? (
        <EmptyState
          description="カテゴリーを選んでターゲットを置くと、週の締めで達成状況が読めます。"
          icon={<IconTarget aria-hidden />}
          title="まだターゲットがありません"
        >
          <EmptyState.Actions>
            <Anchor component={Link} to="/goals">
              ターゲットを置く
            </Anchor>
          </EmptyState.Actions>
        </EmptyState>
      ) : (
        <Stack gap="xs">
          {targets.map((target) => (
            <TargetRow key={target._id} target={target} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
