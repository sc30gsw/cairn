# 週次レビュー設計（#52）

- 状態: 決定済み（2026-08-24）。実装は別セッション。
- 対象: **週次レビュー画面**。週の消化・週間ターゲット達成・コンディション・学習量を1画面にまとめ、既存の履歴/分析と役割を分け、日の共有文に対応する**週版 Slack 共有文**を持つ。
- 前提となる決定: マップ #47 の Decisions so far（優先順「目標階層 → タイマー → **週次レビュー** → 紐付け → 月次レビュー → 通知 → PWA」）。CONTEXT.md「履歴」「消化」「週間ターゲット」「学習量」「コンディション」「共有文」。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)、[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)、[design-live-board.md](../../.claude/rules/web/design-live-board.md)、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)、[shimmer-from-structure.md](../../.claude/rules/web/shimmer-from-structure.md)、[valibot-validation.md](../../.claude/rules/typescript/valibot-validation.md)、[project-structure.md](../../.claude/rules/typescript/project-structure.md)。
- このドキュメントの担当範囲: **週次レビュー画面のスキーマ・関数サーフェス・情報レイアウト・週版共有文フォーマット・エッジケース**、および `/review` ルートの共有土台（ルート・検索パラメータ・タブ外枠・週の状態導出）。目標階層（#48〜50）、タイマー（#51）、目標×記録の紐付け（#53）、月次レビューの中身（#54）、通知（#56）、PWA（#58）は範囲外（§17）。

---

## 0. 執筆順の注記（#54 との関係・最重要）

マップの優先順では **週次レビュー（#52）が月次レビュー（#54）より先**だが、本ランでは #54 が先に確定し `docs/specs/monthly-review.md` が既に存在する。同書の §0 は「#52 が未確定のため §2 に週次レビューの最小契約を仮決めした。#52 が確定したら §2・§8 を突き合わせること」と明記している。

本書は #54 §2 の仮定を**すべて採用する**（食い違いはゼロ）。そのうえで、#54 が「#52 が所有する」と明示した3点を本書で確定する。

| #54 が #52 に委ねた事項 | 本書の決定 | 節 |
| --- | --- | --- |
| `week` 検索パラメータの意味と導出 | 月曜正規化 + 未来週クランプ。`deriveReviewWeek` を `use-review-view.ts` に追加（#54 の `deriveReviewMonth` と同居） | §8.4 |
| `WeeklyReviewTab` の中身（#54 はプレースホルダのみ確定） | 本書 §4・§9 | §4, §9 |
| 「レビューをナビタブ（8本目）へ昇格させるか」の判断 | **昇格させない。`NAV` は7本のまま。**入口を2本に増やして発見性を補う | §8.5, §14-8 |
| 履歴からのリンクの `search` | `search` を落として既定タブ（`weekly`）へ飛ばす | §8.5 |

**実装順序の含意**: 優先順どおり #52 を先に実装する場合、`/review` ルート・`ReviewSearchSchema`・`ReviewPage`・`use-review-view.ts`・`~/lib/schemas/calendar-date-schema.ts`・`convex/lib/completionRate.ts`・履歴からのリンクは**本書（#52）が新規作成する**。#54 の該当節（§6.1, §8.1〜§8.4, §14「新規」の一部）はそのとき「#52 が既に作った土台に月次分を足す」に読み替える。コードは #54 が書いた形をそのまま採る（差分を作らない）ため、どちらが先に実装されても衝突しない。

---

## 1. 決定の要約

1. **新しいテーブルを1つも増やさない。** `rows` / `days` / `items` / `categories` / `targets` を読むだけの `ownerQuery` 1本（`weeklyReview`）で1画面ぶんが揃う（§5, §7）。
2. **1画面 = 5ブロックの縦一列。** ①サマリー（学習量・実施日・消化）②週間ターゲット達成 ③**週の1日/1行テーブル**（学習量・コンディション・消化を1つの表に統合）④週版共有文 ⑤履歴/日への導線。横スクロールなし、他画面へ遷移せずに週の判断が終わる状態を「1画面」と定義する（§4）。
3. **学習量・コンディション・消化を別々のチャートに割らず、7行のテーブルに束ねる。** 曜日ごとに「学習量（行内バー + 分数）・コンディション（`ConditionBadge`）・消化（確定/並んだ）」を横に並べる。7点しかないデータを3つのチャートに散らすより、1つの表で「週の形」が読める（§4.3, §9.4, §14-2）。
4. **チャートライブラリ（`@mantine/charts`）は使わない。** 日別ペースの折れ線/棒は既存 履歴/分析（週スコープ）の担当であり、同じ絵を2画面に置かない。週次レビューが使う図形は「行内バー」と「進捗メーター」だけ（§9.4, §14-2）。
5. **週の消化は「その週の 確定 / 並んだ件数」。今日の行は数えない。** CONTEXT「消化」の _Avoid_「今日の未着手を計画倒れに数えること」を、既存 `presetReview`（今日を除く直近28日）と #54 の月間トレンドと**同じ規則**で適用する（§6.2, §14-3）。
6. **週間ターゲットは今週だけ数値を出す。過去週は `null` を返し、UI は数値を一切描かない。** CONTEXT「週間ターゲット」の「今週専用の計器」「週次スナップショットを持たない」に従う。過去週では代わりに理由を書いた `Alert` を出す（§7.2, §13-3, §14-4）。
7. **週版共有文はサーバで組み立て、DTO の `shareMarkdown` として返す。** 日の共有文（`convex/lib/share.ts` の `formatShareMarkdown` を `getDayPage` が組む）と同じ置き場所・同じ構造（カテゴリ見出し + 項目行、固定順、空行なし、1件・項目名=カテゴリ名なら1行に畳む）にし、週は**項目ごとに分数を合算**して1週ぶんを2階層で表す。先頭に週範囲と学習量の見出し行を1行だけ足す（§10）。
8. **既存 履歴との棲み分け**: 履歴は「任意の日/週/月を選んで内訳を掘る」画面、週次レビューは「先週/今週というくくりで週を締める」画面。カテゴリ内訳（ドーナツ）・コンディション別学習量（集計表）・日別ペース・完了内訳・曜日別消化（直近28日）は**週次レビューに出さない**（§3, §14-1）。
9. **`/review` はナビタブにしない（`NAV` は7本のまま）。**入口は ①履歴画面のリンク ②`/goals` の週間ターゲット節のリンク の2本。加えて #56 の `weeklyTargetMiss` 通知のリンク先を `/review` にする（§8.5, §14-8）。
10. **mutation を持たない読み取り専用画面。** Formisch のフォームは存在しない。ユーザー入力は検索パラメータ（週の前後移動）だけで、境界検証は Valibot（`ReviewSearchSchema`）が行う（§12）。

---

## 2. 現状（コードから確認した事実）

| 既存要素 | 場所 | 事実 |
| --- | --- | --- |
| 週ページ（Agenda） | `queries/history/week.ts` → `services/history/computeWeekPage.ts` | 引数 `{ dateJst, todayJst }`。月曜始まりの週の `days`（学習量・7日移動平均・コンディション・メモ）、`events`（終日イベント）、`volumeMinutes` を返す。**消化もターゲットも持たない。** |
| 週の内訳 | `queries/history/weekBreakdown.ts` → `lib/historyBreakdown.ts` の `buildWeekBreakdown` | `byCategory` / `byCondition` / `byDay`（確定分数・見送り分数・休養フラグ）/ `rows`（項目別に合算した完了内訳）を返す。**消化もターゲットも持たない。** |
| 分析タブ | `features/history/components/analysis/history-analysis-panel.tsx` | 日/週/月の `SegmentedControl`。週スコープでは `CompositeChart`（完了 + 7日平均）＋ カテゴリ `DonutChart` ＋ 完了内訳表 ＋ コンディション別学習量表 ＋ メモ節。 |
| 曜日別の消化 | `services/history/presetReview.ts` + `lib/presetDigest.ts` | 「今日を除く直近28暦日」を**曜日ごと**に束ねた `確定 /(確定+未着手+進行中+見送り)`。ピッカーに追従しない固定ウィンドウ。 |
| 週間ターゲット実績 | `services/targets/listWithProgress.ts` → `queries/targets/listWithProgress.ts` | 引数 `{ weekStartJst }`（サーバ側で月曜へ正規化）。カテゴリ別に `current` / `targetValue` / `achieved` を返す。表示は `/goals` の `WeeklyTargetsSection` のみ。 |
| 日の共有文 | `lib/share.ts` の `formatShareMarkdown` → `services/days/getDayPage.ts` | 確定行だけ。カテゴリ固定順（`categorySortOrder` → 名前）。カテゴリ内は `sortOrder`。カテゴリ間に空行なし。`- カテゴリ` + `  - 項目: ひとこと N分`。1件・ひとこと空・項目名=カテゴリ名のときだけ `- カテゴリ N分` に畳む。**週版は存在しない。** |
| ナビ | `src/components/app-shell.tsx` | `NAV` は7本（日/ボード/履歴/項目/プリセット/目標/ゴミ箱）。 |

結論: 「その週の消化」「週間ターゲットの達成を週の実績として読むこと」「先週との比較」「週版の共有文」は**どこにも無い**。これが週次レビューの存在理由であり、既存機能の再掲ではない（§3 で重複しないことを検証する）。

---

## 3. 履歴/分析との棲み分け

| 軸 | 履歴（`/history`） | 週次レビュー（`/review?tab=weekly`） |
| --- | --- | --- |
| 目的 | 任意の日/週/月を**選んで掘る** | 1つの週を**締める**（続けるか変えるかを決める） |
| 単位 | 日・週・月を `SegmentedControl` で切り替える | 週だけ。画面の単位が週そのもの |
| 学習量 | 月カレンダーのマス、週 Agenda、分析の日別ペース（完了 + 7日平均） | **週合計 + 前週比 + 1日平均**、および7行テーブルの行内バー |
| コンディション | 月マス・週 Agenda の表示、分析のコンディション別学習量（集計表）、コンディション別メモ | 7行テーブルの1列（**日ごとの並び**。集計しない） |
| 消化 | 直近28日の**曜日別**（固定ウィンドウ。プリセット改善のための道具） | **その週の1つの数字**＋日ごとの内訳（この週の計画が残ったかの指標） |
| 週間ターゲット | 出さない | **今週の達成状況（画面の主役）** |
| カテゴリ内訳 | 分析のドーナツ + 完了内訳表 | **出さない**（週版共有文の項目行が実質の内訳を兼ねる） |
| 比較 | 無い | 前週比（学習量・実施日） |
| 共有 | 日の共有文（日ページ） | **週版共有文** |
| 編集 | 日ページへ遷移して編集 | 読み取り専用。導線だけ持つ |

**週次レビューに出さないものの理由**

- **カテゴリ別ドーナツ / 完了内訳表**: 分析の週スコープで同じ `byCategory` / `rows` が既に見られる。CONTEXT「履歴」の _Avoid_「模試分析のような複雑ダッシュボード」に寄る（§14-1）。
- **コンディション別学習量（集計表）**: 同上（分析の週スコープに `byCondition` がある）。週次レビューは日ごとの並びだけを持つ。
- **日別ペースのチャート**: 分析の週スコープの `CompositeChart` と完全に同じ絵になる（§14-2）。
- **曜日別の消化（直近28日）と プリセット改善提案**: ピッカーに追従しない固定ウィンドウの道具であり、週の単位に引き込むと定義が壊れる（CONTEXT「履歴」_Avoid_「消化を分析の日・週・月ピッカーに追従させること」）。週次レビューが出すのは**その週の消化**という別の指標で、曜日別の28日窓は履歴に残す（§14-5）。

---

## 4. 情報レイアウト（1画面）

### 4.1 「1画面」の定義

- 縦一列。ブロックは5つ。**横スクロールは持たない**（幅の狭い表だけ `Table.ScrollContainer` の中で横スクロールする）。
- **他画面へ遷移せずに週の判断（続ける/変える）が終わる**。掘りたくなったときだけ履歴/日ページへ渡す。
- タブ切り替え（週次/月次）以外の内部ナビゲーションを持たない（`SegmentedControl` を置かない = 履歴の分析タブとの違い）。

### 4.2 ワイヤーフレーム

```
/review?tab=weekly
┌──────────────────────────────────────────────────────────┐
│ レビュー                                                    │ ← PageTitle（波下線）
│ ┌────────┬────────┐                                       │
│ │  週次   │  月次   │  ← Tabs variant="pills"                │
│ └────────┴────────┘                                       │
│                                                            │
│  ◀  8月第3週（08/17 月 〜 08/23 日）  ▶   [今週へ]   〈今週〉 │ ← WeeklyReviewWeekNav
│                                                            │
│ ┌──────────────┬──────────────┬──────────────┐            │
│ │ 学習量        │ 実施日        │ 消化          │            │ ← SummaryCards（3枚）
│ │ 620分         │ 5日           │ 78%           │            │
│ │ 1日平均 89分   │ 先週 4日 (+1) │ 39/50件       │            │
│ │ 先週 540分(+80)│              │ 今日は数えない  │            │
│ └──────────────┴──────────────┴──────────────┘            │
│                                                            │
│  週間ターゲット                        〈2/3 達成〉           │ ← WeeklyReviewTargets
│  ┌──────────────────────────────────────────────┐        │
│  │ ✓ TOEIC対策  分  ▇▇▇▇▇▇▇▇▇▇  300/300分（100%）│        │
│  │   多聴       実施日 ▇▇▇▇▇▁▁▁▁  3/5日（60%）    │        │
│  │ ✓ 英会話     確定件数 ▇▇▇▇▇▇▇▇  2/2件（100%）  │        │
│  └──────────────────────────────────────────────┘        │
│  （過去週のときはここに Alert:「週間ターゲットは今週だけの計器」）  │
│                                                            │
│  この週の流れ                                                │ ← WeeklyReviewDayTable
│  ┌────┬───────┬──────────────┬─────────┬──────────┐   │
│  │曜日 │ 日付   │ 学習量        │コンディション│ 消化      │   │
│  ├────┼───────┼──────────────┼─────────┼──────────┤   │
│  │ 月  │ 08/17 │ ▇▇▇▇▇▇ 120分 │ 🙂 好調   │ 4/5（80%）│   │
│  │ 火  │ 08/18 │ ▇▇▇▇ 80分     │ 😐 普通   │ 3/5（60%）│   │
│  │ 水  │ 08/19 │ ▇▇▇▇▇▇▇ 140分│ 🙂 好調   │ 5/5（100%）│  │
│  │ 木  │ 08/20 │ ▇▇▇ 60分      │ 🙁 崩れた │ 2/5（40%）│   │
│  │ 金  │ 08/21 │ ▇▇▇▇▇▇ 120分 │ 😐 普通   │ 4/5（80%）│   │
│  │ 土  │ 08/22 │ 休養           │ —        │ —        │   │
│  │ 日  │ 08/23 │ ▇▇▇ 60分  〈今日〉│ 😐 普通 │ —（今日）  │   │
│  └────┴───────┴──────────────┴─────────┴──────────┘   │
│                                                            │
│  共有文（週）                                                │ ← ShareCopy（共通化）
│  ┌──────────────────────────────────────────────┐        │
│  │ 週次まとめ 2026-08-17〜2026-08-23（学習量 620分…  │        │
│  │ - TOEIC対策                                     │        │
│  │   - 金のフレーズ 120分                            │        │
│  └──────────────────────────────────────────────┘        │
│  [共有文をコピー]                                            │
│                                                            │
│  [この週を履歴で掘る]   [08/23（日）を編集]                    │ ← 導線
└──────────────────────────────────────────────────────────┘
```

### 4.3 なぜ3指標を1つの表に束ねるか（form の選択）

`dataviz` の form ヒューリスティックに従って決めた。

- データは7点しかない。7点 × 3指標を3つのチャートに割ると、**同じ横軸（曜日）の絵が3枚**並ぶ。読者は視線を3回往復させて曜日を突き合わせることになる。
- 学習量は magnitude（大きさ）、コンディションは status（状態）、消化は ratio（割合）で、**エンコードが3種類ばらばら**。1つのチャートに重ねるのは論外（dual-axis 禁止）だが、**表の3列**なら1行=1日で自然に揃う。
- 数値は常にテキストで出す（CONTEXT「履歴」_Avoid_「チャートだけで数値を伝えること」）。表はこれを構造として満たす。
- したがって **7行のテーブル + 行内バー**が正解で、チャートは使わない。行内バーは magnitude の当たりを付けるためだけの補助（数値が本体）。

---

## 5. スキーマ変更（CVX-10/11/12/13/16）

**結論: `convex/schema.ts` の変更はゼロ。** 新規テーブル・新規インデックスを追加しない。

理由:

- 必要なのは「ある日付範囲の `rows` / `days`」「カタログ（`items` / `categories`）」「`targets` 全件（1所有者あたり最大カテゴリ数）」で、既存の `by_owner_and_date`（`rows`, `days`）・`by_owner_and_category`（`targets`）・`loadCatalog` で完全にまかなえる。
- 読む範囲は「対象週 + 前週」の14日ぶん。1日あたりの `rows` はプリセット規模（多くて10件程度）なので `.collect()` される件数は多くても百数十件で、CVX-11 の「概ね1000件未満」に余裕で収まる。範囲は `withIndex` の `gte`/`lte` で絞り、`.filter()` は使わない（CVX-10）。
- 新規インデックスが無いので CVX-12（プレフィックス重複）に抵触しない。

### 5.1 `convex/lib/validators.ts` への追加

```ts
//* 週の消化(CONTEXT「消化」: 確定 / 並んだ件数)。今日の行は数えないので、今日を含む週は isPartial=true。
export const weeklyDigestValidator = v.object({
  confirmedCount: v.number(),
  //? 数えた範囲。UI の注記(「08/17〜08/22 を数えた」)にそのまま使う。
  countedFrom: v.string(),
  //? 1日も数えられないとき(週初日が今日 or 未来週)は null。
  countedThrough: v.union(v.string(), v.null()),
  digestRate: v.number(),
  //? 週の全7日を数えられていない(今日を含む・未来を含む)ときに true。UI は注記を出す。
  isPartial: v.boolean(),
  leftoverCount: v.number(),
  ongoingCount: v.number(),
  plannedCount: v.number(),
  skippedCount: v.number(),
});

export type WeeklyDigest = Infer<typeof weeklyDigestValidator>;

//* 週次レビューの1日分。月〜日の7件固定。kind は既存の dayViewKind をそのまま使う(CVX-16)。
export const weeklyReviewDayValidator = v.object({
  condition: v.union(conditionValidator, v.null()),
  confirmedCount: v.number(),
  confirmedMinutes: v.number(),
  dateJst: v.string(),
  //? 今日・未記録・並んだ件数0 の日は消化を出さない(null)。0% と描くと「サボった」に見え、
  //? CONTEXT「消化」の定義(計画が残ったかの指標。計画が無い日は指標そのものが無い)に反する。
  digestRate: v.union(v.number(), v.null()),
  kind: dayViewKindValidator,
  plannedCount: v.number(),
  skippedCount: v.number(),
});

export type WeeklyReviewDay = Infer<typeof weeklyReviewDayValidator>;

//* 週次レビュー画面1枚ぶん。前週比のラベル整形はクライアントの純関数が担う(§14-7)。
export const weeklyReviewValidator = v.object({
  //? 確定記録が1件以上ある暦日数。週間ターゲットの days 計器と同じ「実施日」の定義。
  activeDays: v.number(),
  byDay: v.array(weeklyReviewDayValidator),
  confirmedMinutes: v.number(),
  digest: weeklyDigestValidator,
  //? 週内で今日以前の暦日数(過去週なら7)。1日平均の分母。
  elapsedDays: v.number(),
  isCurrentWeek: v.boolean(),
  previousActiveDays: v.number(),
  previousConfirmedMinutes: v.number(),
  previousWeekStart: v.string(),
  shareMarkdown: v.string(),
  skippedMinutes: v.number(),
  //? 週間ターゲットは「今週専用の計器」(CONTEXT)。過去週は null を返し、UI は数値を描かない。
  targets: v.union(v.array(targetProgressDtoValidator), v.null()),
  weekEnd: v.string(),
  weekStart: v.string(),
});

export type WeeklyReviewDto = Infer<typeof weeklyReviewValidator>;
```

既存の `conditionValidator` / `dayViewKindValidator` / `targetProgressDtoValidator` をそのまま再利用する。新しい形を作らない（CVX-16）。

### 5.2 既存ファイルへの影響

`schema.ts` は無変更。`validators.ts` への追記のみ。`dayViewKindValidator` は宣言順の都合で `weeklyReviewDayValidator` より前に定義されている必要があるため、追記位置は `dayPageValidator` より**後ろ**（ファイル末尾側）にする。

---

## 6. 純関数（Convex ランタイムを import しない）

spec.md の原則「ドメインの不変条件は Convex ランタイムを import しない純関数に置く」に従い `convex/lib/` に置く。フロントは `~domain/*` エイリアス（`tsconfig.json` の `~domain/* → convex/lib/*`）で同じ関数を読める。

### 6.1 `convex/lib/completionRate.ts`（新規 — #54 と共有）

消化率の計算を型非依存のプリミティブに切り出す。**このファイルは `docs/specs/monthly-review.md` §6.1 と完全に同一の内容**で、#52 / #54 のどちらが先に実装しても同じものができる（先に実装した側が作り、後の側はそのまま使う）。

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

`convex/lib/presetDigest.ts` の `plannedCount` / `digestRate` は**公開 API と戻り値を変えずに**内部実装だけ委譲する（純粋なリファクタ。`WeekdayCounts` は `CompletionCounts` の構造的部分型なのでそのまま渡せる。`presetDigest.test.ts` は無改修で通る）。

```ts
import { completedCount, confirmedRatio } from "./completionRate";

export function plannedCount(counts: WeekdayCounts): number {
  return completedCount(counts);
}
export function digestRate(counts: WeekdayCounts): number {
  return confirmedRatio(counts);
}
```

### 6.2 `convex/lib/weeklyReview.ts`（新規）

```ts
import { dayViewKind, type DayViewKind } from "./dayView";
import { STATUSES } from "./domain";
import { completedCount, confirmedRatio, type CompletionCounts } from "./completionRate";
import type { Condition } from "./conditions";
import type { WeeklyDigest, WeeklyReviewDay } from "./validators";

const [confirmedStatus, leftoverStatus, ongoingStatus, skippedStatus] = STATUSES;

export type WeeklyStatusRow = {
  dateJst: string;
  minutes: number;
  status: (typeof STATUSES)[number];
};

function emptyCounts(): CompletionCounts {
  return { confirmed: 0, leftover: 0, ongoing: 0, skipped: 0 };
}

function addRow(counts: CompletionCounts, status: WeeklyStatusRow["status"]): CompletionCounts {
  if (status === confirmedStatus) return { ...counts, confirmed: counts.confirmed + 1 };
  if (status === leftoverStatus) return { ...counts, leftover: counts.leftover + 1 };
  if (status === ongoingStatus) return { ...counts, ongoing: counts.ongoing + 1 };
  if (status === skippedStatus) return { ...counts, skipped: counts.skipped + 1 };
  return counts;
}

function countRows(rows: readonly WeeklyStatusRow[]): CompletionCounts {
  return rows.reduce((counts, row) => addRow(counts, row.status), emptyCounts());
}

//* 消化に数える暦日: 週内で「今日より前」の日だけ。
//? 今日の未着手を計画倒れに数えない(CONTEXT「消化」_Avoid_)。未来の日はそもそも記録が無い。
//? 既存 presetReview(今日を除く直近28日)と monthly-review.md の週バケットと同じ規則にそろえる。
export function digestCountedDates(
  weekDates: readonly string[],
  todayJst: string,
): readonly string[] {
  return weekDates.filter((dateJst) => dateJst < todayJst);
}

export function buildWeeklyDigest(
  weekDates: readonly string[],
  rows: readonly WeeklyStatusRow[],
  todayJst: string,
): WeeklyDigest {
  const counted = digestCountedDates(weekDates, todayJst);
  const countedSet = new Set(counted);
  const counts = countRows(rows.filter((row) => countedSet.has(row.dateJst)));
  return {
    confirmedCount: counts.confirmed,
    countedFrom: counted[0] ?? weekDates[0] ?? todayJst,
    countedThrough: counted.at(-1) ?? null,
    digestRate: confirmedRatio(counts),
    isPartial: counted.length < weekDates.length,
    leftoverCount: counts.leftover,
    ongoingCount: counts.ongoing,
    plannedCount: completedCount(counts),
    skippedCount: counts.skipped,
  };
}

//* 週の7日分。学習量・コンディション・消化を1日1行にまとめる(§4.3)。
export function buildWeeklyReviewDays(args: {
  conditionByDate: Readonly<Record<string, Condition | null | undefined>>;
  liveDayDates: ReadonlySet<string>;
  rows: readonly WeeklyStatusRow[];
  todayJst: string;
  weekDates: readonly string[];
}): WeeklyReviewDay[] {
  const rowsByDate = new Map<string, WeeklyStatusRow[]>();
  for (const row of args.rows) {
    const list = rowsByDate.get(row.dateJst);
    if (list === undefined) {
      rowsByDate.set(row.dateJst, [row]);
    } else {
      list.push(row);
    }
  }
  const countedSet = new Set(digestCountedDates(args.weekDates, args.todayJst));

  return args.weekDates.map((dateJst) => {
    const dayRows = rowsByDate.get(dateJst) ?? [];
    const counts = countRows(dayRows);
    const kind: DayViewKind = dayViewKind({
      dateJst,
      hasLiveDay: args.liveDayDates.has(dateJst),
      todayJst: args.todayJst,
    });
    const planned = completedCount(counts);
    return {
      condition: args.conditionByDate[dateJst] ?? null,
      confirmedCount: counts.confirmed,
      confirmedMinutes: dayRows.reduce(
        (total, row) => (row.status === confirmedStatus ? total + row.minutes : total),
        0,
      ),
      dateJst,
      //? 数えない日(今日・未来)と、並んだ件数0 の日は null。§5.1 のコメント参照。
      digestRate: countedSet.has(dateJst) && planned > 0 ? confirmedRatio(counts) : null,
      kind,
      plannedCount: planned,
      skippedCount: counts.skipped,
    };
  });
}

//* 週内で今日以前の暦日数。1日平均の分母(過去週は常に7)。
export function elapsedDaysInWeek(weekDates: readonly string[], todayJst: string): number {
  return weekDates.filter((dateJst) => dateJst <= todayJst).length;
}
```

### 6.3 `convex/lib/share.ts` への追加 — 週版共有文

フォーマットの詳細と根拠は §10。実装は日版と同じファイルに置き、2つの形が並んで見えるようにする（ドリフトを目視できる）。

```ts
import type { BreakdownRow } from "./validators";

export type WeeklyShareInput = {
  activeDays: number;
  //? aggregateBreakdownRows(...).rows。カテゴリ順(categorySortOrder)→項目名 で既にソート済み。
  rows: readonly Pick<BreakdownRow, "category" | "itemName" | "minutes">[];
  volumeMinutes: number;
  weekEnd: string;
  weekStart: string;
};

export function formatWeeklyShareMarkdown(input: WeeklyShareInput): string {
  if (input.rows.length === 0) {
    return "";
  }
  const header = `週次まとめ ${input.weekStart}〜${input.weekEnd}（学習量 ${input.volumeMinutes}分 / 実施 ${input.activeDays}日）`;
  const byCategory = groupBy(input.rows, prop("category"));
  //? rows のソート順がカテゴリ固定順そのものなので、出現順を保つだけでカテゴリ順が決まる。
  const names = [...new Set(input.rows.map((row) => row.category))];

  const body = names.flatMap((category) => {
    const categoryRows = byCategory[category] ?? [];
    const [only] = categoryRows;
    //? 日版と同じ畳み込み: 1件だけ かつ 項目名がカテゴリ名と一致 なら親+子の重複を1行にする。
    //? 週版に「ひとこと」は無いので、日版の content === "" 条件は自動的に満たされる(§10.3)。
    if (categoryRows.length === 1 && only !== undefined && only.itemName === category) {
      return [`- ${category} ${only.minutes}分`];
    }
    return [
      `- ${category}`,
      ...categoryRows.map((row) => `  - ${row.itemName} ${row.minutes}分`),
    ];
  });

  return [header, ...body].join("\n");
}
```

### 6.4 `convex/services/targets/buildTargetProgress.ts`（新規 — 既存ロジックの切り出し）

`listWithProgress` は「`targets` / `rows` / `days` / カタログを読む」処理と「読んだものを突き合わせて DTO を作る」処理が1関数に混ざっている。週次レビューは**すでに読み終えた同じ週の live rows** を持っているので、同じ範囲を二重に読ませない。AHA（2箇所目の利用）に従い、突き合わせ部分だけを切り出す。

```ts
// convex/services/targets/buildTargetProgress.ts
import type { Doc, Id } from "../../_generated/dataModel";
import type { TargetProgressDto } from "../../lib/validators";
import { aggregateByCategory, currentForMetric, type TargetRow } from "./aggregateByCategory";

export function buildTargetProgress(args: {
  categoryById: ReadonlyMap<Id<"categories">, Doc<"categories">>;
  itemById: ReadonlyMap<Id<"items">, Doc<"items">>;
  rows: readonly TargetRow[];
  targets: readonly Doc<"targets">[];
}): TargetProgressDto[] {
  //? categoryId はバックフィル済みが前提。移行前の古い項目だけが undefined で、実績に加算されず0扱いになる。
  const categoryIdByItemId = new Map<Id<"items">, Id<"categories">>(
    [...args.itemById.values()].flatMap((item) =>
      item.categoryId === undefined ? [] : [[item._id, item.categoryId] as const],
    ),
  );
  const aggregates = aggregateByCategory(args.rows, categoryIdByItemId);
  const sortOrderOf = (categoryId: Id<"categories">) =>
    args.categoryById.get(categoryId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
  //? 表示順はカテゴリの並び順に合わせる。元配列は触らない。
  return args.targets
    .toSorted((left, right) => sortOrderOf(left.categoryId) - sortOrderOf(right.categoryId))
    .map((target) => {
      const current = currentForMetric(aggregates.get(target.categoryId), target.metric);
      return {
        _id: target._id,
        achieved: current >= target.targetValue,
        categoryId: target.categoryId,
        categoryName: args.categoryById.get(target.categoryId)?.name ?? "不明",
        current,
        metric: target.metric,
        targetValue: target.targetValue,
      };
    });
}
```

`services/targets/listWithProgress.ts` は読み込みだけを残し、末尾を `return buildTargetProgress({ categoryById: catalog.categoryById, itemById: catalog.itemById, rows: liveRows(rows, liveDayDatesFrom(days)), targets })` に置き換える。**戻り値は完全に同じ**なので既存 `convex/targets.test.ts` が回帰テストになる。

### 6.5 純関数の一覧（CVX-09 準拠）

| 関数 | ファイル | 責務 |
| --- | --- | --- |
| `completedCount` / `confirmedRatio` | `convex/lib/completionRate.ts` | 消化率の計算（`presetDigest` / #54 と共有） |
| `digestCountedDates` | `convex/lib/weeklyReview.ts` | 消化に数える暦日（今日より前）の抽出 |
| `buildWeeklyDigest` | `convex/lib/weeklyReview.ts` | 週1つ分の消化 |
| `buildWeeklyReviewDays` | `convex/lib/weeklyReview.ts` | 7日分の 学習量・コンディション・消化 |
| `elapsedDaysInWeek` | `convex/lib/weeklyReview.ts` | 1日平均の分母 |
| `formatWeeklyShareMarkdown` | `convex/lib/share.ts` | 週版共有文の Markdown |
| `buildTargetProgress` | `convex/services/targets/buildTargetProgress.ts` | ターゲット突き合わせ（ctx 非依存） |

---

## 7. 関数サーフェス（CVX-01/02/03/04/05/20）

ドメイン `review` を `queries/` `services/` に置く（#54 と同じドメイン）。mutation は無い（読み取り専用）。cron・scheduler も無い（CVX-05 は非該当）。

### 7.1 query（1関数1ファイル）

| ファイル | export | args | returns |
| --- | --- | --- | --- |
| `convex/queries/review/weeklyReview.ts` | `weeklyReview` | `{ todayJst: v.string(), weekStartJst: v.string() }` | `weeklyReviewValidator` |

```ts
// convex/queries/review/weeklyReview.ts — API 層は薄く保つ(CVX-02)
import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { weeklyReviewValidator } from "../../lib/validators";
import { weeklyReview as getWeeklyReview } from "../../services/review/weeklyReview";

export const weeklyReview = ownerQuery({
  args: { todayJst: v.string(), weekStartJst: v.string() },
  handler: async (ctx, args) => getWeeklyReview(ctx, ctx.ownerId, args),
  returns: weeklyReviewValidator,
});
```

`ownerQuery`（`convex/lib/ownerFunctions.ts`）が `requireUser` 相当を担い、未認証・未許可は throw する（CVX-04）。`args` は両フィールドとも必須のバリデータ付き（CVX-03）。**query は `Date.now()` を呼ばない** — `todayJst` は引数（CVX-14）。

### 7.2 service

```ts
// convex/services/review/weeklyReview.ts
import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { requireDateJst, requireWeekStartJst } from "../../lib/dateArgs";
import { aggregateBreakdownRows } from "../../lib/historyBreakdown";
import { addDaysJst, mondayOfWeek } from "../../lib/jst";
import { formatWeeklyShareMarkdown } from "../../lib/share";
import type { WeeklyReviewDto } from "../../lib/validators";
import {
  buildWeeklyDigest,
  buildWeeklyReviewDays,
  elapsedDaysInWeek,
} from "../../lib/weeklyReview";
import { buildConditionByDate, liveDayDatesFrom, liveRows } from "../history/shared";
import { buildTargetProgress } from "../targets/buildTargetProgress";

export async function weeklyReview(
  ctx: QueryCtx,
  ownerId: string,
  args: { todayJst: string; weekStartJst: string },
): Promise<WeeklyReviewDto> {
  //? 形が壊れた引数はここで弾く。非月曜は月曜へ正規化する(listWithProgress と同じ規則)。
  const todayJst = requireDateJst(args.todayJst);
  const weekStart = requireWeekStartJst(args.weekStartJst);
  const weekEnd = addDaysJst(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, offset) => addDaysJst(weekStart, offset));
  const previousWeekStart = addDaysJst(weekStart, -7);
  const previousWeekEnd = addDaysJst(weekStart, -1);
  const isCurrentWeek = weekStart === mondayOfWeek(todayJst);

  //? 対象週+前週の14日を1本のレンジクエリで読む(CVX-10: withIndex のみ、filter なし)。
  //? targets は今週だけ必要なので、過去週では読まない(無駄な購読を増やさない)。
  const [rows, days, catalog, targets] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", previousWeekStart).lte("dateJst", weekEnd),
      )
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", ownerId).gte("dateJst", previousWeekStart).lte("dateJst", weekEnd),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
    isCurrentWeek
      ? ctx.db
          .query("targets")
          .withIndex("by_owner_and_category", (q) => q.eq("ownerId", ownerId))
          .collect()
      : Promise.resolve([]),
  ]);

  //? ゴミ箱の記録・日を必ず除く(presetReview / listWithProgress / computeWeekPage と同じ前提)。
  //? 忘れると削除した記録が週の実績に残り続けるバグになる。
  const liveDayDates = liveDayDatesFrom(days);
  const live = liveRows(rows, liveDayDates);
  const currentRows = live.filter((row) => row.dateJst >= weekStart && row.dateJst <= weekEnd);
  const previousRows = live.filter(
    (row) => row.dateJst >= previousWeekStart && row.dateJst <= previousWeekEnd,
  );

  const current = aggregateBreakdownRows(currentRows, catalog.itemById, catalog.categoryById);
  const previous = aggregateBreakdownRows(previousRows, catalog.itemById, catalog.categoryById);
  const activeDaysOf = (targetRows: readonly (typeof live)[number][]) =>
    new Set(targetRows.filter((row) => row.status === "確定").map((row) => row.dateJst)).size;
  const activeDays = activeDaysOf(currentRows);
  const statusRows = currentRows.map((row) => ({
    dateJst: row.dateJst,
    minutes: row.minutes,
    status: row.status,
  }));

  return {
    activeDays,
    byDay: buildWeeklyReviewDays({
      conditionByDate: buildConditionByDate(days),
      liveDayDates,
      rows: statusRows,
      todayJst,
      weekDates,
    }),
    confirmedMinutes: current.confirmedMinutes,
    digest: buildWeeklyDigest(weekDates, statusRows, todayJst),
    elapsedDays: elapsedDaysInWeek(weekDates, todayJst),
    isCurrentWeek,
    previousActiveDays: activeDaysOf(previousRows),
    previousConfirmedMinutes: previous.confirmedMinutes,
    previousWeekStart,
    shareMarkdown: formatWeeklyShareMarkdown({
      activeDays,
      rows: current.rows,
      volumeMinutes: current.confirmedMinutes,
      weekEnd,
      weekStart,
    }),
    skippedMinutes: current.skippedMinutes,
    //? 今週専用の計器(CONTEXT「週間ターゲット」)。過去週は null にして UI に数値を出させない。
    targets: isCurrentWeek
      ? buildTargetProgress({
          categoryById: catalog.categoryById,
          itemById: catalog.itemById,
          rows: currentRows,
          targets,
        })
      : null,
    weekEnd,
    weekStart,
  };
}
```

`aggregateBreakdownRows`（`convex/lib/historyBreakdown.ts`）と `buildConditionByDate`（`services/history/shared.ts` 経由）は既存 export をそのまま再利用する。新しい集計を重複実装しない（CVX-16 / AHA）。`byCategory` は使わないが、`aggregateBreakdownRows` は1回の呼び出しで `rows`（共有文用）・`confirmedMinutes`・`skippedMinutes` をまとめて返すため、専用関数を新設しない。

### 7.3 CVX チェック

- args validator あり、`ownerQuery` 経由で認可あり（CVX-03/04）。
- `internal.*` を使う scheduler / cron は無い（CVX-05 非該当）。
- `.filter()` 不使用。範囲は `by_owner_and_date` / `by_owner_and_category` の `withIndex`（CVX-10）。
- `.collect()` は14日ぶん + `targets`（カテゴリ数ぶん）に絞られており、CVX-11 の「概ね1000件未満」に収まる（§5 に根拠）。
- 新規インデックス無し（CVX-12 非該当）。
- `ctx.db.query(table, ...)` 形で第1引数がテーブル名（CVX-13。既存コード全体と同じ Convex 1.31+ の形）。
- `Date.now()` を呼ばない。`todayJst` は引数（CVX-14）。
- 書き込みが無い（CVX-15 非該当）。`ctx.run*` を使わない（CVX-07/08 非該当）。
- `Doc<"...">` / `Id<"...">` をそのまま使い、手書き型を増やさない（CVX-16）。
- `await` 漏れなし（CVX-17）。
- 1関数1ファイル、`queries/review/` `services/review/` に分離（CVX-20）。

---

## 8. ルーティング・検索パラメータ

**#52 が `/review` の共有土台を作る。**以下は `docs/specs/monthly-review.md` §8 と同一の設計で、月次分（`month` / `deriveReviewMonth`）も同時に用意する（#54 が後から差し込むだけで済む状態にする）。

### 8.1 共有スキーマの抽出（AHA: 2箇所目の利用で切り出す）

`src/features/history/schemas/history-search-schema.ts` の `DateJstSchema` / `YearMonthSchema` / `isCalendarDate` を `src/lib/schemas/calendar-date-schema.ts` へ移し、両 feature から import する。**#54 §8.1 と同一内容**（先に実装した側が作る）。

```ts
// src/lib/schemas/calendar-date-schema.ts
import * as v from "valibot";
import { DATE_JST_PATTERN } from "~domain/domain";

const YEAR_MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/;

function isCalendarDate(value: string): boolean {
  if (!DATE_JST_PATTERN.test(value)) {
    return false;
  }
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

export const DateJstSchema = v.pipe(
  v.string(),
  v.check(isCalendarDate, "日付は YYYY-MM-DD 形式で指定してください"),
);

export const YearMonthSchema = v.pipe(
  v.string(),
  v.regex(YEAR_MONTH_PATTERN, "月は YYYY-MM 形式で指定してください"),
);
```

`history-search-schema.ts` は重複定義を削除して上記を import するだけに置き換える（`HistorySearchSchema` の公開 API・挙動は変えない純粋な internal リファクタ）。

### 8.2 `/review` の検索パラメータ

```ts
// src/features/review/schemas/review-search-schema.ts
import * as v from "valibot";

import { DateJstSchema, YearMonthSchema } from "~/lib/schemas/calendar-date-schema";

const ReviewTabSchema = v.picklist(["weekly", "monthly"]);

export const ReviewSearchSchema = v.object({
  //? month は #54(月次)が消費する。本チケットは週次の week を消費する。
  month: v.optional(YearMonthSchema),
  tab: v.optional(ReviewTabSchema),
  //? 月曜でない日付が来ても導出側で月曜へ正規化する(§8.4)。URL 直打ちを弾かない。
  week: v.optional(DateJstSchema),
});

export type ReviewSearch = v.InferOutput<typeof ReviewSearchSchema>;
export type ReviewTab = v.InferOutput<typeof ReviewSearchSchema>["tab"];

export const reviewSearchDefaults = {
  month: undefined,
  tab: "weekly",
  week: undefined,
} as const satisfies ReviewSearch;
```

> `ReviewTab` は #54 §8.2 では `v.InferOutput<typeof ReviewTabSchema>` として export されている。`ReviewTabSchema` を export しないなら上記の派生形、export するなら #54 の形でよい。**どちらでも型は同一**なので実装者の判断で1つに決める（他の節に影響しない）。

```ts
// src/features/review/lib/review-route-search.ts
import { stripSearchParams, type SearchMiddleware } from "@tanstack/react-router";

import {
  ReviewSearchSchema,
  reviewSearchDefaults,
  type ReviewSearch,
} from "~/features/review/schemas/review-search-schema";

export const reviewSearchMiddlewares: SearchMiddleware<ReviewSearch>[] = [
  stripSearchParams(reviewSearchDefaults),
];

export { ReviewSearchSchema };
```

### 8.3 ルート定義

```tsx
// src/routes/review.tsx
import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { ReviewPage } from "~/features/review/components/review-page";
import {
  reviewSearchMiddlewares,
  ReviewSearchSchema,
} from "~/features/review/lib/review-route-search";

export const Route = createFileRoute("/review")({
  validateSearch: ReviewSearchSchema,
  search: { middlewares: reviewSearchMiddlewares },
  component: ReviewRoute,
});

function ReviewRoute() {
  return (
    <OwnerGate>
      <ReviewPage />
    </OwnerGate>
  );
}
```

**loader を持たない。** convex-tanstack.md「route loaders で Convex query を prefetch しない」に従い、読み取りは `useSuspenseQuery` のみ（§11）。

### 8.4 状態導出（`src/features/review/hooks/use-review-view.ts`）

`use-history-view.ts` の `deriveHistoryView` と同じクランプ規則。**#54 §8.4 の月次分を含めた統合版**。

```ts
import { getRouteApi } from "@tanstack/react-router";
import { isFutureDateJst, mondayOfWeek, todayJst, type DateJst } from "~domain/jst";

import type { ReviewSearch, ReviewTab } from "~/features/review/schemas/review-search-schema";

/** `/review` 専用 — ReviewPage 配下からのみ import すること */
const reviewRoute = getRouteApi("/review");

function yearMonthFromDateJst(dateJst: string): string {
  return dateJst.slice(0, 7);
}

export function deriveReviewMonth(search: ReviewSearch, today: DateJst): string {
  const todayYearMonth = yearMonthFromDateJst(today);
  const requestedMonth = search.month ?? todayYearMonth;
  //? 未来月への遷移は禁止(history の deriveHistoryView と同じクランプ)。
  return requestedMonth > todayYearMonth ? todayYearMonth : requestedMonth;
}

//* 週アンカーは必ず月曜。未来週は今週にクランプする。
//? 月曜正規化を導出側でも行うのは、URL に火曜を直打ちされても画面と query 引数が食い違わないため。
//? サーバも requireWeekStartJst で正規化するので二重に守られる(§7.2)。
export function deriveReviewWeek(search: ReviewSearch, today: DateJst): DateJst {
  const requested = mondayOfWeek(search.week ?? today);
  return isFutureDateJst(requested, today) ? mondayOfWeek(today) : requested;
}

export function useReviewView() {
  const search = reviewRoute.useSearch();
  const navigate = reviewRoute.useNavigate();
  const today = todayJst();
  const currentWeekStart = mondayOfWeek(today);
  const weekStart = deriveReviewWeek(search, today);
  const yearMonth = deriveReviewMonth(search, today);
  const tab: ReviewTab = search.tab ?? "weekly";

  return {
    currentWeekStart,
    setMonth: (nextYearMonth: string) => {
      void navigate({
        search: (current) => ({
          ...current,
          month: nextYearMonth === yearMonthFromDateJst(today) ? undefined : nextYearMonth,
        }),
      });
    },
    setTab: (nextTab: ReviewTab) => {
      void navigate({
        search: (current) => ({ ...current, tab: nextTab === "weekly" ? undefined : nextTab }),
      });
    },
    setWeek: (nextWeekStart: DateJst) => {
      void navigate({
        search: (current) => ({
          ...current,
          week: nextWeekStart === currentWeekStart ? undefined : nextWeekStart,
        }),
      });
    },
    tab,
    today,
    weekStart,
    yearMonth,
  };
}
```

### 8.5 入口（ナビタブは増やさない）

**決定: `src/components/app-shell.tsx` の `NAV` は7本のまま。「レビュー」タブを追加しない。**

`docs/specs/monthly-review.md` §8.3 / §12-10 はこの判断を「`/review` の一次導線の所有者である #52 が行う」として引き渡した。本書は**昇格させない**と決める。理由:

1. CONTEXT.md「マイページ」の _Avoid_ が「8番目のナビタブ」を明示的に禁じている。`pwa-mobile.md` §6.1・§8.3・§10.1〜§10.3・§17 と `notifications.md` は**すべてこの制約を守る形で確定済み**（`NAV` 7本・`MOBILE_PRIMARY` 4本 +「その他」3本・app-shell テスト期待値）。制約を守った先行仕様が3本ある状態で、後から来た本書が単独で崩すのは筋が悪い。
2. `_Avoid_` の**意図**（マイページ限定の禁止か、`NAV` の本数上限か）を1文に確定する作業は CONTEXT.md の語彙定義の改訂であり、#50 相当の独立工程に属する。週次レビューの実装仕様の中で片手間に決めるべきものではない。
3. 昇格は `NAV` の1行では終わらない。`pwa-mobile.md` §10.3 は `MOBILE_PRIMARY`（`/`, `/board`, `/history`, `/goals`）4本と「その他」Menu 3本の割り当てを確定し §17 でテスト期待値にしている。8本にするなら「`/review` を `MOBILE_PRIMARY` に入れるか / 入れるなら現4本のどれを落とすか」まで決め、同 §17 を書き換える必要がある（**PWA #58 は優先順で最後**なので、本書が勝手に8本にすると #58 は置き場所を持たないまま実装に入る）。

**代わりに入口を2本にする**（月次レビューが1本だったのに対し、週次は「週に1回」の頻度なので発見性を上げる）。

1. **履歴画面**（#54 §8.3 が指定した位置。`search` を落として既定タブに任せる）

```tsx
// src/features/history/components/history-page.tsx — PageTitle の右
<Group align="center" justify="space-between" mb="md">
  <PageTitle>履歴</PageTitle>
  {/*? /review への入口。ナビタブは増やさない(§8.5)。既定タブ(weekly)へ飛ばす */}
  <Anchor component={Link} to="/review">
    レビューを見る
  </Anchor>
</Group>
```

2. **目標画面の週間ターゲット節**（週間ターゲットを見ている場所から週の締めへ渡す）

```tsx
// src/features/goals/components/weekly-targets-section.tsx — Title の並び
<Group gap="xs" justify="space-between" wrap="nowrap">
  <Group gap="xs" wrap="nowrap">
    <Title order={2}>週間ターゲット</Title>
    {targets.length > 0 && (
      <Badge color={achievedCount === targets.length ? "green" : "gray"} variant="light">
        {achievedCount}/{targets.length} 達成
      </Badge>
    )}
  </Group>
  {/*? 週の締めは /review。ここは常設の入口2本目(§8.5) */}
  <Anchor component={Link} to="/review">
    今週のレビュー
  </Anchor>
</Group>
```

- どちらも `Link`（`@tanstack/react-router`）+ Mantine `Anchor` だけを使い、**`~/features/review/*` を import しない**（project-structure.md「Feature inter-dependencies forbidden」）。リンク先の型安全性は生成ルート型が担保する。
- 履歴の `Tabs`（月/週/分析）に4本目を足さない。別ルートへ飛ぶものをタブに混ぜると `HistorySearchSchema` の `tab` の意味と `history-page.tsx` の `onChange` 分岐が壊れる。
- **#56 への引き渡し**: `notifications.md` §9.2 は「#52 が週次レビュー画面を作ったら `weeklyTargetMiss` のリンク先を差し替える」としている。**差し替え先は `/review`**（`src/lib/notification-link.ts` の1行）。`weeklyTargetMiss` は土曜09:00 に今週について発火するので、既定タブ（`weekly`）・既定週（今週）でちょうど正しい画面が開く。検索パラメータは付けない。
- **昇格させたくなった場合の3点セット**（#54 §8.3 から引き継ぎ、本書でも据え置く）: ①CONTEXT.md「マイページ」_Avoid_ の意図を1文に確定（#50 相当の工程）②`pwa-mobile.md` §10.1〜§10.3 を8本前提に改訂（`MOBILE_PRIMARY` か「その他」かの決定を含む）③同 §17 のテスト期待値を書き換え。

---

## 9. UI 構造（Mantine 優先 / Paper Redesign）

### 9.1 コンポーネント一覧

| ファイル | 責務 |
| --- | --- |
| `src/features/review/components/review-page.tsx` | `PageTitle` +「週次/月次」`Tabs`（`variant="pills"`）の外枠。`Suspense` + `ReviewPending`。**#52 が作る**。月次パネルは #54 が入るまでプレースホルダ |
| `src/features/review/components/review-pending.tsx` | 画面全体の Shimmer（タブ外枠ぶん） |
| `src/features/review/components/weekly-review-tab.tsx` | 週次タブ本体。`useWeeklyReview` で取得し5ブロックを縦に並べる |
| `src/features/review/components/weekly-review-tab-pending.tsx` | 構造モックの `<Shimmer loading>`（shimmer-from-structure.md パターン2） |
| `src/features/review/components/weekly-review-week-nav.tsx` | 週の前後移動 +「今週へ」（`learning-date-navigation.tsx` と同じ `ActionIcon` + `Tooltip` パターン） |
| `src/features/review/components/weekly-review-summary-cards.tsx` | サマリー3枚（学習量 / 実施日 / 消化） |
| `src/features/review/components/weekly-review-targets.tsx` | 週間ターゲット達成。過去週は `Alert` |
| `src/features/review/components/weekly-review-day-table.tsx` | 7行テーブル（学習量・コンディション・消化） |
| `src/features/review/hooks/review-queries.ts` | `useWeeklyReview(weekStartJst, todayJst)`（#54 が `useMonthlyReview` を足す） |
| `src/features/review/hooks/use-review-view.ts` | §8.4 |
| `src/features/review/lib/weekly-review-labels.ts` | 表示整形の純関数（週範囲ラベル・曜日1文字・前週比ラベル・消化ラベル・1日平均） |
| `src/features/review/lib/review-shimmer-template.ts` | Shimmer 用のテンプレデータ |
| `src/features/review/types/weekly-review.ts` | `FunctionReturnType` 由来の型（§11） |
| `src/components/share-copy.tsx` | **移設**（`src/features/today/components/share-copy.tsx` から）。日と週の2箇所で使うので共有ゾーンへ（§9.6） |

### 9.2 `ReviewPage`（タブ外枠）

`history-page.tsx` と同型。パネル内は選択中タブのときだけレンダリングして、非表示タブの query を購読しない。

```tsx
export function ReviewPage() {
  return (
    <Suspense fallback={<ReviewPending />}>
      <ReviewReady />
    </Suspense>
  );
}

function ReviewReady() {
  const { setTab, tab } = useReviewView();

  return (
    <>
      <PageTitle mb="md">レビュー</PageTitle>
      <Tabs
        onChange={(value) => {
          if (value === "weekly" || value === "monthly") {
            setTab(value);
          }
        }}
        value={tab}
        variant="pills"
      >
        <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
          <Tabs.Tab value={"weekly" satisfies ReviewTab}>週次</Tabs.Tab>
          <Tabs.Tab value={"monthly" satisfies ReviewTab}>月次</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt="md" value="weekly">
          {tab === "weekly" ? (
            <Suspense fallback={<WeeklyReviewTabPending />}>
              <WeeklyReviewTab />
            </Suspense>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel pt="md" value="monthly">
          {/*? #54 が MonthlyReviewTab を差し込む。それまでは準備中の一文だけ(monthly-review.md §9.6) */}
          {tab === "monthly" ? <MonthlyReviewPlaceholder /> : null}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
```

`MonthlyReviewPlaceholder` は `Text c="dimmed"`1つ（「月次レビューは準備中です。」）。#54 が実装され次第この1行を差し替えるだけで済むよう、`ReviewPage` は月次側の実装を直接 import しない構造にしておく。

### 9.3 サマリー3枚（stat tile）

`dataviz` の stat tile 規則に従う。

```tsx
// 骨子: Grid で3枚。数値は NUMERAL_FONT、ラベルは本文フォント
<Grid>
  <Grid.Col span={{ base: 12, sm: 4 }}>
    <Card padding="md">
      <Text c="var(--cairn-muted-2)" size="sm">学習量</Text>
      <Text ff={NUMERAL_FONT} fw={600} fz={32} lh={1.1}>{confirmedMinutes}分</Text>
      <Text c="var(--cairn-muted-2)" ff={NUMERAL_FONT} size="xs">
        1日平均 {dailyAverageMinutes(confirmedMinutes, elapsedDays)}分（{elapsedDays}日）
      </Text>
      <Group gap={4} wrap="nowrap">
        <DeltaIcon direction={deltaDirection} />
        <Text c="var(--cairn-muted-2)" ff={NUMERAL_FONT} size="xs">
          {previousWeekLabel(confirmedMinutes, previousConfirmedMinutes, "分")}
        </Text>
      </Group>
    </Card>
  </Grid.Col>
  {/* 実施日 / 消化 も同じ形 */}
</Grid>
```

- **前週比に赤を使わない。** 減少を赤で塗るのは design-live-board.md #2（赤は削除・危険の予約色）に反する。増減は **`IconArrowUpRight` / `IconArrowDownRight` / `IconMinus` + 符号つきテキスト**（`+80分` / `-40分` / `±0分`）で表し、色は `var(--cairn-muted-2)` 一色にする。増減の良し悪しをアプリが評価しない（CONTEXT「習得」_Avoid_「未達の自動失敗記録」の精神）。
- 消化タイルは `78%` を大きく、その下に `39/50件` と `今日（08/23）は数えません`（`digest.isPartial` のときだけ）。`digest.plannedCount === 0` のときは `—` と `まだ数えられません` を出す（0% と描かない）。
- 前週データが無い（利用開始1週目）ときは前週比の行を出さず、`先週の記録はありません` を1行出す（§13-4）。

### 9.4 7行テーブル（学習量・コンディション・消化）

```tsx
<Table.ScrollContainer minWidth={480}>
  <Table highlightOnHover striped="odd" verticalSpacing="xs">
    <Table.Thead>
      <Table.Tr>
        <Table.Th>曜日</Table.Th>
        <Table.Th>日付</Table.Th>
        <Table.Th>学習量</Table.Th>
        <Table.Th>コンディション</Table.Th>
        <Table.Th>消化</Table.Th>
      </Table.Tr>
    </Table.Thead>
    <Table.Tbody>
      {byDay.map((day) => (
        <Table.Tr key={day.dateJst}>
          {/*? 土=青 / 日=赤 / 祝日 は既存の calendar-day-style のクラスを流用(新色を作らない) */}
          <Table.Td className={calendarDayClassName(day.dateJst) ?? undefined}>
            {weekdayShortLabel(day.dateJst)}
          </Table.Td>
          <Table.Td ff={NUMERAL_FONT}>
            {monthDayLabel(day.dateJst)}
            {day.dateJst === today ? <Badge ml={6} size="xs" variant="light">今日</Badge> : null}
          </Table.Td>
          <Table.Td>
            <MinutesCell day={day} maxMinutes={maxMinutes} />
          </Table.Td>
          <Table.Td>
            {day.condition === null ? <Text c="dimmed">—</Text> : <ConditionBadge condition={day.condition} />}
          </Table.Td>
          <Table.Td ff={NUMERAL_FONT}>{digestCellLabel(day, today)}</Table.Td>
        </Table.Tr>
      ))}
    </Table.Tbody>
  </Table>
</Table.ScrollContainer>
```

**行内バー（`MinutesCell`）の仕様**

- `kind === "rest"` → `休養`（`c="dimmed"`）。`kind === "unrecorded"` → `未記録`（`c="dimmed"`）。`kind === "todayEmpty"` かつ分数0 → `0分`。
- バーは `Progress`。`value = maxMinutes === 0 ? 0 : Math.round((confirmedMinutes / maxMinutes) * 100)`。**スケールの基準はその週の最大確定分数**（0〜100分の固定軸にしない。週ごとに絶対値が大きく違うため、相対で「週の中の山谷」を見せるのが目的）。
- `color="orange.5"`。トラックは既定（`Progress` のテーマ既定＝紙色 + ink 枠）。
  - 検証: `#BC5215`（orange.5）は inset 紙面 `#F2F0E5` に対しコントラスト比 **3:1 以上（PASS）**。`#DA702C`（orange.4）は 2.9:1 で WARN になり、可視ラベルが必須になる。**バーは orange.5 を使う**（`scripts/validate_palette.js` で実測）。
- バーは装飾なので `aria-hidden`。値は隣のテキスト（`120分`、`NUMERAL_FONT`）が担う。**チャートだけで数値を伝えない**（CONTEXT「履歴」_Avoid_）。
- 週の全日が0分（`maxMinutes === 0`）のときはバーを描かず、テーブルの下に `EmptyState`（`この週の記録はありません`）を出す。

**コンディション列**

- 既存の `src/components/condition-badge.tsx`（`ConditionBadge`）をそのまま使う。色 + アイコン + **文字ラベル**を持つので、色だけに依存しない。
- 検証: 3色（`red.6 #932821` / `blue.6 #4385BE` / `teal.6 #0ca678`）を紙面 `#FFFCF0` で検証 → 明度帯・彩度床・CVD 分離・通常視・コントラストすべて PASS。ただし **tritan（青黄型）での 緑↔青 は ΔE 6.0 で床帯**にあり、色だけの識別は不可。`ConditionBadge` が持つ文字ラベルが必須の二次エンコードであり、**アイコンやラベルを外して色だけのドットにしてはいけない**。

**消化列（`digestCellLabel`）**

- `digestRate === null` の場合: 今日 → `—（今日）`、`kind === "unrecorded"` → `—`、`plannedCount === 0`（休養など） → `—`。
- それ以外: `4/5（80%）`。

### 9.5 週間ターゲット

- **今週（`targets !== null`）**: `Title order={3}` +「{達成数}/{件数} 達成」`Badge`（既存 `WeeklyTargetsSection` と同じ表現）。各行は `Progress` + `IconCircleCheck`（達成時）+ `VisuallyHidden`（`{カテゴリ}は達成`）+ `{current} / {targetValue} {unit}（{percent}%）`。既存 `target-list.tsx` の `TargetRow` と同じ構成にする。
  - **削除ボタン（`ActionIcon`）は置かない。** レビューは読み取り専用。編集は `/goals` の担当。したがって `TargetList` をそのまま再利用せず（`onRemove` 必須 + feature 間 import 禁止）、`weekly-review-targets.tsx` に読み取り専用の行を書く。
  - 検証（重要）: 達成 `green.6 #536A09` と未達 `orange.5 #BC5215` は **protan（赤型）で ΔE 0.2 = 事実上同色**（実測）。**達成の判別を色に載せてはいけない。** `IconCircleCheck` と `VisuallyHidden` の文言、`（100%）` の数値が判別子であり、この3つは省略不可。既存 `target-list.tsx` は偶然この条件を満たしているが、レビュー側では意図として明記する。
  - 0件のとき: `EmptyState`（`まだターゲットがありません`）+ `/goals` へのリンク。
- **過去週（`targets === null`）**: `Alert color="blue" title="週間ターゲットは今週だけの計器です"` に「過去の週にはターゲットの達成状況を出しません（週ごとの目標値を保存していないため、いまの目標値で過去を裁くことになります）」＋ `/goals` へのリンク。数値は一切描かない。

### 9.6 共有文（`ShareCopy` の共通化）

週次レビューの共有文ブロックは日ページと同じ体験（読み取り専用 `Textarea` + `CopyButton`）にする。`src/features/today/components/share-copy.tsx` は today feature の中にあり、review feature からは import できない（project-structure.md）。**2箇所目の利用なので共有ゾーンへ移す**（AHA）。

```tsx
// src/components/share-copy.tsx（移設 + プロパティ追加）
type ShareCopyProps = {
  emptyDescription?: string;
  markdown: string;
  title?: string;
};

export function ShareCopy({
  emptyDescription = "この日の記録を確定すると、共有文がここに生成されます。",
  markdown,
  title = "共有文",
}: ShareCopyProps) { /* 既存実装のまま。文言だけ props 経由 */ }
```

- 日ページ（`day-board.tsx`）は import 元を `~/components/share-copy` に変えるだけ（既定値が現行の文言なので表示は無変更）。
- 週次レビューは `<ShareCopy emptyDescription="この週に確定した記録がありません。" markdown={shareMarkdown} title="共有文（週）" />`。
- 移設に伴い `vp run fallow` を回して旧パスの参照が残っていないことを確認する。

### 9.7 週ナビ（`weekly-review-week-nav.tsx`）

- `ActionIcon` + `Tooltip`（`learning-date-navigation.tsx` と同じパターン）で「前の週」「次の週」「今週へ戻る」。
- 「次の週」は `weekStart >= currentWeekStart` のとき `disabled`（未来週へ行かせない。`Tooltip` を効かせるため `Box component="span" display="inline-flex"` で包む — 既存の実装と同じ回避）。
- ラベルは `weekRangeLabel(weekStart, weekEnd)`（例: `8月第3週（08/17 月 〜 08/23 日）`）。`NUMERAL_FONT`。今週なら `Badge variant="light"` で `今週`。
- **`DatePickerInput` は置かない。** 週単位の移動に日ピッカーは過剰で、`◀ ▶ + 今週へ` で足りる（月次レビュー #54 §9.2 の月ナビと同じ判断）。

### 9.8 表示整形の純関数（`src/features/review/lib/weekly-review-labels.ts`）

表示文言は UI の関心なので `convex/lib` に置かない（#54 §12-8 と同じ判断）。

```ts
import { WEEKDAY_NAMES } from "~domain/catalog";
import { weekdayFromDateJst } from "~domain/jst";

/** 「月」「火」… WEEKDAY_NAMES(SSoT)の1文字目を使い、曜日リストを再定義しない */
export function weekdayShortLabel(dateJst: string): string {
  return WEEKDAY_NAMES[weekdayFromDateJst(dateJst)].slice(0, 1);
}

/** 「08/17」 */
export function monthDayLabel(dateJst: string): string {
  return `${dateJst.slice(5, 7)}/${dateJst.slice(8, 10)}`;
}

/** 「8月第3週（08/17 月 〜 08/23 日）」。月をまたぐ週は「08/31 月 〜 09/06 日」 */
export function weekRangeLabel(weekStart: string, weekEnd: string): string { /* … */ }

/** 「先週 540分（+80分）」/ 「先週の記録はありません」 */
export function previousWeekLabel(current: number, previous: number, unit: string): string { /* … */ }

/** "up" | "down" | "flat" */
export function deltaDirection(current: number, previous: number): "down" | "flat" | "up" { /* … */ }

/** 週内で経過した日数で割る。休養は0分として数に入る(CONTEXT「学習量」) */
export function dailyAverageMinutes(confirmedMinutes: number, elapsedDays: number): number {
  return elapsedDays === 0 ? 0 : Math.round(confirmedMinutes / elapsedDays);
}

/** 「4/5（80%）」/「—（今日）」/「—」 */
export function digestCellLabel(
  day: Pick<WeeklyReviewDay, "confirmedCount" | "dateJst" | "digestRate" | "plannedCount">,
  todayJst: string,
): string { /* … */ }
```

`chart-data.ts` の `paceChartWeekTitle`（履歴 feature）と用途が似るが、書式が違う（`8月第3週` のみ vs 曜日つき範囲）うえに feature 間 import が禁止なので、`src/lib` への昇格は3箇所目が現れるまで待つ（AHA）。

### 9.9 Paper Redesign 準拠

- 色は Mantine トークン（`orange.5` / `green.6` / `blue` / `teal` / `red`）と `--cairn-*` 変数のみ。**hex を直書きしない**（design-live-board.md #2）。
- 数値（分数・件数・パーセント・日付）は `NUMERAL_FONT`、見出し・本文は既定（`BODY_FONT` / `DISPLAY_FONT`）。フォントスタックをローカル宣言しない（同 #3）。
- 見出しは共通 `PageTitle`（波下線）を使う（同「Notes for implementers」）。
- ライトのみ。`prefers-color-scheme` の分岐や `data-theme` の扱いを追加しない（同 #4）。
- カードの不揃い輪郭・紙の影は `Card` のテーマ既定がすでに持つので、`style` で `borderRadius` / `boxShadow` を上書きしない。
- Tailwind は「Mantine を包むレイアウト要素」だけに使う（mantine-tailwind.md）。`Grid` / `Stack` / `Group` で足りる範囲では使わない。

### 9.10 Shimmer

- `ReviewPage` の `Suspense fallback` は `ReviewPending`（`PageTitle` + タブ外枠の構造モック）。
- 週次タブの `Suspense fallback` は `WeeklyReviewTabPending`。**`WeeklyReviewTab` 自身を fallback に入れない**（再サスペンドする。shimmer-from-structure.md パターン2）。サマリー3枚・ターゲット3行・テーブル7行・共有文の構造モックを `<Shimmer loading>` で包む。テンプレデータは `review-shimmer-template.ts`（7日ぶん・ターゲット3件で、実データと同じ配列長にしてレイアウトシフトを防ぐ）。
- 色は `__root.tsx` の `ShimmerProvider` から継承する。`<Shimmer>` に色 props を書かない。
- `React.memo` を付けない（React Compiler 任せ）。

---

## 10. 週版 Slack 共有文フォーマット

### 10.1 日版（既存）の事実

`convex/lib/share.ts` の `formatShareMarkdown`:

- 確定行だけ。カテゴリ見出しは常に出す（1カテゴリでも省略しない）。
- カテゴリ順は `categorySortOrder` → 名前（`ja` ロケール）。カテゴリ内は行の `sortOrder`（入力順）。
- カテゴリ間に空行を入れない。
- `- カテゴリ` / `  - 項目: ひとこと N分`。ひとことが空なら `  - 項目 N分`。
- **1件だけ かつ ひとこと空 かつ 項目名がカテゴリ名と一致**のときだけ `- カテゴリ N分` に畳む。
- 確定が0件なら空文字列（UI は `EmptyState` を出す）。

### 10.2 週版の決定

```
週次まとめ 2026-08-17〜2026-08-23（学習量 620分 / 実施 5日）
- TOEIC対策
  - 金のフレーズ 180分
  - 出る文特急 120分
- 多聴
  - Distinction 2000 200分
- 英会話 120分
```

1. **見出し行を1行だけ足す。** `週次まとめ {weekStart}〜{weekEnd}（学習量 {分}分 / 実施 {日}日）`。日版に見出しが無いのは日付が投稿の文脈で自明だからで、週は範囲が自明でないため必要（Slack に貼ったときに「どの週か」が本文だけで分かる）。
2. **本文は日版と同じ2階層**（`- カテゴリ` + `  - 項目 N分`）。カテゴリ固定順・カテゴリ間の空行なしも同じ。
3. **項目ごとに1週ぶんの分数を合算する。** 同じ項目が週に5回出ても1行。並びは `aggregateBreakdownRows(...).rows` の順（カテゴリ順 → 項目名の `ja` ロケール順）。
4. **ひとことは載せない。** 1つの項目行が複数日の記録の合算なので、日ごとに違うひとことを1行に畳む正しい方法が無い（§14-6 で代替案を検討）。
5. **畳み込みは日版と同じ条件**（1件 + 項目名 = カテゴリ名）。週版にひとことが無いので日版の「ひとこと空」条件は自動的に満たされる。上例の `- 英会話 120分` がこれ。
6. **確定が0件なら空文字列。** UI は `ShareCopy` の `EmptyState`（`この週に確定した記録がありません。`）を出す。
7. **週間ターゲットの達成状況・消化率・コンディションは載せない。** 共有文は CONTEXT「共有文」のとおり「**確定した記録から作る** Markdown」であり、指標のレポートではない。加えて週間ターゲットは今週しかスナップショットが無いので、今週と過去週で共有文の形が変わってしまう（§14-6）。

### 10.3 サーバで組む理由

日版が `getDayPage`（サーバ）で `shareMarkdown` を組んで DTO に載せているのと同じにする。クライアントで組むと、カテゴリ固定順のロジック（`categorySortOrder` の解決）と畳み込みルールが日版・週版で2実装に割れる。`convex/lib/share.ts` に両方を置けば、片方を変えたときに他方が目に入る。

---

## 11. 型の SSoT（convex-tanstack.md 準拠）

```ts
// src/features/review/hooks/review-queries.ts
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useWeeklyReview(weekStartJst: string, todayJst: string) {
  return useSuspenseQuery(
    convexQuery(api.queries.review.weeklyReview.weeklyReview, { todayJst, weekStartJst }),
  );
}
```

```ts
// src/features/review/types/weekly-review.ts
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type WeeklyReview = FunctionReturnType<typeof api.queries.review.weeklyReview.weeklyReview>;
export type WeeklyReviewDay = WeeklyReview["byDay"][number];
export type WeeklyReviewTarget = NonNullable<WeeklyReview["targets"]>[number];
```

- コンポーネントの props はすべてこの型から派生させる。手書きの重複型を作らない。
- **`~/features/history/types/history` や `~/features/goals/types/target` から import しない**（feature 間 import 禁止）。`targetProgressDtoValidator` を共有しているので中身は同じだが、参照は自 feature の派生型を通す。
- `TARGET_METRIC_LABELS` / `TARGET_METRIC_UNITS` は現在 `src/features/goals/lib/target-metric-labels.ts` にある。週次レビューが2箇所目の利用者になるので **`src/lib/target-metric-labels.ts` へ移す**（`src/lib/target-metric-units.ts` が既に `src/lib` にあるので、その隣へ寄せる）。goals feature の import 先を更新する。

---

## 12. フォーム（Formisch / Valibot）

**フォームは無い。** 週次レビューは読み取り専用で mutation を持たない（§1-10）。ユーザー入力は `/review` の検索パラメータ（週の前後移動・タブ切り替え）だけで、これは §8.2 の `ReviewSearchSchema`（Valibot）がルート境界で検証する。valibot-validation.md の「境界だけ検証する」の対象であり、Formisch のフォームスキーマとは別物。`features/review/schemas/` に置くのは検索パラメータのスキーマのみ。

---

## 13. エッジケース

| # | 状況 | 挙動 | 根拠 |
| --- | --- | --- | --- |
| 1 | `week` が月曜以外（URL 直打ち） | 導出（`deriveReviewWeek`）とサーバ（`requireWeekStartJst`）の両方で月曜へ正規化。エラーにしない | `listWithProgress` の既存規則 |
| 2 | `week` が未来の日付 | 導出で今週へクランプ。サーバは未来週を渡されても0件を返すだけで安全（`targets` も `null`） | `deriveHistoryView` と同じクランプ |
| 3 | `week` / `todayJst` が壊れた文字列 | `DateJstSchema` がルート境界で弾き、通過してもサーバの `requireDateJst` が `ValidationFailedError` を投げる | `dateArgs.ts` の既存防御 |
| 4 | 前週にデータが無い（利用開始1週目） | 前週比の行を出さず `先週の記録はありません` を1行。`±%` を描かない（`-100%` のような誤解を避ける） | §9.3 |
| 5 | 今週を見ている（`isCurrentWeek === true`） | 学習量・実施日は「今日まで」の実績としてそのまま出す。消化は今日を除いて数え、`isPartial` の注記を出す。ターゲットは進行中の値を出す | CONTEXT「学習量」は確定分数の合計。週が終わっていなくても実績は実績 |
| 6 | 週初日が今日（月曜にレビューを開く） | `digest.plannedCount === 0` → 消化タイルは `—` / `まだ数えられません`。テーブルの消化列は全日 `—`。学習量・ターゲットは今日ぶんが出る | §6.2, §9.3 |
| 7 | 過去週を見ている | ターゲットは `null` → `Alert` を出し数値を描かない。消化は7日すべてを数える（`isPartial === false`） | CONTEXT「週間ターゲット」 |
| 8 | 週内に1件も記録が無い（丸ごと休養週） | サマリーは全0、テーブルは7行すべて `休養`（未来日は `未記録`）、テーブル下に `EmptyState`、共有文は空 → `ShareCopy` の `EmptyState` | §9.4, §10.2-6 |
| 9 | 削除済み（ゴミ箱）の記録・日 | 集計・消化・テーブル・共有文・ターゲット実績のすべてから除外（`liveRows` / `liveDayDatesFrom` を通す） | §7.2 のコメントで明示。忘れると復元前提の記録が実績に残る |
| 10 | 項目が削除されている（移行前データ等） | `aggregateBreakdownRows` の既存フォールバック（`item?.name ?? "不明"`）をそのまま使う。新しいフォールバックを増やさない | 既存 `historyBreakdown.ts` の挙動を流用（CVX-16） |
| 11 | 項目に `categoryId` が無い（移行前データ） | `buildTargetProgress` の既存挙動どおりターゲット実績に加算されない（0扱い）。共有文・学習量には `不明` カテゴリとして出る | `listWithProgress` の既存コメントと同じ |
| 12 | コンディション未選択の日 | `condition: null` → テーブルは `—`。「未設定」というラベルを作らない（CONTEXT「コンディション」_Avoid_「未設定」） | CONTEXT「コンディション」 |
| 13 | 進行中の記録がある | 消化の分母に入る（`plannedCount`）が分子に入らない。学習量には入らない（確定だけ） | CONTEXT「消化」「学習量」 |
| 14 | 週の途中でカテゴリを改名した | 共有文とサマリーは現在のカテゴリ名で出る（カタログの現在値を引くため）。前週比は分数合計だけなので影響しない | 既存の履歴集計と同じ |
| 15 | 週間ターゲットが0件（未設定） | `targets: []`（今週）→ `EmptyState` + `/goals` へのリンク。`null`（過去週）とは表示を分ける | §9.5 |
| 16 | 所有者間のデータ越境（IDOR） | `ownerQuery` が `ctx.ownerId` を強制し、index は常に `ownerId` で絞る | CVX-04 |
| 17 | 複数タブ/端末で同時閲覧 | Convex の reactive query が自動更新。専用の同期機構は不要 | 既存の全 query と同じ |
| 18 | 日付が変わる瞬間に画面を開いたまま | `todayJst` はマウント時に確定するので、日付が変わっても再計算されない（消化の「今日」がずれる）。**許容**。既存の履歴・日ページも同じ挙動で、日付境界の再購読は入れない | CVX-14（query は時計を読まない）の帰結 |

---

## 14. 検討した代替案（グリル: 自問自答）

### 14-1. 履歴/分析の週スコープを拡張すればよく、新画面は不要では？

**却下（ただし最も強い反論であることを認める）。** 分析タブの週スコープには既に「日別ペース」「カテゴリ内訳」「完了内訳」「コンディション別学習量」「メモ」があり、そこに「消化」「週間ターゲット」「前週比」「週版共有文」を足せば確かに1画面にはなる。しかし:

1. 分析タブは `SegmentedControl` で 日/週/月 を切り替える画面である。週だけに存在する要素（週間ターゲット、週版共有文）を足すと、日スコープ・月スコープで空白になるブロックが生まれる。`scope === "week"` の条件分岐が増え、`history-analysis-panel.tsx`（すでに273行、条件分岐が5箇所）が肥大する。
2. 「掘る」画面と「締める」画面は使う頻度と目的が違う。締める画面は週に1回、判断（続ける/変える）のために開く。掘る画面は気になったときに開く。同じ画面に混ぜると、週に1回の判断のために毎回スコープを合わせ直す操作が入る。
3. #54 が既に `/review` を作り、月次を置いた。週次を履歴側に置くと**週次と月次が別の画面に散る**。

**譲る点**: 画面が2つに増えるコストは実在する。だから §3 で重複を1つも作らない棲み分けを明文化し、両画面を相互リンクで結んだ（履歴 → レビュー / レビュー → 履歴の分析週スコープ）。

### 14-2. 週の学習量は折れ線/棒チャートで見せるべきでは？

**却下。** `dataviz` の form ヒューリスティックに従うと、7点の magnitude をチャートにする価値は低く、さらに決定的なのは**まったく同じ絵が既にある**こと（`history-analysis-panel.tsx` の `PaceChartCard`、週スコープで `完了`（棒）+ `均`（7日平均エリア）の `CompositeChart`）。同じ絵を2画面に置けば、どちらを見ればよいかが分からなくなる。週次レビューは表 + 行内バーで magnitude の当たりを付け、掘りたい人を分析タブへ渡す。

**譲る点**: 表は「週の中の山谷」を折れ線ほど直感的には見せない。行内バーを入れたのはその緩和で、加えて 7日平均のような時系列の文脈が欲しい場面は分析タブへのリンクで解決する。

### 14-3. 消化から今日を除くのは、日曜夜にレビューする人にとって不親切では？

**認めるが、規則は変えない。** 日曜夜に締めると、その日曜の記録が消化から落ちる（週の 1/7）。もっと素直な規則として「今日の**未着手・進行中だけ**を分母から除き、今日の確定・見送りは数える」も検討した。CONTEXT「消化」の _Avoid_「今日の未着手を計画倒れに数えること」を文字どおりには満たす。

**却下の理由**: ①同じ `/review` 画面の月次タブ（#54 §6.2）が「今日の行を丸ごと除く」規則を確定済みで、週次だけ別規則にすると**1画面の中で消化の定義が2つ**になる。②既存 `presetReview`（今日を除く直近28日）も同じ規則で、アプリ全体で3つ目の定義を作ることになる。③消化は「並んだ計画が残ったか」の指標であり、まだ終わっていない日について語らないのが定義に忠実。

**緩和**: `digest.isPartial` / `countedThrough` を DTO に持たせ、UI が `今日（08/23）は数えません` と明示する（§9.3）。テーブルでは今日の行も学習量とコンディションは出し、消化列だけ `—（今日）` にする。日曜の記録が「見えなくなる」わけではない。

### 14-4. 過去週の週間ターゲット達成を、いまの目標値で評価して見せるべきでは？

**却下。** `targets` テーブルは常に現在値だけを持ち（CONTEXT「週間ターゲット」_Avoid_「週ごとのスナップショット保存」、`schema.ts` のコメント）、週の途中や週をまたいで目標値を変えると、過去週を現在の目標値で裁くことになる（「先週は600分/週だったが今週500分/週に変えた」→ 先週が遡って達成に化ける）。誤った達成/未達を表示するより、出さない方が正しい。

**譲る点**: これにより「月曜の朝に先週を振り返る」使い方ではターゲット欄が空になる。締めは**日曜夜〜土曜（今週のうち）**に行う運用を前提にする。`notifications.md` の `weeklyTargetMiss` が土曜09:00 に発火して `/review`（=今週）へ誘導する設計とも整合する。スナップショット機構の追加は別チケット相当（#54 §12-1/12-2 と同じ結論。openQuestions に残す）。

### 14-5. 「その週の消化」は CONTEXT「履歴」の _Avoid_「消化を分析の日・週・月ピッカーに追従させること」に反しないか？

**反しない、と読む（ただし解釈であることを明示する）。** この _Avoid_ は「履歴」の語彙定義の中にあり、直前の文が「同じ分析に、今日を除く直近28暦日の曜日ごとの消化を置く」である。つまり**履歴/分析タブに置いた曜日別消化パネルが、そのタブの 日/週/月 ピッカーに追従してはいけない**という指示であり、消化という指標を週というくくりで語ること一般の禁止ではない。本書はその指示を守る（履歴側の消化パネルは無変更。週次レビューには曜日別28日窓を持ち込まない）。

**補強**: #54 も同じ読み方で「月間の消化推移」を `/review` に置いており、本書はそれと同じ立場に揃えた。`/review` には日/週/月の `SegmentedControl` が存在せず、週次タブの単位は週そのものなので「ピッカーに追従する」状態が構造的に起こらない。

**譲る点**: 所有者が _Avoid_ をより広く（消化はどこでも28日曜日別だけ）読んでいる可能性は残る。CONTEXT.md の語彙改訂は本書の範囲外なので、**openQuestions に「この読み方の是非」を残す**。もし広い読みが正なら、影響は週次レビューの消化ブロック（サマリー1枚 + テーブル1列）と #54 の消化推移の削除で、他は無傷である。

### 14-6. 週版共有文に、ひとこと・週間ターゲット達成・消化を載せるべきでは？

**却下。**

- **ひとこと**: 項目行が複数日の合算なので、日ごとに違うひとことを1行に畳む正しい方法が無い。全部並べる（`金のフレーズ: 1-50 / 51-100 / … 180分`）案は行が伸びて Slack で読めなくなり、最新1件だけ載せる案は他の日を黙って捨てる。**日ごとの詳細が欲しい人は日の共有文を貼る**のが正しい分担（日版は消えない）。
- **週間ターゲット達成**: 今週しか値が無いので、今週と過去週で共有文の形が変わる（過去週だけ行が消える）。共有文は「毎回同じ並びに貼れる」ことが要件（CONTEXT「共有文」）なので、週によって構造が変わるものを入れない。
- **消化**: 「並んだ計画のうち何を落としたか」は内部の運用指標であり、Slack に投げる成果報告ではない。見出し行に入れたのは 学習量 と 実施日 だけに絞った（どちらも全週で必ず値がある）。

### 14-7. 前週比の計算やラベルはサーバで作るべきでは？

**却下（#54 §12-8 と同じ判断に揃える）。** サーバは `confirmedMinutes` / `previousConfirmedMinutes` / `activeDays` / `previousActiveDays` という生値だけ返し、`+80分` のような日本語ラベルと符号・矢印の向きはクライアントの純関数（`weekly-review-labels.ts`）に置く。表示文言は UI の関心であり、`convex/lib` に日本語の書式を増やさない（study-timer.md §6・#54 §12-8 と同じ）。ただし**週版共有文は例外的にサーバ**で組む（§10.3。カテゴリ固定順と畳み込みルールが日版と共有される「ドメインの形」なので）。

### 14-8. レビューは独立した画面なのだから、ナビタブ（8本目）を足すのが素直では？

**却下。** 詳細は §8.5。要点は ①CONTEXT.md「マイページ」_Avoid_「8番目のナビタブ」を守る先行3仕様（`notifications.md` / `pwa-mobile.md` / `monthly-review.md`）がすでにある ②昇格は `NAV` の1行では終わらず `pwa-mobile.md` §10・§17 の改訂を伴う（PWA #58 は優先順で最後なので、いま8本にすると #58 が置き場所を持たない）③_Avoid_ の意図確定は CONTEXT.md の語彙改訂であり #50 相当の独立工程。

**譲る点**: 週次レビューは月次より頻度が高い（週1回）ので、発見性の不足は月次より痛い。緩和として入口を**2本**にした（履歴画面 + `/goals` の週間ターゲット節）。加えて #56 の `weeklyTargetMiss` 通知が土曜09:00 に `/review` へ誘導するので、実運用では「通知から入る」が主導線になる見込みである。それでも足りなければ §8.5 末尾の3点セットで昇格させればよい。

### 14-9. 週次レビューを新テーブル（週のスナップショット）で持つべきでは？

**却下。** 週の実績は `rows` / `days` から常に再計算でき、スナップショットを持つと「記録を後から直したのにレビューが古い」という不整合が生まれる（記録は今日と過去を編集できる — CONTEXT「日」）。スナップショットが本当に必要なのは週間ターゲットの**目標値**の履歴だけで、それは §14-4 のとおり別チケット相当。読み取り専用の集計 query 1本で足りる。

### 14-10. `weeklyReview` を「週の集計」と「週間ターゲット」の2 query に分けるべきでは？

**却下。** 分けると同じ週の `rows` / `days` を2つの query が別々に読み、購読が2本になる（Convex は query 単位で再実行するので、記録を1件確定するたびに両方が走る）。1本にまとめれば1回の読み取りで済み、`buildTargetProgress`（§6.4）の切り出しによって `listWithProgress` との重複実装も避けられる。DTO が大きくなる欠点はあるが、7日 + ターゲット数件ぶんなので実害は無い。

**譲る点**: 既存 `queries/targets/listWithProgress` と `weeklyReview.targets` は同じ値を返す2つの経路になる。突き合わせロジックは `buildTargetProgress` 1箇所に集約したので、計算がずれることはない。

### 14-11. 目標階層（未達成チェックポイント件数）や「この目標に効いた今週の記録」を置くべきでは？

**却下（今回は）。** `goal-hierarchy-layout.md` §15-10 と `goal-record-linking.md` §19 は、どちらも「#52 が扱う自然な場所」として本書に投げている。しかし:

1. 本チケットの Question は「週の消化・週間ターゲット達成・コンディション・学習量」の4つであり、目標階層は含まれない。
2. `notifications.md` / `pwa-mobile.md` / `monthly-review.md` が確立した「#48〜50・#53 に依存しない」設計原則を本書も踏襲する。目標階層（#48〜50）は優先順で本書より前だが、**紐付け（#53）は本書より後**であり、`goal-record-linking.md` が言う「この目標に効いた今週の記録」は #53 の対象項目テーブルが無いと計算できない。
3. 4ブロック + 共有文で画面はすでに縦に長い。5つ目の関心（目標）を足すと「週を締める」という焦点がぼける。

**譲る点**: 週次レビューが目標の自然な置き場所であることは認める。#53 が着地したあとに「週次レビューへ目標ブロックを足すか」を独立して判断できるよう、**openQuestions に残す**。足す場合も本書の DTO（`weeklyReviewValidator`）にフィールドを追加するだけで、§4〜§10 の構造は変わらない。

### 14-12. 「祝い」（週間ターゲット達成の演出）を入れるべきでは？

**部分的に採用。** `notifications.md` §4.3 は「褒めは週次レビュー（#52）の担当」として本書に投げた。本書の答えは「**達成の事実を静かに出すこと自体が祝いである**」。具体的には ①週間ターゲット節の `{達成数}/{件数} 達成` バッジ（全件達成なら `green`）②各行の `IconCircleCheck` と `100%` の数値。

**却下したもの**: 紙吹雪・アニメーション・効果音・「すごい！」のような文言。理由は ①Paper Redesign は紙と手書きの静かな言語で、演出は世界観に合わない ②CONTEXT「習得」_Avoid_「ストリーク」が示すとおり、このアプリは達成を煽らない ③達成/未達が色だけで伝わらないことの方が優先度が高い（§9.5 の protan ΔE 0.2 の実測）。

---

## 15. テスト（CVX-19、convex-test）

### 15.1 純関数 unit（`convex/lib/**/*.test.ts`、Node 環境）

| ファイル | ケース |
| --- | --- |
| `convex/lib/completionRate.test.ts`（新規・#54 と共有） | `confirmedRatio` がゼロ除算を0にする / `completedCount` が4フィールドの和になる |
| `convex/lib/presetDigest.test.ts`（既存・無改修） | 委譲後も既存アサーションが通る（回帰） |
| `convex/lib/weeklyReview.test.ts`（新規） | `digestCountedDates`: 今日と未来を落とす / 過去週は7日すべて残る。`buildWeeklyDigest`: 今日の行が分母にも分子にも入らない / `plannedCount === 0` で `digestRate === 0` / 今週は `isPartial === true`・過去週は `false` / 週初日が今日なら `countedThrough === null`。`buildWeeklyReviewDays`: 7件返る / 休養日は `kind === "rest"` かつ `digestRate === null` / 未来日は `kind === "unrecorded"` / 今日は `digestRate === null` だが `confirmedMinutes` は出る / 並んだ件数0 の過去日も `digestRate === null` / コンディション未選択は `null`。`elapsedDaysInWeek`: 過去週は7・今週は経過日数 |
| `convex/lib/share.test.ts`（既存に追記） | `formatWeeklyShareMarkdown`: 見出し行の書式 / カテゴリ固定順 / 項目ごとに週の分数が合算される / カテゴリ間に空行が入らない / 1件+項目名=カテゴリ名で1行に畳む / 行0件で空文字列 |

### 15.2 Convex 統合（`convex/weeklyReview.test.ts`、edge-runtime、`convex-test`）

`convexTest(schema)` + `t.withIdentity({ subject })`（testing.md の規約どおり）。

| ケース | 期待 |
| --- | --- |
| 未認証で呼ぶ | throw する（`ownerQuery` の認可ガード） |
| 所有者Aのデータを所有者Bとして読む | 所有者Bの結果は0/空（IDOR にならない。CVX-04） |
| 対象週・前週に 確定/未着手/進行中/見送り がある | `confirmedMinutes` / `previousConfirmedMinutes` / `activeDays` / `previousActiveDays` / `skippedMinutes` が正しく分かれる |
| `weekStartJst` に火曜を渡す | その週の月曜に正規化された `weekStart` が返る |
| 今週を渡す | `isCurrentWeek === true`、`targets` が配列、`digest.isPartial === true`、今日の行が `digest.plannedCount` に含まれない |
| 過去週を渡す | `isCurrentWeek === false`、**`targets === null`**、`digest.isPartial === false` |
| 週間ターゲットが0件のまま今週を渡す | `targets === []`（`null` ではない） |
| ゴミ箱に入れた記録・日がある | 集計・消化・`byDay`・`shareMarkdown`・ターゲット実績のすべてから除外される |
| 前週にデータが無い | `previousConfirmedMinutes === 0` / `previousActiveDays === 0` |
| 確定記録から共有文が組まれる | `shareMarkdown` が §10.2 の形（見出し行 + カテゴリ + 項目行）になる。確定0件なら空文字列 |
| `weekStartJst` が壊れた文字列 | `ValidationFailedError` を投げる（`requireDateJst`） |
| 既存 `convex/targets.test.ts` | `buildTargetProgress` 切り出し後も無改修で通る（回帰） |

### 15.3 フロント（Testing Library、happy-dom）

- `src/features/review/components/weekly-review-tab.test.tsx`: `useWeeklyReview` をモックし ①サマリー3枚の数値 ②今週ならターゲット行が出る ③**過去週なら「週間ターゲットは今週だけの計器です」の `Alert` が出てターゲットの数値が1つも出ない** ④テーブルが7行で休養日に `休養`・今日の消化に `—（今日）` が出る ⑤達成行に `{カテゴリ}は達成`（`VisuallyHidden`）がある ⑥共有文が `Textarea` に出てコピーボタンがある。`renderWithMantine` を使い `data-testid` は使わない。
- `src/features/review/lib/weekly-review-labels.test.ts`: `weekdayShortLabel` / `monthDayLabel` / `weekRangeLabel`（月をまたぐ週を含む）/ `previousWeekLabel`（増・減・同・前週0）/ `deltaDirection` / `dailyAverageMinutes`（`elapsedDays === 0`）/ `digestCellLabel`（4分岐）。
- `src/features/review/hooks/use-review-view.ts` の導出: `deriveReviewWeek` を直接テストする（月曜正規化・未来週クランプ）。`use-history-view.test.ts` と同じ形。
- `app-shell.tsx` は無変更なのでナビ関連のテストを追加しない（`pwa-mobile.md` §17 の期待値もそのまま）。入口2本は `history-page` / `weekly-targets-section` 側で `getByRole("link", { name: ... })` を1アサーションずつ足す（`weekly-targets-section.test.tsx` は既存なので追記できる）。
- `ShareCopy` 移設後、`day-board.test.tsx` の共有文アサーションが無改修で通ることを確認する（回帰）。

---

## 16. 実装チェックリスト

**新規**

- `convex/lib/completionRate.ts` / `completionRate.test.ts`（#54 と共有。先に実装した側が作る）
- `convex/lib/weeklyReview.ts` / `weeklyReview.test.ts`
- `convex/queries/review/weeklyReview.ts`
- `convex/services/review/weeklyReview.ts`
- `convex/services/targets/buildTargetProgress.ts`
- `convex/weeklyReview.test.ts`（統合）
- `src/lib/schemas/calendar-date-schema.ts`（#54 と共有）
- `src/lib/target-metric-labels.ts`（`src/features/goals/lib/` から移設）
- `src/components/share-copy.tsx`（`src/features/today/components/` から移設 + props 追加）
- `src/features/review/schemas/review-search-schema.ts`
- `src/features/review/lib/review-route-search.ts`
- `src/features/review/lib/weekly-review-labels.ts` / `.test.ts`
- `src/features/review/lib/review-shimmer-template.ts`
- `src/features/review/hooks/use-review-view.ts` / `.test.ts`
- `src/features/review/hooks/review-queries.ts`
- `src/features/review/types/weekly-review.ts`
- `src/features/review/components/review-page.tsx`
- `src/features/review/components/review-pending.tsx`
- `src/features/review/components/weekly-review-tab.tsx` / `.test.tsx`
- `src/features/review/components/weekly-review-tab-pending.tsx`
- `src/features/review/components/weekly-review-week-nav.tsx`
- `src/features/review/components/weekly-review-summary-cards.tsx`
- `src/features/review/components/weekly-review-targets.tsx`
- `src/features/review/components/weekly-review-day-table.tsx`
- `src/routes/review.tsx`

**改修**

- `convex/lib/validators.ts`（`weeklyDigestValidator` / `weeklyReviewDayValidator` / `weeklyReviewValidator` 追加）
- `convex/lib/share.ts`（`formatWeeklyShareMarkdown` 追加）
- `convex/lib/presetDigest.ts`（`plannedCount` / `digestRate` を `completionRate.ts` に委譲）
- `convex/services/targets/listWithProgress.ts`（突き合わせを `buildTargetProgress` に委譲。戻り値不変）
- `src/features/history/schemas/history-search-schema.ts`（`DateJstSchema` / `YearMonthSchema` を共有ファイルからの import に置換）
- `src/features/history/components/history-page.tsx`（`PageTitle` の右に `/review` へのリンク）
- `src/features/goals/components/weekly-targets-section.tsx`（見出し右に `/review` へのリンク）
- `src/features/goals/**`（`target-metric-labels` の import 先を `~/lib/target-metric-labels` に更新）
- `src/features/today/components/day-board.tsx`（`ShareCopy` の import 先を `~/components/share-copy` に更新）

**無変更（意図的）**

- `convex/schema.ts` — 新規テーブル・インデックスなし（§5）
- `src/components/app-shell.tsx` — `NAV` は7本のまま（§8.5, §14-8）
- `CONTEXT.md` — 語彙の追加・改訂なし（§18）
- `docs/specs/pwa-mobile.md` §10・§17、`docs/specs/notifications.md` — 本書は改訂しない（`weeklyTargetMiss` のリンク先は #56 実装時に `/review` にする、という引き渡しのみ）
- 履歴/分析の消化パネル（`presetReview`）— 定義も窓も変えない（§14-5）

実装後に `vp check` / `vp test` / `vp run fallow`（`ShareCopy` と `target-metric-labels` の移設、`buildTargetProgress` の新規 export があるため必須）/ `vp build` を通す（development-workflow.md の PR pre-check）。`convex/` の差分は `convex:convex-reviewer` に通す（CVX-18）。

---

## 17. 範囲外（このドキュメントが決めないこと）

- 月次レビューの中身 → #54（本書は `/review` の土台と週次タブだけを決める）
- 目標階層の表示・チェックポイント件数のサマリー → #48〜50。週次レビューへ足すかは #53 着地後の判断（§14-11、openQuestions）
- 目標×記録の紐付け（「この目標に効いた今週の記録」） → #53（§14-11）
- タイマーの計測値をレビューに出すこと → #51。`study-timer.md` §19 が「計測は新しい集計軸を作らない」と確定しており、レビューが読むのは確定分数のまま（本書のスキーマ・DTO はタイマー導入で1行も変わらない）
- 通知の実装 → #56。本書が決めたのは `weeklyTargetMiss` のリンク先を `/review` にすることだけ
- PWA・オフライン対応・モバイルのナビ配置 → #58
- 週間ターゲットのスナップショット機構（過去週の達成評価） → 未決（§14-4、openQuestions）
- AI による週次サマリー文の自動生成 → マップの「Not yet specified」のまま
- レビューをナビタブへ昇格させること → 本書は昇格させないと決定。将来やるなら §8.5 末尾の3点セット

---

## 18. CONTEXT.md / ADR への影響

**変更不要。** 週次レビューは CONTEXT.md の既存語彙（「履歴」「消化」「週間ターゲット」「学習量」「コンディション」「共有文」）の定義を変えず、新しい語も導入しない。

- **「消化」**: 定義（確定 / 並んだ件数）をそのまま使う。曜日別28日窓のパネル（履歴/分析）は無変更。_Avoid_「消化を分析の日・週・月ピッカーに追従させること」の読み方は §14-5 のとおり（履歴/分析のパネルに対する指示と読む）。**もし所有者がより広く読むなら**、週次レビューの消化ブロックと #54 の消化推移を落とすだけで済む（openQuestions）。
- **「週間ターゲット」**: 「今週専用の計器であり、過去週には表示しない」をそのまま守る（過去週は `null`）。_Avoid_「週ごとのスナップショット保存」も守る。
- **「共有文」**: 定義は「確定した記録から作る Markdown」。週版もこの定義の中にあり、カテゴリ固定順・空行なし・畳み込みルールを引き継ぐ。**「週次まとめ」の見出し行1行だけが日版との差分**であり、語彙の変更ではない（同じ「共有文」の週版）。もし所有者が「共有文に見出し行を入れない」を保ちたい場合は、見出し行を落として `- カテゴリ` から始めればよい（他の節に影響しない）。
- ADR-0001〜0011 のいずれとも矛盾しない。新規 ADR は不要。特に ADR-0003（プロセス目標であり OKR ツリーを作らない）・ADR-0006（チェックポイントが週間目標を置き換える）に照らして、週次レビューは**新しい目標概念を1つも導入しない**（既存の週間ターゲットと記録を読むだけ）。
