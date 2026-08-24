import { Box, Button, Card, EmptyState, Grid, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTarget } from "@tabler/icons-react";
import { useRef, useState, type ReactNode } from "react";
import type { DateJst } from "~domain/jst";

import { ConcreteActionTour } from "~/components/concrete-action-tour";
import { PageTitle } from "~/components/page-title";
import { AchievedHistorySection } from "~/features/goals/components/achieved-history-section";
import { GoalForm } from "~/features/goals/components/goal-form";
import { LongTermSection } from "~/features/goals/components/long-term-section";
import { ObstacleSection } from "~/features/goals/components/obstacle-section";
import { OrphanCheckpointsAlert } from "~/features/goals/components/orphan-checkpoints-alert";
import { ParentGoalGroup } from "~/features/goals/components/parent-goal-group";
import { WeeklyTargetsSection } from "~/features/goals/components/weekly-targets-section";
import { useGoalsBoardActions } from "~/features/goals/hooks/use-goals-board-actions";
import type { GoalFormVariant } from "~/features/goals/lib/goal-form-copy";
import { removeConfirmCopy } from "~/features/goals/lib/goal-remove-confirm";
import { tierTransition, tierTransitionToast } from "~/features/goals/lib/goal-tier-transition";
import {
  buildGoalTree,
  childCheckpointsOf,
  goalTier,
  type ParentGoal,
  type ParentGroup,
} from "~/features/goals/lib/goal-tree";
import type { GoalFormOutput } from "~/features/goals/schemas/goal-schema";
import type { Goal, MasteryGoal, Obstacle } from "~/features/goals/types/goal";
import type { TargetProgress } from "~/features/goals/types/target";
import type { CategoryDto } from "~/types/category";

export const EXAM_GOAL_EMPTY_TITLE = "本番目標がまだありません";
export const GOAL_HIERARCHY_HINT =
  "本番目標と長期目標の下に、期限つきのチェックポイントを刻みます。同時に追いかけるのは親ごとに1〜2件が目安。";

type GoalEditor =
  | { goal: Goal; kind: "edit" }
  | { kind: "closed" }
  | { kind: "createCheckpoint"; parent: ParentGoal }
  | { kind: "createExam" }
  | { kind: "createLongTerm" };

//? フォームは区分ごとに別ストア。対象が変わったら作り直す
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
  obstacles: Obstacle[];
  targets: TargetProgress[];
  todayJst: DateJst;
};

export function GoalsBoard({ categories, goals, obstacles, targets, todayJst }: GoalsBoardProps) {
  const {
    onCreateGoal,
    onCreateObstacle,
    onRemoveGoal,
    onRemoveObstacle,
    onSetAchieved,
    onUpdateGoal,
    onUpdateObstacle,
  } = useGoalsBoardActions();
  const [editor, setEditor] = useState<GoalEditor>({ kind: "closed" });
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

  //? 削除は不可逆(目標はゴミ箱に入らない)。子の件数と内訳を出してから確定させる
  function requestRemove(goal: Goal) {
    const children = childCheckpointsOf(goals, goal._id);
    const copy = removeConfirmCopy({
      achievedChildCount: children.filter((child) => child.achievedAt !== undefined).length,
      childNames: children.map((child) => `${child.content}（期限 ${child.deadline}）`),
      goalName: goal.content,
      variant: goal.type === "exam" ? "exam" : goalTier(goal),
    });
    modals.openConfirmModal({
      children: <Text style={{ whiteSpace: "pre-line" }}>{copy.children}</Text>,
      confirmProps: { color: "red" },
      labels: { cancel: "キャンセル", confirm: copy.labelConfirm },
      onConfirm: () => onRemoveGoal(goal._id),
      title: copy.title,
    });
  }

  function submitGoal(goal: GoalFormOutput) {
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
        goal={editingGoal}
        goals={goals}
        hasChildCheckpoints={
          editingGoal !== undefined && childCheckpointsOf(goals, editingGoal._id).length > 0
        }
        key={editorKey(editor)}
        onCancel={closeEditor}
        onSubmit={submitGoal}
        parent={parent}
        todayJst={todayJst}
        variant={editorVariant(editor)}
      />
    );
  }

  //? フォームは常に対象の位置に開く。1箇所だけが受け取る(同時に開くのは1つ)
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

  function visibleRows(rows: readonly MasteryGoal[]): MasteryGoal[] {
    return rows.filter((row) => row._id !== editingGoal?._id);
  }

  function addCheckpointHandler(parent: ParentGoal, form: ReactNode) {
    //? そのグループにフォームが開いている間は追加導線を出さない(同じ「作る」を二重に見せない)
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
        key={group.parent._id}
        kind="longTerm"
        onAddCheckpoint={addCheckpointHandler(group.parent, form)}
        onEditGoal={openEdit}
        onRemoveGoal={requestRemove}
        onSetAchieved={onSetAchieved}
        parent={group.parent}
        todayJst={todayJst}
      />
    );
  }

  function renderExamColumn(): ReactNode {
    const group = tree.exam;
    if (group === undefined) {
      return editor.kind === "createExam" ? (
        goalForm()
      ) : (
        <Card>
          <EmptyState
            description="本番日とスコア帯を決めると、残り日数の軸ができます。"
            icon={<IconTarget aria-hidden />}
            title={EXAM_GOAL_EMPTY_TITLE}
          >
            <EmptyState.Actions>
              <Button onClick={() => setEditor({ kind: "createExam" })} type="button">
                本番目標を作成する
              </Button>
            </EmptyState.Actions>
          </EmptyState>
        </Card>
      );
    }
    if (editingGoal?._id === group.parent._id) {
      return goalForm();
    }
    const form = formForGroup(group);

    return (
      <ParentGoalGroup
        checkpoints={visibleRows(group.checkpoints)}
        form={form}
        hasWeeklyTargets={targets.length > 0}
        kind="exam"
        onAddCheckpoint={addCheckpointHandler(group.parent, form)}
        onEditGoal={openEdit}
        onRemoveGoal={requestRemove}
        onSetAchieved={onSetAchieved}
        onShowWeeklyTargets={showWeeklyTargets}
        parent={group.parent}
        todayJst={todayJst}
      />
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
              onEditGoal={openEdit}
              onRemoveGoal={requestRemove}
              onSetAchieved={onSetAchieved}
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
        {tree.achieved.length > 0 && (
          <Grid.Col span={12}>
            <AchievedHistorySection
              achieved={visibleRows(tree.achieved)}
              form={formForRows(tree.achieved)}
              onEditGoal={openEdit}
              onRemoveGoal={requestRemove}
              onSetAchieved={onSetAchieved}
              parentNameOf={parentNameOf}
              todayJst={todayJst}
            />
          </Grid.Col>
        )}
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
