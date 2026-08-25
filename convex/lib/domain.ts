import { ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

export const STATUSES = ["確定", "未着手", "進行中", "スキップ"] as const;

export type Status = (typeof STATUSES)[number];

export const MINUTES_MIN_MESSAGE = "分数は0以上です";

//* rows / presets のどちらでも分数を確定・保存する前に必ず通す境界チェック。
//? args.minutes < 0 は NaN/Infinity を素通しするので、Number.isFinite を先に見る。
//? 整数強制は既存の UI/テストに影響が大きいので、ここでは要求しない(保守的)。
export function requireValidMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throwDomain(new ValidationFailedError({ message: MINUTES_MIN_MESSAGE }));
  }
  return minutes;
}

//* 目標タイプ。判定の入り方で切った固定2値 — docs/adr/0006-checkpoints-replace-weekly-goals.md
//? 期限つき習得の呼び名が「チェックポイント」。独立したタイプではないので、ここには増えない。
export const GOAL_TYPES = ["exam", "mastery"] as const satisfies readonly string[];

export type GoalType = (typeof GOAL_TYPES)[number];

//* 本番目標(TOEIC)のスコア制約。
export const TOEIC_SCORE = { max: 990, min: 10, step: 5 } as const satisfies Record<string, number>;

//* 目標入力の検証メッセージ。サーバ(services)と Valibot スキーマが同じ文言を共有する(CVX-16)。
//? 文言に数値を手書きせず、上のドメイン定数から組み立てる。
export const GOAL_DATE_MESSAGE = "日付は YYYY-MM-DD で入力してください";

export const TOEIC_SCORE_RANGE_MESSAGE = `スコアは${TOEIC_SCORE.min}〜${TOEIC_SCORE.max}で入力してください`;

export const TOEIC_SCORE_STEP_MESSAGE = `スコアは${TOEIC_SCORE.step}点刻みで入力してください`;

export const TOEIC_SCORE_ORDER_MESSAGE = "目標点の下限が上限を超えています";

export const MASTERY_CRITERION_MESSAGE = "達成の基準を入力してください";

//* 目標階層の不変条件メッセージ。services と Valibot が同じ文言を共有する(CVX-16)。
//? 期限と親は同時に存在する(INV-1)。片方だけの状態は services 層で弾く。
export const CHECKPOINT_PARENT_REQUIRED_MESSAGE =
  "期限を付けるときは親（本番目標か長期目標）を選んでください";

export const CHECKPOINT_DEADLINE_REQUIRED_MESSAGE = "親を持つチェックポイントには期限が必要です";

export const CHECKPOINT_PARENT_SELF_MESSAGE = "自分自身を親にはできません";

export const CHECKPOINT_PARENT_KIND_MESSAGE = "チェックポイントの下にチェックポイントは置けません";

export const CHECKPOINT_HAS_CHILDREN_MESSAGE =
  "子チェックポイントを持つ長期目標は、チェックポイントにできません";

//* 対象項目(習得が実績に数える記録の範囲)の検証メッセージ。services と Valibot が共有する(CVX-16)。
export const GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE = "選べない項目が含まれています";

export const GOAL_SCOPE_FROZEN_MESSAGE =
  "達成済みの目標では対象項目を変えられません。達成を外してから変更してください";

//* 既存チェックポイントへの親バックフィル(#49)の監査。全所有者を横断するので上限で切る(CVX-11)。
export const CHECKPOINT_AUDIT_LIMIT = 2000;

//* バックフィルの適用規則。監査の出力と純関数の戻り値が同じ語彙を使う。
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

//* 週間ターゲットの計器。今週のカテゴリ別実績を何で測るか — docs CONTEXT「週間ターゲット」。
export const TARGET_METRICS = ["minutes", "days", "count"] as const satisfies readonly string[];

export type TargetMetric = (typeof TARGET_METRICS)[number];

//* 週間ターゲットの単位。通知の本文もサーバが組むので、単位はもう UI 専有の飾りではない。
//? 表示ラベル(「件数 / 実施日 / 分」)は UI のまま(src/lib/target-metric-labels.ts)。
export const TARGET_METRIC_UNITS = {
  count: "件",
  days: "日",
  minutes: "分",
} as const satisfies Record<TargetMetric, string>;

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
