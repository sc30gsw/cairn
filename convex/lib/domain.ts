export const STATUSES = ["確定", "未着手", "スキップ"] as const;

export type Status = (typeof STATUSES)[number];

export const MINUTES_MIN_MESSAGE = "分数は0以上です";

//* 週間ゴールの達成履歴で遡る週数(サーバの weeklyTrend とクライアントのストリーク上限が共有)
export const WEEKLY_TREND_WEEKS = 12;

export { CATEGORIES, type Category } from "./categories";
export { CONDITIONS, type Condition } from "./conditions";
