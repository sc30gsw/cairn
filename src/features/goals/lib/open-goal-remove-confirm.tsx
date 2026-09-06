import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";

import { removeConfirmCopy } from "~/features/goals/lib/goal-remove-confirm";
import { childCheckpointsOf, goalTier } from "~/features/goals/lib/goal-tree";
import type { Goal, GoalId } from "~/features/goals/types/goal";

type OpenGoalRemoveConfirmOptions = {
  goal: Goal;
  goals: readonly Goal[];
  onConfirm: (goalId: GoalId) => void;
};

export function openGoalRemoveConfirm({ goal, goals, onConfirm }: OpenGoalRemoveConfirmOptions) {
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
    onConfirm: () => onConfirm(goal._id),
    title: copy.title,
  });
}
