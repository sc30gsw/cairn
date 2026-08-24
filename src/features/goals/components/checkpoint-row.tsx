import { Badge, Box, Checkbox, Group, Text } from "@mantine/core";
import { compareDateJst, daysUntil, type DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import type { MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";
import { NUMERAL_FONT } from "~/lib/theme";

export const OVERDUE_LABEL = "期限超過";

//? 親カードの中に書き込まれた行。自前の枠は持たず、点線の下罫だけで区切る(Paper Redesign)
const ROW_BORDER = "1px dashed var(--cairn-desk)";

type CheckpointRowProps = {
  goal: MasteryGoal;
  //? 最後の行は下罫を出さない
  isLast: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  todayJst: DateJst;
};

export function CheckpointRow({
  goal,
  isLast,
  onEdit,
  onRemove,
  onSetAchieved,
  todayJst,
}: CheckpointRowProps) {
  const achieved = goal.achievedAt !== undefined;
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
      {/*? 自己判定の較正のために学習量の実績を併記する(Kruger & Dunning 1999) */}
      <Text c="dimmed" data-shimmer-no-children ff={NUMERAL_FONT} size="xs">
        確定 {goal.confirmedMinutes}分 / {goal.activeDays}日
      </Text>
      <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
    </Group>
  );
}
