import { Alert, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import type { DateJst } from "~domain/jst";

import { CheckpointRow } from "~/features/goals/components/checkpoint-row";
import type { MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";
import type { ItemDto } from "~/types/item";

export const ORPHAN_CHECKPOINTS_TITLE = "親のないチェックポイント";
export const ORPHAN_CHECKPOINTS_MESSAGE =
  "親が見つからないチェックポイントがあります。編集で親を選び直してください。";

type OrphanCheckpointsAlertProps = {
  form: ReactNode;
  items: ItemDto[];
  onEditGoal: (goal: MasteryGoal) => void;
  onRemoveGoal: (goal: MasteryGoal) => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  orphans: MasteryGoal[];
  todayJst: DateJst;
};

export function OrphanCheckpointsAlert({
  form,
  items,
  onEditGoal,
  onRemoveGoal,
  onSetAchieved,
  orphans,
  todayJst,
}: OrphanCheckpointsAlertProps) {
  return (
    <Alert color="yellow" title={ORPHAN_CHECKPOINTS_TITLE} variant="light">
      <Stack gap="xs">
        <Text size="sm">{ORPHAN_CHECKPOINTS_MESSAGE}</Text>
        {form}
        <Stack component="ul" gap={0} style={{ listStyle: "none", padding: 0 }}>
          {orphans.map((goal, index) => (
            <CheckpointRow
              goal={goal}
              isLast={index === orphans.length - 1}
              items={items}
              key={goal._id}
              onEdit={() => onEditGoal(goal)}
              onRemove={() => onRemoveGoal(goal)}
              onSetAchieved={onSetAchieved}
              todayJst={todayJst}
            />
          ))}
        </Stack>
      </Stack>
    </Alert>
  );
}
