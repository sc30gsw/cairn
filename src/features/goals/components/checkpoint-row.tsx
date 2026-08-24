import { Badge, Box, Checkbox, Group, Text, Tooltip } from "@mantine/core";
import { compareDateJst, daysUntil, type DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { goalScopeLabel } from "~/features/goals/lib/goal-scope";
import type { MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";
import { NUMERAL_FONT } from "~/lib/theme";
import type { ItemDto } from "~/types/item";

export const OVERDUE_LABEL = "期限超過";

//? 親カードの中に書き込まれた行。自前の枠は持たず、点線の下罫だけで区切る(Paper Redesign)
const ROW_BORDER = "1px dashed var(--cairn-desk)";

type CheckpointRowProps = {
  goal: MasteryGoal;
  //? 最後の行は下罫を出さない
  isLast: boolean;
  //? 対象項目のラベルを引き当てる一覧。名前の真実は items.list だけが持つ(#53 §18-18)
  items: ItemDto[];
  onEdit: () => void;
  onRemove: () => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  todayJst: DateJst;
};

export function CheckpointRow({
  goal,
  isLast,
  items,
  onEdit,
  onRemove,
  onSetAchieved,
  todayJst,
}: CheckpointRowProps) {
  const achieved = goal.achievedAt !== undefined;
  const scope = goalScopeLabel(goal.scopeItemIds, items);
  //? 期限切れは表示が変わるだけ。未達の自動失敗記録は残さない(CONTEXT.md「習得」)
  const overdue =
    !achieved && goal.deadline !== undefined && compareDateJst(goal.deadline, todayJst) < 0;
  const remainingDays = goal.deadline === undefined ? -1 : daysUntil(todayJst, goal.deadline);

  return (
    <Group
      component="li"
      gap="sm"
      py="xs"
      style={{ borderBottom: isLast ? undefined : ROW_BORDER }}
      wrap="wrap"
    >
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
      <Box flex="1" miw={200}>
        <Text>{goal.content}</Text>
        <Text c="dimmed" size="sm">
          基準: {goal.criterion}
        </Text>
      </Box>
      <Text c={overdue ? "red.5" : "orange.6"} ff={NUMERAL_FONT} size="sm">
        期限 {goal.deadline}
        {remainingDays >= 0 ? `（あと${remainingDays}日）` : ""}
      </Text>
      {overdue && (
        <Badge color="red" variant="light">
          {OVERDUE_LABEL}
        </Badge>
      )}
      {/*? 自己判定の較正のために対象項目の学習量の実績を併記する(Kruger & Dunning 1999) */}
      {/*? Tooltip は補助。必須情報は含めない(タッチ端末では出ない前提。#53 §9.1) */}
      <Tooltip disabled={scope.itemCount === 0} label={scope.full} withArrow>
        <Text c="dimmed" data-shimmer-no-children ff={NUMERAL_FONT} size="xs">
          {scope.itemCount === 0 ? "" : `${scope.short}・`}確定 {goal.confirmedMinutes}分 /{" "}
          {goal.activeDays}日
        </Text>
      </Tooltip>
      <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
    </Group>
  );
}
