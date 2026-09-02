# 復習フラグ（#74）

- 状態: 決定済み・実装済み（2026-09-02）。地図 [#66](https://github.com/sc30gsw/cairn/issues/66)。調査 [#73](https://github.com/sc30gsw/cairn/issues/73) → [docs/research/review-flag-precedents.md](../research/review-flag-precedents.md)。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)（CVX-12 索引の重複なし、CVX-15 同一トランザクション）、[design-live-board.md](../../.claude/rules/web/design-live-board.md)、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)。
- 試作は捨てた。本書が決定の正。

## 1. 決定の要約

| 論点 | 決定 |
| --- | --- |
| 印を付ける操作 | **確定した記録だけ**。日ページの記録行（`RowEditor`）とボードのカードメニューの両方に置く（`ReviewMenuItems` を共有）。復習の記録そのものには付けない（確定すれば次の復習に進む） |
| 期日の決め方 | **固定間隔の段階リスト** `REVIEW_INTERVAL_DAYS = [1, 3, 7, 14]`（Leitner 型）。印を付けた日から 1 日後が既定。メニューで「1 / 3 / 7 / 14 日後に復習」を選び直せる（日付ピッカーは置かない）。期日は明日以降 |
| 期日到来時の並び方 | 今日を開いたとき（`days.open`）に、期日の来た復習を**その日の先頭に未着手の記録**として並べる。プリセット適用と同じ経路・同じトランザクション。項目とひとことは印を付けた時点の値を凍結して引き継ぎ、分数は 0（今日の学習量は改めて入れる） |
| 期日超過 | **今日に繰り越す**（`dueJst <= today` を全部並べる）。何日遅れたかは出さない。ストリーク・バッジ・カウントダウンは作らない |
| 元の記録との関係 | **独立した記録**。`reviewFlags` が元の記録（`sourceRowId`）と、いま並んでいる復習の記録（`reviewRowId`）を指す。復習の記録を確定すると段階が進み次の期日が決まる（その日から数える）。最後の段階を終えると印は消える。見送り・ゴミ箱で印は終わる。元の記録を消しても印は残る（内容は凍結済み） |
| 保存の場所 | 別テーブル `reviewFlags`。記録に `reviewDueJst` を持たせない（未来の暦日に日を作らない、という days の規則に触れない） |
| 語彙 | `CONTEXT.md` に「復習」を追加 |
| 見せ方 | `ReviewBadge`: 元の記録は `Badge variant="light" color="orange"`「復習 YYYY-MM-DD」、復習の記録は `variant="filled"`「復習 n/4」。印を付ける導線は `IconRepeat` の `ActionIcon` + `Menu` |

## 2. スキーマと関数

```ts
reviewFlags: defineTable({
  content: v.string(),           // 凍結したひとこと
  dueJst: v.string(),
  itemId: v.id("items"),
  ownerId: v.string(),
  reviewRowId: v.optional(v.id("rows")), // いま並んでいる復習の記録
  sourceRowId: v.id("rows"),
  stage: v.number(),             // 0..3
})
  .index("by_owner_and_dueJst", ["ownerId", "dueJst"])
  .index("by_sourceRow", ["sourceRowId"])
  .index("by_reviewRow", ["reviewRowId"]);
```

- `convex/lib/review.ts`（純関数）: `REVIEW_INTERVAL_DAYS` / `REVIEW_STAGE_COUNT` / `reviewDueJst(base, stage)` / `nextReviewStage(stage)` / `isReviewDue(due, today)` と文言
- `rowDtoValidator.review`: `{ kind: "source", dueJst, stage } | { kind: "review", stage } | null`（`toRowDtos` が所有者の印を1回読んで組む）
- `mutations/reviews/flag`（`{ rowId, todayJst, dueJst? }`）/ `mutations/reviews/unflag`（`{ rowId }`）
- `services/reviews/flag.ts`: 所有・日が生きている・確定・復習の記録でない → 既定または指定の期日（明日以降）で upsert（既存は期日だけ差し替え、段階は保つ）
- `services/reviews/placeDueReviews.ts`: `dueUnplacedFlags`（期日到来・未配置、期日の古い順）を先頭（既存の最小 sortOrder より前）に未着手で挿入し `reviewRowId` を記録
- `services/days/openDay.ts`: プリセットの有無に関わらず今日の復習を並べる。`applied` はプリセット適用の有無のまま
- `services/reviews/settleReviewRow.ts`: `advanceReviewForRow`（確定 → 段階+1・期日更新・`reviewRowId` 解除、最後なら削除）/ `endReviewForRow`（見送り・ゴミ箱 → 削除）。`rows/confirm.ts` / `skip.ts` / `remove.ts` から呼ぶ

## 3. UI

- `src/components/review-badge.tsx`（`ReviewBadge`、`reviewBadgeLabel`）、`src/components/review-menu-items.tsx`（`ReviewMenuItems`: 1/3/7/14 日後、やめる）。today と board の両 feature が使うので `src/components/` に置く
- 日ページ `row-editor.tsx`: 状態バッジの隣に `ReviewBadge`、確定行に `IconRepeat` の `ActionIcon` → `Menu`
- ボード `board-kanban.tsx` の `RecordCard`: 状態バッジの隣に `ReviewBadge`。`board-kanban-card-menu.tsx` に `ReviewMenuItems`
- `use-day-board-actions.ts` / `use-board-kanban-actions.ts`: `onFlagReview` / `onUnflagReview`（トースト「復習に回しました（期日）」「復習をやめました」）

## 4. テスト

- 純関数: `convex/lib/review.test.ts`
- 統合: `convex/reviews.test.ts`（確定だけ・既定の期日・付け直し・期日の下限・所有者分離・今日を開くと先頭に並ぶ・期日超過の繰り越し・二重配置なし・段階の進行と終了・見送り / ゴミ箱で終了）
- UI: `row-editor.test.tsx`（印と導線）、`board-kanban-card-menu.test.tsx`（復習の項目）

## 5. 端ケース

| ケース | 挙動 |
| --- | --- |
| 期日の日に今日を開かなかった | 次に今日を開いた日に並ぶ（繰り越し）。遅れは表示しない |
| 復習の記録を未着手のまま翌日になった | その記録はその日に残る（普通の未着手）。印は `reviewRowId` を指したまま → 次の期日は決まらない。見送るか確定するかで先へ進む |
| 復習の記録を確定→取り消し（未着手に戻す） | 段階はすでに進んでいる。取り消しは記録の状態だけを戻す |
| 元の記録を見送りに変えた・ゴミ箱に入れた | 印は残る（内容は凍結済み）。やめるなら「復習をやめる」 |
| 項目が消された | 記録を持つ項目は消せない（従来の規則）ので起きない |
| 同じ日に複数の復習が来た | 期日の古い順に先頭へ。既存の記録の前に並ぶ |
