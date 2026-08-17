import { Button, Card, EmptyState, Grid, Group, Title } from "@mantine/core";
import { IconTarget } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { GoalType } from "~domain/domain";
import type { DateJst } from "~domain/jst";

import { ConcreteActionTour } from "~/components/concrete-action-tour";
import { CheckpointSection } from "~/features/goals/components/checkpoint-section";
import { ExamGoalCard } from "~/features/goals/components/exam-goal-card";
import { GoalForm } from "~/features/goals/components/goal-form";
import { MasteryGoalCard } from "~/features/goals/components/mastery-goal-card";
import { ObstacleSection } from "~/features/goals/components/obstacle-section";
import {
  WeeklyTargetsSection,
  type WeeklyTargetsSectionProps,
} from "~/features/goals/components/weekly-targets-section";
import { findGoalOfType } from "~/features/goals/lib/goal-selectors";
import { groupMasteryGoals } from "~/features/goals/lib/mastery-goals";
import type { GoalFormOutput } from "~/features/goals/schemas/goal-schema";
import type { Goal, GoalId, Obstacle } from "~/features/goals/types/goal";
import type {
  CreateObstacleInput,
  RemoveObstacleInput,
  SetAchievedInput,
  UpdateGoalInput,
  UpdateObstacleInput,
} from "~/features/goals/types/mutations";

export const EXAM_GOAL_EMPTY_TITLE = "本番目標がまだありません";
export const OPEN_MASTERY_SECTION_TITLE = "期限なしの習得";

type GoalEditor =
  | { goal: Goal; kind: "edit" }
  | { kind: "closed" }
  | { kind: "create"; type: GoalType };

type GoalsBoardProps = {
  goals: Goal[];
  obstacles: Obstacle[];
  onCreateGoal: (goal: GoalFormOutput) => void;
  onCreateObstacle: (input: CreateObstacleInput) => void;
  onRemoveGoal: (goalId: GoalId) => void;
  onRemoveObstacle: (planId: RemoveObstacleInput["planId"]) => void;
  onSetAchieved: (input: SetAchievedInput) => void;
  onUpdateGoal: (input: UpdateGoalInput) => void;
  onUpdateObstacle: (input: UpdateObstacleInput) => void;
  todayJst: DateJst;
  //? 週間ターゲットはこの板では素通し。区画ごと渡して props の数を抑える
  weeklyTargets: WeeklyTargetsSectionProps;
};

//? フォームはタイプごとに別ストア。編集対象が変わったら作り直す
function editorKey(editor: GoalEditor): string {
  if (editor.kind === "create") {
    return `create-${editor.type}`;
  }

  return editor.kind === "edit" ? `edit-${editor.goal._id}` : "closed";
}

export function GoalsBoard({
  goals,
  obstacles,
  onCreateGoal,
  onCreateObstacle,
  onRemoveGoal,
  onRemoveObstacle,
  onSetAchieved,
  onUpdateGoal,
  onUpdateObstacle,
  todayJst,
  weeklyTargets,
}: GoalsBoardProps) {
  const [editor, setEditor] = useState<GoalEditor>({ kind: "closed" });
  const weeklyTargetsRef = useRef<HTMLDivElement>(null);
  const examGoal = findGoalOfType(goals, "exam");
  const mastery = groupMasteryGoals(goals);
  //? チェックポイントの追加はセクション内で完結させる。上部のフォーム枠には出さない
  const checkpointFormOpen = editor.kind === "create" && editor.type === "mastery";
  //? チェックポイントは本番目標に従属する。本番目標が無い間は追加導線を出さない(docs/adr/0006)
  const showCheckpointSection =
    examGoal !== undefined || mastery.checkpoints.length > 0 || mastery.achieved.length > 0;

  function closeEditor() {
    setEditor({ kind: "closed" });
  }

  function openCreate(type: GoalType) {
    setEditor({ kind: "create", type });
  }

  function openEdit(goal: Goal) {
    setEditor({ goal, kind: "edit" });
  }

  function submitGoal(goal: GoalFormOutput) {
    if (editor.kind === "edit") {
      onUpdateGoal({ goal, goalId: editor.goal._id });
    } else {
      onCreateGoal(goal);
    }
    closeEditor();
  }

  function showWeeklyTargets() {
    weeklyTargetsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <ConcreteActionTour screen="obstacles">
      <Grid gap="md">
        <Grid.Col span={12}>
          <Group gap="sm" justify="space-between" wrap="nowrap">
            <Title order={1}>目標</Title>
            {/*? 本番目標があるなら追加導線はチェックポイントに一本化する */}
            {examGoal === undefined && (
              <Button onClick={() => openCreate("exam")} type="button">
                目標を追加
              </Button>
            )}
          </Group>
        </Grid.Col>
        {editor.kind !== "closed" && !checkpointFormOpen && (
          <Grid.Col span={12}>
            <GoalForm
              activeCheckpointCount={mastery.checkpoints.length}
              goal={editor.kind === "edit" ? editor.goal : undefined}
              initialType={editor.kind === "create" ? editor.type : "exam"}
              key={editorKey(editor)}
              onCancel={closeEditor}
              onSubmit={submitGoal}
              todayJst={todayJst}
            />
          </Grid.Col>
        )}
        <Grid.Col span={12}>
          {examGoal === undefined ? (
            <Card>
              <EmptyState
                description="本番日とスコア帯を決めると、残り日数の軸ができます。"
                icon={<IconTarget aria-hidden />}
                title={EXAM_GOAL_EMPTY_TITLE}
              >
                <EmptyState.Actions>
                  <Button onClick={() => openCreate("exam")} type="button">
                    本番目標を作成する
                  </Button>
                </EmptyState.Actions>
              </EmptyState>
            </Card>
          ) : (
            <ExamGoalCard
              goal={examGoal}
              hasWeeklyTargets={weeklyTargets.targets.length > 0}
              onEdit={() => openEdit(examGoal)}
              onRemove={() => onRemoveGoal(examGoal._id)}
              onShowWeeklyTargets={showWeeklyTargets}
              todayJst={todayJst}
            />
          )}
        </Grid.Col>
        {showCheckpointSection && (
          <Grid.Col span={12}>
            <Card>
              <CheckpointSection
                achieved={mastery.achieved}
                checkpoints={mastery.checkpoints}
                form={
                  checkpointFormOpen ? (
                    <GoalForm
                      activeCheckpointCount={mastery.checkpoints.length}
                      goal={undefined}
                      initialType="mastery"
                      onCancel={closeEditor}
                      onSubmit={submitGoal}
                      todayJst={todayJst}
                      typeSelectable={false}
                    />
                  ) : undefined
                }
                onAddCheckpoint={examGoal === undefined ? undefined : () => openCreate("mastery")}
                onEditGoal={openEdit}
                onRemoveGoal={onRemoveGoal}
                onSetAchieved={onSetAchieved}
                todayJst={todayJst}
              />
            </Card>
          </Grid.Col>
        )}
        <Grid.Col span={12}>
          <Card ref={weeklyTargetsRef}>
            <WeeklyTargetsSection {...weeklyTargets} />
          </Card>
        </Grid.Col>
        {mastery.open.length > 0 && (
          <Grid.Col span={12}>
            <Title order={2}>{OPEN_MASTERY_SECTION_TITLE}</Title>
          </Grid.Col>
        )}
        {mastery.open.map((goal) => (
          <Grid.Col key={goal._id} span={{ base: 12, md: 6 }}>
            <MasteryGoalCard
              goal={goal}
              onEdit={() => openEdit(goal)}
              onRemove={() => onRemoveGoal(goal._id)}
              onSetAchieved={onSetAchieved}
              todayJst={todayJst}
            />
          </Grid.Col>
        ))}
        <Grid.Col span={12}>
          <Card>
            <ObstacleSection
              obstacles={obstacles}
              onCreateObstacle={onCreateObstacle}
              onRemoveObstacle={onRemoveObstacle}
              onUpdateObstacle={onUpdateObstacle}
            />
          </Card>
        </Grid.Col>
      </Grid>
    </ConcreteActionTour>
  );
}
