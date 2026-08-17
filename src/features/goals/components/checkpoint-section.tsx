import { Accordion, Button, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import type { DateJst } from "~domain/jst";

import { MasteryGoalCard } from "~/features/goals/components/mastery-goal-card";
import type { MasteryGroups } from "~/features/goals/lib/mastery-goals";
import type { GoalId, MasteryGoal } from "~/features/goals/types/goal";
import type { SetAchievedInput } from "~/features/goals/types/mutations";

export const CHECKPOINT_SECTION_TITLE = "チェックポイント";
export const CHECKPOINT_EMPTY_MESSAGE =
  "チェックポイントがまだありません。「いつまでに何ができているか」を1件置いてみましょう。";

type CheckpointSectionProps = {
  achieved: MasteryGroups["achieved"];
  checkpoints: MasteryGroups["checkpoints"];
  //? 追加フォームはこの区画の中で開く。本番目標カードの上には出さない
  form: ReactNode;
  //? undefined なら追加導線を出さない(本番目標が無い間)
  onAddCheckpoint: (() => void) | undefined;
  onEditGoal: (goal: MasteryGoal) => void;
  onRemoveGoal: (goalId: GoalId) => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  todayJst: DateJst;
};

//? 本番目標の直下に期限順で並ぶ。データ上の親子は持たず、画面の配置だけが従属する(docs/adr/0006)
export function CheckpointSection({
  achieved,
  checkpoints,
  form,
  onAddCheckpoint,
  onEditGoal,
  onRemoveGoal,
  onSetAchieved,
  todayJst,
}: CheckpointSectionProps) {
  return (
    <Stack aria-label={CHECKPOINT_SECTION_TITLE} component="section" gap="md">
      <Group gap="sm" justify="space-between" wrap="nowrap">
        <Title order={2}>{CHECKPOINT_SECTION_TITLE}</Title>
        {onAddCheckpoint !== undefined && (
          <Button onClick={onAddCheckpoint} size="xs" type="button" variant="light">
            チェックポイントを追加
          </Button>
        )}
      </Group>
      <Text c="dimmed" size="sm">
        本番までに「いつまでに何ができているか」を刻みます。同時に追いかけるのは1〜2件が目安です。
      </Text>
      {form}
      {checkpoints.length === 0 ? (
        <Text c="dimmed" size="sm">
          {CHECKPOINT_EMPTY_MESSAGE}
        </Text>
      ) : (
        <Stack gap="sm">
          {checkpoints.map((goal) => (
            <MasteryGoalCard
              goal={goal}
              key={goal._id}
              onEdit={() => onEditGoal(goal)}
              onRemove={() => onRemoveGoal(goal._id)}
              onSetAchieved={onSetAchieved}
              todayJst={todayJst}
            />
          ))}
        </Stack>
      )}
      {achieved.length > 0 && (
        //? 達成しても消えない。この一覧がそのまま達成の履歴になる(CONTEXT.md「習得」)
        <Accordion defaultValue="achieved" variant="contained">
          <Accordion.Item value="achieved">
            <Accordion.Control>達成済み（{achieved.length}件）</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                {achieved.map((goal) => (
                  <MasteryGoalCard
                    goal={goal}
                    key={goal._id}
                    onEdit={() => onEditGoal(goal)}
                    onRemove={() => onRemoveGoal(goal._id)}
                    onSetAchieved={onSetAchieved}
                    todayJst={todayJst}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Stack>
  );
}
