export const GOAL_SCOPE_HINT = "未選択のままにすると、すべての確定記録を数えます";

export const GOAL_SCOPE_FROZEN_HINT = "達成を外すと、対象項目を変更できます";

export type GoalFormVariant = "checkpoint" | "exam" | "longTerm";

export type GoalFormCopy = {
  contentLabel: string;
  createTitle: string;
  editTitle: string;
  submitLabel: string;
};

export const GOAL_FORM_COPY = {
  checkpoint: {
    contentLabel: "チェックポイントの内容",
    createTitle: "チェックポイントを追加",
    editTitle: "チェックポイントを編集",
    submitLabel: "保存",
  },
  exam: {
    contentLabel: "目標の内容",
    createTitle: "本番目標を追加",
    editTitle: "本番目標を編集",
    submitLabel: "保存",
  },
  longTerm: {
    contentLabel: "長期目標の内容",
    createTitle: "長期目標を追加",
    editTitle: "長期目標を編集",
    submitLabel: "保存",
  },
} as const satisfies Record<GoalFormVariant, GoalFormCopy>;
