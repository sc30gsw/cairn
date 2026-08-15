export const CONDITIONS = ["好調", "普通", "崩れた"] as const;

export type Condition = (typeof CONDITIONS)[number];
