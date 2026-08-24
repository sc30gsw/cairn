import { Accordion, Box, Card, Checkbox, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import type { DateJst } from "~domain/jst";

import { GoalCardActions } from "~/features/goals/components/goal-card-actions";
import type { MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";
import { NUMERAL_FONT } from "~/lib/theme";

export const ACHIEVED_SECTION_TITLE = "達成した目標";

const ROW_BORDER = "1px dashed var(--cairn-desk)";

type AchievedRowProps = {
  goal: MasteryGoal;
  isLast: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  //? 親があれば添える。カスケード削除で消える範囲が読めるようにする
  parentName: string | undefined;
  todayJst: DateJst;
};

//? CheckpointRow と同じ骨格。期限の代わりに達成日と親名を出す
function AchievedRow({
  goal,
  isLast,
  onEdit,
  onRemove,
  onSetAchieved,
  parentName,
  todayJst,
}: AchievedRowProps) {
  return (
    <Group
      component="li"
      gap="sm"
      py="xs"
      style={{ borderBottom: isLast ? undefined : ROW_BORDER }}
      wrap="wrap"
    >
      {/*? 外すと現在進行形に戻り、ツリーへ帰る */}
      <Checkbox
        aria-label={`${goal.content}の達成`}
        checked={goal.achievedAt !== undefined}
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
        {parentName !== undefined && (
          <Text c="dimmed" size="xs">
            親: {parentName}
          </Text>
        )}
      </Box>
      <Text c="dimmed" ff={NUMERAL_FONT} size="sm">
        達成 {goal.achievedAt}
      </Text>
      <Text c="dimmed" data-shimmer-no-children ff={NUMERAL_FONT} size="xs">
        確定 {goal.confirmedMinutes}分 / {goal.activeDays}日
      </Text>
      <GoalCardActions goalName={goal.content} onEdit={onEdit} onRemove={onRemove} />
    </Group>
  );
}

type AchievedHistorySectionProps = {
  achieved: MasteryGoal[];
  //? 編集フォームは一覧の上に開く(対象の行は隠れている)
  form: ReactNode;
  onEditGoal: (goal: MasteryGoal) => void;
  onRemoveGoal: (goal: MasteryGoal) => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  parentNameOf: (goal: MasteryGoal) => string | undefined;
  todayJst: DateJst;
};

//? 達成の履歴は時系列で読むもの。親ごとに折りたたむのではなくページ下部に1本だけ置く(#48 §15-5)
export function AchievedHistorySection({
  achieved,
  form,
  onEditGoal,
  onRemoveGoal,
  onSetAchieved,
  parentNameOf,
  todayJst,
}: AchievedHistorySectionProps) {
  return (
    <Card>
      {/*? 既定は閉じる(defaultValue を渡さない) */}
      <Accordion variant="contained">
        <Accordion.Item value="achieved">
          <Accordion.Control>
            {ACHIEVED_SECTION_TITLE}（
            <Text ff={NUMERAL_FONT} span>
              {achieved.length}
            </Text>
            件）
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              {form}
              <Stack component="ul" gap={0} style={{ listStyle: "none", padding: 0 }}>
                {achieved.map((goal, index) => (
                  <AchievedRow
                    goal={goal}
                    isLast={index === achieved.length - 1}
                    key={goal._id}
                    onEdit={() => onEditGoal(goal)}
                    onRemove={() => onRemoveGoal(goal)}
                    onSetAchieved={onSetAchieved}
                    parentName={parentNameOf(goal)}
                    todayJst={todayJst}
                  />
                ))}
              </Stack>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
}
