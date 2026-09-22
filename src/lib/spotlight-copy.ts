import { SEARCH_QUERY_MIN_LENGTH } from "~domain/domain";

import type { HistorySearchHitDto } from "~/../convex/lib/validators/history";

export const SPOTLIGHT_LABEL = "検索";
export const SPOTLIGHT_PLACEHOLDER = "アプリ内を検索、または画面へ移動";
export const SPOTLIGHT_NAV_GROUP = "移動";
export const SPOTLIGHT_RECORDS_GROUP = "検索結果";
export const SPOTLIGHT_LOADING = "検索中…";
export const SPOTLIGHT_NOTHING_FOUND = "見つかりませんでした";
export const SPOTLIGHT_HINT = `${String(SEARCH_QUERY_MIN_LENGTH)}文字以上で、記録・予定・項目・計画・目標・方法を検索します`;

export const SPOTLIGHT_RECORD_LIMIT = 7;

export const SPOTLIGHT_KIND_LABELS = {
  event: "予定",
  goal: "目標",
  hitokoto: "ひとこと",
  item: "項目",
  memo: "メモ",
  method: "方法",
  obstacle: "障害プラン",
  plan: "計画",
} as const satisfies Record<HistorySearchHitDto["kind"], string>;

const SPOTLIGHT_KIND_COLOR = {
  event: "blue",
  goal: "grape",
  hitokoto: "green",
  item: "teal",
  memo: "orange",
  method: "cyan",
  obstacle: "yellow",
  plan: "indigo",
} as const satisfies Record<HistorySearchHitDto["kind"], string>;

export function spotlightKindColor(kind: HistorySearchHitDto["kind"]): string {
  return SPOTLIGHT_KIND_COLOR[kind];
}
