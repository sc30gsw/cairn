import type { GoalFormVariant } from "~/features/goals/lib/goal-form-copy";

export type RemoveConfirmCopy = { children: string; labelConfirm: string; title: string };

const LISTED_CHILDREN_LIMIT = 3;

const REMOVE_TITLES = {
  checkpoint: "チェックポイントを削除しますか？",
  exam: "本番目標を削除しますか？",
  longTerm: "長期目標を削除しますか？",
} as const satisfies Record<GoalFormVariant, string>;

const NO_TRASH_MESSAGE = "削除するとゴミ箱には入らず、戻せません。";

type RemoveConfirmInput = {
  achievedChildCount: number;
  childNames: readonly string[];
  goalName: string;
  variant: GoalFormVariant;
};

export function removeConfirmCopy({
  achievedChildCount,
  childNames,
  goalName,
  variant,
}: RemoveConfirmInput): RemoveConfirmCopy {
  const title = REMOVE_TITLES[variant];
  if (childNames.length === 0) {
    return { children: `${goalName}\n\n${NO_TRASH_MESSAGE}`, labelConfirm: "削除する", title };
  }
  const achieved = achievedChildCount === 0 ? "" : `（うち達成済み ${achievedChildCount}件）`;
  const listed = childNames.slice(0, LISTED_CHILDREN_LIMIT).map((name) => `・${name}`);
  const rest = childNames.length - listed.length;
  const lines = [
    goalName,
    "",
    `ひもづくチェックポイント ${childNames.length}件${achieved}も一緒に削除されます。目標はゴミ箱に入らないので戻せません。`,
    "",
    ...listed,
    ...(rest === 0 ? [] : [`ほか ${rest}件`]),
  ];

  return { children: lines.join("\n"), labelConfirm: "まとめて削除する", title };
}
