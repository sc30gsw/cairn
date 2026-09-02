# 本番の結果と次の本番（#72）

- 状態: 決定済み・実装済み（2026-09-02）。地図 [#66](https://github.com/sc30gsw/cairn/issues/66)。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)（CVX-15 同一トランザクション）、[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)、[formisch.md](../../.claude/rules/typescript/formisch.md)、[valibot-validation.md](../../.claude/rules/typescript/valibot-validation.md)、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)。
- 参照: [ADR-0005](../adr/0005-goal-types-by-structure.md)（タイプは構造で切る・増やさない）、[ADR-0015](../adr/0015-exam-result-closes-goal.md)（本仕様の決定）、[goal-hierarchy-layout.md](./goal-hierarchy-layout.md)（本番目標の列と達成履歴の位置）。

## 1. 決定の要約

| 論点 | 決定 |
| --- | --- |
| 結果の形 | `goals.result = { score, recordedAt }`（任意）。`score` は目標帯と同じ `TOEIC_SCORE`（10〜990・5点刻み）、`recordedAt` は結果を入れた日（YYYY-MM-DD）。1本番につき1値 |
| 一度だけか訂正か | **訂正は許す**（同じ mutation を再度呼ぶ）。**取り消しはできない**（結果を消して進行中に戻す道は無い） |
| 履歴化 | 進行中 / 終了の判別は `result` の有無だけ。目標タイプは増やさない（ADR-0005 維持）。終了した本番は「達成した目標」（`AchievedHistorySection`）に本番バッジ付きで並ぶ |
| 「1件だけ」の改訂 | 「進行中は1件」。`SINGLE_EXAM_GOAL_MESSAGE` は結果なしの試験を数える。終了した本番は何件あってもよい。ADR は新規 [ADR-0015](../adr/0015-exam-result-closes-goal.md) |
| 子チェックポイント | **そのまま残す**。未達成の子が残る間は、終了した本番もツリー（本番目標の列）に残り、子の編集で親を付け替えられる（次の本番・長期目標）。終了した本番の下に新しいチェックポイントは足せない。子が全部片づくと本番は履歴に移る |
| カウントダウン | 終了した本番はカウントダウンを出さず結果を大きく出す。マイページ「今日の状況」も進行中の本番だけを見る（無ければ従来のプレースホルダ） |
| 次の本番の導線 | 進行中が無く終了した本番があるときの空状態は「次の本番を作りましょう」＋前回（本番日・結果）を添える。結果保存時のトーストは「本番の結果を記録しました。次の本番目標を作れます」、訂正は「本番の結果を訂正しました」 |
| 通知との相互作用 | `checkpointDeadline` 通知は子の期限だけを見るので変更なし。本番結果に関する通知は作らない |
| 模試との境界 | 本番結果は1本番につき1値。系列は持たない（Avoid「模試スコアの系列をアプリに入れること」維持） |
| セットアップ | `hasExamGoal` は「本番目標がある」のまま（初回セットアップの完了条件）。終了後に Stepper を再表示しない。次の本番の導線は目標画面が担う |
| 語彙 | `CONTEXT.md`「目標」「本番目標」を改訂（§6） |

## 2. スキーマと関数

```ts
// convex/lib/validators.ts
export const examResultValidator = v.object({ recordedAt: v.string(), score: v.number() });
const examGoalInputFields = v.object({ content, examDate, maxScore, minScore, type: "exam" });
const examGoalFields = examGoalInputFields.extend({ result: v.optional(examResultValidator) });
// goalInputValidator は examGoalInputFields（結果は create/update から入れない）
// goalDocumentValidator / goalDtoValidator は examGoalFields（結果を持つ）
```

- `convex/lib/toeicScore.ts`（純関数）: `toeicScoreMessage(score)`。目標帯（`validateGoalInput`）と結果で同じ規則を共有
- `convex/lib/examGoal.ts`（純関数）: `isActiveExamGoal` / `isFinishedExamGoal` / `findActiveExamGoal`。サーバー（create・backfill 計画）とクライアント（ツリー・マイページ）が同じ判別を使う
- `mutations/goals/setExamResult`（`ownerMutation`、`args: { goalId, result }`）→ `services/goals/setExamResult.ts`: 所有確認 → 試験タイプ以外は `NOT_EXAM_GOAL_MESSAGE` → スコア規則 → 日付形式 → `ctx.db.patch("goals", id, { result })`
- `services/goals/create.ts`: 試験は `by_owner_and_type` で試験を集め、`isActiveExamGoal` が1件でもあれば `SINGLE_EXAM_GOAL_MESSAGE`
- `services/goals/update.ts`: 試験の replace は `result: existing.result` を引き継ぐ（達成日と同じ扱い）
- `services/goals/toGoalDto.ts`: `result` を DTO に載せる
- `services/goals/planCheckpointParents.ts`: 孤児の受け皿になる試験は進行中のものだけ

## 3. UI

- `src/features/goals/schemas/exam-result-schema.ts`: `ExamResultSchema = v.object({ recordedAt: DateJstSchema, score: ToeicScoreSchema })`（`goal-schema.ts` の既存スキーマを export して再利用）
- `exam-result-modal.tsx`: Mantine `Modal` + Formisch。`NumberInput`（value ベースの `onChange` を上書き）と `GoalDateField`（`goal-form-fields.tsx` から export）。初期値は既存の結果、無ければ今日。題名は「本番の結果を入れる」/「本番の結果を訂正する」
- `exam-goal-card.tsx`: 進行中で本番日を過ぎたら（当日含む）「結果を入れる」。終了なら「終了」バッジ・結果スコア・入れた日・「結果を訂正」を出し、カウントダウンと週間ターゲット未設定の促しを消す。ボタンの `aria-label` は `examResultActionName(goal)`（目標名付き、複数カードで衝突しない）
- `exam-empty-card.tsx`: 空状態。`latestFinishedExam(goals)` があれば「次の本番を作りましょう」
- `goal-tree.ts`: `GoalTree` に `finishedExams`（未達成の子が残る終了本番のグループ）と `examHistory`（履歴に回す終了本番、結果日の新しい順）を追加。`parentGoalOptions` は終了した本番を候補から外す（今の親だけ残す）
- `goals-board.tsx`: 本番目標の列は「進行中（または空状態 / 作成フォーム）→ 終了だが子が残る本番」の `Stack`。モーダルの開閉は `hooks/use-goal-dialogs.ts` に集約、削除 Confirm は `lib/open-goal-remove-confirm.tsx`
- `achieved-history-section.tsx`: `finishedExams` を先頭に本番バッジ付きで並べ、件数に含める。「結果を訂正」から同じモーダルを開く
- `my-page/today-summary-section.tsx`: `findActiveExamGoal(goals)`

## 4. テスト

- 統合: `convex/goals.examResult.test.ts`（保存・訂正・進行中1件の判定と次の本番作成・編集で消えない・不正値・習得は拒否・子が残って付け替えられる）
- 純関数: `goal-tree.test.ts`（`examHistory` / `finishedExams` / 並び / `latestFinishedExam` / 親候補）、`exam-result-schema.test.ts`
- UI: `exam-result-modal.test.tsx`、`exam-goal-card.test.tsx`（本番日前は導線なし・過ぎたら導線・終了表示）、`achieved-history-section.test.tsx`（本番行）、`goals-board.test.tsx`（モーダル経由の記録・次の本番の空状態・子が残る終了本番）

## 5. 端ケース

| ケース | 挙動 |
| --- | --- |
| 本番日より前に結果を入れたい | 導線を出さない（本番日を編集してから）。mutation 自体は日付順を縛らない |
| 結果を入れた後に本番日やスコア帯を編集 | 通常の編集。結果は引き継がれる |
| 終了した本番を削除 | 従来どおり Confirm → 子チェックポイントをカスケード削除（目標にゴミ箱は無い） |
| 終了した本番の子を達成にする | 子は達成履歴へ。子が全部片づけば本番も履歴へ移る（次の描画から） |
| 終了した本番が複数 | 履歴には結果日の新しい順。空状態の「前回」は最新の1件 |
| 結果を消したい | できない。訂正で値を変える。誤って入れた場合も本番目標を削除して作り直すしかない（Avoid「結果を取り消して進行中に戻すこと」） |

## 6. `CONTEXT.md` 改訂

- 「目標」: 「試験は1件だけ」→「試験は進行中が1件だけ（結果が入って終了したものは履歴に残る）」
- 「本番目標」: 進行中は1件、本番日を過ぎたら結果（スコア1値と入れた日）を入れて終了、訂正はできるが取り消せない、終了した本番は達成した目標に並ぶ、未達成の子は残って付け替えられる、終了後はカウントダウンを出さない。Avoid に「進行中の本番目標を複数持つこと」「結果を取り消して進行中に戻すこと」
