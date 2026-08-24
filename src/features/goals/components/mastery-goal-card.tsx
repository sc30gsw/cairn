import { Badge, Checkbox, Group, Stack, Text, Title } from "@mantine/core";
import type { DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { goalTier } from "~/features/goals/lib/goal-tree";
import type { MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";
import { NUMERAL_FONT } from "~/lib/theme";

export const LONG_TERM_CARD_TITLE = "長期目標";
export const ACHIEVED_BADGE_LABEL = "達成済み";

const TIER_TITLES = {
  checkpoint: "チェックポイント",
  longTerm: LONG_TERM_CARD_TITLE,
} as const satisfies Record<"checkpoint" | "longTerm", string>;

type MasteryGoalBodyProps = {
  goal: MasteryGoal;
  onEdit: () => void;
  onRemove: () => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  todayJst: DateJst;
};

//? 親カードの中身だけ。枠(Card)と子チェックポイントは ParentGoalGroup が持つ
//? 期限を持つ習得の呼び名がチェックポイント。データ上は同じタイプ(docs/adr/0006)
export function MasteryGoalBody({
  goal,
  onEdit,
  onRemove,
  onSetAchieved,
  todayJst,
}: MasteryGoalBodyProps) {
  const achieved = goal.achievedAt !== undefined;

  return (
    <Stack gap="xs">
      <Group gap="xs" justify="space-between" wrap="wrap">
        <Group gap="xs" wrap="wrap">
          <Title order={2}>{TIER_TITLES[goalTier(goal)]}</Title>
          {achieved && (
            <Badge color="green" variant="light">
              {ACHIEVED_BADGE_LABEL}
            </Badge>
          )}
        </Group>
        <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
      </Group>
      <Group gap="xs" wrap="wrap">
        <Checkbox
          aria-label={`${goal.content}の達成`}
          checked={achieved}
          onChange={(event) =>
            onSetAchieved({
              achievedAt: event.currentTarget.checked ? todayJst : undefined,
              goalId: goal._id,
            })
          }
        />
        <Text>{goal.content}</Text>
      </Group>
      <Text size="sm">基準: {goal.criterion}</Text>
      {goal.achievedAt !== undefined && (
        <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
          達成 {goal.achievedAt}
        </Text>
      )}
      {/*? 自己判定の較正のために学習量の実績を併記する(Kruger & Dunning 1999) */}
      <Text c="dimmed" ff={NUMERAL_FONT} size="xs">
        確定 {goal.confirmedMinutes}分 / {goal.activeDays}日
      </Text>
    </Stack>
  );
}
