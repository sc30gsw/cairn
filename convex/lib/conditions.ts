export const CONDITIONS = ["好調", "普通", "崩れた"] as const satisfies readonly string[];

export type Condition = (typeof CONDITIONS)[number];
