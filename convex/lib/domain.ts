import { ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

export const STATUSES = ["確定", "未着手", "進行中", "スキップ"] as const;

export type Status = (typeof STATUSES)[number];

export const MINUTES_MIN_MESSAGE = "分数は0以上です";

export function requireValidMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throwDomain(new ValidationFailedError({ message: MINUTES_MIN_MESSAGE }));
  }
  return minutes;
}

export const GOAL_TYPES = ["exam", "mastery"] as const satisfies readonly string[];

export type GoalType = (typeof GOAL_TYPES)[number];

export const TOEIC_SCORE = { max: 990, min: 10, step: 5 } as const satisfies Record<string, number>;

export const GOAL_DATE_MESSAGE = "日付は YYYY-MM-DD で入力してください";

export const TOEIC_SCORE_RANGE_MESSAGE = `スコアは${TOEIC_SCORE.min}〜${TOEIC_SCORE.max}で入力してください`;

export const TOEIC_SCORE_STEP_MESSAGE = `スコアは${TOEIC_SCORE.step}点刻みで入力してください`;

export const TOEIC_SCORE_ORDER_MESSAGE = "目標点の下限が上限を超えています";

export const MASTERY_CRITERION_MESSAGE = "達成の基準を入力してください";

export const CHECKPOINT_PARENT_REQUIRED_MESSAGE =
  "期限を付けるときは親（本番目標か長期目標）を選んでください";

export const CHECKPOINT_DEADLINE_REQUIRED_MESSAGE = "親を持つチェックポイントには期限が必要です";

export const CHECKPOINT_PARENT_SELF_MESSAGE = "自分自身を親にはできません";

export const CHECKPOINT_PARENT_KIND_MESSAGE = "チェックポイントの下にチェックポイントは置けません";

export const CHECKPOINT_HAS_CHILDREN_MESSAGE =
  "子チェックポイントを持つ長期目標は、チェックポイントにできません";

export const GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE = "選べない項目が含まれています";

export const GOAL_SCOPE_FROZEN_MESSAGE =
  "達成済みの目標では対象項目を変えられません。達成を外してから変更してください";

export const CHECKPOINT_AUDIT_LIMIT = 2000;

export const CHECKPOINT_BACKFILL_PLANS = [
  "exam",
  "longTerm",
  "promote",
  "manual",
  "none",
] as const satisfies readonly string[];

export type CheckpointBackfillPlan = (typeof CHECKPOINT_BACKFILL_PLANS)[number];

export const CHECKPOINT_BACKFILL_MANUAL_MESSAGE =
  "親候補が無く、孤児のチェックポイントがすべて達成済みです。長期目標を手で作ってから再実行してください";

export const CHECKPOINT_DEADLINE_MALFORMED_MESSAGE =
  "期限の形式が壊れたチェックポイントがあります。手で直してから再実行してください";

export const PRESET_SETTINGS_DEFAULTS = { holidayAsSunday: false } as const satisfies Record<
  "holidayAsSunday",
  boolean
>;

export const TARGET_METRICS = ["minutes", "days", "count"] as const satisfies readonly string[];

export type TargetMetric = (typeof TARGET_METRICS)[number];

export const TARGET_METRIC_UNITS = {
  count: "件",
  days: "日",
  minutes: "分",
} as const satisfies Record<TargetMetric, string>;

export const TARGET_VALUE_LIMITS = {
  maxDays: 7,
  min: 1,
} as const satisfies Record<string, number>;

export const TARGET_VALUE_MESSAGE = `目標値は${TARGET_VALUE_LIMITS.min}以上の整数で入力してください`;

export const TARGET_DAYS_MESSAGE = `実施日の目標は${TARGET_VALUE_LIMITS.maxDays}日までです`;

export const ACHIEVEMENT_REFLECTION_MAX_LENGTH = 200;

export const ACHIEVEMENT_REFLECTION_LENGTH_MESSAGE = `振り返りは${String(ACHIEVEMENT_REFLECTION_MAX_LENGTH)}字以内で入力してください`;

export const SEARCH_QUERY_MIN_LENGTH = 2;

export const SEARCH_QUERY_TOO_SHORT_MESSAGE = `検索語は${String(SEARCH_QUERY_MIN_LENGTH)}文字以上で入力してください`;

//? 履歴検索は新しい順にこの件数まで返す。超えた分は「語を足して絞る」よう促す
export const SEARCH_RESULT_LIMIT = 50;

export const DATE_JST_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

export { CATEGORIES, type Category } from "./categories";
export { CONDITIONS, type Condition } from "./conditions";
