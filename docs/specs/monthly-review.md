# 月次レビュー設計（#54）

- 状態: 決定済み（2026-08-24）。実装は別セッション。
- 対象: 週次レビューの月版としての**月次レビュー画面**（`/review?tab=monthly`）。月間サマリー、**月間の消化推移**、**カテゴリ内訳の月比較**（前月比）。
- 前提となる決定: マップ #47 の Decisions so far（優先順「目標階層 → タイマー → 週次レビュー → 紐付け → **月次レビュー** → 通知 → PWA」、通知/PWA 調査結果）。**`docs/specs/weekly-review.md`（#52、決定済み）— 本書はこの内容を前提として全面的に採用する（§0, §2）。** CONTEXT.md「履歴」「消化」「週間ターゲット」「学習量」。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)、[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)、[design-live-board.md](../../.claude/rules/web/design-live-board.md)、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)、[shimmer-from-structure.md](../../.claude/rules/web/shimmer-from-structure.md)、[valibot-validation.md](../../.claude/rules/typescript/valibot-validation.md)。Formisch は対象外（§12 で理由を明示）。
- このドキュメントの担当範囲: **月次レビュー画面（`monthly` タブ）のスキーマ・関数サーフェス・UI 構造・エッジケース**。`/review` の共有土台（ルート・`ReviewSearchSchema`・`ReviewPage` のタブ外枠・`use-review-view.ts`・`calendar-date-schema.ts`）と週次タブの中身は **#52（`docs/specs/weekly-review.md`）が所有し、本書は§2でそのまま採用する**。目標階層（#48〜50）、目標×記録の紐付け（#53）、通知（#56）、PWA（#58）は範囲外。

---

## 0. 執筆順の注記（#52 との整合・最重要）

本書には旧版（#52 未確定の時点で書かれた版）が存在した。旧版は `docs/specs/weekly-review.md` が存在しない状態で、§2に週次レビューの最小契約を**仮決め**して独立に書かれていた。**その後 #52 が確定し、`docs/specs/weekly-review.md` が決定済み文書として存在する。** 本書はその確定内容と全面的に突き合わせ、矛盾・重複する節をすべて書き直した。

### 何が生き残ったか（無傷だった部分）

旧版 §0 が事前に立てた設計方針（「新規テーブルを増やさない」「`/review` というルートの存在にも週次タブの中身にも依存しない独立 query にする」）が功を奏し、以下は**内容の変更なしで生き残った**:

- §5〜§7 の大枠（スキーマ・純関数・query/service の構造）
- §4 のスコープ表（見せる/見せない）
- §13-1〜13-7（月間ターゲット・週間ターゲット月内集計・目標階層・コンディション別内訳・日次粒度・月境界の週バケット・YoY を却下した理由。旧版では §12-1〜12-7 だったが、本書では「検討した代替案」節が §13 のため §13-1〜13-7 に読み替える）

### 何を書き直したか（#52 の確定内容に合わせた変更）

| 旧版の記述 | #52 確定内容 | 本書の対応 |
| --- | --- | --- |
| §2「週次レビューの最小契約」を仮決め | `weekly-review.md` が `/review` ルート・`ReviewSearchSchema`・`ReviewPage`・`use-review-view.ts`（`deriveReviewMonth` を含む統合版）・`calendar-date-schema.ts` を実際に確定 | §2 を「差分ゼロの採用表」に置き換え（下記） |
| 履歴画面のリンク先を `search={{ tab: "monthly" }}` で明示 | `weekly-review.md` §8.5 が履歴画面のリンクを**検索パラメータ無し（既定タブへ）**で確定し、`history-page.tsx` の当該箇所は #52 が実装する | §8.3 を全面差し替え。本書は `history-page.tsx` を改修しない（二重編集を避ける） |
| サマリー3枚 = 確定分数 / 稼働日数 / **見送り件数** | `weekly-review.md` §9.3 のサマリー3枚 = 学習量 / 実施日 / **消化**（前週比は矢印+ミュート色、色だけで増減を伝えない） | §9.3 を「学習量 / 実施日 / 消化」に揃え、`weeklyDigestValidator` を月全体にも再利用（§5.1, §6.5） |
| `monthlyDigestBucketValidator` が独自の6フィールド | — | 月全体の消化は `weeklyDigestValidator` を**そのまま**再利用（CVX-16 SSoT）。週バケットは月境界という月固有の事情があるため独自形を維持（§5.1 で理由を明示） |
| ナビタブ8本目の是非を独立に再検討（旧版 §12-10、本書 §13-10） | `weekly-review.md` §8.5・§14-8 が「`NAV` は7本のまま。入口は履歴画面 + `/goals` の週間ターゲット節の2本」とすでに確定 | 本書は再検討しない。§8.3 で確定内容をそのまま採用するだけに留める（マップの「すでにロックされた決定は再審しない」に従う） |
| `use-review-view.ts` を月次分だけ独自定義（§8.4） | `weekly-review.md` §8.4 が `deriveReviewWeek` と `deriveReviewMonth` を同居させた統合版をすでに確定（`yearMonth` / `setMonth` を含む） | §8.4 を削除し、「追加の実装は不要」と明記 |

### 人間の再確認ポイント（decisionComment 参照）

- 月全体の消化を `weeklyDigestValidator`／`buildWeeklyDigest`（`convex/lib/weeklyReview.ts`）から**そのまま**再利用する設計（§5.1, §6.5, §13-13）。関数名・ファイル名が「weekly」のままで月次から呼ばれることになる。
- 月次レビューへの専用ナビ導線を追加しない（週次と共有の2導線のみで足りるとした判断、§8.3, §13-14）。

### 最終突き合わせ（本パス）

本書はこの時点ですでに `weekly-review.md`（決定済み）の内容と全面的に整合していた。本パスでは追加で次の2点を検証・修正した:

1. **実コードとの突き合わせ**: `convex/schema.ts`（`rows`/`days`/`targets` の型）、`convex/lib/historyBreakdown.ts`（`aggregateBreakdownRows` の戻り値形）、`convex/lib/validators.ts`（`categoryBreakdownValidator`/`targetProgressDtoValidator`）、`convex/lib/jst.ts`・`dateArgs.ts`・`domain.ts`・`dayView.ts`・`conditions.ts`・`services/history/shared.ts`・`lib/catalogLoader.ts`・`lib/ownerFunctions.ts` を実際に読み、本書 §5〜§7 が参照する既存シグネチャ・エクスポート名・フィールド名がすべて実装と一致することを確認した（ドリフトなし）。
2. **`weekly-review.md` への内部参照の節番号ミス**: 本書の旧稿は「レビューをナビタブへ昇格させない」判断と「入口を2本にした」判断、および「前週比のラベルはクライアントの純関数に置く」判断を、それぞれ `weekly-review.md` §13-8 / §13-7 として引用していた。`weekly-review.md` 本文を確認したところ、これらは同書の**§13**（エッジケース表の行番号）ではなく**§14**（検討した代替案。§14-7・§14-8）の内容だったため、該当するすべての参照を §14-7・§14-8 に修正した（§0 の対応表、§8.3、§13-10、§13-14、§16 の計6箇所）。内容面の結論はどれも変更していない。

---

## 1. 決定の要約

1. **月次レビューは新しいテーブルを1つも増やさない。** `rows` / `days` / `items` / `categories` を読むだけの `ownerQuery` 1本（`monthlyReview`）で完結する（§5, §7）。
2. **月次レビューは「トレンドと比較」に徹し、既存 履歴（`/history`）の分析タブと重複する軸（コンディション別内訳、日別ペースの生データ）は出さない。** 履歴が「任意の日/週/月を選んで内訳を見る」画面なのに対し、月次レビューは「今月というくくりでの変化」を見せる画面と役割分担する（§4, §13-4）。
3. **サマリー3枚は週次レビューと完全に同じ形（学習量 / 実施日 / 消化）にする。** 前月比は矢印アイコン + ミュート色のテキストで表し、増減を色で評価しない（design-live-board.md #2、`weekly-review.md` §9.3 と同一ルール）。月全体の消化は `weeklyDigestValidator` をそのまま再利用する（§5.1, §6.5）。
4. **月間の消化推移**は、月内の暦日を**月曜始まりの週でバケット化**（月境界は部分週として許容）し、週バケットごとに `確定 / (確定+未着手+進行中+スキップ)` の消化率を出す棒グラフ（§6.3, §9.4）。**この点だけは `weekly-review.md` の「チャートは使わない」方針から意図的に外れる**（理由は §13-2）。
5. **カテゴリ内訳の月比較**は、今月と前月（暦月ベース、前年同月ではない）の `byCategory` を突き合わせ、カテゴリ名で対応させて増減を見せる（§6.4, §9.5）。突き合わせと delta% の計算は**クライアント側の純関数**に置く（サーバはカテゴリ別分数の生値だけ返す。§13-8、`weekly-review.md` §14-7 と同じ判断）。
6. **月間ターゲット・週間ターゲットの月内達成回数・目標階層の件数は月次レビューに出さない。** 週間ターゲットは仕様上「今週専用の計器」でスナップショットを持たないため、過去週へ遡って正しく評価できない（§13-1, §13-2）。目標階層は現在値のスナップショットしか持たず、月内の変化を表せない（§13-3）。
7. **消化率は「今日を含む部分週/月」から今日を除外して計算する。** CONTEXT「消化」の「今日の未着手を計画倒れに数えない」を月次のトレンドにもそのまま適用する（`weekly-review.md` §6.2 と同一規則。§6.3, §13-5）。
8. **既存の `digestRate`（`convex/lib/presetDigest.ts`）と同じ計算式を再利用する。** 比率計算だけを `convex/lib/completionRate.ts` に切り出し、`presetDigest.ts` / `weekly-review.md` の週次レビュー / 月次レビューの三者で共有する（§6.1、`weekly-review.md` §6.1 と完全同一内容）。
9. **`/review` ルート・検索パラメータ・タブ外枠は #52 が作った実装をそのまま使う。** 本書が新たに作るファイルは無い（§8）。
10. **専用のナビ導線を追加しない。** `weekly-review.md` §8.5 が確定した2導線（履歴画面のリンク、`/goals` 週間ターゲット節のリンク）はどちらも既定タブ（`weekly`）へ飛ぶが、`/review` に着地した利用者はタブ切り替え1操作で月次に到達できるため、月次専用のリンクを別途持たない（§8.3, §13-14）。

---

## 2. `weekly-review.md`（#52）確定内容の採用（差分ゼロ）

本書は次の #52 確定内容を**そのまま**前提として使う。中身は一切変更しない。

| 項目 | #52 の決定 | 本書での扱い |
| --- | --- | --- |
| ルート | `/review`（`src/routes/review.tsx`）。`OwnerGate` 配下 | 変更しない。本書は新規ファイルを作らない（§8.2） |
| 検索パラメータ | `ReviewSearchSchema`（`{ month, tab, week }`、`src/features/review/schemas/review-search-schema.ts`）。`month` は本チケットが消費する枠として既に用意済み | 変更しない。フィールド追加不要（§8.2） |
| 共有スキーマ | `src/lib/schemas/calendar-date-schema.ts`（`DateJstSchema` / `YearMonthSchema`） | 変更しない。`YearMonthSchema` をそのまま `month` の検証に使う |
| タブ外枠 | `ReviewPage`（`PageTitle` + `Tabs variant="pills"`。週次/月次パネルを個別 `Suspense` で持つ） | `Tabs.Panel value="monthly"` の中身（`MonthlyReviewPlaceholder` → `MonthlyReviewTab`）だけを差し替える（§9.2） |
| 状態導出 | `use-review-view.ts` の `useReviewView()` が `yearMonth` / `setMonth` / `deriveReviewMonth` をすでに提供 | 変更・追加なし。月次タブはこのフックをそのまま呼ぶ（§8.4） |
| ナビ導線 | `NAV`（7本）は無変更。入口は①履歴画面のリンク（`search` 無し、既定タブへ）②`/goals` 週間ターゲット節のリンク（同上） | 本書は専用の3本目を追加しない（§8.3, §13-14） |
| 純関数の共有 | `convex/lib/completionRate.ts`（`completedCount` / `confirmedRatio`）、`convex/lib/weeklyReview.ts`（`buildWeeklyDigest` / `elapsedDaysInWeek` — いずれも日付リストに関して汎用） | 月次レビューがそのまま import して使う（§6.5, §13-13） |

**この表と実際の #52 実装が食い違った場合の影響範囲は、本書の §8.2〜§8.4（ルーティングの記述）に限定される。** §5〜§7（スキーマ・純関数・query 本体）は `/review` の内部構成にもタブの実装詳細にも依存しないため、無傷で使える。

---

## 3. 現状（コードから確認した事実）— 履歴の既存集計と何が違うか

既に `convex/queries/history/` に月次の集計は存在する（`monthBreakdown`）。月次レビューが屋上屋を架さないよう、まず現状を整理する。

| 既存要素 | 場所 | 事実 |
| --- | --- | --- |
| 月の内訳 | `queries/history/monthBreakdown.ts` → `services/history/computeMonthBreakdown.ts` | 引数 `{ todayJst, yearMonth }`。**選んだ1か月**の `byCategory` / `byCondition` / `confirmedMinutes` / `skippedMinutes` / 日別ヒートマップ用 `days`（7日移動平均つき）/ `events` を返す。**前月との比較は持たない。トレンド（週推移）も持たない。** `yearMonth` の形式が壊れている場合は空の DTO を返す防御パターン（throw しない）。 |
| 消化（曜日別・直近28日） | `services/history/presetReview.ts` + `convex/lib/presetDigest.ts` | 「今日を除く直近28暦日」を**曜日ごと**に束ねて `confirmed / (confirmed+leftover+ongoing+skipped)` を出す。月境界にもピッカーにも従わない固定ウィンドウ（CONTEXT「消化」の `_Avoid`: 「消化を分析の日・週・月ピッカーに追従させること」）。 |
| 週次レビューの消化・共有文 | `queries/review/weeklyReview.ts`（#52 決定済み） | 対象週+前週の消化・学習量・週間ターゲット・週版共有文を1本で返す。**月をまたぐ比較や週バケットのトレンドは持たない**（週1つぶんの実績のみ）。 |
| 週間ターゲット実績 | `services/targets/listWithProgress.ts` | 引数 `{ weekStartJst }`。**今週だけ**の実績。過去週には出さない設計（CONTEXT「週間ターゲット」）。スナップショットを持たないため、過去の目標値を遡って正しく再現できない。 |
| 目標のスナップショット性 | `convex/schema.ts` の `goals` | 現在値のみを保持。達成済み習得の `confirmedMinutes` / `activeDays`（ADR-0007）は「達成時点で固定」だが、これは個々の目標の実績であり月次のトレンドではない。 |

結論: 履歴の `monthBreakdown` も週次レビューの `weeklyReview` も「選んだ期間の内訳・実績」を出す道具であり、**「先月と比べてどうだったか」「月の中でどう変化したか」という2つの軸を持つものはどこにも無い**。これが月次レビューの存在理由であり、既存機能の単純な再掲ではない（§13-4 で重複しないことを検証する）。

---

## 4. 月次レビューのスコープ（何を見せる／見せないか）

| 見せる | 見せない | 理由 |
| --- | --- | --- |
| 今月の学習量・実施日・消化（サマリー3枚。**週次レビューと同じ3項目**） | — | §1-3。`weekly-review.md` §9.3 とレイアウト・文言規則を揃える |
| **月間の消化推移**（週バケットの棒グラフ） | 曜日別の消化（既存・直近28日） | 役割が違う。曜日別は「プリセットを直すべき曜日」を見つけるための道具（履歴の担当）。月次は「月の中で尻すぼみ/尻上がりのどちらか」を見るための道具 |
| **カテゴリ内訳の月比較**（今月 vs 前月） | コンディション別内訳 | 履歴の分析タブで既に選んだ月のコンディション別内訳が見られる（`monthBreakdown.byCondition`）。重複 UI を避ける（CONTEXT 履歴の `_Avoid`「模試分析のような複雑ダッシュボード」） |
| 前月比のカテゴリ増減（分数・新規/消滅ラベル） | 前年同月比（YoY） | 本番まで残り約6週間の学習ログであり、前年データは存在しない/意味を持たない（spec.md Problem Statement） |
| 「今月を履歴で見る」への導線（`/history` へのリンク） | 記録の直接編集 | 月次レビューは読み取り専用。編集は既存の日ページ/履歴に任せる |
| — | 月版 Slack 共有文 | §10 で理由を明示（週次と違い、月の合算はカテゴリ内訳比較チャートで代替されており、Slack に貼る単位としても「月」は大きすぎる） |
| — | 月間ターゲット、週間ターゲットの月内達成回数 | §13-1, §13-2 で却下（スナップショット欠如） |
| — | 目標階層（長期目標/チェックポイント）の件数サマリー | §13-3 で却下（依存回避 + 現在値スナップショットしか無い） |

---

## 5. スキーマ変更（CVX-10/11/12/13/16）

**結論: `convex/schema.ts` の変更はゼロ。** 新規テーブル・新規インデックスを追加しない。

理由:

- 月次レビューが必要とするのは「ある日付範囲の `rows` / `days`」と「カタログ（`items` / `categories`）」であり、これらは既存の `by_owner_and_date`（`rows`, `days`）と `loadCatalog`（`items` / `categories`）で完全にまかなえる。
- 今月・前月をまたぐ範囲は最大で概ね62日分（前月の初日〜今月の末日）。1日あたりの `rows` はプリセット規模（多くて10件程度）なので、`.collect()` される件数は多くても数百件で、CVX-11 の「概ね1000件未満」に収まる。範囲は `by_owner_and_date` の `gte`/`lte` で絞るため `.filter()` は使わない（CVX-10）。
- CVX-12（プレフィックス重複インデックス禁止）に抵触する新規インデックスの追加自体が無いので、この観点でも安全。

### 5.1 `convex/lib/validators.ts` への追加

**追記位置: `weekly-review.md` §5.1 が追記する `weeklyDigestValidator` / `weeklyReviewDayValidator` / `weeklyReviewValidator` より後ろ。** `monthlyReviewValidator` が `weeklyDigestValidator` を参照するため、同一ファイル内で宣言順の依存が生まれる。

```ts
//* 月内の週バケット1つ分の消化推移(digestRate と同じ定義)。
//? weeklyDigestValidator を月バケットにそのまま使わない理由: 月境界で7日に満たないバケットは
//? 「今日を含むから不完全」ではなく「暦週として不完全」という別の理由で isPartial になる
//? (weeklyDigestValidator の isPartial は「今日/未来を除いた」ことだけを意味する。§13-13)。
//? チャートが必要とするのは digestRate / isPartial / plannedCount(0件判定) だけなので、
//? countedFrom 等の詳細フィールドは持たせず最小形にする。
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

//* 月次レビュー画面1枚ぶんの集計。カテゴリ比較の delta%・ラベル付けはクライアントの純関数が担う(§13-8)。
export const monthlyReviewValidator = v.object({
  activeDays: v.number(),
  byCategory: v.array(categoryBreakdownValidator),
  confirmedMinutes: v.number(),
  //? 月全体(今日を除く)の消化。weeklyDigestValidator をそのまま再利用する(§6.5, §13-13)。
  //? 週次レビューのサマリー「消化」タイルと同じ形にするための意図的な再利用(CVX-16 SSoT)。
  digest: weeklyDigestValidator,
  digestTrend: v.array(monthlyDigestBucketValidator),
  //? 月内で今日以前の暦日数(過去月なら月の日数と同じ)。1日平均の分母。
  elapsedDays: v.number(),
  //? yearMonth が todayJst の月と一致するか。当月は「まだ途中」の注記に使う(§9.3)。
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
```

`categoryBreakdownValidator`（既存、`{ category, categorySortOrder, minutes }`）と `weeklyDigestValidator`（`weekly-review.md` §5.1 で追加済み、`{ confirmedCount, countedFrom, countedThrough, digestRate, isPartial, leftoverCount, ongoingCount, plannedCount, skippedCount }`）をそのまま再利用する。新しい形を作らない（CVX-16、goal-hierarchy-layout.md §「DTO の形を作り直すことになる」と同じ教訓）。

### 5.2 既存ファイルへの影響

なし（`schema.ts` は無変更）。`validators.ts` への追記のみ（`weekly-review.md` の追記より後ろに置く。§5.1 参照）。

---

## 6. 純関数（Convex ランタイムを import しない）

spec.md の原則「ドメインの不変条件は Convex ランタイムを import しない純関数に置く」に従う。すべて `convex/lib/` に置き、フロントは `~domain/*` エイリアス（`tsconfig.json`）経由で同じ関数を読む。

### 6.1 `convex/lib/completionRate.ts`（`weekly-review.md` §6.1 と共有・内容同一）

`weeklyDigestValidator` の比率計算と全く同じプリミティブを使う。**このファイルは `weekly-review.md` §6.1 と完全に同一の内容**で、#52 / #54 のどちらが先に実装しても同じものができる（先に実装した側が作り、後の側はそのまま使う。以下は参照用に再掲）。

```ts
export type CompletionCounts = {
  confirmed: number;
  leftover: number;
  ongoing: number;
  skipped: number;
};

export function completedCount(counts: CompletionCounts): number {
  return counts.confirmed + counts.leftover + counts.ongoing + counts.skipped;
}

//* 消化率(CONTEXT「消化」): 確定 / 並んだ件数。並んだ件数が0なら0(ゼロ除算を避ける)。
export function confirmedRatio(counts: CompletionCounts): number {
  const total = completedCount(counts);
  return total === 0 ? 0 : counts.confirmed / total;
}
```

`convex/lib/presetDigest.ts` の改修は `weekly-review.md` §6.1 が既に確定済み（`plannedCount` / `digestRate` を委譲するだけの無害な内部リファクタ）。本書は追加の変更を加えない。

### 6.2 月全体の消化は `convex/lib/weeklyReview.ts` の関数をそのまま再利用する

`weekly-review.md` §6.2 で定義される次の2関数は、**週7日というサイズを一切前提にしていない**（任意長の `readonly string[]` を受け取る汎用関数）。月次レビューはこれを import してそのまま使う（新しい実装を書かない）。

```ts
// 参照のみ(weekly-review.md §6.2 で定義済み。ここでは再掲しない)
// buildWeeklyDigest(weekDates: readonly string[], rows: readonly WeeklyStatusRow[], todayJst: string): WeeklyDigest
// elapsedDaysInWeek(weekDates: readonly string[], todayJst: string): number
```

呼び出し方は「月内の全暦日」を `weekDates` 引数に渡すだけ（§7.2）。月の全日は前月・翌月の日を混ぜずに構成されるため、週次のような「境界で7日に満たない」問題が起きない（`buildWeeklyDigest` の `isPartial` は「今日/未来day` の未計上」だけを表せば正しい）。この再利用が正当である理由・ファイル名の違和感については §13-13 で検討する。

### 6.3 `convex/lib/monthlyReview.ts`（新規）— 月間の消化推移（週バケット）

```ts
import { STATUSES } from "./domain";
import { weekdayFromDateJst } from "./jst";
import { completedCount, confirmedRatio, type CompletionCounts } from "./completionRate";
import type { MonthlyDigestBucket } from "./validators";

const [confirmedStatus, leftoverStatus, ongoingStatus, skippedStatus] = STATUSES;

export type DateStatusRow = { dateJst: string; status: (typeof STATUSES)[number] };

type DateBucket = { dates: string[]; end: string; start: string };

//* 月の暦日リストを月曜始まりの週でバケット化する。月境界をまたぐ週は月内の日数だけの部分週になる
//? (例: 2026-08 は 8/1(土)〜8/2(日) の部分週で始まり、8/31(月) 単独の部分週で終わる)。
//? 前月・翌月の日を混ぜないので、月内の消化推移と月間合計の整合が常に取れる(§13-6)。
export function bucketDatesByWeek(dates: readonly string[]): DateBucket[] {
  const buckets: DateBucket[] = [];
  for (const dateJst of dates) {
    const isMonday = weekdayFromDateJst(dateJst) === 1;
    const current = buckets.at(-1);
    if (current === undefined || isMonday) {
      buckets.push({ dates: [dateJst], end: dateJst, start: dateJst });
      continue;
    }
    current.dates.push(dateJst);
    current.end = dateJst;
  }
  return buckets;
}

function countStatuses(rows: readonly DateStatusRow[]): CompletionCounts {
  const counts: CompletionCounts = { confirmed: 0, leftover: 0, ongoing: 0, skipped: 0 };
  for (const row of rows) {
    if (row.status === confirmedStatus) counts.confirmed += 1;
    else if (row.status === leftoverStatus) counts.leftover += 1;
    else if (row.status === ongoingStatus) counts.ongoing += 1;
    else if (row.status === skippedStatus) counts.skipped += 1;
  }
  return counts;
}

//* 週バケットごとの消化推移。当日を含むバケットは、当日の行を除いて計算する
//? (CONTEXT「消化」: 今日の未着手を計画倒れに数えない。weekly-review.md §6.2 の digestCountedDates と同じ規則)。
export function buildMonthlyDigestTrend(
  dates: readonly string[],
  rows: readonly DateStatusRow[],
  todayJst: string,
): MonthlyDigestBucket[] {
  const rowsByDate = new Map<string, DateStatusRow[]>();
  for (const row of rows) {
    const list = rowsByDate.get(row.dateJst);
    if (list === undefined) {
      rowsByDate.set(row.dateJst, [row]);
    } else {
      list.push(row);
    }
  }
  return bucketDatesByWeek(dates).map((bucket) => {
    const includesToday = bucket.dates.includes(todayJst);
    const effectiveDates = includesToday
      ? bucket.dates.filter((dateJst) => dateJst !== todayJst)
      : bucket.dates;
    const bucketRows = effectiveDates.flatMap((dateJst) => rowsByDate.get(dateJst) ?? []);
    const counts = countStatuses(bucketRows);
    return {
      bucketEnd: bucket.end,
      bucketStart: bucket.start,
      confirmedCount: counts.confirmed,
      digestRate: confirmedRatio(counts),
      //? 月境界の部分週(7日未満) or 当日を含む進行中の週は「週全体を代表しない」印をつける。
      isPartial: includesToday || bucket.dates.length < 7,
      plannedCount: completedCount(counts),
    };
  });
}
```

`rows` に渡す前に**必ず `liveRows` / `liveDayDatesFrom`（`services/history/shared.ts`）を通す**（§7.2、§13-6）。この関数自体は Convex 型を知らない純粋なフィルタ後データを受け取るだけでよい。

### 6.4 `convex/lib/jst.ts` への追加 — 前月の算出

```ts
//* yearMonth の月算術。負数で過去へ、月境界(年またぎ)も正しく処理する。
export function addMonthsJst(yearMonth: string, months: number): string {
  const [yearText, monthText] = yearMonth.split("-");
  const year = Number(yearText);
  const zeroBasedMonth = Number(monthText) - 1 + months;
  const nextYear = year + Math.floor(zeroBasedMonth / 12);
  const nextMonth = ((zeroBasedMonth % 12) + 12) % 12;
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}`;
}
```

`addMonthsJst("2026-01", -1) === "2025-12"`。`addMonthsJst("2026-12", 1) === "2027-01"`。既存の `addDaysJst` と対になる命名（`convex/lib/jst.test.ts` に追記してテストする、§15.1）。

### 6.5 純関数の一覧（CVX-09 準拠、Convex ランタイム非依存）

| 関数 | ファイル | 責務 | 出典 |
| --- | --- | --- | --- |
| `completedCount` / `confirmedRatio` | `convex/lib/completionRate.ts` | 消化率の計算 | `weekly-review.md` §6.1 と共有（内容同一） |
| `buildWeeklyDigest` | `convex/lib/weeklyReview.ts` | 月全体（今日を除く）の消化を計算する。月次レビューはこれを**リネームせず再利用**する（§13-13） | `weekly-review.md` §6.2 をそのまま import |
| `elapsedDaysInWeek` | `convex/lib/weeklyReview.ts` | 1日平均の分母。月全体の暦日リストにもそのまま使える | `weekly-review.md` §6.2 をそのまま import |
| `bucketDatesByWeek` | `convex/lib/monthlyReview.ts` | 月の暦日を月曜始まりの週でバケット化（月固有） | 新規 |
| `buildMonthlyDigestTrend` | `convex/lib/monthlyReview.ts` | 週バケットごとの消化率トレンド（月固有） | 新規 |
| `addMonthsJst` | `convex/lib/jst.ts` | 前月/翌月の `yearMonth` 算出 | 新規 |

---

## 7. 関数サーフェス（CVX-01/02/03/04/05/20）

ドメイン `review` を `queries/` `services/` に置く（`weekly-review.md` と同じドメイン。CVX-20）。mutation は無い（読み取り専用。§12）。cron・scheduler も無い（CVX-05 は非該当）。

### 7.1 query（1関数1ファイル）

| ファイル | export | args | returns |
| --- | --- | --- | --- |
| `convex/queries/review/monthlyReview.ts` | `monthlyReview` | `{ todayJst: v.string(), yearMonth: v.string() }` | `monthlyReviewValidator` |

```ts
// convex/queries/review/monthlyReview.ts — API 層は薄く保つ(CVX-02)
import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { monthlyReviewValidator } from "../../lib/validators";
import { monthlyReview as getMonthlyReview } from "../../services/review/monthlyReview";

export const monthlyReview = ownerQuery({
  args: { todayJst: v.string(), yearMonth: v.string() },
  handler: async (ctx, args) => getMonthlyReview(ctx, ctx.ownerId, args),
  returns: monthlyReviewValidator,
});
```

`ownerQuery` が `requireUser` 相当（`ctx.ownerId` の付与）を担う（CVX-04、`convex/lib/ownerFunctions.ts` の既存パターン。`weekly-review.md` の `weeklyReview` query と同一パターン）。`args` は CVX-03 のとおり両フィールドとも必須のバリデータ付き。

### 7.2 service

```ts
// convex/services/review/monthlyReview.ts
import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { aggregateBreakdownRows } from "../../lib/historyBreakdown";
import { addMonthsJst, calendarDatesInMonth } from "../../lib/jst";
import { buildMonthlyDigestTrend } from "../../lib/monthlyReview";
import type { MonthlyReviewDto } from "../../lib/validators";
import { buildWeeklyDigest, elapsedDaysInWeek } from "../../lib/weeklyReview";
import { liveDayDatesFrom, liveRows } from "../history/shared";

function emptyMonthlyReview(yearMonth: string, todayJst: string): MonthlyReviewDto {
  //? calendarDatesInMonth が空を返す(yearMonth の形式が壊れている)場合の防御。
  //? services/history/computeMonthBreakdown.ts の既存防御パターンに合わせる
  //? (weekly-review.md は日/週引数を requireDateJst/requireWeekStartJst で throw するが、
  //? 月引数(yearMonth)は既存の月クエリ全体がこの「空DTOを返す」規則で統一されているため、
  //? そちらに揃える。§13-9)。
  return {
    activeDays: 0,
    byCategory: [],
    confirmedMinutes: 0,
    digest: {
      confirmedCount: 0,
      countedFrom: yearMonth,
      countedThrough: null,
      digestRate: 0,
      isPartial: true,
      leftoverCount: 0,
      ongoingCount: 0,
      plannedCount: 0,
      skippedCount: 0,
    },
    digestTrend: [],
    elapsedDays: 0,
    isCurrentMonth: yearMonth === todayJst.slice(0, 7),
    monthEnd: yearMonth,
    monthStart: yearMonth,
    previousActiveDays: 0,
    previousByCategory: [],
    previousConfirmedMinutes: 0,
    previousYearMonth: yearMonth,
    skippedMinutes: 0,
    yearMonth,
  };
}

export async function monthlyReview(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; yearMonth: string },
): Promise<MonthlyReviewDto> {
  const dates = calendarDatesInMonth(args.yearMonth);
  const start = dates[0];
  const end = dates.at(-1);
  if (start === undefined || end === undefined) {
    return emptyMonthlyReview(args.yearMonth, args.todayJst);
  }

  const previousYearMonth = addMonthsJst(args.yearMonth, -1);
  const previousDates = calendarDatesInMonth(previousYearMonth);
  //? previousYearMonth は addMonthsJst の出力なので常に妥当な形式。空になることはない防御的フォールバックのみ。
  const previousStart = previousDates[0] ?? start;
  const previousEnd = previousDates.at(-1) ?? end;

  //? 今月+前月をまたぐ1本のレンジクエリ(CVX-07: ctx.run* の連鎖を避け、読み取りは1回にまとめる)。
  const [rows, days, catalog] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", previousStart).lte("dateJst", end),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", previousStart).lte("dateJst", end),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);

  //? ゴミ箱の記録・日を必ず除く(presetReview / listWithProgress / computeMonthBreakdown / weeklyReview と同じ前提)。
  //? これを忘れると、削除した記録が月次サマリーに残り続けるバグになる(study-timer.md §2 と同種の見落とし)。
  const live = liveRows(rows, liveDayDatesFrom(days));
  const currentRows = live.filter((row) => row.dateJst >= start && row.dateJst <= end);
  const previousRows = live.filter(
    (row) => row.dateJst >= previousStart && row.dateJst <= previousEnd,
  );

  const current = aggregateBreakdownRows(currentRows, catalog.itemById, catalog.categoryById);
  const previous = aggregateBreakdownRows(previousRows, catalog.itemById, catalog.categoryById);

  const activeDaysOf = (targetRows: typeof currentRows) =>
    new Set(
      targetRows.filter((row) => row.status === "確定").map((row) => row.dateJst),
    ).size;

  return {
    activeDays: activeDaysOf(currentRows),
    byCategory: current.byCategory,
    confirmedMinutes: current.confirmedMinutes,
    //? 月全体(今日を除く)の消化。weekly-review.md §6.2 の関数をそのまま再利用する(§6.2, §13-13)。
    digest: buildWeeklyDigest(dates, currentRows, args.todayJst),
    digestTrend: buildMonthlyDigestTrend(
      dates,
      currentRows.map((row) => ({ dateJst: row.dateJst, status: row.status })),
      args.todayJst,
    ),
    elapsedDays: elapsedDaysInWeek(dates, args.todayJst),
    isCurrentMonth: args.yearMonth === args.todayJst.slice(0, 7),
    monthEnd: end,
    monthStart: start,
    previousActiveDays: activeDaysOf(previousRows),
    previousByCategory: previous.byCategory,
    previousConfirmedMinutes: previous.confirmedMinutes,
    previousYearMonth,
    skippedMinutes: current.skippedMinutes,
    yearMonth: args.yearMonth,
  };
}
```

`aggregateBreakdownRows` は既存 export（`convex/lib/historyBreakdown.ts`）を、`buildWeeklyDigest` / `elapsedDaysInWeek` は `weekly-review.md` が追加する `convex/lib/weeklyReview.ts` の export をそのまま再利用する。新しい集計ロジックを重複実装しない（CVX-16 / AHA）。`currentRows` は `Doc<"rows">` そのもの（`dateJst` / `status` フィールドを持つ）なので `buildWeeklyDigest` の第2引数（`WeeklyStatusRow[]` 互換）にそのまま渡せる（構造的部分型）。

### 7.3 CVX チェック

- args validator あり、`ownerQuery` 経由で認可あり（CVX-03/04）。
- `internal.*` を使う scheduler/cron は無い（CVX-05 非該当）。
- `.filter()` 不使用、範囲は `by_owner_and_date` の `withIndex`（CVX-10）。
- `.collect()` は前月+今月の範囲に絞られており、CVX-11 の「概ね1000件未満」に収まる（§5 で数値根拠を明示済み）。
- 新規インデックス無し（CVX-12 非該当）。
- `ctx.db.*` はすべて第1引数にテーブル名（CVX-13、`ctx.db.query("rows", ...)` 形。既存コード全体・`weekly-review.md` と同じ Convex 1.31+ の形に揃える）。
- `Date.now()` を呼ばない。`todayJst` は引数（CVX-14）。
- 単一 query 内の一連の読み取りのみで、`ctx.run*` は使わない（CVX-07/08 非該当。そもそも query からは呼べない）。
- 関連する書き込みは無い（CVX-15 非該当。読み取り専用）。
- `Doc<"...">` / `Id<"...">` をそのまま使い、`weeklyDigestValidator` 等の既存 validator を再利用し手書き型を増やさない（CVX-16）。
- `await` 漏れなし（CVX-17）。
- 1関数1ファイル、`queries/review/` `services/review/` に分離（CVX-20）。

---

## 8. ルーティング・検索パラメータ

**本書が新規に作るルーティング関連ファイルは無い。** すべて `weekly-review.md`（#52）がすでに確定・作成する（§2）。

### 8.1 共有スキーマ・検索パラメータ・ルート定義

`src/lib/schemas/calendar-date-schema.ts`（`YearMonthSchema` を含む）、`src/features/review/schemas/review-search-schema.ts`（`month` フィールドを含む `ReviewSearchSchema`）、`src/features/review/lib/review-route-search.ts`、`src/routes/review.tsx` は**すべて `weekly-review.md` §8.1〜§8.3 が確定した内容そのまま**を使う。本書からの追加・変更は無い。

### 8.2 状態導出（`use-review-view.ts`）

`weekly-review.md` §8.4 の `useReviewView()` はすでに `yearMonth`（`deriveReviewMonth` で導出）と `setMonth` を返す統合実装になっている。**月次タブはこのフックをそのまま呼ぶだけでよく、本書側の追加実装は無い。**

```tsx
// src/features/review/components/monthly-review-tab.tsx（骨子）
import { useReviewView } from "~/features/review/hooks/use-review-view";

export function MonthlyReviewTab() {
  const { setMonth, today, yearMonth } = useReviewView();
  const { data } = useMonthlyReview(today, yearMonth);
  // ...
}
```

### 8.3 ナビ導線: 追加しない（`weekly-review.md` §8.5 の確定内容をそのまま採用）

**決定: 月次レビュー専用のナビ導線は追加しない。** `weekly-review.md` §8.5 が確定した2導線（①履歴画面のリンク ②`/goals` 週間ターゲット節のリンク）は、いずれも `search` パラメータ無しで `/review` の既定タブ（`weekly`）へ飛ぶ。月次タブへは、その画面に着地した利用者が `Tabs` を1回クリックするだけで到達できる。

この判断は `weekly-review.md` §8.5・§13-8 がすでに確定した「`NAV` は7本のまま。8番目のナビタブを追加しない」という決定を**前提としてそのまま受け入れるものであり、本書は再審しない**（マップ運用ルール「ロック済みの決定を relitigate しない」）。旧版（§0参照）は「履歴画面のリンクを `search={{ tab: "monthly" }}` にする」という月次専用の一手を独自に検討していたが、これは #52 側が同じ `history-page.tsx` の同じ箇所を無条件・既定タブ向けに実装したことで**そのまま採用不可**になった（同じ行を2つの仕様が別々の内容で編集することになる）。本書はこれを撤回し、`history-page.tsx` を一切改修しない。

**譲る点（discoverability）**: 月次レビューへのワンクリック専用リンクが無いぶん、週次レビューに比べて到達に1操作（タブクリック）多くかかる。月次レビューは「月に1回開く画面」であり、週次（週に1回）や日次画面ほどの頻度で開かないため、これは許容できるトレードオフと判断する（§13-14。`weekly-review.md` §13-8 の「頻度に応じて発見性のコストを調整する」考え方を踏襲）。

---

## 9. UI 構造（Mantine 優先 / Paper Redesign）

### 9.1 ワイヤーフレーム

```
/review?tab=monthly
┌──────────────────────────────────────────────┐
│ レビュー                                       │ ← PageTitle（波下線。ReviewPage が持つ）
│ ┌────────┬────────┐                          │
│ │  週次   │  月次   │  ← Tabs variant="pills"   │
│ └────────┴────────┘                          │
│                                               │
│  ◀  2026年8月  ▶   [今月へ]                    │ ← MonthlyReviewMonthNav
│                                               │
│ ┌──────────────┬──────────────┬─────────────┐│
│ │ 学習量        │ 実施日        │ 消化         ││ ← SummaryCards（3枚。週次と同じ形）
│ │ 1,240分       │ 18日          │ 82%          ││
│ │ 1日平均 69分   │ 先月 15日(+3) │ 41/50件      ││
│ │ 先月 1,080分  │              │ 今日は数えない ││
│ │ (+160分)      │              │              ││
│ └──────────────┴──────────────┴─────────────┘│
│                                               │
│  月間の消化推移                                 │
│  ┌───────────────────────────────────────┐   │
│  │  [棒グラフ: 第1週 第2週 第3週 第4週 第5週(一部)]│ │ ← MonthlyDigestTrendChart
│  └───────────────────────────────────────┘   │
│                                               │
│  カテゴリ内訳の月比較（先月比）                    │
│  ┌───────────────────────────────────────┐   │
│  │ [グループ棒: 今月/先月 × カテゴリ]        │   │ ← MonthlyCategoryComparison
│  ├───────────────────────────────────────┤   │
│  │ カテゴリ  今月  先月  増減              │   │ ← 数値表(併記, CONTEXT 履歴の慣習)
│  │ TOEIC対策 620分 540分 +80分(+14.8%)     │   │
│  │ 多聴      ...                          │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  [今月(2026-08)を履歴で見る]                    │ ← /history?month=... へのリンク
└──────────────────────────────────────────────┘
```

サマリー3枚の並び（学習量 → 実施日 → 消化）、前月比の見せ方（矢印アイコン + ミュート色。色で増減の良し悪しを評価しない）は `weekly-review.md` §4.2・§9.3 と完全に同じレイアウト規則に揃える。**月固有なのは「消化推移」と「カテゴリ内訳の月比較」の2ブロックだけ**（§1-4, §1-5）。

### 9.2 コンポーネント一覧・所有者の切り分け

| ファイル | 責務 | 所有者 |
| --- | --- | --- |
| `src/features/review/components/review-page.tsx` | Tabs 外枠。**`Tabs.Panel value="monthly"` の中身だけ本書が差し替える**（下記） | `weekly-review.md`（改修は本書が指示） |
| `src/features/review/hooks/use-review-view.ts` | `yearMonth` / `setMonth` を含む統合フック | `weekly-review.md`（変更なし） |
| `src/features/review/hooks/review-queries.ts` | `useWeeklyReview` に加えて `useMonthlyReview` を追加 | `weekly-review.md` が作成したファイルに本書が追記（改修） |
| `src/features/review/lib/review-shimmer-template.ts` | Shimmer 用テンプレデータ。週次ぶんに月次テンプレを追記 | `weekly-review.md` が作成したファイルに本書が追記（改修） |
| `src/features/review/components/monthly-review-tab.tsx` | 月次タブ本体 | 新規（本書） |
| `src/features/review/components/monthly-review-tab-pending.tsx` | 構造モックの `<Shimmer loading>`（shimmer-from-structure.md パターン2） | 新規（本書） |
| `src/features/review/components/monthly-review-month-nav.tsx` | 月の前後移動（`learning-date-navigation.tsx` と同じ `ActionIcon` + `Tooltip` パターン） | 新規（本書） |
| `src/features/review/components/monthly-review-summary-cards.tsx` | サマリー3枚（学習量・実施日・消化。週次と同じ形） | 新規（本書） |
| `src/features/review/components/monthly-digest-trend-chart.tsx` | 週バケットの消化率 `BarChart`（`@mantine/charts`） | 新規（本書） |
| `src/features/review/components/monthly-category-comparison.tsx` | 今月/先月のグループ棒 `BarChart` + 数値表 | 新規（本書） |
| `src/features/review/lib/monthly-review-labels.ts` | 月固有の表示整形（月ラベル・前月比テキスト）。`dailyAverageMinutes` / `deltaDirection` は `weekly-review-labels.ts` から import して再利用する（§13-15） | 新規（本書） |
| `src/features/review/lib/category-comparison.ts` | 今月/先月の `byCategory` 突き合わせ・delta% 計算（純粋関数、§13-8） | 新規（本書） |
| `src/features/review/types/monthly-review.ts` | `FunctionReturnType` 由来の型 | 新規（本書） |

`review-page.tsx` の改修差分（`Tabs.Panel value="monthly"` 内のみ。`weekly-review.md` §9.2 のコードの当該箇所を次のように差し替える）:

```tsx
// 変更前(weekly-review.md §9.2)
<Tabs.Panel pt="md" value="monthly">
  {tab === "monthly" ? <MonthlyReviewPlaceholder /> : null}
</Tabs.Panel>

// 変更後(本書)
<Tabs.Panel pt="md" value="monthly">
  {tab === "monthly" ? (
    <Suspense fallback={<MonthlyReviewTabPending />}>
      <MonthlyReviewTab />
    </Suspense>
  ) : null}
</Tabs.Panel>
```

`WeeklyReviewTab` 側の `Suspense` パターン（`weekly-review.md` §9.2）と完全に同じ形にする。`MonthlyReviewPlaceholder`（`Text c="dimmed"` 1つ）は不要になるため削除する。

### 9.3 サマリー3枚（`weekly-review.md` §9.3 を再利用 — 差分のみ記載）

**再利用（差分ゼロ）**: `Grid` 3枚のマークアップ、カードの内部構造（`Text` の `ff`/`fw`/`fz`/`c` 指定、`DeltaIcon` の配置）は `weekly-review.md` §9.3 のコードをそのまま流用する。ここに再掲しない。差し替わるのは値の出典（`confirmedMinutes` → 月次 DTO の同名フィールド、`elapsedDays` → 月内の経過日数）だけで、JSX構造そのものは1行も変えない。

以下は月固有の差分（表示規則の確認と、月次だけの新規実装箇所）:

- **前月比に赤を使わない。** `weekly-review.md` §9.3 と同じ規則（design-live-board.md #2、赤は削除・危険の予約色）で、**`IconArrowUpRight` / `IconArrowDownRight` / `IconMinus` + 符号つきテキスト**（`+160分` / `-40分` / `±0分`）を使い、色は `var(--cairn-muted-2)` 一色にする。
- `DeltaIcon` / `dailyAverageMinutes` / `deltaDirection` は**新規に書かず** `weekly-review-labels.ts`（`weekly-review.md` §9.8）から import する（同一 feature 内なので project-structure.md の「Feature inter-dependencies forbidden」には抵触しない。§13-15）。**月固有で新規に書くのは `previousMonthLabel`（「先月」という文言差分）だけ**で、`monthly-review-labels.ts` に置く。
- 消化タイルは `digest.digestRate*100` を大きく、その下に `{digest.confirmedCount}/{digest.plannedCount}件` と `digest.isPartial` のときだけ `今日は数えません`。`digest.plannedCount === 0` のときは `—` と `まだ数えられません`（`weekly-review.md` §9.3 と同一規則。月全体の `digest` が `weeklyDigestValidator` の形そのものなので、この分岐ロジックも週次と共有できる）。
- 前月データが無い（利用開始1か月目、`previousConfirmedMinutes === 0 && previousActiveDays === 0`）ときは前月比の行を出さず、`先月の記録はありません` を1行出す（`weekly-review.md` §13-4 と同一パターン）。

### 9.4 月間の消化推移チャート（`weekly-review.md` の「チャート不使用」からの意図的な逸脱）

```tsx
// src/features/review/lib/monthly-review-labels.ts
export function monthlyDigestBucketLabel(index: number, isPartial: boolean): string {
  const base = `第${index + 1}週`;
  return isPartial ? `${base}(一部)` : base;
}
```

```tsx
// monthly-digest-trend-chart.tsx（骨子）
<BarChart
  data={digestTrend.map((bucket, index) => ({
    label: monthlyDigestBucketLabel(index, bucket.isPartial),
    消化率: bucket.plannedCount === 0 ? null : Math.round(bucket.digestRate * 100),
  }))}
  dataKey="label"
  h={220}
  series={[{ color: "orange.5", name: "消化率" }]}
  valueFormatter={(value) => `${value}%`}
  withLegend={false}
  yAxisProps={{ domain: [0, 100] }}
/>
```

- `plannedCount === 0` の週（記録が1件も無い週、または当日除外後に空になった当月最終週）は `null` にして棒を出さない。0% と表示すると「サボった」に見えてしまい、CONTEXT「消化」の定義（計画があったかどうかの指標であり、無い週はそもそも指標が無い）に反する（`weekly-review.md` §9.3 と同じ考え方）。
- `isPartial` な週バケットは棒の色を `orange.3`（薄い）にして注記する（`Alert` ではなく、バーの下に `Text size="xs" c="dimmed"` で「第5週は月末までのデータです」等、静かな注記に留める。CONTEXT 履歴の `_Avoid`「模試分析のような複雑ダッシュボード」を踏まえ、警告色は使わない）。
- 色は `orange.5`（Progress/棒の既定アクセント。`weekly-review.md` §9.4 が紙面 `#F2F0E5` に対し 3:1 以上のコントラストを実測済みで、本書のチャート背景である `Card` の `PAPER`（`#FFFCF0`。inset より明るい）に対しても同等以上のコントラストになる）。
- Y軸は 0〜100% 固定（`yAxisProps={{ domain: [0, 100] }}`）。月をまたいでも軸のスケールが変わらないようにする。
- **`weekly-review.md` §1-4 は「チャートライブラリ（`@mantine/charts`）は使わない」と決めているが、月次レビューはここで意図的に外れる。** 理由は §13-2 で検討する（週次の「7点×3指標」は既存の分析パス・チャートと完全に同じ絵になったため表に統合したが、月次の「週バケット4〜6本のトレンド」は既存のどこにも無い絵であり、表に置き換えると読み取りにくくなる）。

### 9.5 カテゴリ内訳の月比較

```ts
// src/features/review/lib/category-comparison.ts
export type CategoryComparisonRow = {
  category: string;
  categorySortOrder: number;
  currentMinutes: number;
  deltaLabel: string; // "+80分(+14.8%)" | "新規" | "先月のみ" | "変化なし"
  deltaMinutes: number;
  previousMinutes: number;
};

export function buildCategoryComparisonRows(
  current: readonly { category: string; categorySortOrder: number; minutes: number }[],
  previous: readonly { category: string; minutes: number }[],
): CategoryComparisonRow[] {
  const previousByCategory = new Map(previous.map((entry) => [entry.category, entry.minutes]));
  const seen = new Set<string>();
  const rows: CategoryComparisonRow[] = current.map((entry) => {
    seen.add(entry.category);
    const previousMinutes = previousByCategory.get(entry.category) ?? 0;
    return {
      category: entry.category,
      categorySortOrder: entry.categorySortOrder,
      currentMinutes: entry.minutes,
      deltaLabel: deltaLabel(entry.minutes, previousMinutes),
      deltaMinutes: entry.minutes - previousMinutes,
      previousMinutes,
    };
  });
  const previousOnly = previous
    .filter((entry) => !seen.has(entry.category))
    .map((entry) => ({
      category: entry.category,
      categorySortOrder: Number.MAX_SAFE_INTEGER,
      currentMinutes: 0,
      deltaLabel: "先月のみ",
      deltaMinutes: -entry.minutes,
      previousMinutes: entry.minutes,
    }));
  return [...rows, ...previousOnly].toSorted(
    (left, right) => left.categorySortOrder - right.categorySortOrder,
  );
}

function deltaLabel(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "変化なし";
  if (previous === 0) return "新規";
  const percent = Math.round(((current - previous) / previous) * 100);
  const sign = current - previous >= 0 ? "+" : "";
  return `${sign}${current - previous}分(${sign}${percent}%)`;
}
```

- カテゴリの対応は**カテゴリ名の文字列**で行う（`categoryBreakdownValidator` が名前ベースの集計であるため、履歴機能全体と同じ設計。§13-8 で ID ベース案を検討し却下）。
- 「先月のみ」（今月0分）の行は一覧の末尾に固定する（`categorySortOrder = MAX_SAFE_INTEGER`）。カテゴリを削除した/使わなくなった場合に自然に一番下へ落ちる。
- グループ棒グラフは2系列: 今月 = `orange.5`（消化推移チャート・週次レビューの行内バーと同じアクセント色で「現在の期間」を表す）、先月 = `gray.6`（Mantine 既定パレット。`--cairn-muted-2` 相当のトーンで「過去の期間」を表す。紙面 `#FFFCF0` に対しグラフィカル要素の閾値である 3:1 を満たす）。**数値は必ず併記の表で示し、チャートだけで数値を伝えない**（CONTEXT「履歴」_Avoid_。`weekly-review.md` §4.3 と同じ原則）。
- グラフ側は `previous === 0 && current === 0` の行を除外して描画する（表には出すが、グラフのノイズにはしない）。
- 増減列（表）も色で良し悪しを表さない。テキストの符号（`+`/`-`）と数値だけで表す（§9.3 のサマリータイルと同じ規則。design-live-board.md #2）。

### 9.6 月版 Slack 共有文は持たない

**決定: 月次レビューに共有文ブロックは置かない。** `weekly-review.md` §1-7・§10 は週版共有文（`formatWeeklyShareMarkdown`）を確定しているが、月次には対応するものを作らない。理由:

1. ticket の Question は「月間の消化推移・カテゴリ内訳の月比較など」であり、共有文は挙げられていない。マップの「Not yet specified」にも月次共有文は無い。
2. 月の確定記録をカテゴリ×項目で全部並べると行数が多くなり、Slack に貼る単位として大きすぎる（週版の6倍近い分量になり得る）。月の要約は本画面の「カテゴリ内訳の月比較」チャート+数値表がすでに担っている。
3. 週版共有文は「確定した記録から作る Markdown」（CONTEXT「共有文」）という日次〜週次の運用に馴染む粒度で確定した機能であり、月次まで拡張する要求はどこにも無い。

必要になった場合は独立チケットとして再検討する（§17 openQuestions）。

### 9.7 Paper Redesign 準拠

`weekly-review.md` §9.9 と同一規則。色は Mantine トークン（`orange.5` / `gray.6` / `green` / `blue` / `red`）と `--cairn-*` 変数のみ。hex を直書きしない。数値は `NUMERAL_FONT`、見出し・本文は既定（`BODY_FONT` / `DISPLAY_FONT`）。見出しは共通 `PageTitle`（`ReviewPage` がすでに持つ）。ライトのみ。カードの不揃い輪郭・紙の影は `Card` のテーマ既定に任せる。

### 9.8 Shimmer

- `ReviewPage` の `Suspense fallback` は `weekly-review.md` の `ReviewPending` をそのまま使う（変更なし）。
- 月次タブの `Suspense fallback` は `MonthlyReviewTabPending`。**`MonthlyReviewTab` 自身を fallback に入れない**（再サスペンドする。shimmer-from-structure.md パターン2）。サマリー3枚・消化推移チャート（棒5本ぶんのダミー）・カテゴリ比較（3行ぶんのダミー）の構造モックを `<Shimmer loading>` で包む。
- テンプレデータは `weekly-review.md` が作成する `review-shimmer-template.ts` に `monthlyReviewShimmerTemplate` を追記する形にする（週次テンプレと同じファイルに同居させ、Shimmer 用データの置き場所を1つに保つ。AHA）。バケット5件・カテゴリ3件など、実データに近い配列長にしてレイアウトシフトを防ぐ。
- 色は `__root.tsx` の `ShimmerProvider` から継承する。`<Shimmer>` に色 props を書かない。
- `React.memo` を付けない（React Compiler 任せ）。

---

## 10. 型の SSoT（convex-tanstack.md 準拠）

```ts
// src/features/review/hooks/review-queries.ts（weekly-review.md が作成したファイルに追記）
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useMonthlyReview(todayJst: string, yearMonth: string) {
  return useSuspenseQuery(
    convexQuery(api.queries.review.monthlyReview.monthlyReview, { todayJst, yearMonth }),
  );
}
```

```ts
// src/features/review/types/monthly-review.ts
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type MonthlyReview = FunctionReturnType<typeof api.queries.review.monthlyReview.monthlyReview>;
export type MonthlyCategoryBreakdown = MonthlyReview["byCategory"][number];
```

コンポーネントの props はすべてこの型から派生させる。手書きの重複型を作らない。**`~/features/history/types/history` から `CategoryBreakdown` 等を import しない**（project-structure.md「Feature inter-dependencies forbidden」— `review` と `history` は兄弟 feature）。`~/features/review/types/weekly-review`（`weekly-review.md` §11）とは別ファイルにする（週次・月次で戻り値の形が違うため、型を無理に共通化しない）。

---

## 11. フォーム（Formisch / Valibot）

**フォームは無い。** 月次レビューは読み取り専用画面で、ユーザー入力を保存する mutation を持たない（§4「見せない」列）。したがって Formisch のフォームは存在しない。唯一の入力は `/review` の検索パラメータ（月の前後移動）であり、これは `weekly-review.md` §8.2 の Valibot スキーマ（`ReviewSearchSchema`）でルート境界のバリデーションを行う。これは valibot-validation.md の「境界だけ検証する」の対象であり、フォームスキーマとは別物である。

---

## 12. エッジケース

| # | 状況 | 挙動 | 根拠 |
| --- | --- | --- | --- |
| 1 | `yearMonth` の形式が壊れている（URL 直接編集など） | `emptyMonthlyReview` を返す（全項目0/空配列。`digest` も0埋めの `WeeklyDigest` 形） | `computeMonthBreakdown` の既存防御と同じパターン（§7.2, §13-9） |
| 2 | `month` が未来月 | ルート側（`weekly-review.md` の `deriveReviewMonth`）で当月にクランプ。サーバは未来月を渡されても単に0件を返すだけで安全 | `deriveHistoryView` と同じクランプ規則 |
| 3 | 前月にデータが無い（利用開始1か月目） | `previousConfirmedMinutes === 0` のとき、カテゴリ比較は全行「新規」表示。サマリーには前月比の行を出さず `先月の記録はありません` を1行出す。±% は表示しない | ゼロ除算・誤解を招く「-100%」を避ける（§9.3, `weekly-review.md` §13-4 と同一） |
| 4 | 当月レビュー中（`isCurrentMonth === true`） | `digest`・`digestTrend` の当日を含むバケットが `isPartial: true` になり注記が付く。サマリーの学習量・実施日は「今日まで」の実績としてそのまま出す（隠さない） | CONTEXT「学習量」は確定分数の合計であり、月が終わっていなくても実績は実績（`weekly-review.md` §13-5 と同一考え方） |
| 5 | 月内に1件も記録が無い（丸ごと休養月 or アカウント作成前） | サマリー全て0、`digest` は `plannedCount===0` → `—`/`まだ数えられません`。チャートは空状態（`plannedCount===0` の週は非表示、全週非表示なら「この月の記録はありません」の `EmptyState`） | `theme.ts` の `EmptyState` デフォルト props を使う |
| 6 | 削除済み（ゴミ箱）の記録・日 | 集計・トレンド・`digest` のすべてから除外（`liveRows`/`liveDayDatesFrom` を通す） | §7.2 のコメントで明示。忘れると復元前提のゴミ箱記録が実績に残るバグになる |
| 7 | 項目が削除されている（移行前データ等） | `aggregateBreakdownRows` 内の既存フォールバック（`item?.name ?? "不明"`）をそのまま使う。新しいフォールバックを増やさない | 既存 `historyBreakdown.ts` の挙動を流用（CVX-16） |
| 8 | カテゴリを月の途中で改名した | 今月と前月でカテゴリ名が変わっていると、旧名は「先月のみ」、新名は「新規」として出る（名前ベース突き合わせの既知の限界） | §13-8 で ID ベース案を検討し、既存設計との一貫性を優先して許容 |
| 9 | 月境界をまたぐ週（第1週・最終週） | 月内の日数だけの部分週として扱い、前月/翌月の日を混ぜない。`isPartial: true` | §6.3, §13-6 |
| 10 | 複数タブ/端末で同時に閲覧 | Convex の reactive query が自動で最新化する。専用の同期機構は不要 | 既存の全 query と同じ（Convex の標準動作） |
| 11 | 所有者間のデータ越境（IDOR） | `ownerQuery` が `ctx.ownerId` を強制し、index は常に `ownerId` で絞る。他所有者の `rows`/`days` は取得され得ない | CVX-04、既存の全 query と同じ設計 |
| 12 | オフライン（PWA #58 とは独立） | Convex クライアントの標準の再接続・キャッシュ挙動に従う。本書はオフライン専用の対応を持たない（PWA 対応は #58 の範囲） | pwa-mobile.md §7「担当範囲」の切り分けに合わせる |
| 13 | 週次タブから月次タブへ切り替える（同一 `/review` セッション内） | `useMonthlyReview` は週次タブが非表示のとき購読されない（`weekly-review.md` §9.2 の `tab === "monthly" ? ... : null` パターン）。タブ切り替えのたびに新規購読・アンマウントが起きるだけで、専用の対処は不要 | `weekly-review.md` §9.2 と同じ `Tabs.Panel` 構造 |

---

## 13. 検討した代替案（グリル: 自問自答）

### 13-1〜13-7. 旧版から変更なしで維持する却下事項

以下は旧版（#52 未確定時点）の検討で、#52 確定後も結論が変わらないもの。要点のみ再掲する。

- **月間ターゲット（月ごとの分数ノルマ）を新設すべきでは？** → 却下。`targets` はスナップショットを持たない設計であり、過去月を今の目標値で裁くことになる（§13-1）。
- **週間ターゲットの「月内で何週達成したか」を集計すべきでは？** → 却下（同根）。スナップショットが無いため過去週にその時点の目標値を適用できない（§13-2）。
- **目標階層（チェックポイント件数・長期目標の進捗）を出すべきでは？** → 却下。目標は現在値のみのスナップショットで、月内トレンドを表せない。「#48〜50・#53 に依存しない」設計原則も踏襲する（§13-3）。
- **コンディション別内訳を月次レビューにも出すべきでは？** → 却下。`/history` の分析タブの月スコープに既にある（`monthBreakdown.byCondition`）。重複 UI を避ける（§13-4）。
- **消化推移は日次にすべきでは？** → 却下。日次は既存の「直近28暦日の曜日別消化」と粒度が重複し、モバイル幅で28〜31本の棒が潰れる。週バケット（4〜6本）が適切（§13-5）。
- **月境界をまたぐ週は7日固定にすべきでは？** → 却下。前月・翌月の日を混ぜると同じ暦日が二重計上され、月間合計と消化推移の合計が一致しなくなる（§13-6）。
- **前月比ではなく前年同月比（YoY）にすべきでは？** → 却下。本番まで約6週間の学習ログとして始まったアプリで前年データが存在しない（spec.md Problem Statement）。

### 13-8. カテゴリ比較の delta% やラベルはサーバで計算して返すべきでは？

**一部譲るが、却下（旧版から維持。`weekly-review.md` §14-7 と同一の結論に揃った）。** サーバは `byCategory` / `previousByCategory` という生の分数集計だけを返し、「新規」「先月のみ」等の表示ラベルや delta% はクライアントの純関数（`category-comparison.ts`）に置く。理由: ①表示文言（日本語ラベル、パーセント表記の丸め方）は UI の関心であり、`convex/lib` に置くべきではない（CVX-09 の精神は「ドメイン計算」と「表示整形」の分離にも及ぶ。`weekly-review.md` §14-7 の「前週比のラベルはクライアントの純関数に置く」と同じ判断）。②既存の `chart-data.ts`（履歴機能）も donut のセル生成や週タイトルの整形をクライアント側の純関数で行っており、月次レビューだけサーバ側で計算すると設計が割れる。

一方で、**カテゴリ名ベースの突き合わせという「対応関係の決定」自体は月固有の新しいロジック**であり、これを毎回コンポーネント内に書くと画面ごとに実装がずれるリスクがあるため、`category-comparison.ts` という専用の純関数ファイルに切り出す（コンポーネントに直書きしない）。

### 13-9. `yearMonth` が壊れている場合、`weekly-review.md` と同じく throw すべきでは？

**却下。** `weekly-review.md` の `requireDateJst` / `requireWeekStartJst` は日/週の引数を throw で弾くが、これは `weeklyReview` query が新規に導入した規則ではなく、既存の日ページ/週ページの引数検証パターンを踏襲したもの。一方、月の引数（`yearMonth`）については、既存の `services/history/computeMonthBreakdown.ts` がすでに「壊れた形式なら空の DTO を返す」という**別の確立された規則**を持っている。月次レビューは新規に規則を作らず、**同じ引数の型（`yearMonth`）を扱う既存の隣接クエリに揃える**方を選んだ（CVX-16 の精神——同じ概念には同じ扱いを——を「引数の型」の軸で適用した）。

**譲る点**: これによりリポジトリ全体では日/週引数は throw、月引数は空 DTO という2つの規則が併存する。統一するなら別途「日付系引数の検証規則を1本化する」独立の技術的決定が必要で、本チケットのスコープ外とする（openQuestions）。

### 13-10. レビューをナビタブ（8本目）へ昇格させるべきでは？

**再審しない。** `weekly-review.md` §8.5・§14-8 がこの論点をすでに決着させている（`NAV` は7本のまま。CONTEXT.md「マイページ」の `_Avoid_`「8番目のナビタブ」と、それを前提に確定済みの `notifications.md`・`pwa-mobile.md` §10 を守る）。マップ運用ルール「ロック済みの決定を relitigate しない」に従い、本書は独自の再検討をしない。旧版が保持していた完全な検討過程（3案比較）は `weekly-review.md` §14-8・§8.5 側に一本化されたと理解する。

### 13-11. サマリー3枚を「学習量/実施日/消化」ではなく元の「確定分数/稼働日数/見送り件数」のままにすべきでは？

**却下（旧版からの変更点。以下が今回の判断）。** 元の第3タイル「見送り件数」は月の消化のうち「見送り」だけを切り出した数字で、消化率（確定/並んだ件数）という完成された指標ほど情報量が無い。`weekly-review.md` は週次のサマリー3枚目を「消化」（確定/並んだ件数の比率 + 件数の内訳）にしており、この形の方が①既存の「消化」概念（CONTEXT）に忠実 ②`weeklyDigestValidator` をそのまま月全体にも再利用できる（CVX-16 SSoT、§13-13）という2点で優れている。**画面間の一貫性（週次と月次で同じ3項目）を優先し、月次のサマリーも「学習量/実施日/消化」に揃える。**

**譲る点**: 「見送り件数」という単純な数字が持っていた読みやすさ（1タイルで完結する具体的な件数）は失われる。ただし `skippedMinutes` は DTO に残しており（`weekly-review.md` の DTO も同様に `skippedMinutes` を残すだけでタイル化していない）、必要であればカテゴリ比較の数値表や将来の詳細ビューで参照できる。

### 13-12. 月次にも週次と同様「1画面」の原則（他画面へ遷移せずに判断が終わる）を明文化すべきでは？

**部分的に採用。** `weekly-review.md` §4.1 は「他画面へ遷移せずに週の判断が終わる」ことを1画面の定義に含めている。月次レビューも同じ精神（サマリー・トレンド・比較を1画面に収め、掘りたいときだけ履歴へ渡す）を持つが、月次は「続ける/変える」という単一の判断ではなく「先月と比べてどうだったかを俯瞰する」ことが目的であるため、週次ほど強く「意思決定を1画面で完結させる」とは謳わない。§1・§4 のスコープ表がこの役割を代わりに果たしている。

### 13-13. `buildWeeklyDigest` / `elapsedDaysInWeek` を「weekly」という名前のまま月次から呼ぶのは適切か？

**認めた上で、リネームは本チケットのスコープ外とする。** 両関数は実装上まったく週固有ではない（任意長の `readonly string[]` を受け取るだけ）。しかし関数名・ファイル名（`convex/lib/weeklyReview.ts`）は「週次レビュー」を指しており、月次レビューのサービスコードから見ると `import { buildWeeklyDigest } from "../../lib/weeklyReview"` は一見奇妙に映る。

検討した3案:

| 案 | 判断 |
| --- | --- |
| (a) そのまま `weeklyReview.ts` から import する | **採用。** `weekly-review.md` は既に「決定済み」であり、本チケットがその文書のファイル名・関数名を書き換える権限は無い（担当範囲外）。動作は完全に正しく、CVX-16（重複実装を避ける）を満たす |
| (b) `convex/lib/digestPeriod.ts` のような中立的な名前へ実装時にリネームする | 次にこの関数の3人目の利用者が現れた時点（AHA）で検討すべき、**任意の**改善。本書はこれを要求しない。リネームする場合は `weekly-review.md` 側のコメント・テストも合わせて更新が必要になり、決定済み文書への影響が本チケットの担当範囲を超える |
| (c) 月次専用に同じロジックを複製する | 却下。CVX-16 / AHA に反する二重実装であり、`presetDigest.ts` → `completionRate.ts` の教訓（`weekly-review.md` §6.1）に反する |

**結論: (a)。** 実装セッションは `weeklyReview.ts` から直接 import してよい。将来的な中立名へのリネームは、必要になった時点の独立した小さな改修に委ねる（openQuestions）。

### 13-14. 月次レビューへの専用リンクを1本も持たないのは discoverability として弱すぎないか？

**認めるが、現状維持とする。** `weekly-review.md` は週次レビューについて「週に1回」の頻度を理由に入口を2本（履歴 + `/goals`）に増やした（§14-8）。月次レビューは「月に1回」でさらに頻度が低く、`weekly-review.md` の同じ判断基準（pwa-mobile.md §10.2 の「毎日触らない機能は常設 UI 要素を専有しない」という基準）を当てはめると、**専用の3本目のリンクを持つ必要性は週次より低い**。

加えて、`/review` に着地した利用者はタブが2つしかないため、月次タブへの到達コストは「タブを1回クリックする」だけであり、実質的に discoverability の悪化は小さい。

**譲る点**: 週次を見るために `/review` を開いた利用者が、月次の存在に気づかないまま離脱する可能性はある。将来 `weekly-review.md` §8.5 末尾の「ナビタブ昇格の3点セット」を実行するのであれば、その時点で月次タブの発見性も同時に改善される。単独で月次だけ専用リンクを追加する変更は、ナビ導線の一貫性（週次と月次を同じ扱いにする）を崩すため見送る。

### 13-15. `dailyAverageMinutes` / `deltaDirection` を `weekly-review-labels.ts` から import するのは feature 間 import 禁止に触れないか？

**触れない。確認のうえ明記する。** project-structure.md の「Feature inter-dependencies forbidden」は**異なる feature 間**（例: `orders` が `users` から import する）を禁じるものであり、`weekly-review-labels.ts` と `monthly-review-labels.ts` はどちらも同じ `src/features/review/` 配下にある。同一 feature 内のファイル間 import は既存のどの規約にも違反しない。

**それでも独立ファイルにした理由**: `previousWeekLabel`（「先週」という文言をハードコードしている）は月次でそのまま使えないため、`previousMonthLabel`（「先月」）を別途書く必要がある。一方 `dailyAverageMinutes` / `deltaDirection` は文言を含まない純粋な計算なので、そのまま import して再利用する（2箇所目の利用だが、`weekly-review-labels.ts` というファイル名を変更してまで中立化するのは §13-13 と同じ理由でスコープ外とする）。

---

## 14. テスト（CVX-19、convex-test）

### 14.1 純関数 unit（`convex/lib/**/*.test.ts`、Node 環境）

| ファイル | ケース |
| --- | --- |
| `convex/lib/completionRate.test.ts` | `weekly-review.md` が作成する場合はそのまま使う（内容同一。§6.1） |
| `convex/lib/monthlyReview.test.ts`（新規） | `bucketDatesByWeek`: 月初が月曜でない月・月末が日曜でない月・31日ある月/28日の2月で正しく部分週ができる。`buildMonthlyDigestTrend`: 当日を含む週から当日を除外する／`plannedCount===0` の週で `digestRate===0` になる／`isPartial` が月境界と当日を含む週の両方で立つ |
| `convex/lib/jst.test.ts`（既存ファイルに追記） | `addMonthsJst("2026-01", -1) === "2025-12"`／`addMonthsJst("2026-12", 1) === "2027-01"`／`addMonthsJst("2026-08", 0) === "2026-08"` |
| `convex/lib/weeklyReview.test.ts` | `weekly-review.md` の既存テストで `buildWeeklyDigest` / `elapsedDaysInWeek` の汎用性はすでに検証済み。月次側で追加のユニットテストは不要（呼び出しが正しいことは §14.2 の統合テストで確認する） |

### 14.2 Convex 統合（`convex/monthlyReview.test.ts`、edge-runtime、`convex-test`）

`convexTest(schema)` + `t.withIdentity({ subject })`（testing.md の規約どおり）。

| ケース | 期待 |
| --- | --- |
| 未認証で呼ぶ | throw する（`ownerQuery` の認可ガード） |
| 所有者Aのデータを所有者Bとして読む | 所有者Bの結果は0/空（IDOR にならない。CVX-04） |
| 今月・前月それぞれに確定/未着手/進行中/スキップの記録がある | `byCategory` / `previousByCategory` / `confirmedMinutes` / `previousConfirmedMinutes` が正しく分かれる |
| `digest`（月全体の消化）が正しく計算される | 今日を含む当月では今日が分母・分子から除かれる（`buildWeeklyDigest` が正しい `dates` で呼ばれていることの確認） |
| ゴミ箱に入れた記録・日がある | 集計・トレンド・`digest` のすべてから除外される（§13-6） |
| 前月にデータが無い（アカウント作成月） | `previousConfirmedMinutes === 0`、`previousByCategory === []` |
| `todayJst` が対象月の途中（当月レビュー） | `isCurrentMonth === true`。当日を含む週バケットの `plannedCount` が当日ぶんを含まない |
| `yearMonth` が壊れた文字列 | 空の `MonthlyReviewDto` が返る（throw しない。§7.2, §13-9 の防御） |

### 14.3 フロント integration（Testing Library、happy-dom）

`src/features/review/components/monthly-review-tab.test.tsx`:

- `useMonthlyReview` をモックし、サマリーカードの数値（学習量・実施日・消化の3枚。週次と同じ形）・カテゴリ比較表の行・「先月のデータがありません」の `Alert`（前月ゼロ時）が正しく描画されることを `getByRole` / `getByText` で確認。
- `renderWithMantine` を使用（testing.md 規約）。`data-testid` は使わない。

`src/features/review/lib/category-comparison.test.ts` / `monthly-review-labels.test.ts`: 純粋関数として直接テスト（Vitest、`frontend` project）。`monthly-review-labels.test.ts` は `monthlyDigestBucketLabel` / `previousMonthLabel` のみを対象にする（`dailyAverageMinutes` / `deltaDirection` は `weekly-review-labels.test.ts` 側でカバー済み。§13-15）。

`app-shell.tsx` は無変更なので**ナビ関連のテストは追加しない**（`weekly-review.md` §15.3、pwa-mobile.md §17 の app-shell テスト期待値もそのまま）。`history-page.tsx` / `weekly-targets-section.tsx` への入口テストも `weekly-review.md` 側の担当であり、本書は追加しない（§8.3）。

`review-page.test.tsx`（存在すれば）: `tab=monthly` で `MonthlyReviewTab` がレンダリングされることを1アサーション追加する（`WeeklyReviewTab` 用のテストがあれば、対になる形で追記）。

---

## 15. 実装チェックリスト

**新規**（本書が作成）:

- `convex/lib/monthlyReview.ts` / `monthlyReview.test.ts`
- `convex/queries/review/monthlyReview.ts`
- `convex/services/review/monthlyReview.ts`
- `convex/monthlyReview.test.ts`（統合）
- `src/features/review/lib/monthly-review-labels.ts` / `.test.ts`
- `src/features/review/lib/category-comparison.ts` / `.test.ts`
- `src/features/review/types/monthly-review.ts`
- `src/features/review/components/monthly-review-tab.tsx` / `.test.tsx`
- `src/features/review/components/monthly-review-tab-pending.tsx`
- `src/features/review/components/monthly-review-month-nav.tsx`
- `src/features/review/components/monthly-review-summary-cards.tsx`
- `src/features/review/components/monthly-digest-trend-chart.tsx`
- `src/features/review/components/monthly-category-comparison.tsx`

**共有**（`weekly-review.md` が作成する場合はそのまま使う。どちらのチケットが先に実装しても内容は同一）:

- `convex/lib/completionRate.ts` / `completionRate.test.ts`
- `src/lib/schemas/calendar-date-schema.ts`
- `src/features/review/schemas/review-search-schema.ts`
- `src/features/review/lib/review-route-search.ts`
- `src/features/review/hooks/use-review-view.ts`
- `src/routes/review.tsx`

**改修**（本書が追記する。実装順によっては #52 実装後に本書側が触る）:

- `convex/lib/validators.ts`（`monthlyDigestBucketValidator` / `monthlyReviewValidator` 追加。`weeklyDigestValidator` 追記より後ろ）
- `convex/lib/jst.ts`（`addMonthsJst` 追加）、`convex/lib/jst.test.ts`（追記）
- `src/features/review/hooks/review-queries.ts`（`useMonthlyReview` を追記）
- `src/features/review/lib/review-shimmer-template.ts`（`monthlyReviewShimmerTemplate` を追記）
- `src/features/review/components/review-page.tsx`（`Tabs.Panel value="monthly"` の中身を `MonthlyReviewPlaceholder` → `<Suspense><MonthlyReviewTab/></Suspense>` に差し替え。§9.2）

**無変更（意図的）**:

- `convex/schema.ts` — 新規テーブル・インデックスなし（§5）
- `src/components/app-shell.tsx` — `NAV` は7本のまま（`weekly-review.md` §8.5・§14-8。本書は再審しない）
- `CONTEXT.md` — 語彙の追加・改訂なし（§17）
- `src/features/history/components/history-page.tsx` — `weekly-review.md` が改修する。本書は触らない（§8.3。旧版の計画を撤回）
- `docs/specs/pwa-mobile.md` §10・§17、`docs/specs/notifications.md` — 本書は改訂しない

`vp check` / `vp test` / `vp run fallow`（新規 export の参照漏れがないか） / `vp build` を実装後に通す（development-workflow.md の PR pre-check）。`convex/` の差分は `convex:convex-reviewer` に通す（CVX-18）。**#52・#54 の実装順序に関わらず、後から実装する側は `weekly-review.md` §16 / 本書 §15 の「共有」ファイルが既に存在するかを確認し、存在すれば新規作成をスキップして改修に切り替える。**

---

## 16. 範囲外（このドキュメントが決めないこと）

- `/review` の共有土台・週次タブの中身 → #52（`weekly-review.md`。本書は§2で全面採用）
- 目標×記録の紐付け → #53（本書はこれに依存しない設計にした）
- 通知（`weeklyTargetMiss` 等）のリンク先を `/review` に差し替える作業 → #52/#56 側の担当（`weekly-review.md` §8.5）
- 月間ターゲットのスナップショット機構 → 未決（本書 §13-1、`weekly-review.md` §14-4 と同根の未決事項、openQuestions）
- レビューをナビタブ（8本目）へ昇格させるかの判断 → `weekly-review.md` が既に「昇格させない」と確定済み。本書は再審しない（§8.3, §13-10）
- PWA・オフライン対応 → #58
- AI 月次/週次サマリー（振り返り文の自動生成） → マップの「Not yet specified」のまま
- 月版 Slack 共有文 → 本書は「持たない」と決定した（§9.6）。将来必要になれば独立チケット
- `buildWeeklyDigest` / `elapsedDaysInWeek` の中立的な名前への実装時リネーム → 任意・非ブロッキング（§13-13、openQuestions）
- 日付系引数の検証規則（throw する日/週 vs 空DTOを返す月）の統一 → 未決（§13-9、openQuestions）

---

## 17. CONTEXT.md / ADR への影響

**変更不要。** 月次レビューは CONTEXT.md の既存語彙（「履歴」「消化」「学習量」「週間ターゲット」）の定義を変えず、新しい語も導入しない（「月次レビュー」自体は #47 のタイトルに既出の機能名であり、画面の実装であって新概念ではない）。ADR-0005〜0011 のいずれとも矛盾しない。新規 ADR は不要。

**「マイページ」の _Avoid_「8番目のナビタブ」も無変更**（§8.3, §13-10）。本書は `weekly-review.md` が確定した「`NAV` を7本のまま据え置き、`/review` の入口は履歴画面 + `/goals` のリンクにする」という判断をそのまま受け入れる。この `_Avoid_` の意図確定作業（マイページ限定の禁止か `NAV` の本数上限か）は CONTEXT.md の語彙改訂であり、#50 相当の独立工程として引き続き未着手のまま据え置く。

---

## 改訂（2026-09-02）— #81 日付系引数の検証規則を throw に統一

- §13-9 の「月の引数は空 DTO を返す」を**撤回**し、日・週（`requireDateJst` / `requireWeekStartJst`）と同じく **throw に統一**した。`convex/lib/dateArgs.ts` に `requireYearMonth` を足し、`computeMonthBreakdown` と `monthlyReview` は壊れた `yearMonth` で `ValidationFailedError`（`YEAR_MONTH_MESSAGE`）を投げる。`emptyMonthlyReview` は削除。
- 理由: 壊れた引数は URL 改変時にしか起きず、画面側には `ErrorState` がある。空 DTO は「データが無い月」と「壊れた引数」を見分けられず、0 埋めの `digest` が正しい値のように見える。
- クライアントの `validateSearch`（`YearMonthSchema`）は `YEAR_MONTH_PATTERN` / `YEAR_MONTH_MESSAGE` を `~domain/domain` から読み、サーバーと同じ正規表現・文言になった。
- 規則の置き場所: `convex/lib/dateArgs.ts` 冒頭のコメントと `.claude/rules/convex-rules.md` CVX-03 の補足。
- §13-13 の `buildWeeklyDigest` / `elapsedDaysInWeek` は `buildDigest` / `elapsedDaysInRange` に改名した（ファイルは `convex/lib/weeklyReview.ts` のまま）。
