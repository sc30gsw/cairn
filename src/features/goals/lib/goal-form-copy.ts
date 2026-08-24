//? どの追加導線を押したかが型と区分を決める(目標タイプの Select は撤去した)。ここが持つのは語だけ
export type GoalFormVariant = "checkpoint" | "exam" | "longTerm";

export type GoalFormCopy = {
  contentLabel: string;
  createTitle: string;
  editTitle: string;
  submitLabel: string;
};

//? submitLabel は3つとも「保存」。何をしているかはフォームのタイトルが言っている
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
