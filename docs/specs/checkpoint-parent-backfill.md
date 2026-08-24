# 既存チェックポイントの親バックフィル規則（#49）

- 状態: 決定済み（2026-08-24）。実装は別セッション。
- 対象: `goals` テーブルへの `parentGoalId`（自己参照 FK）の段階的導入と、既存の期限つき習得（チェックポイント）への親の後付け。
- 前提となる決定: 長期目標 = 期限なしの習得 / チェックポイントは必須の親（本番目標 or 長期目標）を FK で持つ / 親の削除は子をカスケード削除 / 区分の双方向移行を許す（[ADR-0005](../adr/0005-goal-types-by-structure.md)・[ADR-0006](../adr/0006-checkpoints-replace-weekly-goals.md) の「FK なし」はこの決定で改訂される）。
- このドキュメントの担当範囲: **スキーマの段階的移行・バックフィル規則・検証・ロールバック**。親選択 UI / crowded 助言 / カスケード削除の確認ダイアログ本体は目標階層の実装仕様（#48 系）が持つ。境界は §7 に明記する。

---

## 1. 現状（コードから確認した事実）

`convex/schema.ts` の `goals` は union validator 1本で、習得の枝は次の形（`convex/lib/validators.ts`）。

```ts
// 現状: 期限つきかどうかは deadline の有無だけで表され、親は存在しない
const masteryGoalInputFields = v.object({
  content: v.string(),
  criterion: v.string(),
  deadline: v.optional(v.string()), // ← あれば「チェックポイント」
  type: v.literal(masteryType),
});
const masteryGoalFields = masteryGoalInputFields.extend({ achievedAt: v.optional(v.string()) });
const masteryGoalDocumentFields = masteryGoalFields.extend({
  activeDays: v.number(), // ADR-0007 の非正規化カウンタ
  confirmedMinutes: v.number(),
});
```

- インデックスは `by_owner_and_type: ["ownerId", "type"]` の1本だけ。
- 本番目標（`type: "exam"`）は所有者につき1件（`convex/services/goals/create.ts` の `SINGLE_EXAM_GOAL_MESSAGE` で作成時に排他）。ただし**過去に作られた重複を排除する仕組みは無い**ので、規則は重複に耐える必要がある。
- チェックポイントの画面上の従属は `groupMasteryGoals`（`src/features/goals/lib/mastery-goals.ts`）と `CheckpointSection` が担っており、**データ上の親子は現在まったく存在しない**。なお **この2つは #48 §14 で削除され**、`goal-tree.ts` / `ParentGoalGroup` が役割を継ぐ（#49 の実装時点では存在しない前提。§8）。
- `@convex-dev/migrations` は未導入（`package.json` に無い）。`convex/convex.config.ts` は `betterAuth` のみ `app.use` している。
- マルチユーザー（`ownerId = identity.subject`）。したがって「本番目標が無い所有者」は現実に存在しうる。

> ADR-0007 は「習得タイプの目標ドキュメントはどのデプロイにも存在しないのでバックフィル不要」と書いたが、その後チェックポイント一式が実装・デプロイされている。**今回は「たぶん0件」を前提にしない。**件数は §4 の監査クエリで数えてから進む。

---

## 2. 決定の要約

1. `parentGoalId: v.id("goals")` を習得の枝に導入する。最終形は**習得を2枝に割る union**で、「期限あり ⇔ 親あり」をスキーマで機械的に守る（§3）。
2. 移行は 5 フェーズ。**書き込み側を先に締めてから**バックフィルする（Phase 2 → Phase 3）。孤児の集合を凍結してからしか backfill しない（§4）。
3. バックフィル規則は所有者単位で決定的な4段の優先順位（§5）。本番目標が無い所有者も含めて全ケースを網羅し、**達成済み履歴の書き換えだけは拒否して人に返す**。
4. 監査（`internalQuery`）が移行のゲート・検証・修復検知を兼ねる（§6）。
5. ロールバックは「Phase 1 の緩いスキーマへ戻す → 逆マイグレーションで FK を落とす」。**昇格で外した期限は戻らない**ので、Phase 3 の前に snapshot と監査出力を残すことを手順に含める（§9）。

---

## 3. スキーマ変更（CVX-10/11/12/13/16）

### 3.1 Phase 1（緩める）: `convex/lib/validators.ts`

```ts
//? #49 Phase 1: 既存ドキュメント(親なし)を通すため optional で入れる。ここでは不変条件を守らない。
const masteryGoalInputFields = v.object({
  content: v.string(),
  criterion: v.string(),
  deadline: v.optional(v.string()),
  parentGoalId: v.optional(v.id("goals")),
  type: v.literal(masteryType),
});
```

`goalDtoValidator` / `goalInputValidator` も同じ枝を共有しているので、DTO 側にも `parentGoalId` が optional で現れる（型は `FunctionReturnType` 経由で自動追随。手書きの型は増やさない）。

### 3.2 Phase 5（締める）: 習得を2枝に割る

```ts
//? 期限の有無だけがチェックポイントと長期目標を分ける(ADR-0005: 型は増やさない)。
//? 期限を持つ枝だけが親 FK を必須にすることで「期限 ⇔ 親」がスキーマの不変条件になる(CVX-16)。
const masteryCoreFields = {
  content: v.string(),
  criterion: v.string(),
  type: v.literal(masteryType),
};

//* チェックポイント: 期限と親を必ず持つ
const checkpointInputFields = v.object({
  ...masteryCoreFields,
  deadline: v.string(),
  parentGoalId: v.id("goals"),
});

//* 長期目標: 期限を持たない = 親も持たない(トップ層)
const longTermInputFields = v.object(masteryCoreFields);

const masteryStateFields = {
  achievedAt: v.optional(v.string()),
  activeDays: v.number(),
  confirmedMinutes: v.number(),
};

const checkpointDocumentFields = checkpointInputFields.extend(masteryStateFields);
const longTermDocumentFields = longTermInputFields.extend(masteryStateFields);

export const goalDocumentValidator = v.union(
  examGoalFields.extend(goalOwnerField),
  checkpointDocumentFields.extend(goalOwnerField),
  longTermDocumentFields.extend(goalOwnerField),
);

export const goalDtoValidator = v.union(
  examGoalFields.extend(goalIdField),
  checkpointDocumentFields.extend(goalIdField),
  longTermDocumentFields.extend(goalIdField),
);

export const goalInputValidator = v.union(
  examGoalFields,
  checkpointInputFields,
  longTermInputFields,
);
```

Convex の object validator は厳格（未宣言フィールドを拒否）なので、この形は次を**保存不可能**にする。

- 期限があって親が無いドキュメント（= 移行前の孤児）
- 親があって期限が無いドキュメント（= 期限を外し忘れた長期目標）
- 親を持つ長期目標（チェーンの温床）

`convex deploy` は既存ドキュメントを新スキーマで検証して不一致なら push を落とすので、**Phase 5 のデプロイ自体が「孤児ゼロ」の最終ゲート**になる。

### 3.3 インデックス（`convex/schema.ts`）: **追加しない**

```ts
//? 親 FK を足してもインデックスは増やさない(CVX-12)。#48 §3.2 と同一の決定。
goals: defineTable(goalDocumentValidator).index("by_owner_and_type", ["ownerId", "type"]),
```

`convex/schema.ts` は**この仕様でも無変更**（テーブル定義は validator 経由で §3.1 / §3.2 に追従する）。

- 子の取得は #48 §3.2 / §4.1 で決まった `listChildCheckpoints`（`convex/services/goals/listChildCheckpoints.ts`）に一本化する: `by_owner_and_type` で `ownerId` + `type: "mastery"` に絞って `.collect()` → TypeScript 側で `parentGoalId === goalId` を抽出（`.filter` は書かない。CVX-10 の「取得後に TS で絞る」）。**Phase 5 でもこの実装を差し替えない。**
- 親の削除カスケード（#48 §4.2 の `remove`）と、子を持つ長期目標のチェックポイント化禁止判定（同 `assertNoChildCheckpoints`）はどちらもこの `listChildCheckpoints` を通すので、専用インデックスの用途が無い。1所有者の目標は数件〜数十件なので読み取り量も同じオーダー（CVX-11）。
- 索引を足す判断基準も #48 §3.2 と同じにする: **1所有者の目標が数百件規模になったとき**に `by_owner_and_parentGoalId`（`["ownerId", "parentGoalId"]`）を追加し、`listChildCheckpoints` だけをその読みへ差し替える。`parentGoalId` 単体キーの `by_parent` は作らない（所有者境界を索引に含めない形を新設しない）。この昇格は #49 のフェーズには含めない。
- crowded 助言（親ごとに3件目で警告）は**インデックス不要**。`goals.list` が所有者の目標を丸ごと返しているので UI 側で親ごとに数える（読み取り量は増えない）。
- `q.eq("parentGoalId", undefined)` に依存する読み取りは設計しない（長期目標の抽出は既存の全件 collect + TS 側の仕分けで足りる）。
- 親子のずれ（他所有者の親・dangling・チェーン）の検知はインデックスではなく監査の `crossOwnerParentCount` / `danglingParentCount` / `chainedCount` が担う（§6）。

### 3.4 `convex/lib/domain.ts` に足す定数（CVX-16）

```ts
//* #49 移行の監査。全所有者を横断するので上限で切る(CVX-11)。
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
```

---

## 4. フェーズ（optional → backfill → required）

| Phase | 内容 | デプロイ | 巻き戻し |
| --- | --- | --- | --- |
| 0 | `@convex-dev/migrations` 導入、`convex/migrations.ts`、監査クエリ追加、**監査を dev/prod で実行して件数を記録** | 可 | 単純 revert |
| 1 | スキーマを緩める（`parentGoalId` を optional 追加、§3.1） | 可 | 単純 revert |
| 2 | 書き込み側を締める（#48 の親選択 UI・services ガード。スキーマはまだ optional） | 可 | 単純 revert |
| 3 | バックフィル実行（`dryRun` → 本実行） | データ変更のみ | §9 |
| 4 | 監査で検証（孤児0・不整合0） | なし | — |
| 5 | バリデータを2枝に締める（§3.2）＋ Phase 2〜4 の孤児 UI を撤去（§8。インデックス追加は無し、§3.3） | 可（既存データ検証が走る） | §9 |

各フェーズは **dev デプロイメント → prod デプロイメント** の順で通す。

### なぜ Phase 2（書き込み）を Phase 3（バックフィル）より前に置くか

1. **孤児の集合が凍結される。** Phase 2 の後は新しい孤児が生まれないので、backfill と Phase 5 の間に競合が起きない（先に backfill すると、旧クライアントが作った孤児で Phase 5 の push が落ちる）。
2. **人が手で直す機会が先に来る。** Phase 2 で親セレクタが動いているので、所有者は監査が指す危ういケース（§5 規則3/4）を、決定的な当てずっぽうに任せず自分で親を選べる。バックフィルは**取りこぼしの受け皿**になる。

その代償として、Phase 2〜5 のあいだだけ「親未設定のチェックポイント」が UI に現れる。この表示は**新規に作らない**——#48 が安全網として置く `OrphanCheckpointsAlert` をそのまま使い、Phase 5 でそれを撤去する（§8）。

### 0-1. 導入（Phase 0）

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";

import betterAuth from "./betterAuth/convex.config";
import migrations from "@convex-dev/migrations/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(migrations);

export default app;
```

```ts
// convex/migrations.ts — crons.ts と同じ「フレームワーク配線」の平置きファイル。
//? 規則そのものは services/goals 側の純関数が SSoT で、ここは薄いアダプタだけ(CVX-02)。
import { Migrations } from "@convex-dev/migrations";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import schema from "./schema";
import { backfillCheckpointParents as backfillForOwner } from "./services/goals/backfillCheckpointParents";

export const migrations = new Migrations<DataModel>(components.migrations, { schema });

export const run = migrations.runner();

//* #49: 期限つき習得に親 FK を後付けする。所有者単位の規則なので、孤児を1件見つけたら
//? その所有者ぶんを一括で解決する。同一トランザクションの書き込みは同じバッチの後続の
//? migrateOne から見えるし、別バッチは再読込するので、残りの孤児は skip 側に落ちる。
export const backfillCheckpointParents = migrations.define({
  table: "goals",
  migrateOne: async (ctx, goal) => {
    if (goal.type !== "mastery") {
      return;
    }
    if (!("deadline" in goal) || goal.deadline === undefined) {
      return;
    }
    if ("parentGoalId" in goal && goal.parentGoalId !== undefined) {
      return;
    }
    await backfillForOwner(ctx, goal.ownerId);
  },
});

//* ロールバック用。親 FK を落とすだけで、昇格で外した期限は戻さない(§9)。
export const revertCheckpointParents = migrations.define({
  table: "goals",
  migrateOne: (_ctx, goal) =>
    goal.type === "mastery" && "parentGoalId" in goal ? { parentGoalId: undefined } : undefined,
});
```

実装上の注意（すべて決定事項）:

- `parallelize` は**使わない**（既定 off）。同じ所有者の複数ドキュメントへ順序依存の書き込みをするため。
- `batchSize` は既定（100）のまま。`goals` は所有者あたり数件〜数十件で、テーブル全体も小さい。
- README の例は `ctx.db.patch(doc._id, ...)` の旧形だが、**このリポジトリの書き込みは必ずテーブル名を第1引数に取る**（CVX-13）。`migrateOne` から patch オブジェクトを返す短縮形はコンポーネント内部の書き込みになるので、`revertCheckpointParents` のような単一フィールド操作だけに限る。
- `convex-test` はコンポーネントを登録していないので、**15 個のテストファイルの `import.meta.glob` 除外リストに `"!./migrations.ts"` を追加する**（`crons.ts` と同じ扱い）。対象: `authPublicConfig` / `boardSchedule` / `goals` / `goals.masteryProgress` / `goals.masteryProgressRepair` / `goals.obstacles` / `learningLog` / `ownerIsolation` / `presetReview` / `profile` / `recentConcreteActions` / `rows.status` / `setup` / `smoke` / `targets` の各 `.test.ts`。

### 3. 実行コマンド（Phase 3）

```sh
# 予行: 1バッチだけ走らせて throw する(コミットされない)
npx convex run migrations:backfillCheckpointParents '{"dryRun": true}'

# 本実行
npx convex run migrations:backfillCheckpointParents

# 進捗・状態
npx convex run --component migrations lib:getStatus --watch

# 途中で止める / やり直す
npx convex run --component migrations lib:cancel '{"name": "migrations:backfillCheckpointParents"}'
npx convex run migrations:backfillCheckpointParents '{"reset": true}'
```

> このドキュメントの作成セッションではコマンドを**実行していない**（デプロイメントに触らない制約）。実行は実装セッションが、prod snapshot 取得後に行う。

---

## 5. バックフィル規則（決定的・所有者単位）

### 用語

- **孤児**: `type === "mastery"` かつ `deadline` あり かつ `parentGoalId` なし。
- **親候補**: 本番目標（`type === "exam"`）または「期限なしの習得」＝長期目標。定義上どちらも親を持たない（トップ層）。

### 決定順（上から評価し、最初に当たった規則だけを適用）

孤児が0件なら何もしない（`plan: "none"`）。

1. **規則1 — 本番目標を親にする（`plan: "exam"`）**
   所有者に本番目標があれば、その `_id` を全孤児の親にする。重複がある場合は `_creationTime` の昇順で最古（同値は `_id` の辞書順）。
   *根拠*: 移行前の UI はチェックポイントを本番目標の直下に期限順で並べていた（`CheckpointSection`）。画面が示していた従属を、そのままデータにする。期限は1件も失われない。

2. **規則2 — 既存の長期目標を親にする（`plan: "longTerm"`）**
   本番目標が無く、期限なしの習得があれば、そのうち**未達成のもの**の最古を親にする。未達成が無ければ達成済みの最古（達成済みを親にするのは意味論として弱いが、**そのドキュメントを一切書き換えない**ので履歴は無傷）。
   *根拠*: 期限を1件も失わず、文章を1文字も捏造しない。親の当て違いは Phase 2 で入った親セレクタから所有者が付け替えられる（可逆）。

3. **規則3 — 孤児のうち1件を長期目標へ昇格させる（`plan: "promote"`）**
   親候補がまったく無い所有者では、**未達成の孤児のうち期限がもっとも遠いもの**（同値は最古 → `_id` 順）から `deadline` を外して長期目標にし、それを残りの孤児の親にする。昇格したドキュメントは `parentGoalId` を持たない（両フィールドを同時に落とす）。
   *根拠*: 「期限を外す = トップ層の長期目標へ」は所有者向けに用意した正規の移行操作そのもの（区分の双方向移行）。もっとも遠い期限はその集合でいちばん長期的な言明なので親として自然で、失う期限はいちばん急がないもの1件だけ。捏造したドキュメントを画面に置かない（「具体的手順」の語彙に反する機械生成文を作らない）。
   *損失*: 期限1件（不可逆）。監査が事前にこの所有者と失う日付を名指しするので、所有者は Phase 2 の UI で先に親を作って規則1/2 に落とすことができる。

4. **規則4 — 手に返す（`plan: "manual"`、マイグレーションは throw する）**
   親候補が無く、孤児が**すべて達成済み**の場合。`ConvexError`（`CHECKPOINT_BACKFILL_MANUAL_MESSAGE`）で落とす。
   *根拠*: 達成済みは履歴で、履歴は後から書き換えない（ADR-0007 の無修正主義）。ここで期限を外すのは履歴の改変にあたる。捏造した親を作るのも同じ理由で採らない。監査ゲートを通しているので、この状態は「実行前に分かっている」ものとして人が長期目標を1件作れば規則2 に落ちる。

### 期限の形が壊れているケース

`deadline` があるが `DATE_JST_PATTERN` に合わない場合、**黙って直さず throw する**（`CHECKPOINT_DEADLINE_MALFORMED_MESSAGE`）。マイグレーションのバッチは1トランザクションなので部分適用は起きない。クライアントは `""` を `undefined` に畳み、services も `isDateJst` で弾いているので理論上存在しないが、存在したら人が見るべきデータである。

### 純関数（CVX-09）— `convex/services/goals/planCheckpointParents.ts`

```ts
import type { Doc, Id } from "../../_generated/dataModel";
import type { CheckpointBackfillPlan } from "../../lib/domain";
import { compareDateJst } from "../../lib/jst";

export type CheckpointParentPlan = {
  //? 親を書き込む孤児(昇格対象は含まない)
  assignGoalIds: readonly Id<"goals">[];
  //? 孤児に書き込む親。孤児が無い / 人に返す場合は null
  parentGoalId: Id<"goals"> | null;
  //? どの規則が当たったか。監査の出力と同じ語彙(CVX-16)
  plan: CheckpointBackfillPlan;
  //? 期限を外して親に昇格させる孤児。規則3 のときだけ入る
  promoteGoalId: Id<"goals"> | null;
};

type MasteryDoc = Extract<Doc<"goals">, Record<"type", "mastery">>;

//? Phase 1(optional)と Phase 5(2枝 union)のどちらの型でも同じに動く読み出し。
function deadlineOf(goal: MasteryDoc): string | undefined {
  return "deadline" in goal ? goal.deadline : undefined;
}

function parentOf(goal: MasteryDoc): Id<"goals"> | undefined {
  return "parentGoalId" in goal ? goal.parentGoalId : undefined;
}

function byOldest(left: Doc<"goals">, right: Doc<"goals">): number {
  return left._creationTime - right._creationTime || left._id.localeCompare(right._id);
}

function byFarthestDeadline(left: MasteryDoc, right: MasteryDoc): number {
  return (
    compareDateJst(deadlineOf(right) ?? "", deadlineOf(left) ?? "") || byOldest(left, right)
  );
}

export function planCheckpointParents(goals: readonly Doc<"goals">[]): CheckpointParentPlan {
  const mastery = goals.filter((goal): goal is MasteryDoc => goal.type === "mastery");
  const orphans = mastery.filter(
    (goal) => deadlineOf(goal) !== undefined && parentOf(goal) === undefined,
  );
  if (orphans.length === 0) {
    return { assignGoalIds: [], parentGoalId: null, plan: "none", promoteGoalId: null };
  }
  const assignAll = orphans.map((goal) => goal._id);

  //* 規則1
  const exam = goals.filter((goal) => goal.type === "exam").sort(byOldest)[0];
  if (exam !== undefined) {
    return { assignGoalIds: assignAll, parentGoalId: exam._id, plan: "exam", promoteGoalId: null };
  }

  //* 規則2
  const longTerms = mastery.filter((goal) => deadlineOf(goal) === undefined).sort(byOldest);
  const longTerm = longTerms.find((goal) => goal.achievedAt === undefined) ?? longTerms[0];
  if (longTerm !== undefined) {
    return {
      assignGoalIds: assignAll,
      parentGoalId: longTerm._id,
      plan: "longTerm",
      promoteGoalId: null,
    };
  }

  //* 規則3 / 規則4
  const promoted = orphans
    .filter((goal) => goal.achievedAt === undefined)
    .sort(byFarthestDeadline)[0];
  if (promoted === undefined) {
    return { assignGoalIds: [], parentGoalId: null, plan: "manual", promoteGoalId: null };
  }
  return {
    assignGoalIds: assignAll.filter((goalId) => goalId !== promoted._id),
    parentGoalId: promoted._id,
    plan: "promote",
    promoteGoalId: promoted._id,
  };
}
```

### 適用（CVX-02/15）— `convex/services/goals/backfillCheckpointParents.ts`

```ts
import type { MutationCtx } from "../../_generated/server";
import {
  CHECKPOINT_BACKFILL_MANUAL_MESSAGE,
  CHECKPOINT_DEADLINE_MALFORMED_MESSAGE,
} from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { isDateJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import { planCheckpointParents } from "./planCheckpointParents";

export type BackfillCheckpointParentsResult = {
  assigned: number;
  plan: ReturnType<typeof planCheckpointParents>["plan"];
  promoted: number;
};

//* 所有者1人ぶんの孤児を1トランザクションで解決する(CVX-15)。規則は純関数側が SSoT。
export async function backfillCheckpointParents(
  ctx: MutationCtx,
  ownerId: string,
): Promise<BackfillCheckpointParentsResult> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId))
    .collect();
  for (const goal of goals) {
    if (goal.type === "mastery" && "deadline" in goal && goal.deadline !== undefined) {
      if (!isDateJst(goal.deadline)) {
        throwDomain(new ValidationFailedError({ message: CHECKPOINT_DEADLINE_MALFORMED_MESSAGE }));
      }
    }
  }
  const plan = planCheckpointParents(goals);
  if (plan.plan === "manual") {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_BACKFILL_MANUAL_MESSAGE }));
  }
  if (plan.parentGoalId === null) {
    return { assigned: 0, plan: plan.plan, promoted: 0 };
  }
  if (plan.promoteGoalId !== null) {
    //? 昇格は期限を外すだけ。トップ層なので親は持たない(両方 undefined で落とす)
    await ctx.db.patch("goals", plan.promoteGoalId, {
      deadline: undefined,
      parentGoalId: undefined,
    });
  }
  for (const goalId of plan.assignGoalIds) {
    await ctx.db.patch("goals", goalId, { parentGoalId: plan.parentGoalId });
  }
  return { assigned: plan.assignGoalIds.length, plan: plan.plan, promoted: plan.promoteGoalId === null ? 0 : 1 };
}
```

`internalMutation` のラッパ（テストと単発修復のための入口。`recomputeMasteryProgress` と同じ前例に倣う）:

```ts
// convex/mutations/goals/backfillCheckpointParents.ts
import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { backfillCheckpointParents as backfill } from "../../services/goals/backfillCheckpointParents";

//* 所有者を引数に取る internal な修復入口。scheduler / crons からは呼ばない(CVX-05 の対象外)。
export const backfillCheckpointParents = internalMutation({
  args: { ownerId: v.string() },
  returns: v.object({ assigned: v.number(), plan: v.string(), promoted: v.number() }),
  handler: async (ctx, args) => backfill(ctx, args.ownerId),
});
```

### 冪等性と収束（バッチ順序に依存しないことの証明）

- **skip 条件**: `migrateOne` は「習得 かつ 期限あり かつ 親なし」以外を即 return する。2回目の実行では孤児が居ないので全件 skip（`reset: true` で再実行しても同じ）。
- **同一バッチ内**: バッチは1つの mutation なので、先行する `migrateOne` の書き込みは後続の読み取りから見える。よって同じ所有者の2件目以降は skip 側に落ちる。
- **バッチ跨ぎ**: 後続バッチはドキュメントを読み直すので、前バッチで付いた `parentGoalId` が見える。
- **順序独立**: 孤児 A, B（親候補なし、B の期限がより遠い）で、
  - A を先に処理 → 規則3 で B を昇格（B の期限を外す）→ A に親 B を書く → ループが B に来たとき B は期限なしなので skip。
  - B を先に処理 → 規則3 で B 自身を昇格 → A に来たとき B は「期限なしの習得」なので規則2 が B を選ぶ。
  どちらも同じ最終状態。
- **昇格対象が既に親を持つことはない**: 昇格が選ばれるのは親候補が0のときだけ。もし孤児のどれかに既に親 P が付いていれば P は本番目標か期限なしの習得なので、規則1/2 が先に当たり規則3 に到達しない（対偶）。

---

## 6. 監査クエリ（ゲート兼検証）

`convex/queries/goals/auditCheckpointParents.ts`（**`internalQuery`**。全所有者の `ownerId` を返すので絶対に公開しない。CVX-01/04）

```ts
export const auditCheckpointParents = internalQuery({
  args: {},
  returns: checkpointParentAuditValidator,
  handler: async (ctx) => audit(ctx),
});
```

`convex/lib/validators.ts` に返り値の形（CVX-03 の returns バリデータ、CVX-16 の SSoT）:

```ts
//? 値の SSoT は domain.ts のタプル。ここは validator を組み立てるだけ(CVX-16)。
const [examPlan, longTermPlan, promotePlan, manualPlan, nonePlan] = CHECKPOINT_BACKFILL_PLANS;

export const checkpointBackfillPlanValidator = v.union(
  v.literal(examPlan),
  v.literal(longTermPlan),
  v.literal(promotePlan),
  v.literal(manualPlan),
  v.literal(nonePlan),
);

export const checkpointParentAuditOwnerValidator = v.object({
  examGoalCount: v.number(),
  longTermCount: v.number(),
  orphanCount: v.number(),
  ownerId: v.string(),
  plan: checkpointBackfillPlanValidator, // CHECKPOINT_BACKFILL_PLANS から作る union
  promoteLosesDeadline: v.union(v.string(), v.null()),
});

export const checkpointParentAuditValidator = v.object({
  chainedCount: v.number(), //? 親自身が親を持つ(チェーン)
  crossOwnerParentCount: v.number(), //? 親の ownerId が子と違う
  danglingParentCount: v.number(), //? 親 id が実在しない
  malformedDeadlineCount: v.number(),
  orphanCount: v.number(), //? 期限あり・親なし
  owners: v.array(checkpointParentAuditOwnerValidator),
  parentWithoutDeadlineCount: v.number(), //? 親あり・期限なし
  selfParentCount: v.number(),
  truncated: v.boolean(),
});
```

実装は `convex/services/goals/auditCheckpointParents.ts`（`QueryCtx` ベース + 純関数）。

- 読み取りは `ctx.db.query("goals").take(CHECKPOINT_AUDIT_LIMIT + 1)`。**全所有者横断なのでインデックスが張れない**が、上限で必ず切れるので無制限 collect にはならない（CVX-11 の意図を満たす）。超過時は `truncated: true` を返し、参照整合の判定（dangling / chained）は信頼できないものとして扱う。
- 所有者ごとの `plan` と `promoteLosesDeadline` は `planCheckpointParents`（§5 の純関数）を**そのまま**呼んで求める。監査と実行で規則が二重化しない。
- `Date.now()` を使わない（CVX-14）。日付引数も取らない。

実行:

```sh
npx convex run queries/goals/auditCheckpointParents:auditCheckpointParents
```

**ゲート条件**

- Phase 3 の前: `malformedDeadlineCount === 0`、`plan === "manual"` の所有者が0、`plan === "promote"` の所有者があれば所有者本人の了解（または手動で親を作って解消）。
- Phase 5 の前: `orphanCount === 0` かつ `parentWithoutDeadlineCount === 0` かつ `danglingParentCount === 0` かつ `chainedCount === 0` かつ `selfParentCount === 0` かつ `crossOwnerParentCount === 0` かつ `truncated === false`。

---

## 7. 他チケットとの境界

このドキュメントが**決める**もの:

- `parentGoalId` の validator / インデックスを足さない決定 / フェーズ順序（§3, §4）
- バックフィル規則・純関数・適用関数・監査（§5, §6）
- `buildGoalTree` の**孤児仕分け規則の確定**と、孤児 UI の撤去タイミング（§8）
- ロールバック手順（§9）

目標階層の実装仕様（#48 系）が**決める**もの（ここでは前提として参照するだけ）:

- 親セレクタ（新規/編集フォーム）と `GoalSchema` の分岐、`parentGoalId` の存在・所有者・トップ層チェック（services 側ガード）
- 孤児 UI の実体: `OrphanCheckpointsAlert`（`src/features/goals/components/orphan-checkpoints-alert.tsx`、#48 §7.4）と `buildGoalTree()`（`src/features/goals/lib/goal-tree.ts`、#48 §6.1）。**#49 はここに何も足さない**
- `listChildCheckpoints`（子取得の実装、#48 §3.2 / §4.1）
- 親削除のカスケードと確認ダイアログの文言・件数表示
- crowded 助言を親ごとに数える実装、長期目標セクションと追加導線
- ADR-0006 の改訂（「データ上の親子は持たない」→ FK を持つ）と CONTEXT.md の「チェックポイント」「長期目標」の語彙更新

依存関係: **Phase 2 = #48 の書き込み経路の着地**。#48 が出るまで Phase 3 は走らせない。逆に #48 の実装は、Phase 5 まで `parentGoalId` が optional である前提（親未設定のチェックポイントが DTO に現れる）でコードを書く必要がある。

---

## 8. UI（Phase 2〜4 の孤児表示は #48 のものを使う）

**新しい孤児 UI は作らない。** 孤児表示は #48 §7.4 の `OrphanCheckpointsAlert`（`src/features/goals/components/orphan-checkpoints-alert.tsx`）と、#48 §6.1 の `buildGoalTree()` が返す `GoalTree.orphans` をそのまま使う。

- **`CheckpointSection` / `groupMasteryGoals` への追加はしない。** #48 §14 はこの2つ（`src/features/goals/components/checkpoint-section.tsx` と `src/features/goals/lib/mastery-goals.ts`）を**削除**し、`ParentGoalGroup` と `goal-tree.ts` が役割を継ぐ。依存順は §7 のとおり Phase 2 = #48 の着地なので、#49 の実装時点でこの2ファイルは存在しない。
- 置き場所・見た目・文言はすべて #48 §7.4 の決定（`Alert color="yellow" variant="light" title="親のないチェックポイント"`、長期目標セクションの直後、行は `CheckpointRow`）。#49 側で色・文言・`Badge` を足さない（UI の二重定義を作らない）。
- 抽出も #48 §6.1 の `buildGoalTree()` 1本。#49 は **`GoalTree.orphans` の仕分け規則を確定させるだけ**（下記）。
- Phase 5 の撤去対象は次の2つ:
  1. `src/features/goals/components/orphan-checkpoints-alert.tsx`（+ そのテストと `goals-board.tsx` からの呼び出し）を削除。
  2. `GoalTree` から `orphans` フィールドと、`buildGoalTree` の孤児仕分け分岐を削除（`goal-tree.test.ts` の孤児ケースも同時に落とす）。
     型が2枝 union になった時点で「親 id を解決できないチェックポイント」は DTO に現れなくなるため、この分岐は到達不能コードになる。

### `buildGoalTree` の孤児仕分け規則（#48 §6.1 の規則2/4 の衝突をここで解消する）

**孤児判定が達成済み判定より先に来る。** 判定順を1つに固定する:

1. `mastery` かつ `deadline` あり かつ（`parentGoalId` が無い / 親が `goals` に居ない / 親がチェックポイント）→ **`orphans`**。`achievedAt` の有無は問わない。
2. 1 に当たらなかったもののうち `achievedAt` があり、かつ未達成の子を持たないもの → `achieved`（#48 §6.1 規則4 はこの「1 に当たらなかったもの」に対して読む）。
3. 残りは #48 §6.1 の規則1/3/5 のまま（親グループ・長期目標・親グループの子は未達成のみ）。

同じ目標が `orphans` と `achieved` の両方に現れることはない（1 と 2 は排他）。

*この順序を選ぶ理由*: 達成済みの孤児こそ §5 規則4（`plan: "manual"` でマイグレーションが throw する）の対象そのもので、所有者が Phase 2〜4 のあいだに**画面から**手当てできなければならない。達成済みを先に `achieved` へ落とすと、唯一の当事者が孤児 Alert に現れず、§4 の「人が手で直す機会を先に作る」という順序の根拠が崩れる。逆に、達成済みの孤児を `orphans` に置いても失うものは無い（`achieved` の行は親名を薄字で添える設計なので、親のない行はそこでは意味を持たない）。並びは #48 §7.4 の `CheckpointRow` の既定どおり期限昇順。

> #48 側のドキュメント文言（§6.1 規則4）にこの「孤児でないもののうち」という限定を1行入れる必要がある。#48 のスペックは #49 の担当範囲外なので、この同期は §12 の宿題に置く（規則そのものはここで確定済み）。

`src/features/goals/lib/goals-shimmer-template.ts` は #48 §7.6 で既に `parentGoalId` / `createdAt` を持つ階層テンプレートへ更新済み。#49 では Phase 5 の型変更に合わせて**長期目標テンプレートから `deadline` キーを落とすだけ**（下表）。

### Valibot / Formisch（フォームの形）

親セレクタ本体は #48 の担当だが、`GoalSchema` の**最終形**はここで固定する（Convex の `goalInputValidator` と1対1になる、CVX-16）。

```ts
// src/features/goals/schemas/goal-schema.ts (Phase 5 の最終形)
const CheckpointFieldsSchema = v.object({
  content: ConcreteActionSchema,
  criterion: v.pipe(v.string(), v.trim(), v.minLength(1, MASTERY_CRITERION_MESSAGE)),
  deadline: DateJstSchema, //? チェックポイントでは必須
  parentGoalId: v.pipe(v.string(), v.minLength(1, CHECKPOINT_PARENT_REQUIRED_MESSAGE)),
});

const LongTermFieldsSchema = v.object({
  content: ConcreteActionSchema,
  criterion: v.pipe(v.string(), v.trim(), v.minLength(1, MASTERY_CRITERION_MESSAGE)),
});
```

`GoalSchema` は `v.variant("type", [...])` の3枝（`exam` / `mastery`(checkpoint) / `mastery`(longTerm)）にはできない（`variant` の判別子は1フィールド）ので、**フォームは画面のモード（チェックポイント追加 / 長期目標追加）でスキーマを選び**、送信時に `type: "mastery"` を付ける。既存の `MasteryGoalFields` が `initialType` でスキーマを選んでいるのと同じ構造の延長で、判別子（`type`）はドメイン上2値のまま増えない。

### Phase 5 で必要になる型ナローイングの改修（漏れなく列挙）

2枝 union になると `MasteryGoal` に対する `goal.deadline` 直接参照が型エラーになる。共通ヘルパを1箇所に置き、参照側を差し替える。

```ts
// src/features/goals/types/goal.ts
export type Checkpoint = Extract<MasteryGoal, Record<"parentGoalId", GoalId>>;
export type LongTermGoal = Exclude<MasteryGoal, Checkpoint>;

//? mastery-goals.ts は #48 §14 で削除される。区分判定は goal-tree.ts が継ぐので、
//? 既に `goalTier` を持つこのファイルに型ガードも置く(判定の置き場所を1つに保つ)。
// src/features/goals/lib/goal-tree.ts
export function isCheckpointGoal(goal: MasteryGoal): goal is Checkpoint {
  return "parentGoalId" in goal;
}
```

改修対象（`deadline` 参照箇所すべて。**#48 適用後のファイル構成に対して読む**）:

| ファイル | 現状 | 変更 |
| --- | --- | --- |
| `src/features/goals/lib/goal-tree.ts` | `buildGoalTree` / `goalTier` の `goal.deadline !== undefined`、期限昇順ソートの `deadline ?? ""` | `isCheckpointGoal` で絞り、`?? ""` を消す。§8 の孤児分岐も同時に落とす |
| `src/features/goals/components/checkpoint-row.tsx` / `mastery-goal-card.tsx`（`MasteryGoalBody`） | `goal.deadline` 参照 | `isCheckpointGoal(goal) ? goal.deadline : undefined` を1回だけ計算（`CheckpointRow` は `Checkpoint` を受け取る形にできればそれで足りる） |
| `src/features/board/lib/nearest-checkpoint.ts` | `goal.deadline !== undefined` / `?? ""` | 戻り値の型を `Checkpoint | undefined` にする（下流2ファイルの `?.deadline` が不要になる） |
| `src/features/board/lib/board-schedule-events.ts` | `checkpoint?.deadline === undefined` | 上の戻り値型で素直に書ける |
| `src/features/board/components/board-kanban-tab.tsx` | `checkpoint.deadline === undefined` | 同上 |
| `src/features/goals/lib/goals-shimmer-template.ts` | `deadline: undefined` の枝 | 長期目標テンプレートから `deadline` キー自体を落とす |
| `convex/services/goals/toGoalDto.ts` | `deadline: goal.deadline` を常に載せる | 枝で分けて返す（`parentGoalId` も同様） |
| `convex/services/goals/toGoalDocument.ts` / `update.ts` | 単一の mastery 入力型 | 2枝の入力型を受ける（`replace` は枝ごとに完全な形を渡す） |

`src/features/board/*` は `~/features/goals` を直接 import していない（`~domain` と自前の型経由）ので、feature 間依存の禁止には触れない。

---

## 9. ロールバック

| 巻き戻したい時点 | 手順 |
| --- | --- |
| Phase 1/2 まで | コードを revert してデプロイ。データは無変更。 |
| Phase 3 の途中 | `lib:cancel` で停止 → 部分適用のままでも**スキーマは緩いので破綻しない**（孤児と親付きが混在するだけ）。`reset: true` で再実行、または下の逆マイグレーション。 |
| Phase 3 後 / Phase 5 後 | ① Phase 1 の緩いスキーマへ戻すデプロイ（**先にこれ。厳格な validator のままでは FK を落とせない**）→ ② `npx convex run migrations:revertCheckpointParents` → ③ 必要なら Phase 1 以前のコードへ revert。 |

不可逆な部分と手当て:

- **規則3 で外した期限は逆マイグレーションでは戻らない。** 手当ては (a) Phase 3 前に prod の snapshot をダッシュボードからエクスポートすること（手順に含める・必須）、(b) 監査出力（`promoteLosesDeadline`）を PR 本文に貼って人間可読な記録を残すこと。対象は所有者あたり最大1件なので、最悪でも手で戻せる。
- 逆マイグレーションは `parentGoalId` を落とすだけで、`deadline` には触らない（触れば別の破壊になる）。

---

## 10. テスト（CVX-19）

純関数（`convex/services/goals/planCheckpointParents.test.ts`、ハーネス不要）:

1. 孤児なし → `plan: "none"`、書き込みゼロ。
2. 本番目標あり → 全孤児が exam を親にする（達成済みの孤児も含む）。
3. 本番目標が2件（不正データ）→ 最古が選ばれる。
4. 本番目標なし・未達成の長期目標あり → その最古が親。
5. 本番目標なし・長期目標が達成済みのみ → その最古が親（達成済みでも親になれる）。
6. 親候補なし・未達成の孤児2件 → 期限がもっとも遠い1件が `promoteGoalId`、残りがその子。
7. 6 の同期限 → `_creationTime` 最古が昇格（決定性）。
8. 親候補なし・孤児が達成済みのみ → `plan: "manual"`。
9. 既に `parentGoalId` を持つチェックポイントは `assignGoalIds` に入らない。
10. 引数の配列順を入れ替えても同じ結果（順序独立）。

`convex-test`（`convex/goals.checkpointBackfill.test.ts`。`internal.mutations.goals.backfillCheckpointParents` を叩く）:

11. 規則1〜3 の適用後に、期限つき・親なしのドキュメントが残らない。
12. 同じ mutation を2回呼んでも結果が変わらない（冪等）。
13. 他所有者の目標が親にならない・書き換わらない（`ownerIsolation.test.ts` の作法に倣う）。
14. 達成済みチェックポイントは `parentGoalId` だけ付き、`achievedAt` / `activeDays` / `confirmedMinutes` が不変（ADR-0007 の凍結を壊さない）。
15. 壊れた `deadline` があると throw し、**同じバッチの他の書き込みも入らない**。
16. 規則4（達成済みのみ）で throw し、データが無変更。

監査（`convex/goals.checkpointAudit.test.ts`）:

17. 孤児・dangling・chained・self・cross-owner・parent-without-deadline をそれぞれ1件仕込み、各カウンタが1になる。
18. `CHECKPOINT_AUDIT_LIMIT` 超で `truncated: true`（上限を小さく差し替えられるようにするのではなく、境界値のケースだけ確認する）。

孤児の仕分け（§8 で確定した規則。テストは #48 の `src/features/goals/lib/goal-tree.test.ts` に足す。UI の実体は #48 のものなので #49 はケースを1つ増やすだけ）:

19. **達成済みの孤児**（`achievedAt` あり・`deadline` あり・親が解決できない）が `orphans` に入り、`achieved` には入らない（孤児判定が達成済み判定より先）。Phase 5 でこのケースごと削除する。

---

## 11. 検討した代替案（自己反論と回答）

**A. そもそも `parentGoalId` を optional のままにし、不変条件は services のガードで守れば移行はいらない。**
反論としては最強。実際 ADR-0007 は同種の選択（非正規化 + 経路網羅のテスト）をしている。それでも却下する理由は、ADR-0007 が自分で書いた教訓「書き込み経路の網羅漏れ = 表示が静かに狂う」がそのまま当てはまるのに、こちらには**修復関数が作れない**こと。カウンタは rows から数え直せるが、「どの親に属するはずだったか」は失われた情報で復元できない。スキーマで表現不可能にすれば、経路を1本忘れても `convex deploy` か実行時の validator が落ちる。**譲歩**: この決定は §8 の型改修（8ファイル）を強制する。改修は機械的で、`?? ""` のような偽の既定値が消えるぶん読みやすくなるので、代償として受け入れる。

**B. 2枝 union は TypeScript のナローイングを壊すので、DTO だけ permissive にして document validator だけ厳格にする。**
DTO は document から導出する（CVX-16）決まりなので、DTO だけ緩めると手書きの型が1つ増える。それは「props・型・args・return は validator から導出」という SSoT 原則の例外を作ることになる。却下。

**C. 本番目標が無い所有者には、機械生成の長期目標（「（親未設定）」など）を親として作る。**
期限を1件も失わない点で規則3 より優れる。却下理由は、そのドキュメントの `content` が「具体的手順」の規則（実行可能な一歩、抽象目標の禁止）を破る機械文になり、CONTEXT.md の語彙を画面上で裏切ること。所有者が消すか書き換えるまでゴミが残り、しかも**消すとカスケードで子が全部消える**（親だから）。規則3 は所有者自身が書いた文章を親に昇格させるので、消したくなる理由が生まれない。

**D. 規則3 で昇格させるのは「最古の孤児」でよいのでは。**
最古＝いちばん急ぐ期限（多くの場合）を落とすことになる。もっとも遠い期限を落とすほうが、失う情報の価値が小さく、かつ「いちばん長期の言明が親」という意味論に合う。

**E. 規則4（達成済みのみ）でも昇格させて、移行を絶対に止めないほうが運用は楽。**
楽だが、達成済みチェックポイントの期限を消すのは履歴の書き換えで、ADR-0007 が明文で拒んだ性質のもの。監査ゲートで**実行前に必ず分かる**ケースなので、止めて人に返すコストは小さい。所有者が長期目標を1件作れば規則2 に落ちる。

**F. `@convex-dev/migrations` は2ユーザーのアプリに過剰。`internalMutation` を CLI から1回叩けば済む。**
一部認める。実際 §5 の `internalMutation` ラッパだけで prod は片付く可能性が高い。それでもコンポーネントを入れるのは、(1) `dryRun` が「1バッチ走らせて throw」で本番の予行になる、(2) 実行状態・カーソル・失敗バッチが記録され再開できる、(3) 今後のスキーマ移行（通知・PWA・タイマーで確実に来る）で同じ手順を再利用できる、の3点。**譲歩**: コンポーネント導入自体が Phase 0 の変更（`convex.config.ts` と 15 個のテスト glob）を生む。この副作用は §4 に列挙済み。

**G. 所有者単位の一括解決は `migrateOne`（1件ずつ）の契約を破っており、バッチ境界で壊れる。**
壊れないことは §5 末尾で証明した（同一トランザクションの read-after-write、バッチ跨ぎの再読込、順序独立性）。**譲歩**: `parallelize: true` を付けると成立しなくなるので、既定 off を明記した。

**H. `dryRun` があるなら監査クエリは不要。**
`dryRun` は1バッチだけ走らせて throw するので、全体像（所有者別の適用規則、失う期限）が出ない。監査は「実行前に人が読む地図」で、`dryRun` は「機械が通ることの確認」。役割が違うので両方置く。

**I. カスケード削除と「子を持つ長期目標」の判定のために `by_parent`（`["parentGoalId"]`）を足すべきではないか。**
初版はそう決めていたが**却下**した。理由は2つ。(1) その用途は #48 §4.1 の `listChildCheckpoints` がすべて担っており、#48 §3.2 / §15-13 は「`by_owner_and_type` で `mastery` に絞って TS 側で `parentGoalId` 一致を取る」を明示的に選んでいる。#49 がここで索引を増やすと、同じ読み取りに2つの実装指示が並び、実装者が schema を変えるのか `listChildCheckpoints` を差し替えるのか判断できなくなる。(2) 1所有者の目標は数件〜数十件で読み取り量は同じオーダー、かつ `parentGoalId` 単体キーは所有者境界を索引に含めない新しい形を1つ増やす（`crossOwnerParentCount` で検知はできても、索引の形が増える価値がない）。索引を足す判断基準と名前（`by_owner_and_parentGoalId` = `["ownerId","parentGoalId"]`）は #48 §3.2 に揃え、#49 のフェーズには含めない（§3.3）。**譲歩**: 将来 `listChildCheckpoints` を索引読みへ差し替える日が来たら、差し替え箇所はその1ファイルだけで済む（呼び出し側の契約は変わらない）。

**J. 孤児表示は捨てるコードなので無駄。先に backfill すればいらない。**
先に backfill すると、決定的な当てずっぽう（特に規則3）が所有者の目に触れる前に確定する。しかも孤児表示は **#49 が作るものではない**——#48 が安全網として先に置く `OrphanCheckpointsAlert` と `GoalTree.orphans` で、#49 の追加コストはゼロ（#49 がするのは §8 の仕分け規則の確定と、Phase 5 での撤去だけ）。**「手で直す機会を先に作り、バックフィルは取りこぼしの受け皿にする」ほうが、失う期限の期待値が小さい。**

**K. 移行によって「本番目標を削除するとチェックポイントが全部消える」という新しい破壊力が生まれる。移行前は無関係だった。**
認める。これは階層化そのものの帰結（カスケード削除は確定済みの決定）だが、**バックフィルがその関係を自動で作る**ぶん、所有者が意図していない従属が生まれる。緩和は (1) 削除 Confirm に子の件数を明示（#48 の担当）、(2) 目標にはゴミ箱が無い（CONTEXT.md「ゴミ箱」は記録と日のみ）ため、#48 側で「削除の代わりに子を長期目標へ昇格させる」選択肢を検討する余地を残す（§12 の宿題）。所有者の再確認ポイントとして明示する。

---

## 12. 宿題 / 未決（この仕様の外）

- **#48 側のドキュメント同期（1行）**: goal-hierarchy-layout.md §6.1 の仕分け規則4 に「孤児でないもののうち」という限定を足す（§8 で確定した「孤児判定 → 達成済み判定」の順を #48 の文言にも反映する）。規則そのものは §8 が SSoT なので実装はこの仕様だけで足りるが、2つのドキュメントの文言を一致させる作業は #48 の担当。
- 親削除カスケードに「子を長期目標へ昇格させて残す」逃げ道を用意するか（目標にゴミ箱が無いため、現状の削除は不可逆）。#48 で判断。
- `convex/migrations.ts` を「crons.ts と同じフレームワーク平置き」として扱う件を `.claude/rules/convex-rules.md` CVX-20 に1行として追記するか。
- ADR の担当: ADR-0006 の「データ上の親子を持たない」の改訂は #48 の成果物に含める（この仕様では参照のみ）。ADR を分けるなら「チェックポイントの親 FK と移行」で1本にまとめるほうが読みやすい。
