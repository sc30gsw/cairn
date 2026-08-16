export const STATUSES = ["確定", "未着手", "スキップ"] as const;

export type Status = (typeof STATUSES)[number];

export { CATEGORIES, type Category } from "./categories";
export { CONDITIONS, type Condition } from "./conditions";
