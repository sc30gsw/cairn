# 目標画面の階層レイアウト仕様（#48）

- Status: 決定済み（実装引き渡し可）
- Part of: [#47 目標階層と新機能群の仕様マップ](https://github.com/sc30gsw/cairn/issues/47)
- 参照: `CONTEXT.md`（目標 / 目標タイプ / 本番目標 / 習得 / チェックポイント）、[ADR-0005](../adr/0005-goal-types-by-structure.md)、[ADR-0006](../adr/0006-checkpoints-replace-weekly-goals.md)、[ADR-0007](../adr/0007-denormalize-mastery-progress.md)、`.claude/rules/convex-rules.md`（CVX-01〜20）、`.claude/rules/web/design-live-board.md`、`.claude/rules/web/mantine-tailwind.md`、`docs/design/Paper Redesign.dc.html`
- 前提（マップで確定済み・本仕様では再議論しない）: 長期目標 = 期限なしの習得 / チェックポイントは必須の親を FK（`parentGoalId`）で持つ / 親の削除は子をカスケード削除（Confirm で件数明示）/ 区分の双方向移行を許す（子を持つ長期目標はチェックポイント化不可）/ crowded 助言は親ごと・長期目標は件数制限なし / 長期目標の作成は本番目標から独立、新規フォームに期限欄は出さない

---

## 0. 決定サマリ

1. **画面は「親カード + その中に子チェックポイントの行」の2層で描く。** 親カードは Paper Redesign のスケッチ枠付き `Card`、子は枠なしの行（点線区切り + 破線の左罫）。カードのネストはしない。
2. **ページの縦順は ①本番目標グループ ②長期目標セクション ③週間ターゲット ④達成した目標（折りたたみ）⑤障害プラン。** 「未達成の階層 → 今週の計器 → 履歴 → 備え」の順。
3. **達成済みは親グループから外し、ページ下部の1つの「達成した目標」セクションに集約する。** ただし「達成済みだが未達成の子が残っている親」はツリーに残す（重複表示を作らない除外条件で保証する）。
4. **区分（長期目標 / チェックポイント）は `deadline` と `parentGoalId` の同時存在で決まる。** 両方あればチェックポイント、両方なければ長期目標。片方だけの状態は Convex の services 層で拒否する。
5. **目標タイプの Select はフォームから撤去する。** どの追加導線を押したかが型と区分を決める（本番目標 / 長期目標 / チェックポイント）。
6. **フォームは3種 + 編集1種。** 新規本番目標（既存のまま）、新規長期目標（内容・基準のみ、**期限欄なし**）、新規チェックポイント（内容・基準・期限必須、親は導線から確定して読み取り専用表示）、編集（期限 clearable + 親の付け替え Select + 区分移行のライブ予告）。
7. **削除は常に Confirm を出す。** 親のときは子の件数・うち達成済み件数・子の名前（最大3件）を明示する。目標はゴミ箱に入らない（ゴミ箱は記録と日だけ）ので、その旨も書く。
8. **区分移行に Confirm は出さない。** 可逆なのでフォーム内の `Alert` によるライブ予告 + 保存後トーストの行き先表示で足りる。Confirm は不可逆・破壊的操作（削除）専用にする。

---

## 1. 本仕様の範囲

| 決めるもの | 決めないもの（担当チケット） |
| --- | --- |
| `goals` のスキーマ変更（`parentGoalId` / `createdAt` DTO）と不変条件 | 既存チェックポイントへの親バックフィル手順・`optional → required` の段階移行（#49） |
| 関数サーフェス（create / update / remove / list の変更点） | ADR-0006 の改訂文と `CONTEXT.md` の「長期目標」追記（#50） |
| 画面構造・コンポーネントツリー・フォーム・Confirm・区分移行フロー | 目標×記録の紐付けと進捗表示の変更（#53） |
| 純関数（ツリー構築・区分判定・Confirm 文言）とテスト対象 | タイマー・週次/月次レビュー・通知・PWA（#51〜#58） |

`parentGoalId` は本仕様では **`v.optional`** のまま入れる。必須化（required）は #49 のバックフィル完了後。したがって UI は「親が解決できないチェックポイント」を描ける必要があり、§7.4 の孤児グループを安全網として持つ。

---

## 2. ドメイン（区分と不変条件）

目標タイプは `exam` / `mastery` の2値のまま増やさない（ADR-0005 維持）。`mastery` の中の区分は次の2つで、判別子は期限の有無だけ。

| 区分 | 条件 | 画面上の位置 |
| --- | --- | --- |
| **長期目標** | `type === "mastery" && deadline === undefined && parentGoalId === undefined` | トップ層。長期目標セクションの親カード |
| **チェックポイント** | `type === "mastery" && deadline !== undefined && parentGoalId !== undefined` | 親（本番目標 or 長期目標）カードの中の行 |

不変条件（すべて services 層で強制する。違反は `ValidationFailedError`）:

- **INV-1（期限と親は同時）**: `deadline` と `parentGoalId` は両方あるか両方ないか。片方だけは拒否。
- **INV-2（親の所有者）**: 親は同じ `ownerId` の目標。`requireOwnedGoal` で引く（他人の目標を親に指定できない = IDOR 防止）。
- **INV-3（自己参照禁止）**: `parentGoalId !== 自分の _id`。
- **INV-4（チェーン禁止・親側）**: 親は本番目標か長期目標のみ。親がチェックポイント（`deadline` を持つ mastery）なら拒否。
- **INV-5（チェーン禁止・自分側）**: 子チェックポイントを持つ長期目標に期限を付けてチェックポイント化することは拒否。
- **INV-6（カスケード）**: 目標を削除すると、その目標を親に持つチェックポイントを同一トランザクションで全削除（CVX-15）。達成済みの子も対象。

INV-4 と INV-5 の合わせ技で階層は最大2層に固定される。

**最終形（Phase 5 後）**: validator の最終形は [#49 §3.2](checkpoint-parent-backfill.md) の2枝 union（checkpoint = `deadline` + `parentGoalId` 必須 / longTerm = どちらも無し）で、INV-1 は保存形としてはスキーマが機械的に守る。ただし **Phase 5 後も INV-2〜5 と入力段の INV-1 チェックは services に残す**（他人の親・チェーン・自己参照は DB を読まないと判定できない）。フロントの型は #49 §8 の改修表に従って `Checkpoint` / `LongTermGoal` に分岐する（判定は `goal-tree.ts` の `isCheckpointGoal`）。本仕様が新規作成する `goal-tree.ts` / `checkpoint-row.tsx` は、この分岐が来る前提で書く（§15-3）。

---

## 3. Convex スキーマ変更

### 3.1 `convex/lib/validators.ts`

```ts
//? 期限を持つ習得が「チェックポイント」。別タイプではないので枝は増やさない(docs/adr/0006)。
//? 期限と親は同時に存在する(INV-1)。片方だけの状態は services 層で弾く。
const masteryGoalInputFields = v.object({
  content: v.string(),
  criterion: v.string(),
  deadline: v.optional(v.string()),
  //? 必須化は既存データのバックフィル後(#49)。それまでは optional で受ける。
  parentGoalId: v.optional(v.id("goals")),
  type: v.literal(masteryType),
});

//? 並び順をクライアントの index 順の偶然に頼らないため、DTO に作成時刻を載せる。
//? ツリー構築(§6.1)が自己完結し、純関数のままテストできる。
const goalIdField = { _id: v.id("goals"), createdAt: v.number() };
```

派生する `masteryGoalFields` / `masteryGoalDocumentFields` / `goalDocumentValidator` / `goalDtoValidator` / `goalInputValidator` はいずれも既存の `.extend` 連鎖のままで、`parentGoalId` と `createdAt` が自動で流れる（CVX-16: 形の SSoT は validators.ts 1箇所）。

**この1枝のままの形は #49 Phase 5 までの過渡形。** 最終形は [#49 §3.2](checkpoint-parent-backfill.md) の2枝 union（checkpoint = `deadline` + `parentGoalId` 必須 / longTerm = どちらも無し）で、Phase 5 後も INV-2〜5 と入力段の INV-1 チェックは services に残す。フロントの `MasteryGoal` 型は #49 §8 の改修表に従って `Checkpoint` / `LongTermGoal` に分岐する（本仕様が新規作成する `goal-tree.ts` は `isCheckpointGoal` の置き場所、`checkpoint-row.tsx` は Phase 5 で `Checkpoint` を受け取る形に寄せられる想定で書く）。`optional → required` の昇格手順そのものは #49 の担当（§1 / §15-11）。

### 3.2 `convex/schema.ts`

```ts
goals: defineTable(goalDocumentValidator).index("by_owner_and_type", ["ownerId", "type"]),
```

**インデックスは追加しない**（CVX-12）。子の取得は `by_owner_and_type`（`ownerId` + `type: "mastery"`）で絞ってから TypeScript 側で `parentGoalId` 一致を filter する（CVX-10 の「取得後に TS で絞る」を使う。`.filter` は書かない）。1所有者の目標は数件〜数十件で、`.collect` の対象は所有者の習得目標だけに限定されるため CVX-11 上も問題ない。`by_owner_and_parentGoalId` を足すのは **1所有者の目標が数百件規模になったとき**（そのときは `parentGoalId` が required 化済みのはずなので `["ownerId", "parentGoalId"]` を追加し、`listChildCheckpoints` だけを差し替える）。

### 3.3 `convex/lib/domain.ts`（検証メッセージの SSoT）

```ts
//* 目標階層の不変条件メッセージ。services と Valibot が同じ文言を共有する(CVX-16)。
export const CHECKPOINT_PARENT_REQUIRED_MESSAGE =
  "期限を付けるときは親（本番目標か長期目標）を選んでください";
export const CHECKPOINT_DEADLINE_REQUIRED_MESSAGE = "親を持つチェックポイントには期限が必要です";
export const CHECKPOINT_PARENT_SELF_MESSAGE = "自分自身を親にはできません";
export const CHECKPOINT_PARENT_KIND_MESSAGE = "チェックポイントの下にチェックポイントは置けません";
export const CHECKPOINT_HAS_CHILDREN_MESSAGE =
  "子チェックポイントを持つ長期目標は、チェックポイントにできません";
```

---

## 4. 関数サーフェス（CVX-20: 1関数1ファイル）

### 4.1 新規

| ファイル | 種別 | 内容 |
| --- | --- | --- |
| `convex/services/goals/assertCheckpointParent.ts` | ctx ヘルパ | INV-1〜4。`(ctx: MutationCtx, ownerId: string, input: Extract<GoalInput, { type: "mastery" }>, selfId?: Id<"goals">) => Promise<null>`。親は `requireOwnedGoal(ctx, ownerId, parentGoalId)` で引く（INV-2 を既存関数に集約。`requireOwnedGoal` は `MutationCtx` を取るので ctx 型も `MutationCtx` で揃える） |
| `convex/services/goals/listChildCheckpoints.ts` | ctx ヘルパ | `(ctx: MutationCtx, ownerId: string, goalId: Id<"goals">) => Promise<Doc<"goals">[]>`。`by_owner_and_type` で `mastery` に絞って `.collect()` → TS で `parentGoalId === goalId` を抽出。返り値は期限昇順（Confirm の列挙順と一致させる） |
| `convex/services/goals/assertNoChildCheckpoints.ts` | ctx ヘルパ | INV-5。`listChildCheckpoints` が空でなければ `CHECKPOINT_HAS_CHILDREN_MESSAGE` |

`ctx.runQuery` / `ctx.runMutation` は使わない（CVX-08）。すべて同一トランザクション内の素の関数呼び出し（CVX-02）。

### 4.2 変更

```ts
// convex/services/goals/create.ts（mastery 分岐の先頭に1行）
await assertCheckpointParent(ctx, ownerId, goal);   //? 新規は子を持たないので INV-5 は不要
```

```ts
// convex/services/goals/update.ts（mastery 分岐）
await assertCheckpointParent(ctx, ownerId, goal, existing._id);
if (goal.deadline !== undefined) {
  //? 期限を持つ = チェックポイント。自分が子を持つならチェーンになるので拒否(INV-5)
  await assertNoChildCheckpoints(ctx, ownerId, existing._id);
}
```

`update` は既存どおり `ctx.db.replace` なので、期限を外した保存では `deadline` と `parentGoalId` が同時に落ちる（INV-1 が replace の性質で保たれる）。達成日と学習量実績の据え置きも既存のまま（ADR-0007）。

```ts
// convex/services/goals/remove.ts
//* 親を消すと子チェックポイントも消える(INV-6)。同一トランザクションで全削除(CVX-15)。
export async function remove(ctx, ownerId, args): Promise<number> {
  const goal = await requireOwnedGoal(ctx, ownerId, args.goalId);
  const children = await listChildCheckpoints(ctx, ownerId, goal._id);
  for (const child of children) {
    await ctx.db.delete("goals", child._id);   //? await 漏れ禁止(CVX-17)
  }
  await ctx.db.delete("goals", goal._id);
  return children.length;
}
```

```ts
// convex/mutations/goals/remove.ts
export const remove = ownerMutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => removeGoal(ctx, ctx.ownerId, args),
  //? カスケードで消えた子の件数。トーストの文言に使う
  returns: v.number(),
});
```

`create` / `update` / `list` / `setAchieved` の mutation・query 側（`convex/mutations/goals/*`, `convex/queries/goals/*`）は **引数・返り値の validator が validators.ts 由来なので無変更**。すべて `ownerMutation` / `ownerQuery`（= `requireUser` 相当の所有者解決）を通っており CVX-03 / CVX-04 を満たす。`Date.now()` を読む query は増えない（CVX-14）。scheduler / crons は関与しない（CVX-05）。

### 4.3 `convex/services/goals/toGoalDto.ts`

両分岐に `createdAt: goal._creationTime` を追加。mastery 分岐に `parentGoalId: goal.parentGoalId` を追加。

---

## 5. クエリ設計（サーバでツリーを組まない）

`api.queries.goals.list.list` は今のままフラットな `GoalDto[]` を返す。ツリーはクライアントの純関数で組む。理由:

- 購読は1本のまま（ツリーを返しても購読数は変わらないので、サーバ側で組む利得がない）。
- DTO の形が2層構造に固まると、#53（目標×記録の紐付け）や週次レビューでの再利用時に形を作り直すことになる。
- ツリー構築は日付にも `Date.now()` にも依存しない純粋な仕分けなので、クライアント側でユニットテストできる（CVX-09 の思想をフロントに持ち込む）。

---

## 6. 純関数

### 6.1 `src/features/goals/lib/goal-tree.ts`

```ts
export type GoalTier = "checkpoint" | "longTerm";

export type ParentGroup = {
  //? 未達成の子だけ。期限昇順 → createdAt 昇順
  checkpoints: MasteryGoal[];
  parent: ExamGoal | MasteryGoal;
};

export type GoalTree = {
  //? 孤児でないもののうち、達成済みで未達成の子を持たないもの。achievedAt 降順 → createdAt 降順
  achieved: MasteryGoal[];
  exam: ParentGroup | undefined;
  //? 親が解決できないチェックポイント(バックフィル前の安全網。#49 完了後は常に空)。
  //? 達成済みでもここに入る(孤児判定が達成済み判定より先。#49 §8)
  orphans: MasteryGoal[];
  //? createdAt 昇順(= 作成順)
  longTerm: ParentGroup[];
};

export function goalTier(goal: MasteryGoal): GoalTier;
export function buildGoalTree(goals: readonly Goal[]): GoalTree;
//? 親の選択肢。本番目標 + 未達成の長期目標 + (現在の親が上記に無ければその親)。self は除外
export function parentGoalOptions(goals: readonly Goal[], input: {
  currentParentId: GoalId | undefined;
  selfId: GoalId | undefined;
}): ComboboxData;
```

**評価順は「孤児 → 達成済み → 親グループ / 長期目標（親グループの子は未達成のみ）」で、上から評価して最初に当たった規則だけを適用する**（この順序の SSoT は [#49 §8](checkpoint-parent-backfill.md)。達成済みの孤児を先に `achieved` へ落とすと、#49 §5 規則4 = `plan: "manual"`（マイグレーションが throw する唯一の当事者）が `OrphanCheckpointsAlert` に現れず、Phase 2〜4 で「人が先に手で直す機会を作る」という #49 のフェーズ順序の根拠が崩れる）。

`buildGoalTree` の仕分け規則（テストで固定する）:

1. `exam` 型は1件。あればトップの親。
2. `mastery` かつ `deadline` あり → 親 id で親グループへ。`parentGoalId` が無い / 親が `goals` に無い / 親がチェックポイント → `orphans`。**`achievedAt` の有無は問わない**（達成済みの孤児も `orphans` に入る）。
3. `mastery` かつ `deadline` なし → 長期目標の親グループ。
4. **達成済みの扱い**: 規則2で孤児に落ちなかったもののうち、`achievedAt` があり、かつ未達成の子を持たないものは `achieved` へ移す。未達成の子が残っている達成済み長期目標は `longTerm` に残し、カードに「達成済み」バッジを出す（子が親を失って浮かないようにする / 二重表示は「子なし」条件で防ぐ）。
5. 親グループの `checkpoints` は未達成のみ（達成済みの子は `achieved` に居る）。

規則2 と規則4 は排他なので、同じ目標が `orphans` と `achieved` の両方に現れることはない。

`parentGoalOptions` は Mantine のグループ付き `ComboboxData` を返す:

```ts
[{ group: "本番目標", items: [...] }, { group: "長期目標", items: [...] }]
```

空グループは含めない。**現在の親が達成済み等で候補から外れる場合も必ず含める**（Mantine `Select` は `value` が `data` に無いと空表示になるため）。

### 6.2 `src/features/goals/lib/goal-tier-transition.ts`

```ts
export type TierTransition = "none" | "reparent" | "toCheckpoint" | "toLongTerm";

//? 編集フォームの入力から、保存したときに起きる区分の変化を出す。表示専用の判定
export function tierTransition(input: {
  after: { deadline: string | undefined; parentGoalId: string | undefined };
  before: { deadline: string | undefined; parentGoalId: GoalId | undefined };
}): TierTransition;
```

- `before.deadline` あり → `after.deadline` なし = `toLongTerm`
- `before.deadline` なし → `after.deadline` あり = `toCheckpoint`
- 両方あり かつ 親が変わった = `reparent`
- それ以外 = `none`

### 6.3 `src/features/goals/lib/goal-remove-confirm.ts`

```ts
export type RemoveConfirmCopy = { children: string; labelConfirm: string; title: string };

//? 件数・内訳・子の名前(最大3件)から Confirm の文言を組む。純関数なのでテストで文言を固定できる
export function removeConfirmCopy(input: {
  achievedChildCount: number;
  childNames: readonly string[];   //? 未達成 + 達成済みの子の名前(表示順は期限昇順)
  goalName: string;
  isExam: boolean;
}): RemoveConfirmCopy;
```

文言は §10 のとおり。

---

## 7. 画面構造

### 7.1 デスクトップ（`≥ md`。右小口インデックスタブは全画面共通なので枠外に図示）

```
┌────────────────────────────────────────────────────────────────────┐ ┌────┐
│  目標                                                              │ │ 日 │
│  ~~~~~~~   ← PageTitle（波下線 orange-4）                          │ │ 履 │
│  本番目標と長期目標の下に、期限つきのチェックポイントを刻みます。         │ │ 項 │
│  同時に追いかけるのは親ごとに1〜2件が目安。       ← 説明はここだけ      │ │ プ │
│                                                                    │ │[目]│
│ ╭──────────────────────────────────────────────────────────────╮   │ │ ゴ │
│ │ 本番目標                                          [✎] [🗑]   │   │ └────┘
│ │ TOEIC L&R で 900点を取る                    ╭──────────────╮ │   │
│ │ 2026-11-15 · 目標スコア 850〜900            │ あと  89  日 │ │   │
│ │                                             ╰──────────────╯ │   │
│ │ ┌ ⚠ 未完成 — 週間ターゲットを設定してください ───────────────┐ │   │
│ │ │ 本番目標だけでは日々の行動が決まりません。 [週間ターゲットへ] │ │   │
│ │ └──────────────────────────────────────────────────────────┘ │   │
│ │ ┊ チェックポイント (2)                        [+ 追加]        │   │
│ │ ┊ ☐ 文法問題を9割正答できる        期限 9/30（あと43日）      │   │
│ │ ┊   基準: 模試の文法セクションで9割正答  確定 320分/12日 [✎][🗑]│   │
│ │ ┊┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │   │
│ │ ┊ ☐ Part5 を10分で解ける          期限 10/12（あと55日）     │   │
│ │ ┊   基準: 模試 Part5 を10分以内       確定 120分/6日  [✎][🗑] │   │
│ ╰──────────────────────────────────────────────────────────────╯   │
│                                                                    │
│  長期目標                                     [+ 長期目標を追加]    │
│  期限を決めずに「〜できる」を積む層。ここから期限を刻むと            │
│  チェックポイントになります。                                       │
│ ╭──────────────────────────────────────────────────────────────╮   │
│ │ 長期目標                                          [✎] [🗑]   │   │
│ │ ☐ Distinction の例文を口頭で言い切る                          │   │
│ │ 基準: 3秒以内に例文を口に出せる          確定 90分 / 2日      │   │
│ │ ┊ チェックポイント (1)                        [+ 追加]        │   │
│ │ ┊ ☐ Chapter 1-3 を暗唱できる     期限 9/7（あと14日）        │   │
│ │ ┊   基準: 例文を見ずに言える          確定 40分/2日   [✎][🗑] │   │
│ ╰──────────────────────────────────────────────────────────────╯   │
│ ╭──────────────────────────────────────────────────────────────╮   │
│ │ 長期目標                            [達成済み] [✎] [🗑]      │   │
│ │ ☑ 音読を毎日続けられる ...                                    │   │
│ │ ┊ チェックポイント (0)                        [+ 追加]        │   │
│ │ ┊ チェックポイントなし                                        │   │
│ ╰──────────────────────────────────────────────────────────────╯   │
│                                                                    │
│ ╭─ 週間ターゲット ─────────────────────────────────────────────╮   │
│ │ （既存のまま）                                                │   │
│ ╰──────────────────────────────────────────────────────────────╯   │
│ ╭──────────────────────────────────────────────────────────────╮   │
│ │ ▸ 達成した目標（4件）              ← Accordion（既定は閉）    │   │
│ ╰──────────────────────────────────────────────────────────────╯   │
│ ╭─ 障害プラン ─────────────────────────────────────────────────╮   │
│ │ （既存のまま）                                                │   │
│ ╰──────────────────────────────────────────────────────────────╯   │
└────────────────────────────────────────────────────────────────────┘
```

`┊` は子グループの破線左罫（`border-left: 1px dashed var(--cairn-desk)` + `pl="md"`）。子の行は自前の枠を持たず、行間は `border-bottom: 1px dashed var(--cairn-desk)`（設計ファイルの障害プラン一覧と同じ質感）。親カードだけがスケッチ枠 + 紙影を持つ = 「1枚の紙に子を書き込んだ」形。

### 7.2 モバイル（`< sm`。ブレークポイント分岐のコードは書かない）

レイアウト分岐は **JS も `visibleFrom` も使わず、`Group wrap="wrap"` と子ブロックの `flex="1" miw={200}` による自然な折り返しだけで作る**（設計ファイルの `flex:1;min-width:200px` と同じ手法。SSR と実 DOM でズレない）。

```
┌──────────────────────────────┐
│ 日 履 項 プ [目] ゴ  ← 上部タブ │
├──────────────────────────────┤
│ 目標                          │
│ ~~~~~~                        │
│ 本番目標と長期目標の下に、期限   │
│ つきのチェックポイントを刻みます。│
│ ╭──────────────────────────╮ │
│ │ 本番目標          [✎][🗑] │ │
│ │ TOEIC L&R で 900点を取る  │ │
│ │ 2026-11-15 · 850〜900     │ │
│ │ ╭──────────────╮          │ │
│ │ │ あと  89  日 │          │ │  ← 折り返して縦積みになる
│ │ ╰──────────────╯          │ │
│ │ ┊ チェックポイント (2)     │ │
│ │ ┊             [+ 追加]    │ │  ← ヘッダも折り返す
│ │ ┊ ☐ 文法問題を9割正答     │ │
│ │ ┊   できる                │ │
│ │ ┊   基準: 模試の文法       │ │
│ │ ┊   セクションで9割正答     │ │
│ │ ┊   期限 9/30（あと43日）  │ │
│ │ ┊   確定 320分/12日        │ │
│ │ ┊                [✎][🗑] │ │
│ │ ┊┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │
│ │ ┊ ☐ Part5 を10分で解ける  │ │
│ │ ┊   ...                   │ │
│ ╰──────────────────────────╯ │
│ 長期目標      [+ 長期目標を追加]│  ← 見出しと導線も折り返す
│ ╭──────────────────────────╮ │
│ │ ...                       │ │
└──────────────────────────────┘
```

親カードの `padding` は `Card` の既定（`lg`）のまま。子グループのインデントは `pl="md"` 固定（モバイルでも詰めない — 破線罫と合わせて2層であることが読めればよい）。

### 7.3 Mantine コンポーネントツリー（確定形）

```tsx
<ConcreteActionTour screen="obstacles">
  <Grid gap="md">
    <Grid.Col span={12}>                                  {/* 見出し + 階層の説明 */}
      <Stack gap="xs">
        <PageTitle>目標</PageTitle>
        <Text c="dimmed" size="sm">{GOAL_HIERARCHY_HINT}</Text>
      </Stack>
    </Grid.Col>

    {/* ① 本番目標グループ ─ 無ければ EmptyState（既存 EXAM_GOAL_EMPTY_TITLE） */}
    <Grid.Col span={12}>
      <ParentGoalGroup kind="exam" … />                   {/* §7.3.1 */}
    </Grid.Col>

    {/* ② 長期目標セクション */}
    <Grid.Col span={12}>
      <LongTermSection … />                               {/* §7.3.2 */}
    </Grid.Col>

    {/* ②' 孤児（通常は空） */}
    {tree.orphans.length > 0 && (
      <Grid.Col span={12}><OrphanCheckpointsAlert … /></Grid.Col>
    )}

    {/* ③ 週間ターゲット（既存 WeeklyTargetsSection を Card で包む・変更なし） */}
    <Grid.Col span={12}><Card ref={weeklyTargetsRef}><WeeklyTargetsSection … /></Card></Grid.Col>

    {/* ④ 達成した目標 */}
    {tree.achieved.length > 0 && (
      <Grid.Col span={12}><AchievedHistorySection … /></Grid.Col>
    )}

    {/* ⑤ 障害プラン（既存・変更なし） */}
    <Grid.Col span={12}><Card><ObstacleSection … /></Card></Grid.Col>
  </Grid>
</ConcreteActionTour>
```

#### 7.3.1 `ParentGoalGroup`

```tsx
<Card h="100%">                                            {/* スケッチ枠 + 紙影はテーマ側 */}
  <Stack gap="md">
    {/* 親カードの本体。exam は ExamGoalCard の中身、mastery は MasteryGoalCard の中身 */}
    {kind === "exam" ? <ExamGoalBody … /> : <MasteryGoalBody … />}

    {/* 子グループ */}
    <Stack
      aria-label={`${parent.content}のチェックポイント`}
      component="section"
      gap="xs"
      pl="md"
      style={{ borderLeft: "1px dashed var(--cairn-desk)" }}
    >
      <Group gap="sm" justify="space-between" wrap="wrap">
        <Title order={3}>
          チェックポイント <Text ff={NUMERAL_FONT} span>({checkpoints.length})</Text>
        </Title>
        <Button
          aria-label={`${parent.content}にチェックポイントを追加`}
          leftSection={<IconPlus aria-hidden size={14} />}
          onClick={onAddCheckpoint} size="xs" type="button" variant="default"
        >
          追加
        </Button>
      </Group>

      {form /* 追加・編集フォームはこの位置に開く（§9） */}

      {checkpoints.length === 0
        ? <Text c="dimmed" size="sm">チェックポイントなし</Text>
        : <Stack component="ul" gap={0} style={{ listStyle: "none", padding: 0 }}>
            {checkpoints.map((goal) => <CheckpointRow key={goal._id} goal={goal} … />)}
          </Stack>}
    </Stack>
  </Stack>
</Card>
```

#### 7.3.2 `CheckpointRow`

```tsx
<Group
  component="li" gap="sm" py="xs" wrap="wrap"
  style={{ borderBottom: "1px dashed var(--cairn-desk)" }}   /* 最後の行は borderBottom なし */
>
  <Checkbox aria-label={`${goal.content}の達成`} checked={achieved} onChange={…} />
  <Box flex="1" miw={200}>
    <Text>{goal.content}</Text>
    <Text c="dimmed" size="sm">基準: {goal.criterion}</Text>
  </Box>
  <Text c={overdue ? "red.5" : "orange.6"} ff={NUMERAL_FONT} size="sm">
    期限 {goal.deadline}{remainingDays >= 0 ? `（あと${remainingDays}日）` : ""}
  </Text>
  {overdue && <Badge color="red" variant="light">{OVERDUE_LABEL}</Badge>}
  <Text c="dimmed" ff={NUMERAL_FONT} size="xs" data-shimmer-no-children>
    確定 {goal.confirmedMinutes}分 / {goal.activeDays}日
  </Text>
  <GoalCardActions goalName={goal.content} onEdit={…} onRemove={…} />
</Group>
```

#### 7.3.3 `LongTermSection`

```tsx
<Stack aria-label="長期目標" component="section" gap="md">
  <Group gap="sm" justify="space-between" wrap="wrap">
    <Title order={2}>長期目標</Title>
    <Button leftSection={<IconPlus aria-hidden size={14} />} onClick={onAdd} size="xs" type="button">
      長期目標を追加
    </Button>
  </Group>
  <Text c="dimmed" size="sm">{LONG_TERM_HINT}</Text>
  {form /* 新規長期目標フォームはここに開く */}
  {groups.length === 0
    ? <Text c="dimmed" size="sm">{LONG_TERM_EMPTY_MESSAGE}</Text>
    : groups.map((group) => <ParentGoalGroup key={group.parent._id} kind="longTerm" … />)}
</Stack>
```

長期目標が0件のときも **セクション見出しと追加導線は常に出す**（本番目標から独立した導線という確定事項の受け皿）。`EmptyState` は使わず1行の薄字にする（`EmptyState` はページに1つ = 本番目標なしのときだけ）。

#### 7.3.4 `AchievedHistorySection`

```tsx
<Card>
  <Accordion variant="contained">                          {/* 既定は閉じる（defaultValue なし） */}
    <Accordion.Item value="achieved">
      <Accordion.Control>
        達成した目標（<Text ff={NUMERAL_FONT} span>{achieved.length}</Text>件）
      </Accordion.Control>
      <Accordion.Panel>
        <Stack component="ul" gap={0} style={{ listStyle: "none", padding: 0 }}>
          {achieved.map((goal) => (
            <AchievedRow key={goal._id} goal={goal} parentName={parentNameOf(goal)} … />
          ))}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  </Accordion>
</Card>
```

`AchievedRow` は `CheckpointRow` と同じ骨格で、期限の代わりに `達成 2026-08-20`、親があれば `親: TOEIC L&R で 900点を取る` を薄字で添える（カスケード削除で消える範囲が読める）。達成チェックボックスは残す（外すと現在進行形に戻り、ツリーへ帰る）。

### 7.4 孤児チェックポイント（安全網）

```tsx
<Alert color="yellow" title="親のないチェックポイント" variant="light">
  <Text size="sm">親が見つからないチェックポイントがあります。編集で親を選び直してください。</Text>
  <Stack component="ul" …>{orphans.map((goal) => <CheckpointRow … />)}</Stack>
</Alert>
```

`#49` のバックフィル完了後は常に空になる想定。表示位置は長期目標セクションの直後。

### 7.5 Paper Redesign 準拠

- 色は `src/lib/theme.ts` の Flexoki タプルと `--cairn-*` のみ。**ハードコード hex は書かない**。期限テキストは `orange.6`、期限超過は `red.5` と `Badge color="red"`、達成バッジは `green`。破線は `var(--cairn-desk)`。
- 数値（日数・分数・件数・日付）は `NUMERAL_FONT`。見出し・本文は既定（`BODY_FONT` / `DISPLAY_FONT`）。
- スケッチ枠と紙影は **親カード（`Card`）とボタン・バッジだけ**。子の行には出さない（要所限定という原則の維持）。
- ライトのみ。ダーク分岐は書かない。
- テーマ追加は1点だけ: `Checkbox` の `input` に手描き風角丸（設計ファイル `border-radius:6px 10px 7px 11px/11px 7px 10px 6px`）。`theme.ts` 内のモジュールローカル定数として置く（2箇所目の需要が出るまで export しない = AHA）。

```ts
// src/lib/theme.ts（components に追記）
const CHECK_RADIUS = "6px 10px 7px 11px/11px 7px 10px 6px";
Checkbox: {
  styles: { input: { border: `1.5px solid ${INK}`, borderRadius: CHECK_RADIUS } },
},
```

### 7.6 Shimmer

`GoalsPending` は既存どおり `<Shimmer loading><GoalsBoard …/></Shimmer>`。`goals-shimmer-template.ts` を**実データと同じ階層**に更新する（本番目標1 + その子1 + 長期目標1 + その子1 + 達成済み1）。`parentGoalId` / `createdAt` を持たせて、読み込み後のレイアウトずれをなくす。

---

## 8. 編集状態のモデル

```ts
// src/features/goals/components/goals-board.tsx
type GoalEditor =
  | { kind: "closed" }
  | { kind: "createCheckpoint"; parent: ExamGoal | MasteryGoal }
  | { kind: "createExam" }
  | { kind: "createLongTerm" }
  | { goal: Goal; kind: "edit" };
```

- 同時に開くのは1つだけ（既存の単一 state 方針を維持）。
- フォームは **常に対象の位置にインラインで開く**。`createCheckpoint` は該当親グループのヘッダ直下、`edit` は対象カード／行の位置（対象は編集中は非表示）、`createExam` は本番目標の空状態の位置、`createLongTerm` は長期目標セクション見出しの直下。
- `key` は `editorKey(editor)`（`create-checkpoint-<parentId>` / `create-longTerm` / `create-exam` / `edit-<goalId>`）でフォームストアを貼り替える。

---

## 9. フォーム

### 9.1 Valibot スキーマ（`src/features/goals/schemas/goal-schema.ts`）

```ts
//? 内容と基準は3つのフォームで共通。区分ごとに期限・親の必須度だけが違う
const MasteryCoreEntries = { content: ConcreteActionSchema, criterion: CriterionSchema };

//* 新規長期目標。期限欄は出さない（確定事項）ので schema にも無い
export const LongTermGoalFieldsSchema = v.object(MasteryCoreEntries);

//* 新規チェックポイント。期限は必須。親は導線から確定するが、値として検証する
export const CheckpointFieldsSchema = v.object({
  ...MasteryCoreEntries,
  deadline: DateJstSchema,
  parentGoalId: v.pipe(v.string(), v.nonEmpty(CHECKPOINT_PARENT_REQUIRED_MESSAGE)),
});

//* 編集（習得）。期限は外せる。期限と親は同時に存在する（INV-1 をフォーム側でも守る）
export const MasteryEditFieldsSchema = v.pipe(
  v.object({
    ...MasteryCoreEntries,
    deadline: OptionalDateJstSchema,          //? "" → undefined に畳む（既存）
    parentGoalId: v.optional(v.string()),     //? "" は Select 未選択
  }),
  v.forward(
    v.partialCheck(
      [["deadline"], ["parentGoalId"]],
      (input) =>
        (input.deadline === undefined) === (input.parentGoalId === undefined || input.parentGoalId === ""),
      CHECKPOINT_PARENT_REQUIRED_MESSAGE,
    ),
    ["parentGoalId"],
  ),
);

//* 送信ペイロードの SSoT。convex の goalInputValidator と同じ形（CVX-16）
export const GoalSchema = v.variant("type", [
  v.object({ ...ExamGoalFieldsSchema.entries, type: v.literal(examType) }),
  v.object({ ...MasteryEditFieldsSchema.entries, type: v.literal(masteryType) }),
]);
```

`parentGoalId` は Valibot 上は素の `string`。`Id<"goals">` のブランドは **送信直前に `goals` から引き当てて取り戻す**（`TargetForm` の「一覧から引き当てて Id のブランドを取り戻す」と同じ手法。`as` キャストは書かない）。引き当てに失敗したら `setErrors(form, { path: ["parentGoalId"], errors: [PARENT_NOT_FOUND_MESSAGE] })` で止める。

- `type` は `v.variant` の判別子なので mastery の枝は1本のまま（区分では枝を割らない）。
- `deadline` の必須度は「新規チェックポイント用スキーマ」と「編集用スキーマ」の差で表す。1つのスキーマに条件付き必須を持ち込まない。

### 9.2 新規チェックポイント

```
╭─ チェックポイントを追加 ────────────────────────────────╮
│ 親                                                     │  ← Input.Wrapper + Text（読み取り専用）
│ TOEIC L&R で 900点を取る                               │
│                                                        │
│ ┌ ⚠ 同時に追いかけるチェックポイントは1〜2件が目安です ─┐ │  ← この親の未達成が2件以上のときだけ
│ │ いま追いかけているチェックポイントが 2 件あります。    │ │
│ └──────────────────────────────────────────────────────┘ │
│ チェックポイントの内容                                   │
│ ─────────────────────────────────────────────           │
│ 例: 金のフレーズを1 Unit 音読する                        │
│ 達成の基準                                              │
│ ─────────────────────────────────────────────           │
│ 例: Unit 1-10 を止まらずに音読できる                     │
│ 期限                                                    │
│ [ 2026-08-30  ▾ ]        ← 既定は次の日曜 / clearable なし │
│                                                        │
│ [ 保存 ]  キャンセル                                     │
╰────────────────────────────────────────────────────────╯
```

- 親は `GoalEditor.parent` から確定。**Select は出さない**（押した場所が親を決める = 選び直しの認知負荷ゼロ）。付け替えは編集フォームの仕事。
- `activeCheckpointCount` は **その親の未達成チェックポイント数**（crowded 助言は親ごとに数える。しきい値 `CHECKPOINT_CROWDED_THRESHOLD = 2` は据え置き、止めない `Alert`）。
- 期限の既定は `nextSundayJst(todayJst)`（既存関数）。`clearable={false}`（チェックポイントは期限を持つ定義なので、ここで空にはできない）。

### 9.3 新規長期目標

```
╭─ 長期目標を追加 ───────────────────────────────╮
│ 「〜できる」の基準を決めて、自分で達成にする      │  ← GOAL_TYPE_DESCRIPTIONS.mastery を再利用
│ 長期目標の内容                                  │
│ ────────────────────────────────                │
│ 例: 金のフレーズを1 Unit 音読する                │
│ 達成の基準                                      │
│ ────────────────────────────────                │
│ 例: Unit 1-10 を止まらずに音読できる             │
│                                                │
│ （期限欄は出さない）                             │
│ [ 保存 ]  キャンセル                            │
╰────────────────────────────────────────────────╯
```

期限を切りたくなったら編集で付ける（そのとき親の選択が必要になる）。crowded 助言は出さない（長期目標は件数を数えない）。

### 9.4 新規本番目標

既存の `ExamGoalFields` のまま（内容 / 本番日 / 目標スコア下限・上限）。変更は **目標タイプ Select の撤去**だけ。

### 9.5 編集（習得 = 長期目標 / チェックポイント共通）

```
╭─ チェックポイントを編集 ────────────────────────────────╮   ╭─ 長期目標を編集 ──────────────────╮
│ チェックポイントの内容                                  │   │ 長期目標の内容                     │
│ 文法問題を9割正答できる                                 │   │ Distinction の例文を…              │
│ 達成の基準                                              │   │ 達成の基準                         │
│ 模試の文法セクションで9割正答                            │   │ 3秒以内に例文を口に出せる           │
│ 期限（任意）                                            │   │ 期限（任意）                       │
│ [ 2026-09-30 ▾ ] [×]     ← clearable                   │   │ [ 未設定  ▾ ]                     │
│ 親                                                      │   │ 親  ← 期限を入れると現れる          │
│ [ TOEIC L&R で 900点を取る                        ▾ ]   │   │ [ 選択してください                ▾]│
│   ├ 本番目標                                            │   │                                   │
│   │   TOEIC L&R で 900点を取る                          │   │ ┌ ⓘ 保存すると『TOEIC…』のチェック │
│   └ 長期目標                                            │   │ │   ポイントになります            │ │
│       Distinction の例文を口頭で言い切る                 │   │ └─────────────────────────────────┘ │
│                                                        │   │ [ 保存 ]  キャンセル               │
│ ┌ ⓘ 保存すると期限が外れ、長期目標へ移ります ──────────┐ │   ╰───────────────────────────────────╯
│ └──────────────────────────────────────────────────────┘ │
│ [ 保存 ]  キャンセル                                     │
╰────────────────────────────────────────────────────────╯
```

- **親 Select は `deadline` が入っているときだけ表示**する（期限なし = 長期目標には親がない）。`data` は `parentGoalOptions(goals, { currentParentId, selfId })`（グループ見出し付き）。`onChange` は値ベースなので `field.props` をスプレッドしてから `onChange` を上書きする（`.claude/rules/typescript/formisch.md`）。
- **子を持つ長期目標**（INV-5 該当）では期限フィールドを `disabled` にし、`description={CHECKPOINT_HAS_CHILDREN_MESSAGE}` を出す。親 Select は出さない。サーバ側でも同じ理由で拒否する（UI だけの防御にしない）。
- **区分移行のライブ予告**（`tierTransition` の結果に応じた `Alert color="blue" variant="light"`。押しても止めない情報）:
  - `toLongTerm`: 「保存すると期限が外れ、長期目標へ移ります」
  - `toCheckpoint`: 「保存すると『{親名}』のチェックポイントになります」
  - `reparent`: 「保存すると『{親名}』の下へ移ります」
  - `none`: 出さない
- 保存後トースト（`useGoalsBoardActions`）:
  - `toLongTerm` → 「長期目標に移しました」 / `toCheckpoint` → 「『{親名}』のチェックポイントにしました」 / `reparent` → 「『{親名}』の下へ移しました」 / それ以外 → 既存の「目標を更新しました」
- 本番目標の編集は既存のまま（親も期限もない）。目標タイプは相変わらず変更不可（Select 撤去後はサーバの `GOAL_TYPE_IMMUTABLE_MESSAGE` が最後の砦）。

### 9.6 フォームの語（`goal-form-copy.ts`）

```ts
export type GoalFormVariant = "checkpoint" | "exam" | "longTerm";

export const GOAL_FORM_COPY = {
  checkpoint: { contentLabel: "チェックポイントの内容", createTitle: "チェックポイントを追加",
                editTitle: "チェックポイントを編集", submitLabel: "保存" },
  exam:       { contentLabel: "目標の内容",             createTitle: "本番目標を追加",
                editTitle: "本番目標を編集",             submitLabel: "保存" },
  longTerm:   { contentLabel: "長期目標の内容",         createTitle: "長期目標を追加",
                editTitle: "長期目標を編集",             submitLabel: "保存" },
} as const satisfies Record<GoalFormVariant, GoalFormCopy>;
```

`submitLabel` は3つとも「保存」に統一する（何をしているかはフォームのタイトルが言っている。導線の「追加」とフォーム内の「追加」で同じ語が二重に出る現状を解消）。編集時の variant は **現在の区分**から引く（`goalTier(goal)`）。

---

## 10. カスケード削除 Confirm

すべての目標削除で `modals.openConfirmModal`（`@mantine/modals`。既存の見送り Confirm と同じ手法）を出す。

```
┌ 長期目標を削除しますか？ ──────────────────────────────┐
│ Distinction の例文を口頭で言い切る                     │
│                                                      │
│ ひもづくチェックポイント 3件（うち達成済み 1件）も       │
│ 一緒に削除されます。目標はゴミ箱に入らないので戻せません。│
│                                                      │
│   ・Chapter 1-3 を暗唱できる（期限 2026-09-07）        │
│   ・Chapter 4-6 を暗唱できる（期限 2026-09-21）        │
│   ・Chapter 7-9 を暗唱できる（期限 2026-10-05）        │
│                                                      │
│                    [ キャンセル ]  [ まとめて削除する ] │
└──────────────────────────────────────────────────────┘
```

- 子が4件以上のときは3件だけ列挙し、末尾に「ほか N件」を足す。
- 子が0件のとき: タイトル「長期目標を削除しますか？」／本文「削除するとゴミ箱には入らず、戻せません。」／確定ラベル「削除する」。
- 本番目標のときはタイトルを「本番目標を削除しますか？」に。チェックポイントは常に子0件（INV-4）なので単純形。
- `confirmProps: { color: "red" }`（`red` = 削除/危険という設計トークンの割り当て）。
- 文言は `removeConfirmCopy`（§6.3）が組む純関数の返り値。テストで文言を固定する。
- 件数はクライアントの購読値（reactive なので実質最新）。**削除後のトーストはサーバ返り値の件数**を使う:
  - 0件 → 「目標を削除しました」／1件以上 → 「目標とチェックポイント{n}件を削除しました」

そのために `src/lib/run-mutation.ts` の `successMessage` を後方互換で拡張する:

```ts
type RunMutationOptions<T> = {
  errorMessage?: string;
  //? 返り値で文言が変わるものがある（カスケード削除の件数）。string はそのまま使える
  successMessage?: ((value: T) => string) | string;
};
```

---

## 11. 端ケース一覧（実装時に迷わないための決定表）

| ケース | 決定 |
| --- | --- |
| 本番目標なし・長期目標なし | 本番目標の `EmptyState` + 長期目標セクション（見出し + 追加導線 + 薄字1行）。チェックポイントの追加導線はどこにも出ない（親がないので作れない） |
| 本番目標なし・長期目標あり | 長期目標の下にチェックポイントを刻める。`EmptyState` は本番目標の位置に残す |
| 親が達成済み・未達成の子あり | 親はツリーに残す（`Badge` 「達成済み」+ チェックボックス on）。達成セクションには出さない（二重表示防止） |
| 親が達成済み・子なし / 子も全部達成 | 親は達成セクションへ。子（達成済み）も達成セクションに独立して並ぶ |
| チェックポイントを達成 | 親グループから外れ、達成セクションへ。親ヘッダの件数は未達成のみを数える |
| 達成を取り消す | 元の区分に戻る（期限と親を持ったままなので親グループへ復帰）。ADR-0007 のカウンタ再計算も既存どおり走る |
| 期限超過のチェックポイント | 行の期限テキストを `red.5` + `Badge red 期限超過`。並びは期限昇順のままで先頭に来る。自動失敗記録は残さない |
| 子を持つ長期目標に期限を付けようとする | フォームで期限欄 disabled + 理由表示。サーバも `CHECKPOINT_HAS_CHILDREN_MESSAGE` で拒否 |
| チェックポイントの親を自分自身にする | Select の候補から self を除外。サーバも `CHECKPOINT_PARENT_SELF_MESSAGE` で拒否 |
| チェックポイントを親に選ぶ | 候補に出さない。サーバも `CHECKPOINT_PARENT_KIND_MESSAGE` で拒否 |
| 現在の親が候補条件（未達成の長期目標）を満たさない | その親だけは候補に残す（Select の value 欠落による空表示を避ける） |
| 親が解決できないチェックポイント | 孤児 `Alert`（§7.4）に出し、編集で親を選ばせる。#49 完了後は空 |
| 削除中に別デバイスで子が増減 | Confirm の件数は購読値、実削除件数はサーバ返り値。トーストはサーバ値で出す |
| 他人の目標を親に指定 | `requireOwnedGoal` が投げる（IDOR） |

---

## 12. アクセシビリティ

- 追加ボタンが複数出るので、`aria-label` を親名で一意にする（`${parent.content}にチェックポイントを追加`）。`data-testid` は禁止なので、テストは `getByRole("button", { name: /…にチェックポイントを追加/ })` で引く。
- 子グループは `component="section"` + `aria-label={`${parent.content}のチェックポイント`}`。行は `ul` / `li`（`list-style: none`）。
- 達成チェックボックスの `aria-label` は既存どおり `${goal.content}の達成`。
- 編集・削除の `ActionIcon` は既存 `GoalCardActions` が目標名入りの `aria-label` を持つ（そのまま流用）。
- 期限・実績を色だけで伝えない（期限超過は `Badge` のテキストも出す）。
- ラベルは可視ラベル（`placeholder` で代替しない）。Mantine の必須フィールドは `*` が label に付くので、テストは正規表現で引く（`getByLabelText(/期限/)`）。
- `Accordion` のパネルは `display:none` なのでブラウザの「ページ内検索」に出ない。達成履歴は「一覧で読むもの」であり検索対象ではないと割り切って `Accordion` を維持する（§15-9）。

---

## 13. テスト

### 13.1 Convex（`convex-test` + `t.withIdentity`。CVX-19）

`convex/services/goals/*.test.ts` / 統合は既存の goals テストに追記:

1. 期限だけ・親だけの入力を `create` / `update` が拒否する（INV-1、両方向）。
2. 親がチェックポイントのとき拒否（INV-4）。
3. 親が自分自身のとき拒否（INV-3）。
4. 他人の目標を親にすると投げる（INV-2 / IDOR）。
5. 子を持つ長期目標に期限を付ける `update` が拒否（INV-5）。
6. 親を削除すると子が全部消え、返り値が子の件数（INV-6）。達成済みの子も消える。
7. チェックポイントの期限を外す `update` で `parentGoalId` も落ちる（`replace` の性質）。
8. 親の付け替え `update` が成功し、`list` の `parentGoalId` が変わる。
9. 既存の本番目標1件制約・タイプ不変・達成日据え置き・学習量実績の凍結が回帰していない。

### 13.2 純関数（Node プロジェクト / フロント unit）

- `goal-tree.test.ts`: 仕分け5規則（§6.1）を1ケースずつ。特に「達成済み親 + 未達成の子」がツリーに残り達成セクションに出ないこと、孤児が `orphans` に落ちること、並び順（期限昇順 → createdAt、achievedAt 降順）。
  - **評価順のケース（#49 §10 のテスト19 と同一物）**: 達成済みの孤児（`achievedAt` あり + `deadline` あり + 親が解決できない）が `orphans` に入り、`achieved` には入らない（規則2 が規則4 より先）。このケースは #49 Phase 5 で `orphans` フィールドごと削除される（#49 §8）ので、削除時に一緒に落とす前提で書く。
- `goal-tier-transition.test.ts`: 4種の遷移。
- `goal-remove-confirm.test.ts`: 子0件 / 3件 / 5件（「ほか2件」）/ 達成済み内訳あり、本番目標と長期目標のタイトル差。
- `goal-schema.test.ts`: 新規長期目標に `deadline` キーが無いこと、新規チェックポイントで期限・親が必須、編集で XOR が `parentGoalId` にフォワードされること。

### 13.3 UI（`renderWithMantine`）

- 本番目標の下に子が期限昇順で並ぶ。長期目標の下にもその親の子だけが並ぶ（他の親の子が混ざらない）。
- 「{親名}にチェックポイントを追加」で当該グループにフォームが開き、期限の既定が次の日曜。
- 3件目の追加で crowded `Alert` が出る。**別の親では出ない**（親ごとに数える）。
- 長期目標の新規フォームに期限フィールドが無い（`queryByLabelText(/期限/)` が `null`）。
- 編集で期限を消すと `toLongTerm` の予告 `Alert` が出る。子を持つ長期目標では期限が `disabled`。
- 削除で Confirm が開き、件数と内訳が出る。キャンセルで mutation が呼ばれない。
- 達成にすると行が親グループから消え、達成セクションの件数が増える。

`vite.config.ts` のカバレッジ設定に、Formisch の `Field` を含む新規コンポーネント（`checkpoint-row.tsx` は含まない）を必要に応じて `exclude` に、`src/features/goals/lib/*.ts` は既存の include パターンで拾われることを確認する。

---

## 14. 変更ファイル一覧

**Convex**

- 変更: `convex/lib/validators.ts`, `convex/lib/domain.ts`, `convex/services/goals/{create,update,remove,toGoalDto}.ts`, `convex/mutations/goals/remove.ts`
- 新規: `convex/services/goals/{assertCheckpointParent,listChildCheckpoints,assertNoChildCheckpoints}.ts` + 各テスト
- 無変更: `convex/schema.ts`（インデックス追加なし。テーブル定義は validator 経由で追従）, `convex/queries/goals/list.ts`, `convex/mutations/goals/{create,update,setAchieved}.ts`

**フロント**

- 新規: `src/features/goals/lib/{goal-tree,goal-tier-transition,goal-remove-confirm}.ts`（+ test）, `src/features/goals/components/{parent-goal-group,checkpoint-row,long-term-section,achieved-history-section,orphan-checkpoints-alert}.tsx`
- 変更: `goals-board.tsx`（§7.3 / §8）, `goal-form.tsx`（タイプ Select 撤去・variant 3値）, `goal-form-fields.tsx`（長期目標 / チェックポイント / 編集の3フォーム）, `goal-form-copy.ts`, `mastery-goal-card.tsx`（`MasteryGoalBody` へ分解して `ParentGoalGroup` から使う）, `exam-goal-card.tsx`（同様に `ExamGoalBody` へ）, `schemas/goal-schema.ts`, `hooks/use-goals-board-actions.ts`, `lib/goals-shimmer-template.ts`, `src/lib/run-mutation.ts`, `src/lib/theme.ts`（`Checkbox`）
- 削除: `src/features/goals/components/checkpoint-section.tsx`（+ test。`ParentGoalGroup` が役割を継ぐ）, `src/features/goals/lib/mastery-goals.ts`（+ test。`goal-tree.ts` が継ぐ）, `goal-type-labels.ts` の `GOAL_TYPE_SELECT_DATA`, `goal-guards.ts` の `isGoalType`（Select 撤去で不要）
- 削除・改名後は `vp run fallow` で未使用 export を確認し、`vp check` / `vp test` / `vp build` を通す

---

## 15. 検討した代替案（自己グリル）

1. **そもそも階層 UI は過剰では。期限順のフラット一覧のままでよい。**
   親が複数（本番目標 + 長期目標 N件）になった瞬間、期限順の一列は「この刻みがどの目標に効くのか」を消す。親 FK を入れる決定（マップ確定）と一列表示は両立しない。**譲歩**: 親が本番目標1件だけのユーザーには階層が過剰なので、長期目標0件のときは長期目標セクションを「見出し + 追加導線 + 薄字1行」まで縮め、カード枠も出さない。

2. **子は親カードの外に、インデント + 左罫の兄弟カードとして置く（設計ファイルの枠付き行をそのまま活かす）。**
   設計ファイルは階層のない一覧なので、枠付き行が兄弟として並んでいた。階層では枠 in 枠になり、1.5px インク罫が二重に見える。「紙1枚に子を書き込む」方が Paper Redesign の比喩に合う。**却下**。ただし設計ファイルの行の内部構造（チェックボックス / 内容+基準 / 期限 orange / 確定の数値 / 操作アイコン）はそのまま踏襲し、外枠だけ落とす。設計ファイルに階層ケースの記述はないため、これは「言語の踏襲 + 最小の拡張」であり設計ファイルとの矛盾ではない。

3. **validator を3分岐 union にして INV-1 を構造的に表現不能にする**（`exam` / 期限なし mastery / 期限+親 mastery）。
   **この却下は「#49 Phase 5 までの過渡状態における validator 設計」の判断に限る**（`parentGoalId` が `optional` で、親のないチェックポイントが DTO に現れる期間の話）。最強の強制になるが、その期間に限れば (a) Valibot の `v.variant("type", …)` は判別子の値が一意でなければならず、mastery が2枝になると `v.union` へ落ちてフィールド単位のエラー対象付けを失う、(b) TypeScript 上 `goal.deadline` が union の片枝にしか存在せず `"deadline" in goal` narrowing が全箇所に伝播する、(c) それでも INV-2〜5（親の所有者・種別・自己参照・チェーン）は services でしか検査できないので不変条件は2箇所に分かれる。**過渡期は却下**。この期間は INV-1 も services に集めて「不変条件は1箇所」を守る。
   **最終形は却下しない**: [#49 §3.2](checkpoint-parent-backfill.md) が Phase 5 で `goalDocumentValidator` / `goalDtoValidator` / `goalInputValidator` を2枝 union（checkpoint = `deadline` + `parentGoalId` 必須 / longTerm = どちらも無し）に締めることを決定済みで、上の (a) は #49 §8 の「画面のモードでスキーマを選び送信時に `type` を付ける」形、(b) は同 §8 の `isCheckpointGoal` + 8ファイルの narrowing 改修で解かれる。(c) は解かれない = **Phase 5 後も INV-2〜5 と入力段の INV-1 チェックは services に残る**（構造で守れるのは保存後の形だけで、他人の親・チェーン・自己参照は DB を読まないと分からない）。詳細は §2 / §3.1 の注記。

4. **サーバでツリーを組んで返す（`api.queries.goals.tree`）。**
   購読数は変わらず、DTO の形が2層に固定されて #53・週次レビューでの再利用が難しくなる。ツリー構築は時刻に依存しない純粋な仕分けなのでクライアントで十分。**却下**。

5. **達成済みは親グループの中に折りたたみで置く（現状の `CheckpointSection` の延長）。**
   親ごとに `Accordion` が増えて画面が刻まれ、「達成の履歴」を時系列で読む用途に合わない。**却下**（グローバル1本 + 行に親名を添える）。**ただし譲歩**: 親を削除すると達成済みの子も消えるという事実は履歴の観点で痛いので、Confirm に「うち達成済み N件」を必ず出す（§10）。

6. **達成済み親を必ず達成セクションへ移し、残った子は孤児扱いにする / 未達成の子がある親は達成にできないようにする。**
   前者は子の親が画面から消えて階層が読めなくなる。後者は「習得はいつでも自己判定で達成にできる」（`CONTEXT.md`）に反する。**却下**（「達成済みだが未達成の子あり」はツリーに残す）。代償として「終わったのに残る親」が一時的に出るが、`Badge` と薄字で説明でき、子を片づけるか消せば解決する。

7. **期限を外す操作にも Confirm を出す。**
   区分移行は可逆でデータも消えない。Confirm を可逆操作に配ると、本当に不可逆な削除の Confirm が軽く見える。**却下**（フォーム内ライブ予告 + 行き先入りトースト）。

8. **親の選択を `Radio.Group` にする。**
   `modern-web-guidance`（forms）の「1〜5件は radio、6件以上は select」に従えば、親が通常1〜3件の本アプリでは radio が有利。しかし長期目標は件数無制限（マップ確定）なので閾値で2種の UI を出し分けることになり、分岐とテストが増える。**Select + グループ見出しに一本化**。**譲歩**（ガイドの意図の回収）: 新規チェックポイントでは押した場所が親を決めるので選択操作そのものを消し、編集フォームでも候補が1件だけなら Select を出さず読み取り専用テキストにする。

9. **達成履歴を `Accordion` ではなく `<details>` / `hidden="until-found"` にしてページ内検索に出す。**
   ガイド（search-hidden-content）は `<details>` を推す。しかし Mantine 優先（`mantine-tailwind.md`）で `Accordion` は既に同じ用途で使っており、`<details>` を1箇所だけ入れると紙デザインのスタイル適用が二重管理になる。達成履歴は検索して探すものではなく開いて読むもの。**却下**（制約は §12 に明記して受容）。

10. **crowded 助言を親ごとに数えると、親3件で未達成9件まで警告なしに増える。**
    総数上限は置かない（マップ確定: 長期目標は件数制限なし、助言は親ごと）。総数のメーターを足す案は新機能の追加なので本仕様では**却下**。#52（週次レビュー）が「いま何件抱えているか」を見せる自然な場所になるので、必要ならそこで扱う。

11. **`parentGoalId` を最初から required にする。**
    既存の期限つき習得に親が無いのでデプロイ即破綻する。段階移行は #49 の担当。本仕様は `optional` で受け、UI は孤児を描ける。

12. **並び順はクエリの index 順（作成順）に暗黙に依存させる（DTO に `createdAt` を足さない）。**
    `by_owner_and_type` の index 順に依存すると、インデックスを1つ増やした瞬間に並びが変わる暗黙結合になる。純関数のテストも「呼び出し順」に依存して読みにくい。**却下**（`createdAt` を DTO に載せて明示ソート）。DTO が数値1つ太るコストは受容。

13. **子取得用に `by_owner_and_parentGoalId` インデックスを足す。**
    1所有者の目標は数件〜数十件で、`by_owner_and_type` で `mastery` に絞ってから TS で filter すれば読み取り量は同じオーダー。プレフィックス重複ではないが、使わない索引を先に置かない（CVX-12 の精神）。**却下**。追加の判断基準は §3.2 に明記。

14. **目標タイプ Select を残す（撤去しない）。**
    導線が型と区分を決める設計にすると Select は常に1択になり、「変えられない選択肢」を見せるだけになる。既存の「編集では disabled で見せる」配慮も、区分移行が期限フィールドで表現される以上は不要。**撤去**。タイプ不変はサーバの `GOAL_TYPE_IMMUTABLE_MESSAGE` が保証する。

---

## 16. 次チケットへの引き渡し

- **#49**: `parentGoalId` の `optional → required` 昇格手順、既存の期限つき習得への親付与（本番目標がないユーザーの扱い）。本仕様の孤児グループ（§7.4）は #49 完了後は常に空になる前提で置いている。
- **#50**: `CONTEXT.md` に「長期目標」を追加し「チェックポイント」（「本番目標とはデータ上独立」→「必須の親を FK で持つ」）「習得」を改訂。ADR-0006 の「FK なし」を改訂（または新 ADR）。本仕様の §2（区分と不変条件）と §15-3/5/6 の理由をそのまま素材にできる。
- **#53**: 目標×記録の紐付け。行の「確定 N分 / M日」は現状 ADR-0007 の非正規化カウンタなので、紐付けを入れるならこの行の意味が変わる。本仕様は行のレイアウト位置だけを固定しており、中身の定義は #53 の決定に従う。

---

## 改訂（2026-09-02）— #72 本番の結果と次の本番

- 本番目標の列は「進行中の本番（無ければ空状態 / 作成フォーム）→ 未達成の子が残る終了した本番」の縦並びになった。終了した本番のカードはカウントダウンの代わりに結果を出し、「追加」導線を持たない。
- 「達成した目標」セクションは、終了して子も片づいた本番を本番バッジ付きで先頭に並べ、件数に含める。
- §0-3 の除外条件（「達成済みだが未達成の子が残っている親はツリーに残す」）は終了した本番にも同じく適用する。
- 編集フォームの親 Select は進行中の本番と未達成の長期目標だけを候補に出し、今の親だけは終了していても残す。
- 詳細は [exam-result.md](./exam-result.md) と [ADR-0015](../adr/0015-exam-result-closes-goal.md)。
