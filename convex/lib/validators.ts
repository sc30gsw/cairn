import { type Infer, v } from "convex/values";

import { boardScheduleColorValidator } from "./boardScheduleColors";
import { BOARD_SCHEDULE_VIEWS } from "./boardScheduleRange";
import { WEEKDAYS } from "./catalog";
import { CATEGORIES } from "./categories";
import { CONDITIONS } from "./conditions";
import { DAY_VIEW_KINDS } from "./dayView";
import { CHECKPOINT_BACKFILL_PLANS, GOAL_TYPES, STATUSES, TARGET_METRICS } from "./domain";
import { NOTIFICATION_KINDS, NOTIFICATION_PENDING_SOURCES } from "./notifications";
import { PRESET_REVIEW_REASONS } from "./presetDigest";

//? union はタプルを spread して組み立てる。ドメインのタプル(domain.ts 等)に値を足せば
//? validator も自動で追随し、列挙漏れが構造的に起きない(CVX-16)。個別の literal が必要な
//? 判別子(goalType)だけは分解した名前を残す。
const [examType, masteryType] = GOAL_TYPES;

export const categoryValidator = v.union(...CATEGORIES.map((category) => v.literal(category)));

export const statusValidator = v.union(...STATUSES.map((status) => v.literal(status)));

export const weekdayValidator = v.union(...WEEKDAYS.map((weekday) => v.literal(weekday)));

export type StatusDto = Infer<typeof statusValidator>;
export type RowStatus = StatusDto;
export type WeekdayDto = Infer<typeof weekdayValidator>;

export const presetLineValidator = v.object({
  content: v.string(),
  itemId: v.id("items"),
  minutes: v.number(),
});

export type PresetLine = Infer<typeof presetLineValidator>;

export const presetLineDtoValidator = v.object({
  content: v.string(),
  itemId: v.id("items"),
  itemName: v.string(),
  minutes: v.number(),
});

export type PresetLineDto = Infer<typeof presetLineDtoValidator>;

export const shareRowValidator = v.object({
  category: v.string(),
  categorySortOrder: v.number(),
  content: v.string(),
  itemName: v.string(),
  minutes: v.number(),
  sortOrder: v.number(),
  status: statusValidator,
});

export type ShareRow = Infer<typeof shareRowValidator>;

export const conditionValidator = v.union(...CONDITIONS.map((condition) => v.literal(condition)));

export const breakdownRowValidator = v.object({
  category: v.string(),
  itemName: v.string(),
  minutes: v.number(),
  status: statusValidator,
});

export const categoryBreakdownValidator = v.object({
  category: v.string(),
  categorySortOrder: v.number(),
  minutes: v.number(),
});

export const monthDayValidator = v.object({
  condition: v.union(conditionValidator, v.null()),
  dateJst: v.string(),
  isRest: v.boolean(),
  memo: v.union(v.string(), v.null()),
  minutes: v.number(),
  movingAverage: v.number(),
});

export const conditionVolumeKeyValidator = v.union(conditionValidator, v.literal("未設定"));

export const conditionVolumeValidator = v.object({
  condition: conditionVolumeKeyValidator,
  minutes: v.number(),
});

export const monthEventValidator = v.object({
  category: v.string(),
  dateJst: v.string(),
  minutes: v.number(),
  rowId: v.id("rows"),
  status: statusValidator,
  title: v.string(),
});

export const weekDayBreakdownValidator = v.object({
  confirmedMinutes: v.number(),
  dateJst: v.string(),
  isRest: v.boolean(),
  skippedMinutes: v.number(),
});

export const dayBreakdownValidator = v.object({
  byCategory: v.array(categoryBreakdownValidator),
  byCondition: v.array(conditionVolumeValidator),
  confirmedMinutes: v.number(),
  dateJst: v.string(),
  isRest: v.boolean(),
  rows: v.array(breakdownRowValidator),
  skippedMinutes: v.number(),
});

export const weekBreakdownValidator = v.object({
  byCategory: v.array(categoryBreakdownValidator),
  byCondition: v.array(conditionVolumeValidator),
  byDay: v.array(weekDayBreakdownValidator),
  confirmedMinutes: v.number(),
  rows: v.array(breakdownRowValidator),
  skippedMinutes: v.number(),
  volumeMinutes: v.number(),
  weekEnd: v.string(),
  weekStart: v.string(),
});

export const monthBreakdownValidator = v.object({
  byCategory: v.array(categoryBreakdownValidator),
  byCondition: v.array(conditionVolumeValidator),
  confirmedMinutes: v.number(),
  days: v.array(monthDayValidator),
  events: v.array(monthEventValidator),
  rows: v.array(breakdownRowValidator),
  skippedMinutes: v.number(),
});

export const yearHeatmapValidator = v.object({
  days: v.array(monthDayValidator),
  endDate: v.string(),
  startDate: v.string(),
});

export type BreakdownRow = Infer<typeof breakdownRowValidator>;
export type CategoryBreakdown = Infer<typeof categoryBreakdownValidator>;
export type ConditionVolume = Infer<typeof conditionVolumeValidator>;
export type ConditionVolumeKey = Infer<typeof conditionVolumeKeyValidator>;
export type MonthBreakdownDay = Infer<typeof monthDayValidator>;
export type MonthEventDto = Infer<typeof monthEventValidator>;
export type WeekDayBreakdown = Infer<typeof weekDayBreakdownValidator>;
export type DayBreakdown = Infer<typeof dayBreakdownValidator>;
export type WeekBreakdown = Infer<typeof weekBreakdownValidator>;
export type MonthBreakdown = Infer<typeof monthBreakdownValidator>;
export type YearHeatmapDto = Infer<typeof yearHeatmapValidator>;

//* 進行中の記録が測っている経過。開始時刻はサーバが持ち(mutation の Date.now())、経過は画面が導出する(CVX-14)。
//? DTO は null 正規化して全キーを必ず出す。dayDtoValidator の condition / memo と同じ規則。
export const rowTimerDtoValidator = v.object({
  accumulatedMs: v.number(),
  autoStoppedAt: v.union(v.number(), v.null()),
  startedAt: v.union(v.number(), v.null()),
});

export type RowTimerDto = Infer<typeof rowTimerDtoValidator>;

export const rowDtoValidator = v.object({
  _id: v.id("rows"),
  category: v.string(),
  categorySortOrder: v.number(),
  content: v.string(),
  itemId: v.id("items"),
  itemName: v.string(),
  minutes: v.number(),
  sortOrder: v.number(),
  status: statusValidator,
  //? 計測が無い行は null。進行中でないなら常に null(study-timer.md §4.3 の不変条件)。
  timer: v.union(rowTimerDtoValidator, v.null()),
});

//* いま計測中の1件。どの画面にいても「計測中」を見せるため(study-timer.md §13.2)。
export const runningTimerDtoValidator = v.object({
  _id: v.id("rows"),
  dateJst: v.string(),
  itemName: v.string(),
  timer: rowTimerDtoValidator,
});

export type RunningTimerDto = Infer<typeof runningTimerDtoValidator>;

export const dayDtoValidator = v.object({
  _id: v.id("days"),
  condition: v.union(conditionValidator, v.null()),
  dateJst: v.string(),
  memo: v.union(v.string(), v.null()),
});

export const itemDtoValidator = v.object({
  _id: v.id("items"),
  categoryId: v.id("categories"),
  name: v.string(),
  sortOrder: v.number(),
});

export const categoryDtoValidator = v.object({
  _id: v.id("categories"),
  name: v.string(),
  sortOrder: v.number(),
});

export const presetDtoValidator = v.object({
  _id: v.id("presets"),
  lines: v.array(presetLineDtoValidator),
  name: v.string(),
  weekday: v.number(),
});

export const goalTypeValidator = v.union(v.literal(examType), v.literal(masteryType));

export type GoalTypeDto = Infer<typeof goalTypeValidator>;

//* 目標はタイプごとに入力欄が変わる discriminated union。共有フィールドは content と type だけ。
const examGoalFields = v.object({
  content: v.string(),
  examDate: v.string(),
  maxScore: v.number(),
  minScore: v.number(),
  type: v.literal(examType),
});

//? achievedAt は setAchieved の担当なので、作成・更新の入力には含めない(編集で達成を消さない)。
//? deadline を持つ習得が「チェックポイント」。別タイプではないので枝は増やさない(docs/adr/0006)。
//? 期限と親は同時に存在する(INV-1)。片方だけの状態は services 層で弾く。
const masteryGoalInputFields = v.object({
  content: v.string(),
  criterion: v.string(),
  deadline: v.optional(v.string()),
  //? 必須化は既存データのバックフィル後(#49 Phase 5)。それまでは optional で受ける。
  parentGoalId: v.optional(v.id("goals")),
  //? 実績に数える記録の範囲(対象項目)。省略 = すべての記録(ADR-0007 の元の意味そのまま)。
  //? 空配列は services 側で省略に畳むので、保存済みドキュメントに [] は現れない(#53)。
  scopeItemIds: v.optional(v.array(v.id("items"))),
  type: v.literal(masteryType),
});

const masteryGoalFields = masteryGoalInputFields.extend({ achievedAt: v.optional(v.string()) });

//? 自己判定の較正のために併記する学習量の実績。目標ドキュメントに保存し、確定を動かす書き込みが
//? 同じトランザクションで差分更新する(ADR-0007)。読み取りは保存値をそのまま返すだけ。
const masteryProgressFields = {
  activeDays: v.number(),
  confirmedMinutes: v.number(),
};

const masteryProgressValidator = v.object(masteryProgressFields);

//? 保存フィールドの形はここが SSoT。services 側で同じ2フィールドを書き直さない(CVX-16)。
export type MasteryProgress = Infer<typeof masteryProgressValidator>;

const masteryGoalDocumentFields = masteryGoalFields.extend(masteryProgressFields);

const goalOwnerField = { ownerId: v.string() };

export const goalDocumentValidator = v.union(
  examGoalFields.extend(goalOwnerField),
  masteryGoalDocumentFields.extend(goalOwnerField),
);

//? 並び順をクライアントの index 順の偶然に頼らないため、DTO に作成時刻を載せる。
//? ツリー構築(goal-tree.ts)が自己完結し、純関数のままテストできる。
const goalIdField = { _id: v.id("goals"), createdAt: v.number() };

export const goalDtoValidator = v.union(
  examGoalFields.extend(goalIdField),
  masteryGoalDocumentFields.extend(goalIdField),
);

export type GoalDto = Infer<typeof goalDtoValidator>;

export const goalInputValidator = v.union(examGoalFields, masteryGoalInputFields);

export type GoalInput = Infer<typeof goalInputValidator>;

//? 値の SSoT は domain.ts のタプル。ここは validator を組み立てるだけ(CVX-16)。
export const checkpointBackfillPlanValidator = v.union(
  ...CHECKPOINT_BACKFILL_PLANS.map((plan) => v.literal(plan)),
);

export const checkpointParentAuditOwnerValidator = v.object({
  examGoalCount: v.number(),
  longTermCount: v.number(),
  orphanCount: v.number(),
  ownerId: v.string(),
  plan: checkpointBackfillPlanValidator,
  promoteLosesDeadline: v.union(v.string(), v.null()),
});

//* #49 の移行ゲート兼検証。所有者を横断するので internalQuery からしか返さない。
export const checkpointParentAuditValidator = v.object({
  //? 親自身が親を持つ(チェーン)
  chainedCount: v.number(),
  //? 親の ownerId が子と違う
  crossOwnerParentCount: v.number(),
  //? 親 id が実在しない
  danglingParentCount: v.number(),
  malformedDeadlineCount: v.number(),
  //? 期限あり・親なし
  orphanCount: v.number(),
  owners: v.array(checkpointParentAuditOwnerValidator),
  //? 親あり・期限なし
  parentWithoutDeadlineCount: v.number(),
  selfParentCount: v.number(),
  truncated: v.boolean(),
});

export type CheckpointParentAudit = Infer<typeof checkpointParentAuditValidator>;
export type CheckpointParentAuditOwner = Infer<typeof checkpointParentAuditOwnerValidator>;

export const backfillCheckpointParentsResultValidator = v.object({
  assigned: v.number(),
  plan: checkpointBackfillPlanValidator,
  promoted: v.number(),
});

export type BackfillCheckpointParentsResult = Infer<
  typeof backfillCheckpointParentsResultValidator
>;

//* 週間ターゲット。常設定義・週次スナップショットなしの「今週専用の計器」。
export const targetMetricValidator = v.union(...TARGET_METRICS.map((metric) => v.literal(metric)));

export type TargetMetricDto = Infer<typeof targetMetricValidator>;

export const targetProgressDtoValidator = v.object({
  _id: v.id("targets"),
  achieved: v.boolean(),
  categoryId: v.id("categories"),
  categoryName: v.string(),
  current: v.number(),
  metric: targetMetricValidator,
  targetValue: v.number(),
});

export type TargetProgressDto = Infer<typeof targetProgressDtoValidator>;

export const obstacleDtoValidator = v.object({
  _id: v.id("obstaclePlans"),
  ifText: v.string(),
  thenText: v.string(),
});

export type ObstacleDto = Infer<typeof obstacleDtoValidator>;

export const trashedDayValidator = v.object({
  _id: v.id("days"),
  dateJst: v.string(),
  deletedAt: v.number(),
});

export type TrashedDay = Infer<typeof trashedDayValidator>;

export const trashedRowValidator = v.object({
  _id: v.id("rows"),
  content: v.string(),
  dateJst: v.string(),
  deletedAt: v.number(),
  itemName: v.string(),
  minutes: v.number(),
  status: statusValidator,
});

export type TrashedRow = Infer<typeof trashedRowValidator>;

export const trashPageValidator = v.object({
  days: v.array(trashedDayValidator),
  rows: v.array(trashedRowValidator),
});

export type TrashPageDto = Infer<typeof trashPageValidator>;

export const presetApplyResultValidator = v.object({
  applied: v.boolean(),
});

export type PresetApplyResult = Infer<typeof presetApplyResultValidator>;

export const dayViewKindValidator = v.union(...DAY_VIEW_KINDS.map((kind) => v.literal(kind)));

export const dayPageValidator = v.object({
  canCopyYesterday: v.boolean(),
  dateJst: v.string(),
  day: v.union(dayDtoValidator, v.null()),
  kind: dayViewKindValidator,
  rows: v.array(rowDtoValidator),
  shareMarkdown: v.string(),
  volumeMinutes: v.number(),
});

export type DayPageDto = Infer<typeof dayPageValidator>;

export const historyWeekValidator = v.object({
  days: v.array(monthDayValidator),
  events: v.array(monthEventValidator),
  volumeMinutes: v.number(),
  weekEnd: v.string(),
  weekStart: v.string(),
});

export type HistoryWeekDto = Infer<typeof historyWeekValidator>;

export const historyMonthValidator = v.object({
  days: v.array(monthDayValidator),
});

export type HistoryMonthDto = Infer<typeof historyMonthValidator>;

export type RowDto = Infer<typeof rowDtoValidator>;
export type DayDto = Infer<typeof dayDtoValidator>;
export type ItemDto = Infer<typeof itemDtoValidator>;
export type CategoryDto = Infer<typeof categoryDtoValidator>;
export type PresetDto = Infer<typeof presetDtoValidator>;

export const categoryItemOrderValidator = v.object({
  categoryId: v.id("categories"),
  orderedItemIds: v.array(v.id("items")),
});

export type CategoryItemOrder = Infer<typeof categoryItemOrderValidator>;

export const applyItemOrderArgsValidator = v.object({
  updates: v.array(categoryItemOrderValidator),
});

export type ApplyItemOrderInput = Infer<typeof applyItemOrderArgsValidator>;

export const recentConcreteActionsValidator = v.array(v.string());

export type RecentConcreteActions = Infer<typeof recentConcreteActionsValidator>;

export const presetReviewReasonValidator = v.union(
  ...PRESET_REVIEW_REASONS.map((reason) => v.literal(reason)),
);

export const presetReviewWeekdayValidator = v.object({
  confirmed: v.number(),
  leftover: v.number(),
  ongoing: v.number(),
  planned: v.number(),
  skipped: v.number(),
  weekday: weekdayValidator,
});

export const presetReviewSuggestionValidator = v.object({
  reason: presetReviewReasonValidator,
  weekday: weekdayValidator,
});

export const presetReviewValidator = v.object({
  suggestions: v.array(presetReviewSuggestionValidator),
  weekdays: v.array(presetReviewWeekdayValidator),
  windowEnd: v.string(),
  windowStart: v.string(),
});

export type PresetReviewDto = Infer<typeof presetReviewValidator>;
export type PresetReviewWeekdayDto = Infer<typeof presetReviewWeekdayValidator>;
export type PresetReviewSuggestionDto = Infer<typeof presetReviewSuggestionValidator>;

export const boardScheduleEventDtoValidator = v.object({
  _id: v.id("boardScheduleEvents"),
  color: boardScheduleColorValidator,
  endAt: v.string(),
  rowId: v.id("rows"),
  startAt: v.string(),
  title: v.string(),
});

export const boardScheduleViewValidator = v.union(
  ...BOARD_SCHEDULE_VIEWS.map((view) => v.literal(view)),
);

export type BoardScheduleEventDto = Infer<typeof boardScheduleEventDtoValidator>;

//* 週の消化(CONTEXT「消化」: 確定 / 並んだ件数)。今日の行は数えないので、今日を含む週は isPartial=true。
export const weeklyDigestValidator = v.object({
  confirmedCount: v.number(),
  //? 数えた範囲。UI の注記(「08/17〜08/22 を数えた」)にそのまま使う。
  countedFrom: v.string(),
  //? 1日も数えられないとき(週初日が今日 or 未来週)は null。
  countedThrough: v.union(v.string(), v.null()),
  digestRate: v.number(),
  //? 週の全7日を数えられていない(今日を含む・未来を含む)ときに true。UI は注記を出す。
  isPartial: v.boolean(),
  leftoverCount: v.number(),
  ongoingCount: v.number(),
  plannedCount: v.number(),
  skippedCount: v.number(),
});

export type WeeklyDigest = Infer<typeof weeklyDigestValidator>;

//* 週次レビューの1日分。月〜日の7件固定。kind は既存の dayViewKind をそのまま使う(CVX-16)。
export const weeklyReviewDayValidator = v.object({
  condition: v.union(conditionValidator, v.null()),
  confirmedCount: v.number(),
  confirmedMinutes: v.number(),
  dateJst: v.string(),
  //? 今日・未記録・並んだ件数0 の日は消化を出さない(null)。0% と描くと「サボった」に見え、
  //? CONTEXT「消化」の定義(計画が残ったかの指標。計画が無い日は指標そのものが無い)に反する。
  digestRate: v.union(v.number(), v.null()),
  kind: dayViewKindValidator,
  plannedCount: v.number(),
  skippedCount: v.number(),
});

export type WeeklyReviewDay = Infer<typeof weeklyReviewDayValidator>;

//* 週次レビュー画面1枚ぶん。前週比のラベル整形はクライアントの純関数が担う。
export const weeklyReviewValidator = v.object({
  //? 確定記録が1件以上ある暦日数。週間ターゲットの days 計器と同じ「実施日」の定義。
  activeDays: v.number(),
  byDay: v.array(weeklyReviewDayValidator),
  confirmedMinutes: v.number(),
  digest: weeklyDigestValidator,
  //? 週内で今日以前の暦日数(過去週なら7)。1日平均の分母。
  elapsedDays: v.number(),
  isCurrentWeek: v.boolean(),
  previousActiveDays: v.number(),
  previousConfirmedMinutes: v.number(),
  previousWeekStart: v.string(),
  shareMarkdown: v.string(),
  skippedMinutes: v.number(),
  //? 週間ターゲットは「今週専用の計器」(CONTEXT)。過去週は null を返し、UI は数値を描かない。
  targets: v.union(v.array(targetProgressDtoValidator), v.null()),
  weekEnd: v.string(),
  weekStart: v.string(),
});

export type WeeklyReviewDto = Infer<typeof weeklyReviewValidator>;

//* 月内の週バケット1つ分の消化推移(digestRate と同じ定義)。
//? weeklyDigestValidator を週バケットに使わない理由: 月境界で7日に満たないバケットは
//? 「今日を含むから不完全」ではなく「暦週として不完全」という別の理由で isPartial になる
//? (weeklyDigestValidator の isPartial は「今日/未来を数えられなかった」ことだけを意味する)。
//? チャートが必要とするのは digestRate / isPartial / plannedCount(0件判定) だけなので最小形にする。
export const monthlyDigestBucketValidator = v.object({
  bucketEnd: v.string(),
  bucketStart: v.string(),
  confirmedCount: v.number(),
  digestRate: v.number(),
  //? 月境界の部分週(7日未満) or 当日/未来を含む進行中の週の両方で true。
  isPartial: v.boolean(),
  plannedCount: v.number(),
});

export type MonthlyDigestBucket = Infer<typeof monthlyDigestBucketValidator>;

//* 月次レビュー画面1枚ぶんの集計。カテゴリ比較の delta%・ラベル付けはクライアントの純関数が担う。
export const monthlyReviewValidator = v.object({
  activeDays: v.number(),
  byCategory: v.array(categoryBreakdownValidator),
  confirmedMinutes: v.number(),
  //? 月全体(今日を除く)の消化。weeklyDigestValidator をそのまま再利用する。
  //? 週次レビューのサマリー「消化」タイルと同じ形にするための意図的な再利用(CVX-16 SSoT)。
  digest: weeklyDigestValidator,
  digestTrend: v.array(monthlyDigestBucketValidator),
  //? 月内で今日以前の暦日数(過去月なら月の日数と同じ)。1日平均の分母。
  elapsedDays: v.number(),
  //? yearMonth が todayJst の月と一致するか。当月は「まだ途中」の注記に使う。
  isCurrentMonth: v.boolean(),
  monthEnd: v.string(),
  monthStart: v.string(),
  previousActiveDays: v.number(),
  previousByCategory: v.array(categoryBreakdownValidator),
  previousConfirmedMinutes: v.number(),
  previousYearMonth: v.string(),
  skippedMinutes: v.number(),
  yearMonth: v.string(),
});

export type MonthlyReviewDto = Infer<typeof monthlyReviewValidator>;

const [checkpointDeadlineKind, eveningUntouchedKind, weeklyTargetMissKind] = NOTIFICATION_KINDS;

//* 通知の種類。UI のフィルタと設定のキー集合がここから派生する。
//? ここだけタプルの spread ではなく個別の literal を並べる。この validator は
//? notificationPayloadValidator の判別子で、spread(配列由来)だと各メンバーのリテラル型が
//? 保たれず payload の絞り込みが効かなくなる(kind: any に落ちる)。列挙漏れは
//? validators.test.ts の NOTIFICATION_KINDS との1:1一致テストが検知する。
export const notificationKindValidator = v.union(
  v.literal(checkpointDeadlineKind),
  v.literal(eveningUntouchedKind),
  v.literal(weeklyTargetMissKind),
);

export type NotificationKindDto = Infer<typeof notificationKindValidator>;

//? 参照先のテキストは生成時に写す。親目標がカスケード削除されても通知は読める(#48 INV-6)。
//? goalId は残すが、リンク先はページ(/goals)なので「開けない」ことは起きない。
const checkpointDeadlineItemValidator = v.object({
  content: v.string(),
  daysLeft: v.number(),
  deadline: v.string(),
  goalId: v.id("goals"),
});

const weeklyTargetShortfallValidator = v.object({
  categoryName: v.string(),
  current: v.number(),
  metric: targetMetricValidator,
  targetValue: v.number(),
});

//* 通知の中身。種類ごとに形が変わる discriminated union(目標の goalDocumentValidator と同じ流儀)。
//? 「1発火単位 = 1通」なので、複数件は配列で1つの payload に入る。
export const notificationPayloadValidator = v.union(
  v.object({
    dateJst: v.string(),
    items: v.array(checkpointDeadlineItemValidator),
    kind: v.literal(checkpointDeadlineKind),
  }),
  v.object({
    dateJst: v.string(),
    kind: v.literal(eveningUntouchedKind),
    pendingCount: v.number(),
    source: v.union(...NOTIFICATION_PENDING_SOURCES.map((source) => v.literal(source))),
  }),
  v.object({
    kind: v.literal(weeklyTargetMissKind),
    shortfalls: v.array(weeklyTargetShortfallValidator),
    weekStartJst: v.string(),
  }),
);

export type NotificationPayload = Infer<typeof notificationPayloadValidator>;

//* トリガーごとのオプトイン。キー集合は NOTIFICATION_KINDS と一致する。
//? 一致は評価器の `setting.triggers[kind]` アクセスで tsc が守る — キーを足し忘れると型エラーになる。
export const notificationTriggerPrefsValidator = v.object({
  checkpointDeadline: v.boolean(),
  eveningUntouched: v.boolean(),
  weeklyTargetMiss: v.boolean(),
});

export type NotificationTriggerPrefs = Infer<typeof notificationTriggerPrefsValidator>;

//* 通知欄の1行。readAt は boolean に畳む(dayDtoValidator の null 正規化と同じ規則)。
export const notificationDtoValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("notifications"),
  payload: notificationPayloadValidator,
  read: v.boolean(),
});

export type NotificationDto = Infer<typeof notificationDtoValidator>;

export const notificationPageValidator = v.object({
  items: v.array(notificationDtoValidator),
  unreadCount: v.number(),
});

export type NotificationPageDto = Infer<typeof notificationPageValidator>;

//* 設定の DTO。v1 のチャネルはアプリ内通知欄だけなので、出す値は「使うか」「いつ」「何を」に尽きる。
export const notificationSettingsDtoValidator = v.object({
  enabled: v.boolean(),
  eveningHourJst: v.number(),
  triggers: notificationTriggerPrefsValidator,
});

export type NotificationSettingsDto = Infer<typeof notificationSettingsDtoValidator>;
