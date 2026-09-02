import { Box, Card, Grid, Stack, Text } from "@mantine/core";
import { useRef, useState, type ReactNode } from "react";
import type { DateJst } from "~domain/jst";

import { ConcreteActionTour } from "~/components/concrete-action-tour";
import { PageTitle } from "~/components/page-title";
import { AchievedHistorySection } from "~/features/goals/components/achieved-history-section";
import { AchievementReflectionModal } from "~/features/goals/components/achievement-reflection-modal";
import { ExamEmptyCard } from "~/features/goals/components/exam-empty-card";
import { ExamResultModal } from "~/features/goals/components/exam-result-modal";
import { GoalForm } from "~/features/goals/components/goal-form";
import { LongTermSection } from "~/features/goals/components/long-term-section";
import { ObstacleSection } from "~/features/goals/components/obstacle-section";
import { OrphanCheckpointsAlert } from "~/features/goals/components/orphan-checkpoints-alert";
import { ParentGoalGroup } from "~/features/goals/components/parent-goal-group";
import { WeeklyTargetsSection } from "~/features/goals/components/weekly-targets-section";
import { useGoalDialogs } from "~/features/goals/hooks/use-goal-dialogs";
import { useGoalsBoardActions } from "~/features/goals/hooks/use-goals-board-actions";
import type { GoalFormVariant } from "~/features/goals/lib/goal-form-copy";
import { tierTransition, tierTransitionToast } from "~/features/goals/lib/goal-tier-transition";
import {
  buildGoalTree,
  childCheckpointsOf,
  goalTier,
  latestFinishedExam,
  type ParentGoal,
  type ParentGroup,
} from "~/features/goals/lib/goal-tree";
import { openGoalRemoveConfirm } from "~/features/goals/lib/open-goal-remove-confirm";
import type { ExamGoal, Goal, MasteryGoal, Obstacle } from "~/features/goals/types/goal";
import type { GoalInputPayload } from "~/features/goals/types/mutations";
import type { TargetProgress } from "~/features/goals/types/target";
import type { CategoryDto } from "~/types/category";
import type { ItemDto } from "~/types/item";

export const GOAL_HIERARCHY_HINT =
  "本番目標と長期目標の下に、期限つきのチェックポイントを刻みます。同時に追いかけるのは親ごとに1〜2件が目安。";

type GoalEditor =
  | { goal: Goal; kind: "edit" }
  | { kind: "closed" }
  | { kind: "createCheckpoint"; parent: ParentGoal }
  | { kind: "createExam" }
  | { kind: "createLongTerm" };

function editorKey(editor: GoalEditor): string {
  if (editor.kind === "createCheckpoint") {
    return `create-checkpoint-${editor.parent._id}`;
  }

  return editor.kind === "edit" ? `edit-${editor.goal._id}` : editor.kind;
}

function editorVariant(editor: GoalEditor): GoalFormVariant {
  if (editor.kind === "edit") {
    return editor.goal.type === "exam" ? "exam" : goalTier(editor.goal);
  }
  if (editor.kind === "createCheckpoint") {
    return "checkpoint";
  }

  return editor.kind === "createLongTerm" ? "longTerm" : "exam";
}

type GoalsBoardProps = {
  categories: CategoryDto[];
  goals: Goal[];
  items: ItemDto[];
  obstacles: Obstacle[];
  targets: TargetProgress[];
  todayJst: DateJst;
};

export function GoalsBoard({
  categories,
  goals,
  items,
  obstacles,
  targets,
  todayJst,
}: GoalsBoardProps) {
  const {
    onCreateGoal,
    onCreateObstacle,
    onRemoveGoal,
    onRemoveObstacle,
    onSetAchieved,
    onSetExamResult,
    onUpdateGoal,
    onUpdateObstacle,
  } = useGoalsBoardActions();
  const [editor, setEditor] = useState<GoalEditor>({ kind: "closed" });
  const {
    closeReflection,
    closeResult,
    openResult,
    reflectionGoal,
    requestSetAchieved,
    resultGoal,
    submitExamResult,
    submitReflection,
  } = useGoalDialogs({ goals, onSetAchieved, onSetExamResult });
  const weeklyTargetsRef = useRef<HTMLDivElement>(null);
  const tree = buildGoalTree(goals);
  const editingGoal = editor.kind === "edit" ? editor.goal : undefined;

  function closeEditor() {
    setEditor({ kind: "closed" });
  }

  function openEdit(goal: Goal) {
    setEditor({ goal, kind: "edit" });
  }

  function parentNameOf(goal: MasteryGoal) {
    return goals.find((candidate) => candidate._id === goal.parentGoalId)?.content;
  }

  function requestRemove(goal: Goal) {
    openGoalRemoveConfirm({ goal, goals, onConfirm: onRemoveGoal });
  }

  function submitGoal(goal: GoalInputPayload) {
    if (editingGoal === undefined) {
      onCreateGoal(goal);
      closeEditor();
      return;
    }
    const transition =
      editingGoal.type === "mastery" && goal.type === "mastery"
        ? tierTransition({
            after: { deadline: goal.deadline, parentGoalId: goal.parentGoalId },
            before: {
              deadline: editingGoal.deadline,
              parentGoalId: editingGoal.parentGoalId,
            },
          })
        : "none";
    const parentName =
      goal.type === "mastery"
        ? goals.find((candidate) => candidate._id === goal.parentGoalId)?.content
        : undefined;
    onUpdateGoal({ goal, goalId: editingGoal._id }, tierTransitionToast(transition, parentName));
    closeEditor();
  }

  function showWeeklyTargets() {
    weeklyTargetsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goalForm(): ReactNode {
    const parent = editor.kind === "createCheckpoint" ? editor.parent : undefined;

    return (
      <GoalForm
        activeCheckpointCount={
          parent === undefined
            ? 0
            : childCheckpointsOf(goals, parent._id).filter(
                (child) => child.achievedAt === undefined,
              ).length
        }
        categories={categories}
        goal={editingGoal}
        goals={goals}
        hasChildCheckpoints={
          editingGoal !== undefined && childCheckpointsOf(goals, editingGoal._id).length > 0
        }
        items={items}
        key={editorKey(editor)}
        onCancel={closeEditor}
        onSubmit={submitGoal}
        parent={parent}
        todayJst={todayJst}
        variant={editorVariant(editor)}
      />
    );
  }

  function formForGroup(group: ParentGroup): ReactNode {
    if (editor.kind === "createCheckpoint" && editor.parent._id === group.parent._id) {
      return goalForm();
    }

    return group.checkpoints.some((child) => child._id === editingGoal?._id)
      ? goalForm()
      : undefined;
  }

  function formForRows(rows: readonly MasteryGoal[]): ReactNode {
    return rows.some((row) => row._id === editingGoal?._id) ? goalForm() : undefined;
  }

  function formForExamHistory(): ReactNode {
    return tree.examHistory.some((goal) => goal._id === editingGoal?._id) ? goalForm() : undefined;
  }

  function visibleRows(rows: readonly MasteryGoal[]): MasteryGoal[] {
    return rows.filter((row) => row._id !== editingGoal?._id);
  }

  function addCheckpointHandler(parent: ParentGoal, form: ReactNode) {
    return form === undefined ? () => setEditor({ kind: "createCheckpoint", parent }) : undefined;
  }

  function renderLongTermGroup(group: ParentGroup<MasteryGoal>): ReactNode {
    if (editingGoal?._id === group.parent._id) {
      return <Box key={group.parent._id}>{goalForm()}</Box>;
    }
    const form = formForGroup(group);

    return (
      <ParentGoalGroup
        checkpoints={visibleRows(group.checkpoints)}
        form={form}
        items={items}
        key={group.parent._id}
        kind="longTerm"
        onAddCheckpoint={addCheckpointHandler(group.parent, form)}
        onEditGoal={openEdit}
        onRemoveGoal={requestRemove}
        onSetAchieved={requestSetAchieved}
        parent={group.parent}
        todayJst={todayJst}
      />
    );
  }

  function renderExamGroup(group: ParentGroup<ExamGoal>): ReactNode {
    if (editingGoal?._id === group.parent._id) {
      return <Box key={group.parent._id}>{goalForm()}</Box>;
    }
    const form = formForGroup(group);
    //? 終了した本番には新しいチェックポイントを足せない（残った子の付け替えだけ）
    const finished = group.parent.result !== undefined;

    return (
      <ParentGoalGroup
        checkpoints={visibleRows(group.checkpoints)}
        form={form}
        hasWeeklyTargets={targets.length > 0}
        items={items}
        key={group.parent._id}
        kind="exam"
        onAddCheckpoint={finished ? undefined : addCheckpointHandler(group.parent, form)}
        onEditGoal={openEdit}
        onRecordResult={() => openResult(group.parent)}
        onRemoveGoal={requestRemove}
        onSetAchieved={requestSetAchieved}
        onShowWeeklyTargets={showWeeklyTargets}
        parent={group.parent}
        todayJst={todayJst}
      />
    );
  }

  function renderExamColumn(): ReactNode {
    const active =
      tree.exam !== undefined ? (
        renderExamGroup(tree.exam)
      ) : editor.kind === "createExam" ? (
        goalForm()
      ) : (
        <ExamEmptyCard
          latest={latestFinishedExam(goals)}
          onCreate={() => setEditor({ kind: "createExam" })}
        />
      );

    return (
      <Stack gap="md">
        {active}
        {tree.finishedExams.map(renderExamGroup)}
      </Stack>
    );
  }

  return (
    <ConcreteActionTour screen="obstacles">
      <Grid gap="md">
        <Grid.Col span={12}>
          <Stack gap="xs">
            <PageTitle>目標</PageTitle>
            <Text c="dimmed" size="sm">
              {GOAL_HIERARCHY_HINT}
            </Text>
          </Stack>
        </Grid.Col>
        <Grid.Col span={12}>{renderExamColumn()}</Grid.Col>
        <Grid.Col span={12}>
          <LongTermSection
            form={editor.kind === "createLongTerm" ? goalForm() : undefined}
            groups={tree.longTerm.map(renderLongTermGroup)}
            onAdd={
              editor.kind === "createLongTerm"
                ? undefined
                : () => setEditor({ kind: "createLongTerm" })
            }
          />
        </Grid.Col>
        {tree.orphans.length > 0 && (
          <Grid.Col span={12}>
            <OrphanCheckpointsAlert
              form={formForRows(tree.orphans)}
              items={items}
              onEditGoal={openEdit}
              onRemoveGoal={requestRemove}
              onSetAchieved={requestSetAchieved}
              orphans={visibleRows(tree.orphans)}
              todayJst={todayJst}
            />
          </Grid.Col>
        )}
        <Grid.Col span={12}>
          <Card ref={weeklyTargetsRef}>
            <WeeklyTargetsSection categories={categories} targets={targets} />
          </Card>
        </Grid.Col>
        {tree.achieved.length + tree.examHistory.length > 0 && (
          <Grid.Col span={12}>
            <AchievedHistorySection
              achieved={visibleRows(tree.achieved)}
              finishedExams={tree.examHistory.filter((goal) => goal._id !== editingGoal?._id)}
              form={formForRows(tree.achieved) ?? formForExamHistory()}
              items={items}
              onEditGoal={openEdit}
              onRecordResult={openResult}
              onRemoveGoal={requestRemove}
              onSetAchieved={requestSetAchieved}
              parentNameOf={parentNameOf}
              todayJst={todayJst}
            />
          </Grid.Col>
        )}
        <AchievementReflectionModal
          goal={reflectionGoal}
          onClose={closeReflection}
          onSubmit={submitReflection}
        />
        <ExamResultModal
          goal={resultGoal}
          onClose={closeResult}
          onSubmit={submitExamResult}
          todayJst={todayJst}
        />
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
