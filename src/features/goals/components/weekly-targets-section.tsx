import { Anchor, Badge, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { TargetForm } from "~/features/goals/components/target-form";
import { TargetList } from "~/features/goals/components/target-list";
import { useWeeklyTargetActions } from "~/features/goals/hooks/use-goals-board-actions";
import type { TargetProgress } from "~/features/goals/types/target";
import type { CategoryDto } from "~/types/category";

export function WeeklyTargetsSection({
  categories,
  targets,
}: {
  categories: CategoryDto[];
  targets: TargetProgress[];
}) {
  const { onRemoveTarget, onSaveTarget } = useWeeklyTargetActions();
  const achievedCount = targets.filter((target) => target.achieved).length;

  return (
    <Stack gap="md">
      <Group gap="xs" justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Title order={2}>週間ターゲット</Title>
          {targets.length > 0 && (
            <Badge color={achievedCount === targets.length ? "green" : "gray"} variant="light">
              {achievedCount}/{targets.length} 達成
            </Badge>
          )}
        </Group>
        {/*? 週の締めは /review。ここは常設の入口2本目 */}
        <Anchor component={Link} to="/review">
          今週のレビュー
        </Anchor>
      </Group>
      <Text c="dimmed" size="sm">
        今週のカテゴリー別の実績です。月曜始まりの今週の確定記録から自動で集計します。
      </Text>
      {targets.length === 0 ? (
        <Text c="dimmed" size="sm">
          まだターゲットがありません。カテゴリーを選んで置いてみましょう。
        </Text>
      ) : (
        <TargetList onRemove={onRemoveTarget} targets={targets} />
      )}
      <TargetForm categories={categories} onSave={onSaveTarget} targets={targets} />
    </Stack>
  );
}
