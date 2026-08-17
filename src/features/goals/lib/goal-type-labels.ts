import type { ComboboxData } from "@mantine/core";
import type { GoalType } from "~domain/domain";

//? 値の SSoT は ~domain/domain。ここが持つのは表示だけ(CVX-16)
export const GOAL_TYPE_LABELS = {
  exam: "試験",
  mastery: "習得",
  other: "その他",
  pace: "ペース",
  volume: "達成量",
} as const satisfies Record<GoalType, string>;

export const GOAL_TYPE_DESCRIPTIONS = {
  exam: "本番日とスコア帯を持つ、期限つきの成果",
  mastery: "「できる」の基準で終わりを決める",
  other: "上のどれにも当てはまらない目標",
  pace: "週に何日、1日あたり何分やるか",
  volume: "数えられる量を期限までに積む",
} as const satisfies Record<GoalType, string>;

//? グルーピングは「進捗の入り方」。反復 = 週次判定、期限日 = 期日つき成果(docs/adr/0005)
export const GOAL_TYPE_SELECT_DATA = [
  {
    group: "反復",
    items: [{ label: GOAL_TYPE_LABELS.pace, value: "pace" }],
  },
  {
    group: "期限日",
    items: [
      { label: GOAL_TYPE_LABELS.exam, value: "exam" },
      { label: GOAL_TYPE_LABELS.volume, value: "volume" },
      { label: GOAL_TYPE_LABELS.mastery, value: "mastery" },
    ],
  },
  {
    group: "その他",
    items: [{ label: GOAL_TYPE_LABELS.other, value: "other" }],
  },
] satisfies ComboboxData;
