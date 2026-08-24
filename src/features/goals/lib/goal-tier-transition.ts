//* 編集フォームの入力から、保存したときに起きる区分の変化を出す。表示専用の判定。
//? 区分移行は可逆なので Confirm は出さない。ライブ予告と行き先入りトーストだけで足りる(#48 §0-8)。
export type TierTransition = "none" | "reparent" | "toCheckpoint" | "toLongTerm";

type TierTransitionInput = {
  after: { deadline: string | undefined; parentGoalId: string | undefined };
  before: { deadline: string | undefined; parentGoalId: string | undefined };
};

//? Select の未選択は "" で返る。空文字は「親なし」として畳む
function parentOf(parentGoalId: string | undefined): string | undefined {
  return parentGoalId === undefined || parentGoalId === "" ? undefined : parentGoalId;
}

function deadlineOf(deadline: string | undefined): string | undefined {
  return deadline === undefined || deadline === "" ? undefined : deadline;
}

export function tierTransition({ after, before }: TierTransitionInput): TierTransition {
  const beforeDeadline = deadlineOf(before.deadline);
  const afterDeadline = deadlineOf(after.deadline);
  if (beforeDeadline !== undefined && afterDeadline === undefined) {
    return "toLongTerm";
  }
  if (beforeDeadline === undefined && afterDeadline !== undefined) {
    return "toCheckpoint";
  }
  if (
    beforeDeadline !== undefined &&
    afterDeadline !== undefined &&
    parentOf(after.parentGoalId) !== parentOf(before.parentGoalId)
  ) {
    return "reparent";
  }

  return "none";
}

//* フォーム内のライブ予告(押しても止めない情報)。親名が要る移行は名前が引けるときだけ出す。
export function tierTransitionAlert(
  transition: TierTransition,
  parentName: string | undefined,
): string | undefined {
  if (transition === "toLongTerm") {
    return "保存すると期限が外れ、長期目標へ移ります";
  }
  if (parentName === undefined) {
    return undefined;
  }
  if (transition === "toCheckpoint") {
    return `保存すると『${parentName}』のチェックポイントになります`;
  }

  return transition === "reparent" ? `保存すると『${parentName}』の下へ移ります` : undefined;
}

export const GOAL_UPDATED_MESSAGE = "目標を更新しました";

//* 保存後トーストの行き先表示。移行が起きなかったときは既存の文言に戻す。
export function tierTransitionToast(
  transition: TierTransition,
  parentName: string | undefined,
): string {
  if (transition === "toLongTerm") {
    return "長期目標に移しました";
  }
  if (parentName === undefined) {
    return GOAL_UPDATED_MESSAGE;
  }
  if (transition === "toCheckpoint") {
    return `『${parentName}』のチェックポイントにしました`;
  }

  return transition === "reparent" ? `『${parentName}』の下へ移しました` : GOAL_UPDATED_MESSAGE;
}
