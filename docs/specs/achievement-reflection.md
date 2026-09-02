# 達成の振り返り（#69）

- 状態: 決定済み・実装済み（2026-09-02）。地図 [#66](https://github.com/sc30gsw/cairn/issues/66)。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)、[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)、[formisch.md](../../.claude/rules/typescript/formisch.md)、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)。

## 1. 決定の要約

| 論点 | 決定 |
| --- | --- |
| 何を残すか | 習得の目標を達成にするとき「何が効いたか」を一行（200 文字まで）。任意で、書かなくても達成にできる |
| 入力の場面 | 達成チェックを入れた瞬間に小さなモーダルを開く。取り消し（達成を外す）はモーダルを出さず即反映 |
| 保存先 | `goals.reflection`（任意の文字列）。別テーブルは作らない。達成を外しても消えず、次に達成にするときの初期値になる |
| 表示 | 達成履歴（`AchievedHistorySection`）の各行に「振り返り: …」を併記。カードや共有文、レビューには載せない |
| 検証 | 前後の空白を落とし、空なら「無し」（`undefined`）。200 文字超はサーバーが `ValidationFailedError` を投げる。クライアントも Valibot で同じ上限を先に見る |
| 語彙 | `CONTEXT.md`「習得」に「達成にするとき『何が効いたか』を一行残せる（任意）」を追記。Avoid に「振り返りを必須にすること」「振り返りを共有文やレビューに載せること」 |

## 2. スキーマと関数

```ts
// convex/lib/validators.ts — masteryGoalFields に追加
reflection: v.optional(v.string()),
```

- `convex/lib/domain.ts`: `ACHIEVEMENT_REFLECTION_MAX_LENGTH = 200`、`ACHIEVEMENT_REFLECTION_LENGTH_MESSAGE`
- `convex/lib/achievementReflection.ts`（純関数）: `normalizeReflection(reflection)`。trim → 空なら `undefined` → 上限超は `throwDomain(ValidationFailedError)`
- `mutations/goals/setAchieved`: `args` に `reflection: v.optional(v.string())` を追加
- `services/goals/setAchieved.ts`:
  - `achievedAt === undefined`（取り消し）: 進捗を再計算し `achievedAt` だけを外す。`reflection` は触らない
  - `achievedAt` あり: `reflection` 引数が省略されたら既存値を保つ。渡されたら正規化した値で置き換える（空文字は「消す」）
- `services/goals/toGoalDto.ts`: `reflection` を DTO に載せる。`services/goals/update.ts` の replace は既存の `reflection` を引き継ぐ

## 3. UI

- `src/features/goals/schemas/achievement-reflection-schema.ts`: `AchievementReflectionSchema = v.object({ reflection: v.pipe(v.string(), v.trim(), v.maxLength(200, …)) })`。上限はドメイン定数から読む
- `src/features/goals/components/achievement-reflection-modal.tsx`: Mantine `Modal` + Formisch `Form`/`Field` + `Textarea`（autosize）。`goal` が変わるたびに `reset` で初期値（既存の振り返り）を入れ直す。送信で `onSubmit(reflection | undefined)` → `onClose`
- `goals-board.tsx`: 達成チェックは `requestSetAchieved` を通す。達成にする操作は `pendingAchievement` に留めてモーダルを開き、取り消しは即 `onSetAchieved`
- `achieved-history-section.tsx`: `reflection` があれば `REFLECTION_PREFIX`（「振り返り: 」）付きで斜体の一行を出す

## 4. テスト

- 純関数: `convex/lib/achievementReflection.test.ts`（trim、空→undefined、200 文字ちょうど、201 文字で throw）
- 統合: `convex/goals.reflection.test.ts`（保存、省略で維持、空文字で消す、取り消しで残る、DTO に載る、本番の目標では拒否）
- スキーマ: `achievement-reflection-schema.test.ts`
- UI: `goals-board.test.tsx`（チェック → モーダル → 送信で `reflection` 付きの `onSetAchieved`、キャンセルで呼ばれない、取り消しは即呼ばれる）

## 5. 端ケース

| ケース | 挙動 |
| --- | --- |
| 何も書かずに「達成にする」 | `reflection: undefined` で送る。既存の振り返りがあればサーバー側で維持される（省略と同じ） |
| 既存の振り返りを消したい | モーダルで空にして送る → 空文字 → `normalizeReflection` が `undefined` に落とし、保存値も消える |
| 達成 → 取り消し → 再達成 | 取り消しで振り返りは残る。再達成のモーダルには前回の文が初期値として入る |
| 本番（exam）の目標 | `setAchieved` 自体が `NOT_MASTERY_GOAL_MESSAGE` で拒否（従来どおり） |
| 200 文字超 | クライアントの Valibot で先に止まる。直接呼ばれてもサーバーが `ValidationFailedError` を投げる |
