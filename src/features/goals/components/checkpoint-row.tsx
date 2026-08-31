import { Badge, Box, Checkbox, Group, Text, Tooltip } from "@mantine/core";
import { compareDateJst, daysUntil, type DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import { goalScopeLabel } from "~/features/goals/lib/goal-scope";
import type { MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";
import { NUMERAL_FONT } from "~/lib/theme";
import type { ItemDto } from "~/types/item";

export const OVERDUE_LABEL = "期限超過";

const ROW_BORDER = "1px dashed var(--cairn-desk)";

type CheckpointRowProps = {
  goal: MasteryGoal;
  isLast: boolean;
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
