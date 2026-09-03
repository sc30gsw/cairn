import { SEARCH_QUERY_MIN_LENGTH } from "~domain/domain";

export const SPOTLIGHT_LABEL = "検索";
export const SPOTLIGHT_PLACEHOLDER = "記録・メモを検索、または画面へ移動";
export const SPOTLIGHT_NAV_GROUP = "移動";
export const SPOTLIGHT_RECORDS_GROUP = "記録・メモ";
export const SPOTLIGHT_LOADING = "検索中…";
export const SPOTLIGHT_NOTHING_FOUND = "見つかりませんでした";
export const SPOTLIGHT_HINT = `記録とメモは${String(SEARCH_QUERY_MIN_LENGTH)}文字以上で検索します`;

//? パレットは一覧ではなく飛び先を選ぶ場所なので、記録はこの件数までに絞る
export const SPOTLIGHT_RECORD_LIMIT = 7;

export const SPOTLIGHT_KIND_LABELS = {
  hitokoto: "ひとこと",
  memo: "メモ",
} as const satisfies Record<"hitokoto" | "memo", string>;
