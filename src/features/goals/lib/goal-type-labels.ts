import { type GoalType } from "~domain/domain";

export const GOAL_TYPE_LABELS = {
  exam: "試験",
  mastery: "習得",
} as const satisfies Record<GoalType, string>;

export const GOAL_TYPE_DESCRIPTIONS = {
  exam: "本番日とスコア帯を持つ、期限つきの成果",
  mastery: "「〜できる」の基準を決めて、自分で達成にする",
} as const satisfies Record<GoalType, string>;
