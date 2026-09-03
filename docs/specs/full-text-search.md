# 全文検索（#71）

- 状態: 決定済み・実装済み（2026-09-02）。地図 [#66](https://github.com/sc30gsw/cairn/issues/66)。調査 [#70](https://github.com/sc30gsw/cairn/issues/70) → [docs/research/convex-search-japanese.md](../research/convex-search-japanese.md)。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)（CVX-04 `ownerQuery`、CVX-10/11 index + TS 側判定、CVX-14 期間の下限は引数）、[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)、[shimmer-from-structure.md](../../.claude/rules/web/shimmer-from-structure.md)、[valibot-validation.md](../../.claude/rules/typescript/valibot-validation.md)。

## 1. 決定の要約

| 論点 | 決定 |
| --- | --- |
| 対象 | 記録の**ひとこと**（`rows.content`）と日の**メモ**（`days.memo`）。方法カタログ本文は対象外（日に紐づかず、行き先が別画面になる。必要なら別チケット）。ゴミ箱の記録・ゴミ箱の日に属する記録は除く |
| 方式 | 調査の結論どおり **(c)**: `by_owner_and_date` で所有者（と期間）の文書を読み、TypeScript 側で正規化して `includes`。schema 変更なし、search index なし。日本語の部分一致が正確で、ハイライトも同じ位置計算で済む |
| 正規化 | NFKC + 小文字化（全角英数・半角カナ・大文字小文字を同一視）。検索語は trim。判定は `convex/lib/searchText.ts` の純関数で、サーバーとクライアントが同じものを使う |
| 最短長 | **2文字以上**。1文字は検索しない（UI は助言を出し、サーバーは `SEARCH_QUERY_TOO_SHORT_MESSAGE` で throw） |
| 期間 | 既定は**直近12か月**（12か月前の月初から）。**全期間**は `SegmentedControl` で明示して切り替える。下限日はクライアントが計算して `fromJst` で渡す（CVX-14） |
| 結果の形 | **日付降順**（同日はメモ→ひとこと、ひとことは行順）。関連度順にはしない。1件は日付（日ページへのリンク）・種別バッジ・項目名（メモは「メモ」）・カテゴリ・分数・一致箇所の抜粋。ハイライトはクライアント側 |
| 件数上限 | 新しい順に **50件**（`SEARCH_RESULT_LIMIT`）。超えたら `truncated: true` を返し「語を足して絞る」よう促す |
| UI | `PageTitle` 直下の `TextInput`（`type="search"`）。検索語は URL の search param `q`、期間は `range`（`year` 既定 / `all`）。**2文字以上のあいだはタブの代わりに結果を出す**（タブは増やさない）。1文字は「2文字以上で検索します」を添えてタブのまま。空状態は `EmptyState`、読み込みは Shimmer |
| 打鍵 | URL が唯一の出所（1打鍵ごとに `replace: true` で書く）。Convex への購読だけを 250ms 遅らせる（`useDebouncedValue`） |
| 語彙 | `CONTEXT.md`「履歴」に一文と Avoid「検索専用のタブを増やすこと」「検索結果を関連度順に並べること」 |

## 2. 関数

```ts
// convex/queries/history/search.ts
export const search = ownerQuery({
  args: { fromJst: v.optional(v.string()), query: v.string() },
  returns: historySearchValidator, // { hits: HistorySearchHitDto[], truncated: boolean }
});
```

- `convex/lib/domain.ts`: `SEARCH_QUERY_MIN_LENGTH = 2`、`SEARCH_QUERY_TOO_SHORT_MESSAGE`、`SEARCH_RESULT_LIMIT = 50`
- `convex/lib/searchText.ts`（純関数）: `normalizeSearchText` / `normalizeSearchQuery` / `isSearchableQuery` / `requireSearchQuery`（throw）/ `matchesSearchText` / `searchMatchRange`（元文字列上の位置。正規化で文字数が変わる合字などは `null`）
- `convex/lib/validators.ts`: `historySearchHitValidator = { category?, dateJst, kind: "hitokoto" | "memo", minutes?, rowId?, text, title }`、`historySearchValidator`
- `convex/services/history/search.ts`: `days` と `rows` を `by_owner_and_date`（`fromJst` があれば `gte`）で読み、`liveDayDatesFrom` / `liveRows` でゴミ箱を除き、メモ→ひとことの順で一致を集めて日付降順に並べ、50件で切る

## 3. UI

- `history-search-schema.ts`: `q: v.optional(v.string())`、`range: v.optional(v.picklist(["year", "all"]))`。既定 `range: "year"` は `stripSearchParams` で URL から落ちる
- `use-history-view.ts`: `searchQuery` / `searchRange` を派生し、`setQuery`（`replace: true`）/ `setRange`
- `history-search-input.tsx`: 検索欄。1文字で助言、入力があれば「検索語を消す」
- `history-search-results.tsx`: 範囲の `SegmentedControl`、`Suspense` + `HistorySearchResultsPending`（Shimmer、`historyShimmerSearchHits`）、`SearchHitRow`（`Anchor component={Link} to="/days/$dateJst"`、`Badge`、`Mark`）
- `lib/search-range.ts`: `searchFromJst(range, today)`、`lib/search-excerpt.ts`: `searchExcerpt(text, normalizedQuery)`（前後 24 文字 + 省略記号）
- `history-page.tsx`: `isSearchableQuery(searchQuery)` のあいだ `Tabs` を `HistorySearchResults` に置き換える

## 4. テスト

- 純関数: `convex/lib/searchText.test.ts`、`search-range.test.ts`、`search-excerpt.test.ts`
- 統合: `convex/historySearch.test.ts`（所有者分離、ゴミ箱の記録と日の除外、NFKC/大文字小文字、2文字未満の throw、期間の下限、日付降順、上限と `truncated`）
- UI: `history-search-input.test.tsx`、`history-search-results.test.tsx`（一覧・強調・空状態・上限・範囲切替）、`history-page.test.tsx`（検索欄の位置、タブ ⇄ 結果の切り替え）

## 5. 端ケース

| ケース | 挙動 |
| --- | --- |
| 空白だけ・1文字 | 検索しない。タブのまま助言を出す |
| 日がゴミ箱、記録は生きている | `liveRows` が日ごと除くので出ない（履歴の他の集計と同じ規則） |
| メモが長い | 抜粋は一致の前後 24 文字。全文は日ページで読む |
| 合字などで正規化後の文字数が変わる | 一致はするが位置を保証できないので、抜粋は先頭から・強調なし |
| 全期間で件数が多い | 所有者1名・1日十数件のこの規模では数千〜1万件程度で CVX-11 の範囲。件数が問題になったら bigram 索引（調査 §4.2）を再検討 |
| 同じ語を含む記録が同日に複数 | 行順（`sortOrder`）で並ぶ。メモは行より先 |

---

## 改訂（2026-09-03）— 入口をコマンドパレットに一本化

所有者の判断で、検索の入口を履歴ページの検索欄から **Mantine Spotlight のコマンドパレット**へ移した。検索そのもの（`queries/history/search`、正規化・2文字の下限・ゴミ箱除外・日付降順）は変更していない。

| 論点 | 変更前 | 変更後 |
| --- | --- | --- |
| 入口 | 履歴ページ上部の `TextInput`。2文字以上でタブと入れ替え | **⌘K / Ctrl+K**、またはヘッダーの検索ボタン。どの画面からでも開く |
| 検索語の置き場所 | URL の search param `q`（`replace: true`） | パレット内の state。URL は汚さない |
| 期間 | 既定12か月 + 全期間の切り替え（`range`） | **常に全期間**（`fromJst: undefined`）。パレットは「どこにあるか分からないもの」を探す場所で、一覧ではないため絞りの UI を持たない |
| 件数 | 50件まで一覧表示 | 新しい順に **7件**まで（`SPOTLIGHT_RECORD_LIMIT`）。サーバー側の50件上限はそのまま |
| ほかに載せるもの | なし | **画面移動**（`NAV` の9本）。語で絞り込める |
| 履歴ページ | 検索欄と結果一覧 | 月 / 週 / 分析のタブのみに戻した |

**撤去したもの**: `history-search-input.tsx`、`history-search-results.tsx`、`lib/search-range.ts`（と各テスト）、`HistorySearchSchema` の `q` / `range`、`use-history-view` の `searchQuery` / `searchRange` / `setQuery` / `setRange`、`historyShimmerSearchHits`。

**共有側へ移したもの**: `src/components/**` は features を import できない規約（`vite.config.ts` の `no-restricted-imports`）のため、`useHistorySearch` を `src/hooks/history-search-queries.ts` に、`searchExcerpt` を `src/lib/search-excerpt.ts` に移した。あわせて小口レールのナビ定義を `src/lib/app-nav.ts` へ切り出し、レール・下小口タブ・パレットが同じ `NAV` を読むようにした。

**実装**: `src/components/app-spotlight.tsx`（`AppSpotlight` / `SpotlightTrigger`）、文言は `src/lib/spotlight-copy.ts`。compound components（`Spotlight.Root` / `Search` / `ActionsList` / `ActionsGroup` / `Action` / `Empty`）を使い、ナビは同期でフィルタ、記録は `Suspense` の内側で `useHistorySearch` を読む。購読だけ 250ms デバウンスする。スタイルは `src/styles.css` に `@mantine/spotlight/styles.layer.css` を追加（既存の layer 方式に合わせる）。

**テスト**: `src/components/app-spotlight.test.tsx`（開く / ナビの絞り込みと遷移 / 記録の検索と日ページへの遷移 / 1文字は検索しない / 該当なし）。`history-page.test.tsx` は検索欄が無いことを確かめる形に変えた。
