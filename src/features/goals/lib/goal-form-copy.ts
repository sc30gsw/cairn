//? 同じフォームを「目標」として開くか「チェックポイント」として開くかで語を替える。
//? 値の SSoT はドメイン側にあり、ここが持つのは画面の語だけ(UI 所有)
export type GoalFormVariant = "checkpoint" | "goal";

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
    submitLabel: "チェックポイントを追加",
  },
  goal: {
    contentLabel: "目標の内容",
    createTitle: "目標を追加",
    editTitle: "目標を編集",
    submitLabel: "保存",
  },
} as const satisfies Record<GoalFormVariant, GoalFormCopy>;
