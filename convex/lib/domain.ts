export const STATUSES = ["確定", "未着手", "スキップ"] as const;

export type Status = (typeof STATUSES)[number];

export const MINUTES_MIN_MESSAGE = "分数は0以上です";

//* 週間ゴールの達成履歴で遡る週数(サーバの weeklyTrend とクライアントのストリーク上限が共有)
export const WEEKLY_TREND_WEEKS = 12;

//* 目標タイプ。構造(進捗の入り方)で切った固定5値 — docs/adr/0005-goal-types-by-structure.md
export const GOAL_TYPES = [
  "exam",
  "pace",
  "volume",
  "mastery",
  "other",
] as const satisfies readonly string[];

export type GoalType = (typeof GOAL_TYPES)[number];

//* 達成量目標の単位。
export const VOLUME_UNITS = [
  "分",
  "ページ",
  "問題",
  "回",
  "冊",
] as const satisfies readonly string[];

export type VolumeUnit = (typeof VOLUME_UNITS)[number];

//* 達成量目標の量の下限。目標量は1以上、開始量・現在量は0以上。
export const VOLUME_AMOUNT_LIMITS = {
  minStart: 0,
  minTarget: 1,
} as const satisfies Record<string, number>;

//* 本番目標(TOEIC)のスコア制約。
export const TOEIC_SCORE = { max: 990, min: 10, step: 5 } as const satisfies Record<string, number>;

//* 週 n 日 × 1日あたり最低 m 分の許容範囲。
export const PACE_LIMITS = {
  maxDays: 7,
  minDays: 1,
  minFloorMinutes: 5,
} as const satisfies Record<string, number>;

//* 目標入力の検証メッセージ。サーバ(services)と Valibot スキーマが同じ文言を共有する(CVX-16)。
//? 文言に数値を手書きせず、上のドメイン定数から組み立てる。
export const GOAL_DATE_MESSAGE = "日付は YYYY-MM-DD で入力してください";

export const TOEIC_SCORE_RANGE_MESSAGE = `スコアは${TOEIC_SCORE.min}〜${TOEIC_SCORE.max}で入力してください`;

export const TOEIC_SCORE_STEP_MESSAGE = `スコアは${TOEIC_SCORE.step}点刻みで入力してください`;

export const TOEIC_SCORE_ORDER_MESSAGE = "目標点の下限が上限を超えています";

export const PACE_DAYS_MESSAGE = `週の実施日数は${PACE_LIMITS.minDays}〜${PACE_LIMITS.maxDays}日で入力してください`;

export const PACE_FLOOR_MESSAGE = `1日あたりの最低分数は${PACE_LIMITS.minFloorMinutes}分以上です`;

export const VOLUME_TARGET_MESSAGE = `目標量は${VOLUME_AMOUNT_LIMITS.minTarget}以上の整数で入力してください`;

export const VOLUME_AMOUNT_MESSAGE = `現在量は${VOLUME_AMOUNT_LIMITS.minStart}以上の整数です`;

export const VOLUME_START_MESSAGE = "開始量は目標量より小さい値で入力してください";

export const MASTERY_CRITERION_MESSAGE = "達成の基準を入力してください";

//* 控えめな初期ペース(Duolingo の知見: 低い床から始めるほど続く)。
export const DEFAULT_PACE = {
  dailyFloorMinutes: 20,
  daysPerWeek: 3,
} as const satisfies Record<string, number>;

//* 連続達成を切らずに許容する未達週数。2週連続で切れる。
export const STREAK_RESERVE_WEEKS = 1;

//* 週間ターゲットの計器。今週のカテゴリ別実績を何で測るか — docs CONTEXT「週間ターゲット」。
export const TARGET_METRICS = ["minutes", "days", "count"] as const satisfies readonly string[];

export type TargetMetric = (typeof TARGET_METRICS)[number];

//* 週間ターゲットの目標値。1以上の整数。days は1週=7日を超えられない。
export const TARGET_VALUE_LIMITS = {
  maxDays: 7,
  min: 1,
} as const satisfies Record<string, number>;

export const TARGET_VALUE_MESSAGE = `目標値は${TARGET_VALUE_LIMITS.min}以上の整数で入力してください`;

export const TARGET_DAYS_MESSAGE = `実施日の目標は${TARGET_VALUE_LIMITS.maxDays}日までです`;

//* JST 暦日 `YYYY-MM-DD`。Convex validator / Valibot / UI が共有する唯一の形式。
export const DATE_JST_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

export { CATEGORIES, type Category } from "./categories";
export { CONDITIONS, type Condition } from "./conditions";
