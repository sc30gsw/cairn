# 目標×記録の紐付けと進捗表示（#53）

- 状態: 決定済み（2026-08-24）。実装は別セッション。
- Part of: [#47 目標階層と新機能群の仕様マップ](https://github.com/sc30gsw/cairn/issues/47)
- 参照: `CONTEXT.md`（目標 / 習得 / チェックポイント / 項目 / カテゴリ / 週間ターゲット / 学習量）、[ADR-0003](../adr/0003-process-goals-not-okr.md)、[ADR-0005](../adr/0005-goal-types-by-structure.md)、[ADR-0006](../adr/0006-checkpoints-replace-weekly-goals.md)、[ADR-0007](../adr/0007-denormalize-mastery-progress.md)、[ADR-0008](../adr/0008-hitokoto-optional-for-records.md)、[#48 目標画面の階層レイアウト](goal-hierarchy-layout.md)、[#49 親バックフィル](checkpoint-parent-backfill.md)、`.claude/rules/convex-rules.md`（CVX-01〜20）、`.claude/rules/web/design-live-board.md`、`.claude/rules/typescript/formisch.md`
- 前提（マップ・上流チケットで確定済み。本仕様では再議論しない）: 長期目標 = 期限なしの習得 / チェックポイントは必須の親を `parentGoalId` で持つ / 目標タイプは `exam` / `mastery` の2値のまま増やさない / 親の削除は子をカスケード削除 / 学習量は「確定した記録の分数合計」だけ
- 本仕様の担当範囲: **記録と目標の紐付け方式**、**目標カード側の進捗表示**、**ADR-0007 の非正規化カウンタとの整合**。タイマー（#51）・週次レビュー（#52）・月次レビュー（#54）・通知（#55）・PWA（#58）は範囲外（§19）。

---

## 1. 決定の要約

1. **紐付けの向きは「目標 → 項目集合」の1本だけ。記録側に目標欄は作らない。** 習得（長期目標・チェックポイント）が `scopeItemIds`（**対象項目**）を持ち、その項目の確定記録だけを実績に数える。`rows` のスキーマと確定フローは**一切変えない**（§3）。
2. **未指定 = すべての記録。** `scopeItemIds` を省略した目標は今と同じ「所有者の全確定記録」を数える。既存ドキュメントは省略状態なので**意味が変わらず、バックフィルも不要**（§4.3）。
3. **進捗表示は実績の併記だけ。分母は作らない。** 達成率・進捗バー・パーセンテージ・ストリークは出さない。出すのは対象項目のラベルと `確定 N分 / M日` の2値のみ（§5）。
4. **非正規化カウンタは維持する（ADR-0007 は改訂ではなく延長）。** スコープを入れると読み取り時導出はむしろ悪化する（窓が伸び続けるうえに目標ごとのフィルタが増える）ので、差分更新を**スコープ対応**にする。差分は今までどおり「書き込みの後 − 前」の実測で、測る単位を「日の合計」から「日の**項目別**合計」に一段細かくするだけ（§6・§7）。
5. **カウンタの再計算トリガは3つ。** 達成解除（既存）・修復用 internalMutation（既存）・**対象項目の変更（新規）**。対象項目を変えた保存は、その目標1件ぶんを作成日以降から数え直して同一トランザクションで書く（CVX-15）。
6. **達成済みの目標では対象項目を変更できない。** 実績は達成時点で凍結されている（ADR-0007）ので、対象を変えると凍結値の意味が壊れる。変えたいなら達成を外す（既存の解除→再計算の経路がそのまま正しい答えになる）。
7. **対象項目にしている項目は削除できない。** 記録・プリセットが使っている項目を消せないのと同じ扱い。自動で対象から外すと「最後の1件が外れた瞬間にスコープがすべての記録へ広がる」という静かな意味反転が起きるため、ブロックする（§8）。
8. **新規 public 関数は増えない。** 追加は `goals` の1フィールドと services 層の改修だけ。query / mutation の引数・返り値 validator は `convex/lib/validators.ts` 由来なので自動追随する（CVX-16）。インデックスも増やさない（CVX-12）。

---

## 2. 現状（コードから確認した事実）

| 事実 | 場所 |
| --- | --- |
| 習得目標は `confirmedMinutes` / `activeDays` を保存フィールドで持つ | `convex/lib/validators.ts`（`masteryProgressFields`） |
| 確定を動かす書き込みは全経路 `withMasteryProgressDelta` で包まれている（8経路） | `rows/{confirm,unconfirm,reopen,skip,remove,restore,copyYesterdayConfirmed}`, `trash/{removeDay,restoreDay,purgeDay}` |
| 差分は「書き込みの後 − 前」の実測。1日ぶんの確定合計（分数 + 件数）で測る | `services/goals/{withMasteryProgressDelta,loadDayTotals,masteryDayTotals}.ts` |
| 適用対象は「未達成 かつ 作成日 ≤ 記録日」の習得目標だけ | `services/goals/applyMasteryProgressDelta.ts` |
| 再計算は作成日以降の生きた記録を1トランザクションで読み直す | `services/goals/recomputeMasteryProgress{,ForOwner}.ts` |
| **記録は目標を参照していない**（`rows` は `itemId` だけを持つ） | `convex/schema.ts` |
| **記録の `itemId` は作成時に決まり、あとから変わる経路がない**（`add` / `copyYesterdayConfirmed` / `switchPreset` の insert のみ） | `services/rows/*.ts` |
| 項目削除は「使っている記録・雛形があれば拒否」。目標との関係は「目標は項目を参照しないので掃除は要らない」とコメント済み | `services/items/remove.ts` |
| 週間ターゲットは `rows → item → categoryId` を辿ってカテゴリ別に自動集計する（手入力の進捗申告なし） | `services/targets/aggregateByCategory.ts` |
| 目標カードの実績表示は `確定 {confirmedMinutes}分 / {activeDays}日` の1行 | `src/features/goals/components/mastery-goal-card.tsx` |

`rows.itemId` が不変であることは本仕様の安全性の土台になる（**記録がスコープ間を移動する経路が存在しない** = 差分の実測が項目単位でも整合する）。

---

## 3. 決定1: 紐付けは「目標 → 項目集合」の宣言。記録側に目標欄は作らない

### 3.1 決定

習得（長期目標・チェックポイント）に **対象項目**（`scopeItemIds: Id<"items">[]`）を持たせる。実績に数えるのは「対象項目に含まれる項目の確定記録」だけ。未指定はすべての記録。

記録側（`rows`）には目標参照を**追加しない**。日ページ・実行ボード・確定モーダルの入力欄は増えない。

### 3.2 なぜ記録側の明示選択を採らないか

1. **記録は実行後に確定するもの**で、ADR-0008 はまさに「毎回書くことがない欄」を必須から外した。確定のたびに「これはどの目標のためか」を選ばせるのは、同じ種類の摩擦を別の欄で再導入することになる。
2. **手入力の進捗申告をしない**のはこのアプリの一貫した方針（`CONTEXT.md`「週間ターゲット」の Avoid）。記録側の目標選択は進捗申告の一形態。
3. **1件の記録は複数の目標に効く。** 単一 FK では偽の択一を強いる。多対多にすると中間テーブル + 記録側 UI の肥大を招く。対象項目なら「同じ項目が複数の目標のスコープに入る」だけで自然に多対多になる。
4. **遡及一貫性。** 対象項目は宣言なので、変えれば作成日以降を数え直せる（§7.3）。明示選択だと過去の記録を1件ずつ編集し直す必要がある。
5. **OKR ツリー化の回避（ADR-0003）。** 記録 → 目標の明示紐付けは、記録を Key Result の実績報告に変える。宣言型スコープは目標側の集計条件にとどまる。

### 3.3 なぜカテゴリ経由ではなく項目単位か

- カテゴリは**週間ターゲットの軸**（1カテゴリ1件、`ADR-0006` でプロセス目標の担い手として一本化した）。目標のスコープを同じ軸に置くと、2つの機構が同じ粒度で並走して見分けがつかなくなる。
- 粒度が粗すぎる。「Part5 を10分で解ける」に対して `TOEIC対策` 丸ごとは較正の役に立たない（Kruger & Dunning の較正という目的に反する）。
- **差分適用のホットパスでカタログを読まなくて済む。** `rows` は `itemId` を直接持つので、項目スコープなら確定のたびの追加読み取りが**ゼロ**。カテゴリスコープだと `item → categoryId` の解決（`loadCatalog` = 2 collect）が全確定経路に乗る。
- 項目のカテゴリを付け替えてもスコープが動かない（安定）。

UI ではカテゴリ見出し付きの `MultiSelect` にするので、「カテゴリの項目をまとめて選ぶ」は数クリックで済む（§9.2）。

### 3.4 記録側から目標を見る導線（既存のまま）

記録側で目標が見えないわけではない。実行ボードが「障害プランの then と直近チェックポイント」を出す（`CONTEXT.md`「実行ボード」）。これが記録側の目標可視化であり、本仕様では触らない。

---

## 4. スキーマ変更（CVX-10/11/12/13/16）

### 4.1 `convex/lib/validators.ts`

```ts
//? 期限を持つ習得が「チェックポイント」。別タイプではないので枝は増やさない(docs/adr/0006)。
//? 期限と親は同時に存在する(INV-1)。片方だけの状態は services 層で弾く(#48)。
const masteryGoalInputFields = v.object({
  content: v.string(),
  criterion: v.string(),
  deadline: v.optional(v.string()),
  parentGoalId: v.optional(v.id("goals")),
  //? 実績に数える記録の範囲(対象項目)。省略 = すべての記録(ADR-0007 の元の意味そのまま)。
  //? 空配列は services 側で省略に畳むので、保存済みドキュメントに [] は現れない。
  scopeItemIds: v.optional(v.array(v.id("items"))),
  type: v.literal(masteryType),
});
```

派生する `masteryGoalFields` / `masteryGoalDocumentFields` / `goalDocumentValidator` / `goalDtoValidator` / `goalInputValidator` は既存の `.extend` 連鎖のままで `scopeItemIds` が自動で流れる（CVX-16: 形の SSoT は validators.ts の1箇所）。**DTO には項目名を載せない** — 名前はクライアントが `items.list` から引く（重複した真実を作らない）。

### 4.2 `convex/schema.ts`

**変更なし。インデックスも追加しない（CVX-12）。**

- 目標 → 記録の方向は「目標ドキュメントの `scopeItemIds` を読んで、既に読んだ rows を TS で絞る」だけなので索引は不要。
- 記録 → 目標の方向のクエリは**存在しない**（差分適用は所有者の習得目標を `by_owner_and_type` で引いて TS で判定する。1所有者の習得目標は数件）。
- 項目削除ガード（§8）も同じ `by_owner_and_type` を使う。`.filter` は書かない（CVX-10）。

### 4.3 移行

**バックフィル不要。** 追加は optional フィールド1つで、既存ドキュメントは「省略 = すべての記録」= 現在の意味と完全に一致する。保存済みカウンタの値も正しいまま（§7.4 の再計算は不要）。

### 4.4 #49 Phase 5（習得の2枝 union）との整合

`docs/specs/checkpoint-parent-backfill.md` §3.2 の最終形では習得が2枝に割れる。`scopeItemIds` は**期限の有無と無関係**なので、両枝が共有する `masteryCoreFields` に置く。

```ts
const masteryCoreFields = {
  content: v.string(),
  criterion: v.string(),
  //? 対象項目は区分(長期目標 / チェックポイント)に関係なく持つ。両枝が共有する(#53)。
  scopeItemIds: v.optional(v.array(v.id("items"))),
  type: v.literal(masteryType),
};
```

### 4.5 `convex/lib/domain.ts`（メッセージの SSoT）

```ts
//* 対象項目(習得が実績に数える記録の範囲)の検証メッセージ。services と Valibot が共有する(CVX-16)。
export const GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE = "選べない項目が含まれています";
export const GOAL_SCOPE_FROZEN_MESSAGE =
  "達成済みの目標では対象項目を変えられません。達成を外してから変更してください";
```

項目削除ガードの文言は `services/items/remove.ts` のローカル文字列（隣の「使っている行または雛形がある項目は消せません」と同じ扱い。UI 側が参照しないので SSoT にしない）。

---

## 5. 決定2: 進捗表示は実績の併記だけ。分母を作らない

### 5.1 出すもの

| 表示 | 値 | 出す場所 |
| --- | --- | --- |
| 対象項目 | `すべての記録` / 項目名の列挙 | 親カード（長期目標）本体・編集フォーム |
| 対象項目（短縮） | `すべて` / `金フレ` / `金フレ +2` | チェックポイント行・達成履歴行 |
| 学習量の実績 | `確定 {confirmedMinutes}分 / {activeDays}日` | 既存の位置（#48 §7.3.2 の行末） |

### 5.2 出さないもの（理由つき）

- **達成率・進捗バー・パーセンテージ**: 習得は非数値・自己判定の目標であり、分母を作ると ADR-0005 が削除した「達成量タイプ」を裏口から復活させることになる。
- **学習量からの自動達成・自動失敗**: `CONTEXT.md`「習得」の Avoid そのまま。
- **ストリーク・トレンド**: ADR-0006 で全廃した機構。
- **目標ごとの「今週の実績」**: 週間ターゲットの担当（ADR-0006 の一本化）。必要なら週次レビュー（#52）が扱う。

実績はあくまで**自己判定の較正の材料**（Kruger & Dunning 1999; Li & Zhang 2021）であり、判定機構ではない。スコープを入れる目的も「較正の材料の精度を上げる」ことに限られる。

---

## 6. 決定3: 非正規化カウンタは維持する（ADR-0007 の延長）

### 6.1 導出に戻さない理由

ADR-0007 が導出をやめたのは「集計窓の下端（作成日）が固定で上端（今日）が毎日進むため、読み取り量が未達成目標の寿命に比例して単調増加し、rows への全書き込みが `goals.list` の購読を再実行させる」から。**スコープを入れてもこの構造は変わらず、目標ごとのフィルタが1段増えるだけ**なので、導出に戻す理由はどこにもない。カウンタ維持は ADR-0007 の再確認であり、改訂ではない。

### 6.2 代償と修復可能性（ADR-0007 と同じ）

非正規化の代償は「書き込み経路の網羅漏れ = 表示が静かに狂う」。本仕様はその代償を増やさない:

- 差分を出す**単位**を「日の合計」から「日の項目別合計」に細かくするだけで、**経路は1本も増えない**（`withMasteryProgressDelta` が唯一の入口という性質を維持）。
- 差分は引き続き「書き込みの後 − 前」の実測。想定した増減を渡す形にはしない。
- 修復手段（`internal.mutations.goals.recomputeMasteryProgress`）はスコープを読んで数え直すので、そのまま修復手段として機能する。

### 6.3 早期リターンの安全性（重要）

現在の `applyMasteryProgressDelta` は「日の合計に差が無ければ何もしない」で早期リターンしている。スコープ導入後、この判定を**日の合計**で行うのは危険（同じ日に別項目の確定が入れ替わると合計は同じでも各スコープの値は動く。`copyYesterdayConfirmed` は1トランザクションで複数行を書くので実際に起こりうる）。

早期リターンの条件を**項目別合計の一致**に置き換える（純関数 `sameItemTotals`）。項目別合計が完全一致するなら、どのスコープでも部分和は一致する — これは証明できる十分条件。

---

## 7. 関数サーフェス（CVX-20: 1関数1ファイル）

### 7.1 純関数（`convex/services/goals/masteryDayTotals.ts` の改修）

```ts
export type ConfirmedDayTotals = Pick<MasteryProgress, "confirmedMinutes"> &
  Record<"confirmedCount", number>;                       //? 既存のまま

//* 1暦日の「項目別」確定実績。スコープの部分和を取れる最小の形(CVX-09: 純関数)。
export type ItemConfirmedTotals = ReadonlyMap<Id<"items">, ConfirmedDayTotals>;

type DayRow = Pick<Doc<"rows">, "deletedAt" | "itemId" | "minutes" | "status">;

//* confirmedDayTotals の後継。日がゴミ箱にあれば空(history/shared.ts の liveRows と同じ規則)。
export function confirmedTotalsByItem(
  rows: readonly DayRow[],
  hasLiveDay: boolean,
): ItemConfirmedTotals;

//* 早期リターンの十分条件。項目別合計が完全一致なら、どのスコープの部分和も一致する。
export function sameItemTotals(before: ItemConfirmedTotals, after: ItemConfirmedTotals): boolean;

//* 対象項目で絞った日合計。scopeItemIds が undefined ならすべての項目を足す(= 旧 confirmedDayTotals)。
export function scopedDayTotals(
  totals: ItemConfirmedTotals,
  scopeItemIds: readonly Id<"items">[] | undefined,
): ConfirmedDayTotals;

//* 対象項目の正規化。重複を落とし、空は undefined に畳む(保存形の一意性を services 側で保証する)。
export function normalizeScopeItemIds(
  scopeItemIds: readonly Id<"items">[] | undefined,
): Id<"items">[] | undefined;

//* 対象項目が同じか(順序・重複を無視した集合比較。undefined と [] は同じ「すべての記録」)。
export function sameScopeItemIds(
  left: readonly Id<"items">[] | undefined,
  right: readonly Id<"items">[] | undefined,
): boolean;

//? 無変更: activeDayDelta / masteryProgressDelta / shiftMasteryProgress / initialMasteryProgress
//? 削除: confirmedDayTotals(confirmedTotalsByItem + scopedDayTotals が継ぐ)
```

`normalizeScopeItemIds` / `sameScopeItemIds` は対象項目そのものの純関数なので、`masteryDayTotals.ts` ではなく **`convex/services/goals/scopeItemIds.ts`** に置く（日合計の計算とは別の関心事）。

`convex/services/goals/masteryProgress.ts` の `masteryProgressSince` に対象項目を渡す:

```ts
type DatedRow = Pick<Doc<"rows">, "dateJst" | "itemId" | "minutes" | "status">;

//* 目標を作った日以降・対象項目内の確定分数と実施日数(CVX-09: 純関数)。
export function masteryProgressSince(
  rows: readonly DatedRow[],
  sinceDateJst: string,
  scopeItemIds: readonly Id<"items">[] | undefined,
): MasteryProgress;
```

### 7.2 ctx ヘルパ（新規）

| ファイル | 内容 |
| --- | --- |
| `convex/services/goals/loadDayItemTotals.ts` | `loadDayTotals` の後継。`(ctx, ownerId, dateJst) => Promise<ItemConfirmedTotals>`。中身は既存どおり `loadLiveRows` を1日に閉じて呼び、`confirmedTotalsByItem` に通すだけ（読み取り量は不変） |
| `convex/services/goals/countMasteryProgress.ts` | `(ctx, ownerId, args: { since: string; scopeItemIds?: readonly Id<"items">[] }) => Promise<MasteryProgress>`。`loadLiveRows(from: since)` → `masteryProgressSince`。再計算と対象項目変更が共有する唯一の数え直し口 |
| `convex/services/goals/assertScopeItems.ts` | `(ctx: MutationCtx, ownerId: string, scopeItemIds: readonly Id<"items">[] \| undefined) => Promise<null>`。各 id を `ctx.db.get("items", id)` で引き、`null` または他人の項目なら `GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE`（IDOR 防止 + dangling id 防止。件数は正規化後の数件なので `Promise.all` で足りる） |
| `convex/services/goals/assertScopeUnfrozen.ts` | `(existing: Doc<"goals">, next: GoalInput) => null`（純関数）。`existing.achievedAt !== undefined` かつ対象項目が変わるなら `GOAL_SCOPE_FROZEN_MESSAGE` |

上限件数のチェックは置かない。正規化で重複が落ち、全 id が所有者の項目であることを検査するので、集合の大きさはカタログの項目数で自然に上限される。

### 7.3 既存 services の改修

```ts
// convex/services/goals/withMasteryProgressDelta.ts
const before = await loadDayItemTotals(ctx, ownerId, dateJst);
// oxlint-disable-next-line react-doctor/server-sequential-independent-await
const result = await write();
const after = await loadDayItemTotals(ctx, ownerId, dateJst);
await applyMasteryProgressDelta(ctx, ownerId, { after, before, dateJst });
return result;
```

呼び出し側（`rows/*` 8経路・`trash/*` 3経路）は**引数も呼び方も変わらない**。

```ts
// convex/services/goals/applyMasteryProgressDelta.ts
export async function applyMasteryProgressDelta(ctx, ownerId, args): Promise<null> {
  //? 項目別合計が一致するなら、どのスコープの部分和も動かない(§6.3)。goals を読まずに帰る。
  if (sameItemTotals(args.before, args.after)) {
    return null;
  }
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();
  await Promise.all(
    goals.flatMap((goal) => {
      if (
        goal.type !== "mastery" ||
        goal.achievedAt !== undefined ||
        creationDateJst(goal._creationTime) > args.dateJst
      ) {
        return [];
      }
      //? 差分は目標ごとに「その目標の対象項目に絞った後 − 前」。全体の差分は使わない。
      const delta = masteryProgressDelta(
        scopedDayTotals(args.before, goal.scopeItemIds),
        scopedDayTotals(args.after, goal.scopeItemIds),
      );
      return delta.activeDays === 0 && delta.confirmedMinutes === 0
        ? []
        : [ctx.db.patch("goals", goal._id, shiftMasteryProgress(masteryProgressOf(goal), delta))];
    }),
  );
  return null;
}
```

```ts
// convex/services/goals/create.ts（mastery 分岐）
//? 学習量の実績は作成日を起点にする。作成と同じ暦日に既にある確定は実績に入る(ADR-0007)。
//? 対象項目で絞ってから初期値にする。mutation なので Date.now() を読んでよい(CVX-14)。
const scopeItemIds = normalizeScopeItemIds(goal.scopeItemIds);
await assertScopeItems(ctx, ownerId, scopeItemIds);
const totals = await loadDayItemTotals(ctx, ownerId, todayJst());
const progress = initialMasteryProgress(scopedDayTotals(totals, scopeItemIds));
return await ctx.db.insert(
  "goals",
  toGoalDocument({ ...goal, ...progress, scopeItemIds }, ownerId),
);
```

```ts
// convex/services/goals/update.ts（mastery 分岐）
assertScopeUnfrozen(existing, goal);                       //? 達成済みは対象項目を凍結(§7.2)
const scopeItemIds = normalizeScopeItemIds(goal.scopeItemIds);
await assertScopeItems(ctx, ownerId, scopeItemIds);
//? 対象項目が変わると窓の中身が変わるので、差分では追随できない。1件ぶんを数え直して
//? 同じ replace に載せる(CVX-15: 書き込みは1回。読み直しも1回に抑える)。
const progress = sameScopeItemIds(existing.scopeItemIds, scopeItemIds)
  ? masteryProgressOf(existing)
  : await countMasteryProgress(ctx, ownerId, {
      since: creationDateJst(existing._creationTime),
      scopeItemIds,
    });
await ctx.db.replace("goals", existing._id, {
  ...toGoalDocument({ ...goal, ...progress, scopeItemIds }, ownerId),
  achievedAt: existing.achievedAt,
});
```

```ts
// convex/services/goals/recomputeMasteryProgress.ts（達成解除 / 修復）
const since = creationDateJst(goal._creationTime);
await ctx.db.patch(
  "goals",
  goal._id,
  await countMasteryProgress(ctx, goal.ownerId, { since, scopeItemIds: goal.scopeItemIds }),
);
```

```ts
// convex/services/goals/recomputeMasteryProgressForOwner.ts（所有者ぶんの修復）
//? 目標ごとに rows を読み直さない性質は維持する。いちばん古い作成日から一度だけ読み、
//? 各目標の起点と対象項目で純関数側に絞らせる(CVX-11)。
const targets = goals.flatMap((goal) =>
  goal.type === "mastery" && goal.achievedAt === undefined
    ? [{ goalId: goal._id, scopeItemIds: goal.scopeItemIds, since: creationDateJst(goal._creationTime) }]
    : [],
);
// ...
await Promise.all(
  targets.map(({ goalId, scopeItemIds, since }) =>
    ctx.db.patch("goals", goalId, masteryProgressSince(rows, since, scopeItemIds)),
  ),
);
```

```ts
// convex/services/goals/toGoalDto.ts（mastery 分岐に1行）
scopeItemIds: goal.scopeItemIds,   //? 名前は載せない。クライアントが items.list から引く(§18-18)
```

### 7.4 query / mutation 層（無変更）

`convex/queries/goals/list.ts`、`convex/mutations/goals/{create,update,setAchieved,remove,recomputeMasteryProgress}.ts` は**1行も変えない**。args / returns の validator が `validators.ts` 由来なので `scopeItemIds` が自動で流れる（CVX-03/04 は `ownerQuery` / `ownerMutation` が既に満たしている）。`Date.now()` を読む query は増えず（CVX-14）、scheduler / crons は関与しない（CVX-05）。`ctx.run*` も使わない（CVX-08）。

### 7.5 再計算トリガと読み取り量（CVX-11）

| トリガ | 範囲 | 頻度 |
| --- | --- | --- |
| 確定を動かす書き込み（8+3経路） | その暦日の rows + days のみ（**現状と同じ**） | 高 |
| 対象項目の変更（`update`） | その目標の作成日以降の生きた記録を1回 | 低（編集フォームの保存時のみ、かつ対象項目を変えたときだけ） |
| 達成解除（`setAchieved`） | 同上（既存） | 低 |
| 修復（`internalMutation`） | 所有者の最古の作成日以降を1回（既存） | 極低 |

対象項目の変更を「所有者ぶんまとめて再計算」で済ませない理由は §18-6。上端を開いた範囲読みが目標の寿命とともに増える点は ADR-0007 が既に受容した判断で、トリガが1つ増えても性質は変わらない。

---

## 8. 項目・カテゴリの削除との相互作用

```ts
// convex/services/items/remove.ts
//? 対象項目にしている目標があれば消せない。自動で対象から外すと、最後の1件が外れた瞬間に
//? スコープが「すべての記録」へ静かに広がり、カウンタの意味が反転する(#53)。
const masteryGoals = await ctx.db
  .query("goals")
  .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
  .collect();
if (masteryGoals.some((goal) => goal.type === "mastery" && goal.scopeItemIds?.includes(args.itemId))) {
  throwDomain(new ConflictError({ message: "対象項目にしている目標がある項目は消せません" }));
}
```

- 既存コメント「目標は項目を参照しないので、掃除は要らない」は削除する（本仕様で偽になる）。
- 順序: 既存の rows / presets ガードの**後**に置く。より一般的な理由（記録が使っている）を先に見せる。
- カテゴリ削除は変更なし。項目が残っているカテゴリは消せないので、対象項目に残った項目が経路上に現れない。
- 項目の**改名**は id が変わらないので影響なし。項目の**カテゴリ付け替え**も影響なし（§3.3 の安定性）。

---

## 9. UI 構造（Mantine 優先 / Paper Redesign）

### 9.1 表示

`#48` が固定したレイアウト位置の**中身の定義**を本仕様が埋める（#48 §16 の引き渡し）。

チェックポイント行（`checkpoint-row.tsx`。#48 §7.3.2 の行末を差し替え）:

```tsx
<Tooltip disabled={scope.itemCount === 0} label={scope.full} withArrow>
  <Text c="dimmed" data-shimmer-no-children ff={NUMERAL_FONT} size="xs">
    {scope.itemCount === 0 ? "" : `${scope.short}・`}確定 {goal.confirmedMinutes}分 /{" "}
    {goal.activeDays}日
  </Text>
</Tooltip>
```

親カード本体（`MasteryGoalBody`。長期目標）:

```tsx
<Text c="dimmed" size="xs">
  対象: {scope.full}
</Text>
<Text c="dimmed" ff={NUMERAL_FONT} size="xs">
  確定 {goal.confirmedMinutes}分 / {goal.activeDays}日
</Text>
```

達成履歴行（`AchievedRow`）は行と同じ形。凍結された実績なので、その時点の対象項目のまま表示する。

```
╭─ 長期目標 ─────────────────────────────────────────────╮
│ ☐ Distinction の例文を口頭で言い切る          [✎] [🗑] │
│   基準: 3秒以内に例文を口に出せる                       │
│   対象: Distinction / 音読パッケージ                    │
│   確定 90分 / 2日                                      │
│  ┆ チェックポイント (2)                      [+ 追加]  │
│  ┆ ☐ Unit 1-10 を音読する   期限 08-30(あと6日)         │
│  ┆   基準: 止まらずに音読できる  金フレ +1・確定 180分 / 4日 │
│  ┆ ☐ 例文100本を口頭で言う  期限 09-06(あと13日)        │
│  ┆   基準: 3秒以内に言える      すべて・確定 240分 / 6日 │
╰────────────────────────────────────────────────────────╯
```

- 数値（分数・日数・件数・日付）は `NUMERAL_FONT`。対象項目のラベルは本文フォント。
- 色は `--cairn-*` と Mantine テーマのみ。ハードコード hex は書かない。ライトのみ（ダーク分岐なし）。
- スケッチ枠・紙影は親カードとボタンだけ（#48 の原則を維持）。対象項目に `Badge` は使わない（`Badge` は期限超過・達成済みに予約済み）。
- `Tooltip` は補助であり、必須情報を含めない（項目数は `short` に見える。全項目名は親カードと編集フォームで読める）。タッチ端末で `Tooltip` が出ない前提を許容する。

### 9.2 純関数（`src/features/goals/lib/goal-scope.ts`）

```ts
export const ALL_RECORDS_LABEL = "すべての記録";
export const ALL_RECORDS_SHORT = "すべて";

export type GoalScopeLabel = { full: string; itemCount: number; short: string };

//? items は sortOrder 昇順で渡ってくる(items.list の並び)。表示順はその順に従う
export function goalScopeLabel(
  scopeItemIds: readonly ItemId[] | undefined,
  items: readonly ItemDto[],
): GoalScopeLabel;

//? カテゴリ見出し付きの MultiSelect データ。空グループは含めない
export function goalScopeOptions(
  items: readonly ItemDto[],
  categories: readonly CategoryDto[],
): ComboboxData;

//? MultiSelect が返すのはただの文字列。一覧から引き当てて Id のブランドを取り戻す(as は書かない)
export function resolveScopeItemIds(
  values: readonly string[],
  items: readonly ItemDto[],
): { itemIds: ItemId[]; unresolved: string[] };
```

`goalScopeLabel` の規則:

| 入力 | `full` | `short` | `itemCount` |
| --- | --- | --- | --- |
| `undefined` / `[]` | `すべての記録` | `すべて` | `0` |
| 1件（解決可） | `金フレ` | `金フレ` | `1` |
| 3件（解決可） | `金フレ / 公式問題集 / 特急` | `金フレ +2` | `3` |
| 2件（うち1件が未解決） | `金フレ / 不明な項目1件` | `金フレ +1` | `2` |
| 1件（未解決のみ） | `不明な項目1件` | `不明な項目1件` | `1` |

未解決は項目削除ガード（§8）があるので通常起きない。別デバイスでの操作や楽観キャッシュのズレに対する安全網。

### 9.3 データの供給

- `src/hooks/use-items-list.ts`（**新規・共有**）: `useSuspenseQuery(convexQuery(api.queries.items.list.list, {}))` のラッパ。goals feature は他 feature の hooks を import できない（`vite.config.ts` の `no-restricted-imports`）ため、共有層に置く。3箇所目の需要が出たので AHA の条件を満たす — 既存の `src/features/catalog/hooks/catalog-queries.ts` と `src/features/today/hooks/day-queries.ts` の `useItemsList` はこの共有版へ委譲する。
- `GoalsPage` が `useItemsList()` を呼び、`GoalsBoard` に `items` を渡す。`GoalsBoard` は `ParentGoalGroup` / `CheckpointRow` / `AchievedRow` / フォームへ流す。
- `goals-shimmer-template.ts` に `goalsShimmerItems`（2件、カテゴリ2つに分属）を追加し、テンプレートの習得目標1件に `scopeItemIds` を1件持たせる（読み込み後のガタつきを消す。#48 §7.6 の更新に本項を足す）。

---

## 10. フォーム（Valibot / Formisch）

### 10.1 対象項目は Formisch のストアに載せない

Formisch の `Field` は単一値の入力を前提とし、配列は繰り返しフィールド群（`FieldArray`）向けの機構。`MultiSelect` の値（`string[]`）は1つの入力の値なのでどちらにも素直に乗らない。対象項目には**クロスフィールド検証が無い**（所有者チェックはサーバの責務）ので、`TargetForm` が `categoryId` を `useState` で持っているのと同じ形にする。

```tsx
// src/features/goals/components/goal-form-fields.tsx（MasteryGoalFields）
const [scopeValues, setScopeValues] = useState<string[]>(masteryGoal?.scopeItemIds ?? parentScope);
const [scopeError, setScopeError] = useState<string>();

<MultiSelect
  clearable
  data={goalScopeOptions(items, categories)}
  description={GOAL_SCOPE_HINT}
  //? 達成済みは実績が凍結されている。対象を変えると凍結値の意味が壊れる(#53 §7.2)
  disabled={masteryGoal?.achievedAt !== undefined}
  error={scopeError}
  label="実績に数える項目"
  onChange={setScopeValues}
  placeholder={ALL_RECORDS_LABEL}
  searchable
  value={scopeValues}
/>
```

送信時に引き当ててから既存の `onSubmit` に混ぜる:

```tsx
<Form
  of={form}
  onSubmit={(output) => {
    const { itemIds, unresolved } = resolveScopeItemIds(scopeValues, items);
    if (unresolved.length > 0) {
      setScopeError(GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE);
      return;
    }
    onSubmit({
      ...output,
      scopeItemIds: itemIds.length === 0 ? undefined : itemIds,
      type: "mastery",
    });
  }}
>
```

- 達成済みの目標では `disabled` に加えて `description` を `GOAL_SCOPE_FROZEN_HINT`（「達成を外すと変更できます」）に差し替える。サーバも `GOAL_SCOPE_FROZEN_MESSAGE` で拒否する（UI だけの防御にしない）。
- 新規チェックポイントの初期値は**親の対象項目**（親が長期目標のときのみ。本番目標は対象項目を持たないので空）。継承は初期値のコピーであり、以後は連動しない。
- 新規長期目標・新規チェックポイント・編集の3フォームすべてに出す（対象を決めるのに編集画面へ二度行かせない）。本番目標のフォームには出さない（実績の併記を持たない）。

### 10.2 Valibot と送信ペイロードの型

`GoalSchema`（送信ペイロードの SSoT）の習得の枝に `scopeItemIds` を足す — ただし**フォーム3種のフィールドスキーマには足さない**（ストアに載せないため）。

```ts
// src/features/goals/schemas/goal-schema.ts
//? 対象項目はフォームストアの外(useState)にあるので、フィールドスキーマではなく
//? 送信ペイロードのスキーマにだけ現れる。空配列は undefined に畳む(サーバの正規化と同じ規則)。
const ScopeItemIdsSchema = v.optional(
  v.pipe(
    v.array(v.string()),
    v.transform((values) => (values.length === 0 ? undefined : values)),
  ),
);
```

**#48 §9.1 への補足**: `GoalFormOutput = v.InferOutput<typeof GoalSchema>` は `parentGoalId` / `scopeItemIds` を素の `string` で持つため、そのまま `mutations.goals.create` の引数には渡せない（`Id<"goals">` / `Id<"items">` のブランドが無い）。送信ペイロードの型は Convex から引く形に直す（CVX-16: 形の SSoT はサーバ側の validator）。

```ts
// src/features/goals/types/mutations.ts
export type CreateGoalInput = FunctionArgs<typeof api.mutations.goals.create.create>;
//? フォームが onSubmit で渡す形。ブランド付き Id を持つのでそのまま mutation に流せる
export type GoalInputPayload = CreateGoalInput["goal"];
```

`GoalFieldsProps.onSubmit` / `useGoalsBoardActions.onCreateGoal` の型を `GoalInputPayload` に差し替える（`GoalFormOutput` はフォーム内部の型として残す）。

### 10.3 語（`goal-form-copy.ts`）

```ts
export const GOAL_SCOPE_HINT = "未選択のままにすると、すべての確定記録を数えます";
export const GOAL_SCOPE_FROZEN_HINT = "達成を外すと、対象項目を変更できます";
```

---

## 11. 端ケース一覧（実装時に迷わないための決定表）

| ケース | 決定 |
| --- | --- |
| 対象項目が未指定 | すべての確定記録を数える（既存と同じ）。行のラベルは出さず `確定 N分 / M日` のみ |
| 対象項目の項目に記録が1件も無い | 実績は `0分 / 0日`。警告は出さない（対象を絞った直後の正常な状態） |
| 対象項目を絞った | その目標だけ作成日以降を数え直す。他の目標は触らない |
| 対象項目を広げた（項目を追加 / 全解除） | 同じく数え直す。全解除 = すべての記録に戻る（`undefined` に畳む） |
| 対象項目の選択順を変えただけ / 重複を送った | `sameScopeItemIds` が同一と判定し、数え直さない（保存値は正規化後の形） |
| 達成済みの目標の対象項目を変えようとした | フォームは `disabled`、サーバは `GOAL_SCOPE_FROZEN_MESSAGE`。内容・基準・期限の編集は従来どおり可 |
| 達成を外した | 既存の再計算が走る。**そのときの対象項目で**数え直され、現在進行形に戻る |
| 他人の項目 id を対象項目に送った | `assertScopeItems` が `GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE`（IDOR） |
| 存在しない項目 id を送った | 同じ（`ctx.db.get` が `null`） |
| 対象項目にしている項目を削除しようとした | `ConflictError`。先に目標の対象項目から外す |
| 対象項目の項目を改名 / カテゴリ付け替え | 実績は不変（id 参照）。ラベルだけ追随する |
| 対象外の項目の記録を確定 | そのスコープを持つ目標のカウンタは動かない。項目別合計が変わるので早期リターンには入らず、他のスコープの目標は正しく動く |
| 0分の確定記録が対象項目にある | 実施日 +1、分数 +0（既存の数え方のまま） |
| 同じ日に対象内と対象外の確定を1トランザクションで入れ替え（`copyYesterdayConfirmed`） | 項目別合計で測るので各スコープの増減が正しく出る（§6.3） |
| 日をゴミ箱に入れた / 戻した | その暦日が丸ごと実績から出入りする（既存規則）。スコープでの絞り込みも同じ規則に従う |
| ゴミ箱の記録を完全削除（`purgeRow`） | 実測を挟まない既存の扱いのまま（前後どちらも実績の外） |
| 未解決の項目 id がラベルに現れた | `不明な項目N件` と表示し、編集フォームでは選択肢に出ない（値が消える）。保存すると id が落ちる |
| チェックポイントの親と対象項目が食い違う | 許す（親子は表示の階層、対象項目は集計条件で独立した関心事）。警告も出さない |
| 本番目標 | 対象項目を持たない。カードに実績の併記も出さない（既存のまま） |

---

## 12. テスト

### 12.1 純関数（Node プロジェクト: `convex/lib/**` 相当は `convex-lib`、それ以外は `convex-integration`）

`convex/services/goals/masteryDayTotals.test.ts`（既存に追記）:

1. `confirmedTotalsByItem`: 確定だけを項目別に数える / 削除済み行を無視 / 日がゴミ箱なら空 / 0分の確定も件数1。
2. `sameItemTotals`: 同一なら true / 分数だけ違う・件数だけ違う・キーが増えた・キーが減った でそれぞれ false。
3. `scopedDayTotals`: `undefined` は全項目の合計（旧 `confirmedDayTotals` と一致）/ 指定項目のみ / 該当なしはゼロ。

`convex/services/goals/scopeItemIds.test.ts`（新規）:

4. `normalizeScopeItemIds`: 重複を落とす / 空は `undefined` / `undefined` はそのまま。
5. `sameScopeItemIds`: 順序違いは同一 / 重複違いは同一 / `undefined` と `[]` は同一 / 要素が違えば別。

`convex/services/goals/masteryProgress.test.ts`（既存に追記）:

6. `masteryProgressSince` にスコープを渡すと、対象外の確定が分数にも実施日にも入らない。

### 12.2 Convex 統合（`convex-test` + `t.withIdentity`。CVX-19）

7. 対象項目つきで作成すると、作成日の**対象内**確定だけが初期値になる。
8. 対象内の記録を確定 → カウンタが増える。**対象外**を確定 → 増えない。
9. 対象外の確定を取り消し / 見送り / 削除 / 復元 → 対象つき目標のカウンタは動かない（漂流しない）。
10. `copyYesterdayConfirmed` で対象内・対象外が混ざった複数行を1トランザクションで入れたとき、対象内だけが増える（§6.3 の回帰テスト）。
11. 対象項目を絞る `update` → 作成日以降で数え直される。広げる `update` → 同じく数え直される。
12. 順序だけ変えた `update` → カウンタが変わらない。
13. 達成済み目標の対象項目変更 → `GOAL_SCOPE_FROZEN_MESSAGE`。内容だけの編集は成功し、実績は据え置き（ADR-0007 の凍結の回帰）。
14. 達成解除 → そのときの対象項目で数え直される。
15. 他人の項目 id / 存在しない id を対象項目に指定 → 拒否。
16. 対象項目にしている項目の削除 → `ConflictError`。目標から外すと削除できる。
17. 日をゴミ箱に入れる / 戻すで、対象つき目標の実施日が ±1 する。
18. `internal.mutations.goals.recomputeMasteryProgress` が、対象項目つき目標をスコープ込みで数え直す（漂流させてから修復されることを確認）。
19. 既存の回帰: 対象項目なしの目標が従来どおり全記録を数える。

### 12.3 UI（`renderWithMantine`）

20. 対象項目なしの行は `確定 …分 / …日` だけを出す（`すべて` の接頭辞を出さない）。
21. 対象項目1件で項目名が出る。3件で `{先頭} +2` が出る。親カードには全項目名が出る。
22. 編集フォームの `MultiSelect` がカテゴリ見出し付きで、既存の対象項目が選択済みで開く。
23. 達成済み目標の編集フォームでは `MultiSelect` が `disabled` で、理由の説明が出る（`getByLabelText(/実績に数える項目/)` の `disabled`）。
24. 新規チェックポイントを長期目標から開くと、親の対象項目が初期選択されている。
25. 進捗バー・パーセンテージが**存在しない**（`queryByRole("progressbar")` が `null`）。

---

## 13. 変更ファイル一覧

**Convex**

- 変更: `convex/lib/validators.ts`（`scopeItemIds`）, `convex/lib/domain.ts`（メッセージ2つ）, `convex/services/goals/{withMasteryProgressDelta,applyMasteryProgressDelta,masteryDayTotals,masteryProgress,create,update,recomputeMasteryProgress,recomputeMasteryProgressForOwner,toGoalDto}.ts`, `convex/services/items/remove.ts`
- 新規: `convex/services/goals/{loadDayItemTotals,countMasteryProgress,assertScopeItems,assertScopeUnfrozen,scopeItemIds}.ts` + 各テスト
- 削除: `convex/services/goals/loadDayTotals.ts`（`loadDayItemTotals` が継ぐ）、`masteryDayTotals.ts` の `confirmedDayTotals`
- 無変更: `convex/schema.ts`（インデックス追加なし）, `convex/queries/goals/*`, `convex/mutations/goals/*`, `convex/services/rows/*`, `convex/services/trash/*`

**フロント**

- 新規: `src/hooks/use-items-list.ts`, `src/features/goals/lib/goal-scope.ts`（+ test）
- 変更: `src/features/goals/components/{goals-page,goals-board,goal-form-fields,checkpoint-row,mastery-goal-card,achieved-history-section}.tsx`, `src/features/goals/schemas/goal-schema.ts`, `src/features/goals/lib/{goal-form-copy,goals-shimmer-template}.ts`, `src/features/goals/types/mutations.ts`, `src/features/goals/hooks/use-goals-board-actions.ts`, `src/features/catalog/hooks/catalog-queries.ts`, `src/features/today/hooks/day-queries.ts`
- 実装後: `vp check` / `vp test` / `vp run fallow`（`confirmedDayTotals` / `loadDayTotals` の未使用 export 確認）/ `vp build`

**ドキュメント**（実装セッションが同時に反映する）

- `CONTEXT.md`: 「対象項目」の新規追加、「習得」への追記（§14）
- `docs/adr/0007-denormalize-mastery-progress.md`: 追記（§15）

---

## 14. 語彙（`CONTEXT.md` 追記案）

```
**対象項目**:
習得（長期目標・チェックポイント）が実績に数える記録の範囲。項目の集合で表し、未指定はすべての記録。
記録の項目がこの集合にあれば、その確定分数と実施日が実績に入る。記録の側で目標を選ぶことはしない。
達成済みの目標では実績が凍結されているので変更できない（達成を外せば変更できる）。
対象項目にしている項目は削除できない。
_Avoid_: 記録ごとに目標を選ぶこと, カテゴリ単位の指定, 進捗の手入力申告, 達成率・進捗バーの分母,
対象外の記録を未達に数えること
```

「習得」への追記: 「自己判定の較正のため、**対象項目の**学習量の実績を併記する。」

**注意（#50 の取りこぼし）**: `CONTEXT.md` の「チェックポイント」項は依然として「本番目標とはデータ上独立で、画面の配置だけが従属する」「_Avoid_: 本番目標とのデータ上の親子」と書かれており、ADR-0006 の改訂（2026-08-24）と矛盾している。本仕様の実装セッションで気づいたら合わせて直す（本仕様の決定には影響しない）。

---

## 15. ADR-0007 追記案

```
## 追記（2026-08-24）: カウンタは「対象項目に絞った実績」を持つ（#53）

習得目標が対象項目（scopeItemIds、未指定 = すべての記録）を持つようになったので、confirmedMinutes /
activeDays の意味を「作成日以降・対象項目内の確定分数と実施日数」に狭める。導出に戻すことは検討して
不採用 — スコープを入れても「下端固定・上端が毎日進む窓」という構造は変わらず、目標ごとのフィルタが
1段増えるだけで、この ADR の理由がそのまま強まる。

差分更新の骨格（唯一の入口 withMasteryProgressDelta、実測の「後 − 前」、達成済みの凍結）は変えない。
測る単位を「その暦日の確定合計」から「その暦日の項目別確定合計」に一段細かくし、目標ごとに対象項目で
部分和を取って差分にする。読み取り量は増えない（同じ1日ぶんの rows / days を読む）。早期リターンの
条件は「日合計が同じ」では不十分（同じ日に別項目の確定が入れ替わると各スコープの値は動く）ため、
「項目別合計が完全一致」に置き換えた。これは部分和の一致を保証する十分条件である。

再計算のトリガが3つになった（達成解除 / 修復 / 対象項目の変更）。対象項目を変えると窓の中身が変わり
差分では追随できないため、その目標1件を作成日以降から数え直して同じ replace に載せる（CVX-15）。
達成済みの目標では対象項目を変更できないことにした — 凍結された実績を新しい対象で数え直すと、
達成後に入った編集が凍結値へ漏れ、「凍結」の意味が壊れるため。変更したい場合は達成を外す（既存の
解除→再計算がそのまま正しい経路になる）。バックフィルは不要（未指定 = すべての記録 = 従来の意味）。
```

---

## 16. 実装順序（推奨）

1. `convex/lib/{validators,domain}.ts` にフィールドとメッセージを足す（デプロイしても挙動は変わらない）。
2. 純関数（`masteryDayTotals` / `scopeItemIds` / `masteryProgress`）とそのテスト。
3. 差分適用の配管（`loadDayItemTotals` → `withMasteryProgressDelta` → `applyMasteryProgressDelta`）。ここまでで**対象項目が常に未指定でも回帰しない**ことをテストで確定させる。
4. `countMasteryProgress` と再計算3経路。
5. `create` / `update` のガードと数え直し。
6. `items/remove.ts` のガード。
7. フロント（共有 hook → ラベル純関数 → 表示 → フォーム）。
8. `CONTEXT.md` / ADR-0007 の追記。

---

## 17. #48 / #49 との干渉チェック

| 相手 | 干渉 | 扱い |
| --- | --- | --- |
| #48 `masteryGoalInputFields` への `parentGoalId` 追加 | 同じ object を触る | 追加フィールドどうしなのでコンフリクトは機械的。両方入った形が §4.1 |
| #48 `toGoalDto` への `createdAt` 追加 | 同じ関数 | 併存可（`scopeItemIds` は mastery 分岐のみ） |
| #48 の3フォーム分割（長期目標 / チェックポイント / 編集） | `MasteryGoalFields` の分割 | 対象項目は3フォーム共通なので、#48 の `MasteryCoreEntries` と同じ位置（ただしストア外の `useState`）に置く |
| #48 §9.1 の `GoalFormOutput` の型の穴 | ブランド付き Id | §10.2 で `GoalInputPayload` に差し替える（`parentGoalId` も同じ穴に落ちているので一緒に塞ぐ） |
| #49 Phase 5 の2枝 union | 習得を2枝に割る | `scopeItemIds` は `masteryCoreFields` に置く（§4.4） |
| #49 のバックフィル internalMutation | `goals` を patch する | 対象項目には触らないので影響なし（patch は指定フィールドのみ） |

---

## 18. 検討した代替案（自己グリル）

1. **そもそも紐付けを入れない（ADR-0007 のまま全記録を数える）。**
   いちばん強い反論。既にデプロイ済みで整合しており、「自己判定の較正のために学習量を併記する」という文言も満たしている。**部分的に譲歩**: 未指定を既定にし、対象項目は**目標ごとの任意設定**にした。何もしない所有者にとって本仕様の変更は「フォームに任意の欄が1つ増える」だけで、データも表示も現状と同一。それでも入れる理由は較正の精度 — 英会話のチェックポイントの隣に「多読で稼いだ240分」が並ぶと、較正の材料としては**誤誘導**になる（Kruger & Dunning の目的に反する）。「数えない」より「間違って数える」ほうが悪い。

2. **記録側で明示選択する（`rows.goalId` か中間テーブル `rowGoalLinks`）。**
   ADR-0008 が外したのと同じ摩擦を別の欄で再導入する / 「手入力の進捗申告をしない」方針に反する / 1記録は複数目標に効くので単一 FK は偽の択一・中間テーブルは記録側 UI の肥大 / 目標を作った時点で過去の記録に紐付けが無く、遡及には記録の一括編集が必要 / 記録を Key Result の実績報告に変える（ADR-0003）。**却下**。**譲歩**: 明示選択だけが持つ価値は「この30分はこの目標のためだった」という**意図の記録**で、これは ひとこと（自由文、ADR-0008 で任意化済み）が既に担える。加えて週次レビュー（#52）は事後に振り返る自然な場所になるので、そこで扱う余地を残す。

3. **カテゴリ経由の自動集計にする（週間ターゲットと同じ軸）。**
   粒度が粗く較正に効かない / 週間ターゲットの軸と重なって2機構が見分けられない / 全確定経路に `loadCatalog`（2 collect）が乗る / 項目のカテゴリ付け替えでスコープが動く。**却下**。**譲歩**: カテゴリ見出し付き `MultiSelect` にして、カテゴリの項目をまとめて選ぶ操作を数クリックに収めた。

4. **項目とカテゴリのどちらでも指定できる union スコープ。**
   説明すべき軸が2本になり、カテゴリ枝は「あとで項目を足すと勝手に対象が広がる」暗黙の挙動を持つ。1人用アプリで2軸を持つ利得は薄い。**却下**。

5. **導出に戻す（非正規化をやめる）。**
   ADR-0007 の理由がスコープ導入で強まるだけ（窓は伸び続け、目標ごとのフィルタが増える）。`goals.list` は rows への全書き込みで再実行される。**却下**（§6.1）。

6. **対象項目の変更時に、既存の所有者ぶん再計算（`recomputeMasteryProgressForOwner`）を呼ぶ。**
   1関数の再利用で済み、修復も同時にかかる魅力はある。しかし読む範囲が「所有者の最古の未達成目標の作成日以降」に広がり、関係ない目標も書き直す。1件ぶんの数え直し（`countMasteryProgress`）は範囲が狭く、`replace` 1回に載せられる。**却下**（所有者ぶん再計算は修復専用の道具として残す）。

7. **達成済みの目標でも対象項目を変えられるようにし、[作成日, 達成日] の範囲で数え直す。**
   一見きれい（凍結の意味を範囲で表現できる）が、達成後に「達成日以前の記録」を編集した分が数え直しで**遡って混入**する。凍結が「だいたい凍結」に劣化するのは、ADR-0007 が「履歴は後の学習で書き換わらない」と決めたことの実質的な取り消し。**却下**（達成を外す経路が既に正しい答えを持っている）。

8. **達成率・進捗バーを出す（例: 目標分数に対する消化率）。**
   分母を作ると ADR-0005 が削除した「達成量タイプ」を裏口から復活させ、`CONTEXT.md`「習得」の Avoid（学習量からの自動達成判定）に接近する。**却下**（§5.2）。

9. **対象項目ごとの「今週の実績」も目標カードに出す。**
   週間ターゲットの役割（ADR-0006 の一本化）と二重になる。**却下**。週次レビュー（#52）が扱う自然な場所。

10. **項目を削除するとき、対象項目から自動で外す（ブロックしない）。**
    最後の1件が外れた瞬間にスコープが「すべての記録」へ静かに広がり、カウンタの意味が反転する（しかも数え直しが必要になる）。既存の rows / presets ガードと同じ「使っているものは消せない」に揃えるほうが説明が1行で済む。**却下**（§8）。**譲歩**: 拒否メッセージで「対象項目にしている目標がある」ことを明示し、次の操作（目標側で外す）が分かるようにした。

11. **対象項目の件数上限を置く（例: 20件）。**
    正規化で重複が落ち、全 id が所有者の項目であることを検査するので、集合はカタログの項目数で自然に上限される。数値の根拠が無い上限は、あとでカタログが増えたときに理由のない壁になる。**却下**。

12. **`rows` に「タグ」を新設して紐付け軸にする。**
    `CONTEXT.md`「項目」の Avoid が「複数選択のタグ」を明示的に禁じている。項目が既に記録の分類の原子。**却下**。

13. **スコープを「除外リスト」にする（この項目は数えない）。**
    「英会話以外を数える」のような指定が短く書ける。しかし否定条件は読み手の負荷が高く、「項目を追加すると自動で対象に入る」挙動が付いてくる（意図しない拡大）。既定が「すべて」なので、絞りたいときだけ肯定形で選ぶ形で足りる。**却下**。除外したい項目が多数のときの選択の手間は受容する。

14. **対象項目は編集フォームだけに出す（新規フォームには出さない）。**
    #48 が新規長期目標から期限欄を落としたのと同じ整理には見える。しかし期限は「区分を決める」欄で、対象項目は「集計条件」なので性質が違う。新規で決められないと、作った直後に編集を開き直す二度手間が常態化する。**却下**（任意欄なので新規に置いても摩擦は小さい）。

15. **対象項目を変えたら「実績を数え直しました」とトーストで伝える。**
    #48 が区分移行（`toLongTerm` / `toCheckpoint` / `reparent`）でトースト文言を分岐させているので、そこに4つ目の軸を足すと組み合わせが爆発する。カウンタは reactive query で即座に更新され、目に見える。**却下**（既存の「目標を更新しました」のまま）。

16. **チェックポイントは親の対象項目を常に継承する（連動）。**
    親を変えると子の実績が全部数え直しになり、「親の対象を絞ったら子の履歴の意味が変わる」という遠隔作用が生まれる。継承は**新規作成時の初期値だけ**にとどめる。**却下（連動は不採用）**。

17. **親の対象項目に子の対象項目が含まれることを不変条件にする。**
    階層と集計条件という別の関心事を結びつけ、親の編集が子を拒否する状況を作る。チェックポイントの親は「表示の階層」であって集計の入れ物ではない。**却下**（§11 の「食い違いは許す」）。

18. **`goals.list` の DTO に項目名を載せる（クライアントで引き当てない）。**
    名前の真実が2箇所になり、項目の改名で DTO と `items.list` の一貫性を考えることになる。クライアントは既に `items.list` を購読できる。**却下**（CVX-16）。

19. **対象項目の検証を Valibot 側でも所有者チェックまで行う。**
    クライアントは他人の項目を知らないので検証できない。所有者チェックはサーバの責務（CVX-04）。フォーム側は「一覧から引き当てられるか」だけを見る。**却下（二重実装しない）**。

---

## 19. 次チケットへの引き渡し

- **#52（週次レビュー）**: 対象項目があると「この目標に効いた今週の記録」を出せる。逆に「対象外の確定が多い目標」＝スコープが古い可能性の助言もここが自然な場所（本仕様は助言を持たない）。また #48 §15-10 が残した「未達成チェックポイントの総数」もここで扱える。
- **#54（月次レビュー）**: 達成済み目標の凍結された実績と、その対象項目を並べた振り返りが作れる。凍結値と対象項目が同時に読めることが本仕様の保証。
- **#55（通知）**: 「期限が近いのに対象項目の確定が0件」は通知の候補になるが、本仕様は自動失敗記録を持たない方針（`CONTEXT.md`「習得」）なので、通知にするかは #55 の判断。
- **#58（PWA・モバイル）**: 対象項目の `Tooltip` はタッチで開かない前提で設計している（§9.1）。モバイルで全項目名を見せたいなら、行の折り返し表示か詳細シートを #58 で検討する。
- **`CONTEXT.md` の「チェックポイント」項**が ADR-0006 の改訂に追いついていない（§14 の注意）。#50 の取りこぼしとして誰かが直す。
