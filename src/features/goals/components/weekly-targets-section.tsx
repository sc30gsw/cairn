import { Badge, Group, Stack, Text, Title } from "@mantine/core";

import { TargetForm } from "~/features/goals/components/target-form";
import { TargetList } from "~/features/goals/components/target-list";
import type { SaveTargetInput } from "~/features/goals/types/mutations";
import type { TargetId, TargetProgress } from "~/features/goals/types/target";
import type { CategoryDto } from "~/types/category";

//? GoalsBoard からはこの塊ごと渡ってくる(props の受け渡しを1つにまとめる)
export type WeeklyTargetsSectionProps = {
  categories: CategoryDto[];
  onRemoveTarget: (targetId: TargetId) => void;
  onSaveTarget: (input: SaveTargetInput) => void;
  targets: TargetProgress[];
};

//? このアプリのプロセス目標の担い手。今週専用の計器で、週次スナップショットは取らない(docs/adr/0006)
export function WeeklyTargetsSection({
  categories,
  onRemoveTarget,
  onSaveTarget,
  targets,
}: WeeklyTargetsSectionProps) {
  const achievedCount = targets.filter((target) => target.achieved).length;

  return (
    <Stack gap="md">
      <Group gap="xs" wrap="nowrap">
        <Title order={2}>週間ターゲット</Title>
        {targets.length > 0 && (
          <Badge color={achievedCount === targets.length ? "green" : "gray"} variant="light">
            {achievedCount}/{targets.length} 達成
          </Badge>
        )}
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
