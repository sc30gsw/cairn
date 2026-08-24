# 月次レビュー設計（#54）

- 状態: 決定済み（2026-08-24）。実装は別セッション。
- 対象: 週次レビューの月版としての**月次レビュー画面**。月間サマリー、**月間の消化推移**、**カテゴリ内訳の月比較**（前月比）。
- 前提となる決定: マップ #47 の Decisions so far（優先順「目標階層 → タイマー → 週次レビュー → 紐付け → 月次レビュー → 通知 → PWA」、通知/PWA 調査結果）。CONTEXT.md「履歴」「消化」「週間ターゲット」「学習量」。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)、[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)、[design-live-board.md](../../.claude/rules/web/design-live-board.md)、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)、[shimmer-from-structure.md](../../.claude/rules/web/shimmer-from-structure.md)、[valibot-validation.md](../../.claude/rules/typescript/valibot-validation.md)。Formisch は対象外（§9.5 で理由を明示）。
- このドキュメントの担当範囲: **月次レビュー画面のスキーマ・関数サーフェス・UI 構造・エッジケース**。週次レビュー画面自体の中身は #52 の担当（本書は §2 で最小契約のみ仮定する）。目標階層（#48〜50）、目標×記録の紐付け（#53）、通知（#56）、PWA（#58）は範囲外。

---

## 0. 執筆時点の注記（最重要・人間の再確認ポイント）

本チケット（#54）の Question は「週次レビュー設計の確定後に決める」と明記されており、マップの優先順も 週次レビュー（#52）→ 紐付け（#53）→ 月次レビュー（#54）の順である。

**しかし執筆時点（2026-08-24）で #52 は未着手であり、`docs/specs/weekly-review.md` は存在しない。** リポジトリの `docs/specs/` には `study-timer.md` / `goal-hierarchy-layout.md` / `notifications.md` / `pwa-mobile.md` / `checkpoint-parent-backfill.md` はあるが週次レビューの決定文書は無く、GitHub 上の #52 も `open`（未グリル）のままである。

このワークフローは「本チケットは人間参加が前提だが、今回はオーナーの明示指示によりエージェント駆動で進める」ため、確定を止めずに次の方針で進める。

1. **§2 に週次レビューの最小契約を明示的に仮定する。** 既にロックされたマップ決定（優先順、通知/PWA 仕様が採用した「#52/#53/#54 へ依存しない」設計原則）と、既存コードの前例（`history.tsx` のタブ構成、`weekBreakdown` の形）から機械的に導ける、**リスクの低い最小限の契約**に留める。
2. **月次レビュー本体（§4 以降）は、この仮定が外れても影響範囲が小さくなるように設計する。** 新規テーブルを増やさず、`rows` / `days` / `items` / `categories` の既存データだけを読む独立した集計 query 1本にする（§5, §7）。週次レビューの実装内容（対象範囲、祝い演出、目標階層との統合有無など）には一切依存しない。
3. **#52 が実際に決定した内容が §2 と食い違う場合、reconcile が必要なのは §2（前提）と §8（ルーティング）だけ**であり、§5〜§7（スキーマ・関数・純粋ロジック）は無傷で使える設計にした。

人間の再確認ポイント（詳細は decisionComment 参照）:

- §2 の「週次レビュー最小契約」は本書が代わりに仮決めしたものであり、#52 のグリルで正式に確定・上書きされるべきである。
- #52 が確定した時点で、本書の §2・§8（ルート `/review` とタブ構成）を実際の決定と突き合わせる作業が必要。
- 本書は **`/review` をナビタブにしない**（`NAV` は7本のまま、入口は履歴画面のリンク）と決めた。CONTEXT.md「マイページ」の _Avoid_「8番目のナビタブ」と pwa-mobile.md §10 を動かさないための選択であり、発見性を常設タブより落とすトレードオフを承知の上での判断である（§8.3, §12-10）。昇格させたい場合の手順は §8.3 末尾の引き渡し3点セットにまとめた。

---

## 1. 決定の要約

1. **月次レビューは新しいテーブルを1つも増やさない。** `rows` / `days` / `items` / `categories` を読むだけの `ownerQuery` 1本（`monthlyReview`）で完結する（§5, §7）。
2. **月次レビューは「トレンドと比較」に徹し、既存 履歴（`/history`）の分析タブと重複する軸（コンディション別内訳、日別ペースの生データ）は出さない。** 履歴が「任意の日/週/月を選んで内訳を見る」画面なのに対し、月次レビューは「今月というくくりでの変化」を見せる画面と役割分担する（§4, §12-4）。
3. **月間の消化推移**は、月内の暦日を**月曜始まりの週でバケット化**（月境界は部分週として許容）し、週バケットごとに `確定 / (確定+未着手+進行中+スキップ)` の消化率を出す折れ線/棒グラフ（§6.2, §9.3）。
4. **カテゴリ内訳の月比較**は、今月と前月（暦月ベース、前年同月ではない）の `byCategory` を突き合わせ、カテゴリ名で対応させて増減を見せる（§6.3, §9.4）。突き合わせと delta% の計算は**クライアント側の純関数**に置く（サーバはカテゴリ別分数の生値だけ返す。§12-8）。
5. **月間ターゲット・週間ターゲットの月内達成回数・目標階層の件数は月次レビューに出さない。** 週間ターゲットは仕様上「今週専用の計器」でスナップショットを持たないため、過去週へ遡って正しく評価できない（§12-1, §12-2）。目標階層は現在値のスナップショットしか持たず、月内の変化を表せない（§12-3）。
6. **消化率は「今日を含む部分週」から今日を除外して計算する。** CONTEXT「消化」の「今日の未着手を計画倒れに数えない」を月次のトレンドにもそのまま適用する（§6.2, §11-4）。
7. **既存の `digestRate`（`convex/lib/presetDigest.ts`）と同じ計算式を再利用する。** 比率計算だけを `convex/lib/completionRate.ts` に切り出し、`presetDigest.ts` と月次レビューの双方から呼ぶ（§6.1）。
8. **`/review` を新規トップレベルルートとして追加し、週次/月次をタブで切り替える。** ルート・検索パラメータ・レイアウトの構成は `history.tsx` の月/週/分析タブと完全に同じパターンにする（§8, §9）。
9. **ナビタブは増やさない。`src/components/app-shell.tsx` の `NAV` は既存の7本のまま無変更とし、`/review` への入口は履歴画面からのリンク1本にする。** CONTEXT.md「マイページ」の _Avoid_「8番目のナビタブ」と、それを前提に確定済みの pwa-mobile.md §10.1〜§10.3（`NAV` 7本・`MOBILE_PRIMARY` 4本 +「その他」3本）・§17（app-shell テストの期待値）を、本書側では一切動かさない（§8.3, §12-10）。

---

## 2. 前提: 週次レビューの最小契約（#52 未確定にともなう明示的仮定）

本書が月次レビューを設計する上で必要な最小限の「型」だけをここで仮決めする。**中身（週次レビュー画面が具体的に何を表示するか）は #52 のグリルが決めるべきものであり、ここでは決めない。**

| 項目 | 仮定する内容 | 根拠 |
| --- | --- | --- |
| ルート | `/review`（新規トップレベル）。`src/routes/review.tsx` | `history.tsx` 等の既存トップレベルルートと同じ粒度。design-live-board.md #1「plus any new route」 |
| 画面構成 | `Tabs`（`variant="pills"`）で 週次(`weekly`) / 月次(`monthly`) を切り替える1画面 | `history-page.tsx` の月/週/分析タブと同一パターン |
| ナビゲーション | **`NAV`（7本）には追加しない。** `/review` は履歴画面からのリンクで開く（§8.3） | CONTEXT.md「マイページ」_Avoid_「8番目のナビタブ」、pwa-mobile.md §10.1〜§10.3（`NAV` は7本のまま・`MOBILE_PRIMARY` 4本）・§17 |
| 検索パラメータ | `{ tab, week, month }`。`month` は本チケット（月次）が所有し、`week` は #52 が所有する | `history-search-schema.ts` と同型 |
| 関数ドメイン | `convex/queries/review/*.ts` / `convex/services/review/*.ts`（CVX-20 の新規ドメイン `review`） | 既存の `history` / `targets` ドメイン分割にならう |
| データソースの制約 | 新規テーブルを追加しない。既存の `rows` / `days` / `items` / `categories` / `targets` のみを読む | notifications.md・pwa-mobile.md が採用した「#52/#53/#54 へ依存しない」設計原則の踏襲（下記引用） |
| 目標階層・紐付けへの依存 | 持たない | 同上 |

> 参考: `docs/specs/notifications.md` は `weeklyTargetMiss` について「#52 / #53 / #54 への依存は持たない」と明記し、既存の `targets` テーブルだけを読む設計にしている。本書はこの前例に倣い、月次レビューも同じ独立性を持たせる。

**この表が #52 の実際の決定と異なった場合の影響範囲は、本書の §2 と §8（ルート・検索パラメータ・入口の置き方）に限定される。** §5〜§7（スキーマ・純関数・query 本体）は `/review` というルートの存在にも `week` パラメータの中身にも依存しないため、#52 の内容がどう転んでも作り直しにならない。

---

## 3. 現状（コードから確認した事実）— 履歴の既存集計と何が違うか

既に `convex/queries/history/` に月次の集計は存在する（`monthBreakdown`）。月次レビューが屋上屋を架さないよう、まず現状を整理する。

| 既存要素 | 場所 | 事実 |
| --- | --- | --- |
| 月の内訳 | `queries/history/monthBreakdown.ts` → `services/history/monthBreakdown.ts` → `computeMonthBreakdown` | 引数 `{ todayJst, yearMonth }`。**選んだ1か月**の `byCategory` / `byCondition` / `confirmedMinutes` / `skippedMinutes` / 日別ヒートマップ用 `days`（7日移動平均つき）/ `events` を返す。**前月との比較は持たない。トレンド（週推移）も持たない。** |
| 消化（曜日別・直近28日） | `services/history/presetReview.ts` + `convex/lib/presetDigest.ts` | 「今日を除く直近28暦日」を**曜日ごと**に束ねて `confirmed / (confirmed+leftover+ongoing+skipped)` を出す。月境界にもピッカーにも従わない固定ウィンドウ（CONTEXT「消化」の `_Avoid`: 「消化を分析の日・週・月ピッカーに追従させること」）。 |
| 週間ターゲット実績 | `services/targets/listWithProgress.ts` | 引数 `{ weekStartJst }`。**今週だけ**の実績。過去週には出さない設計（CONTEXT「週間ターゲット」）。スナップショットを持たないため、過去の目標値を遡って正しく再現できない。 |
| 目標のスナップショット性 | `convex/schema.ts` の `goals` | 現在値のみを保持。達成済み習得の `confirmedMinutes` / `activeDays`（ADR-0007）は「達成時点で固定」だが、これは個々の目標の実績であり月次のトレンドではない。 |

結論: 履歴の `monthBreakdown` は「選んだ月の内訳」を出す道具であり、**「先月と比べてどうだったか」「月の中でどう変化したか」という2つの軸を持たない**。これが月次レビューの存在理由であり、既存機能の単純な再掲ではない（§12-4 で重複しない設計であることを検証する）。

---

## 4. 月次レビューのスコープ（何を見せる／見せないか）

| 見せる | 見せない | 理由 |
| --- | --- | --- |
| 今月の確定分数・見送り分数・稼働日数（サマリー） | — | ticket が明示した「月間サマリー」の最小構成 |
| **月間の消化推移**（週バケットの折れ線/棒） | 曜日別の消化（既存・直近28日） | 役割が違う。曜日別は「プリセットを直すべき曜日」を見つけるための道具（履歴の担当）。月次は「月の中で尻すぼみ/尻上がりのどちらか」を見るための道具 |
| **カテゴリ内訳の月比較**（今月 vs 前月） | コンディション別内訳 | 履歴の分析タブで既に選んだ月のコンディション別内訳が見られる（`monthBreakdown.byCondition`）。重複 UI を避ける（CONTEXT 履歴の `_Avoid`「模試分析のような複雑ダッシュボード」） |
| 前月比のカテゴリ増減（分数・新規/消滅ラベル） | 前年同月比（YoY） | 本番まで残り約6週間の学習ログであり、前年データは存在しない/意味を持たない（spec.md Problem Statement） |
| 「今月を編集」への導線（`/history` へのリンク） | 記録の直接編集 | 月次レビューは読み取り専用。編集は既存の日ページ/履歴に任せる |
| — | 月間ターゲット、週間ターゲットの月内達成回数 | §12-1, §12-2 で却下（スナップショット欠如） |
| — | 目標階層（長期目標/チェックポイント）の件数サマリー | §12-3 で却下（依存回避 + 現在値スナップショットしか無い） |

---

## 5. スキーマ変更（CVX-10/11/12/13/16）

**結論: `convex/schema.ts` の変更はゼロ。** 新規テーブル・新規インデックスを追加しない。

理由:

- 月次レビューが必要とするのは「ある日付範囲の `rows` / `days`」と「カタログ（`items` / `categories`）」であり、これらは既存の `by_owner_and_date`（`rows`, `days`）と `loadCatalog`（`items` / `categories`）で完全にまかなえる。
- 今月・前月をまたぐ範囲は最大で概ね62日分（前月の初日〜今月の末日）。1日あたりの `rows` はプリセット規模（多くて10件程度）なので、`.collect()` される件数は多くても数百件で、CVX-11 の「概ね1000件未満」に収まる。範囲は `by_owner_and_date` の `gte`/`lte` で絞るため `.filter()` は使わない（CVX-10）。
- CVX-12（プレフィックス重複インデックス禁止）に抵触する新規インデックスの追加自体が無いので、この観点でも安全。

### 5.1 `convex/lib/validators.ts` への追加

```ts
//* 月内の週バケット1つ分の消化(digestRate と同じ定義)。月境界・当日を含む週は isPartial=true。
export const monthlyDigestBucketValidator = v.object({
  bucketEnd: v.string(),
  bucketStart: v.string(),
  confirmedCount: v.number(),
  //? 週全体を代表しない(月境界で切れている、または当日を含む進行中の週)ときに true。
  //? UI はここが true のバケットを淡色表示 + 注記する(§9.3)。
  isPartial: v.boolean(),
  plannedCount: v.number(),
  digestRate: v.number(),
});

export type MonthlyDigestBucket = Infer<typeof monthlyDigestBucketValidator>;

//* 月次レビュー画面1枚ぶんの集計。カテゴリ比較の delta%・ラベル付けはクライアントの純関数が担う(§12-8)。
export const monthlyReviewValidator = v.object({
  activeDays: v.number(),
  byCategory: v.array(categoryBreakdownValidator),
  confirmedMinutes: v.number(),
  digestTrend: v.array(monthlyDigestBucketValidator),
  //? yearMonth が todayJst の月と一致するか。当月は「まだ途中」の注記に使う(§9.2)。
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

`categoryBreakdownValidator`（既存、`{ category, categorySortOrder, minutes }`）をそのまま再利用する。新しい形を作らない（CVX-16、goal-hierarchy-layout.md §「DTO の形を作り直すことになる」と同じ教訓）。

### 5.2 既存ファイルへの影響

なし（`schema.ts` は無変更）。`validators.ts` への追記のみ。

---

## 6. 純関数（Convex ランタイムを import しない）

spec.md の原則「ドメインの不変条件は Convex ランタイムを import しない純関数に置く」に従う。すべて `convex/lib/` に置き、フロントは `~domain/*` エイリアス（`tsconfig.json`）経由で同じ関数を読む。

### 6.1 `convex/lib/completionRate.ts`（新規）— 消化率の計算を1箇所に集約

既存の `convex/lib/presetDigest.ts` の `digestRate` / `plannedCount` は「曜日別カウント」専用の型 (`WeekdayCounts`) に対してのみ定義されている。月次の週バケットには曜日という軸が無いため、**比率計算そのもの**を型非依存の共有プリミティブへ切り出す。

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

`convex/lib/presetDigest.ts` の改修（**既存の公開 API・戻り値は一切変えない**、内部実装だけ委譲する純粋なリファクタ）:

```ts
// 変更前
export function plannedCount(counts: WeekdayCounts): number {
  return counts.confirmed + counts.leftover + counts.ongoing + counts.skipped;
}
export function digestRate(counts: WeekdayCounts): number {
  const planned = plannedCount(counts);
  if (planned === 0) return 0;
  return counts.confirmed / planned;
}

// 変更後
import { completedCount, confirmedRatio } from "./completionRate";

export function plannedCount(counts: WeekdayCounts): number {
  return completedCount(counts);
}
export function digestRate(counts: WeekdayCounts): number {
  return confirmedRatio(counts);
}
```

`WeekdayCounts` は `{ confirmed, leftover, ongoing, skipped, weekday }` で `CompletionCounts` の上位互換（構造的部分型）なので、そのまま渡せる。**`presetDigest.test.ts` は無改修で通る**（入出力が完全に同じため）。

### 6.2 `convex/lib/monthlyReview.ts`（新規）— 月間の消化推移

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
//? 前月・翌月の日を混ぜないので、月内の消化推移と月間合計の整合が常に取れる(§12-6)。
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

//* 月間の消化推移。当日を含む週バケットは、当日の行を除いて計算する
//? (CONTEXT「消化」: 今日の未着手を計画倒れに数えない、を月次のトレンドにもそのまま適用する)。
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
      //? 月境界の部分週(7日未満) or 当日を含む進行中の週は「週全体を代表しない」印をつける。
      isPartial: includesToday || bucket.dates.length < 7,
      plannedCount: completedCount(counts),
      digestRate: confirmedRatio(counts),
    };
  });
}
```

`rows` に渡す前に**必ず `liveRows` / `liveDayDatesFrom`（`services/history/liveRows.ts`）を通す**（§7.2、§11-6）。この関数自体は Convex 型を知らない純粋なフィルタ後データを受け取るだけでよい。

### 6.3 `convex/lib/jst.ts` への追加 — 前月の算出

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

`addMonthsJst("2026-01", -1) === "2026-01" の前月 = "2025-12"`。`addMonthsJst("2026-12", 1) === "2027-01"`。既存の `addDaysJst` と対になる命名（`convex/lib/jst.test.ts` に追記してテストする、§13.1）。

### 6.4 純関数の一覧（CVX-09 準拠、Convex ランタイム非依存）

| 関数 | ファイル | 責務 |
| --- | --- | --- |
| `completedCount` / `confirmedRatio` | `convex/lib/completionRate.ts` | 消化率の計算（`presetDigest.ts` と共有） |
| `bucketDatesByWeek` | `convex/lib/monthlyReview.ts` | 月の暦日を月曜始まりの週でバケット化 |
| `buildMonthlyDigestTrend` | `convex/lib/monthlyReview.ts` | 週バケットごとの消化率トレンド |
| `addMonthsJst` | `convex/lib/jst.ts` | 前月/翌月の `yearMonth` 算出 |

---

## 7. 関数サーフェス（CVX-01/02/03/04/05/20）

新規ドメイン `review` を `queries/` `services/` に追加する（CVX-20）。mutation は無い（読み取り専用。§9.5）。cron・scheduler も無い（CVX-05 は非該当）。

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

`ownerQuery` が `requireUser` 相当（`ctx.ownerId` の付与）を担う（CVX-04、`convex/lib/ownerFunctions.ts` の既存パターン）。`args` は CVX-03 のとおり両フィールドとも必須のバリデータ付き。

### 7.2 service

```ts
// convex/services/review/monthlyReview.ts
import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { aggregateBreakdownRows } from "../../lib/historyBreakdown";
import { addMonthsJst, calendarDatesInMonth } from "../../lib/jst";
import { buildMonthlyDigestTrend } from "../../lib/monthlyReview";
import type { MonthlyReviewDto } from "../../lib/validators";
import { liveDayDatesFrom, liveRows } from "../history/shared";

function emptyMonthlyReview(yearMonth: string, todayJst: string): MonthlyReviewDto {
  //? calendarDatesInMonth が空を返す(yearMonth の形式が壊れている)場合の防御。
  //? services/history/computeMonthBreakdown.ts の同じ防御パターンに合わせる。
  return {
    activeDays: 0,
    byCategory: [],
    confirmedMinutes: 0,
    digestTrend: [],
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

  //? ゴミ箱の記録・日を必ず除く(presetReview / listWithProgress / computeMonthBreakdown と同じ前提)。
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
    digestTrend: buildMonthlyDigestTrend(
      dates,
      currentRows.map((row) => ({ dateJst: row.dateJst, status: row.status })),
      args.todayJst,
    ),
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

`aggregateBreakdownRows` は既存 export（`convex/lib/historyBreakdown.ts`）をそのまま再利用する。新しい集計ロジックを重複実装しない（CVX-16 / AHA）。

### 7.3 CVX チェック

- args validator あり、`ownerQuery` 経由で認可あり（CVX-03/04）。
- `internal.*` を使う scheduler/cron は無い（CVX-05 非該当）。
- `.filter()` 不使用、範囲は `by_owner_and_date` の `withIndex`（CVX-10）。
- `.collect()` は前月+今月の範囲に絞られており、CVX-11 の「概ね1000件未満」に収まる（§5 で数値根拠を明示済み）。
- 新規インデックス無し（CVX-12 非該当）。
- `ctx.db.*` はすべて第1引数にテーブル名（CVX-13、`ctx.db.query("rows", ...)` 形。既存コード全体が Convex 1.31+ の `ctx.db.query(table, ...)` 形を使っているのでそれに揃える）。
- `Date.now()` を呼ばない。`todayJst` は引数（CVX-14）。
- 単一 query 内の一連の読み取りのみで、`ctx.run*` は使わない（CVX-07/08 非該当。そもそも query からは呼べない）。
- 関連する書き込みは無い（CVX-15 非該当。読み取り専用）。
- `Doc<"...">` / `Id<"...">` をそのまま使い、手書き型を増やさない（CVX-16）。
- `await` 漏れなし（CVX-17）。
- 1関数1ファイル、`queries/review/` `services/review/` に分離（CVX-20）。

---

## 8. ルーティング・検索パラメータ

### 8.1 共有スキーマの抽出（AHA: 2箇所目の利用で切り出す）

`history-search-schema.ts` にある `DateJstSchema` / `YearMonthSchema` / `isCalendarDate` は、月次レビューの `month` パラメータにもそのまま必要になる。同じ正規表現・実在日チェックを2箇所に複製しないよう、共有ファイルへ抽出する。

新規: `src/lib/schemas/calendar-date-schema.ts`

```ts
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

改修: `src/features/history/schemas/history-search-schema.ts` から上記の重複定義を削除し、`~/lib/schemas/calendar-date-schema` から import するだけに置き換える（既存の `HistorySearchSchema` の公開 API・挙動は変えない、純粋な internal リファクタ）。

### 8.2 `/review` ルート

新規: `src/features/review/schemas/review-search-schema.ts`

```ts
import * as v from "valibot";

import { DateJstSchema, YearMonthSchema } from "~/lib/schemas/calendar-date-schema";

const ReviewTabSchema = v.picklist(["weekly", "monthly"]);

export const ReviewSearchSchema = v.object({
  //? week は #52(週次レビュー)が所有する。本チケットは月次の month だけを消費する(§2)。
  month: v.optional(YearMonthSchema),
  tab: v.optional(ReviewTabSchema),
  week: v.optional(DateJstSchema),
});

export type ReviewSearch = v.InferOutput<typeof ReviewSearchSchema>;
export type ReviewTab = v.InferOutput<typeof ReviewTabSchema>;

export const reviewSearchDefaults = {
  month: undefined,
  tab: "weekly",
  week: undefined,
} as const satisfies ReviewSearch;
```

新規: `src/features/review/lib/review-route-search.ts`（`history-route-search.ts` と同型）

```ts
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

新規: `src/routes/review.tsx`

```tsx
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

### 8.3 ナビ: `app-shell.tsx` は無変更。入口は履歴画面のリンク

**決定: `src/components/app-shell.tsx` の `NAV` には「レビュー」を追加しない（7本のまま、順序も変えない）。`/review` への導線は履歴画面に置いたリンク1本にする。**

理由（本書が当初案の「`NAV` の 履歴 と 項目 の間に挿入」を撤回した経緯は §12-10）:

1. 現状の `NAV` は7本（日 / ボード / 履歴 / 項目 / プリセット / 目標 / ゴミ箱 — `app-shell.tsx`、pwa-mobile.md §2.2・§10.1）。ここに追加すれば **8番目のナビタブ**になる。CONTEXT.md「マイページ」の _Avoid_ は「8番目のナビタブ」を明示的に禁じており、pwa-mobile.md §6.1（manifest の `shortcuts` は既存ルートのみ）・§8.3（インストール案内はマイページの1セクション）と notifications.md は、いずれもこの制約を守る形で**すでに確定している**。月次レビュー（本書）が単独でその制約を崩す判断はしない。
2. pwa-mobile.md §10.3 は `NAV` を「既存の7本のまま。順序も変えない」と明記し、モバイルを `MOBILE_PRIMARY` 4本（`/`, `/board`, `/history`, `/goals`）+「その他」Menu 3本（項目 / プリセット / ゴミ箱）に割っている。マップの優先順では **PWA（#58）が月次レビュー（#54）より後**なので、本書が `NAV` を8本にすると #58 のセッションは `/review` の置き場所を持たず、黙って「その他」に落ちるか §17 の app-shell テスト期待値（「下小口ナビに 日/ボード/履歴/目標 の4リンクがあり 項目 は無い」）を壊す。
3. CONTEXT.md 側の _Avoid_ の**意図**（マイページをタブにしないことか、タブ本数そのものの上限か）を1文に確定する作業は、CONTEXT.md の語彙定義を書き換える行為であり、#50 相当の独立した工程に属する。本チケットはそこへ踏み込まず、制約を**満たす**設計を選ぶ（§12-10）。

改修（`src/features/history/components/history-page.tsx`、`PageTitle` の右）:

```tsx
import { Anchor, Group } from "@mantine/core";
import { Link } from "@tanstack/react-router";

<Group align="center" justify="space-between" mb="md">
  <PageTitle>履歴</PageTitle>
  {/* //? /review への唯一の入口。ナビタブは増やさない(§8.3)。 */}
  <Anchor component={Link} to="/review" search={{ tab: "monthly" }}>
    レビューを見る
  </Anchor>
</Group>;
```

- 新規ファイルは作らず `history-page.tsx` に直接置く。`Link`（`@tanstack/react-router`）と Mantine の `Anchor` だけを使い、**`~/features/review/*` は import しない** — project-structure.md「Feature inter-dependencies forbidden」に従う（`history` と `review` は兄弟 feature）。リンク先の型安全性は TanStack Router の生成ルート型が担保する。
- 履歴の `Tabs`（月/週/分析）には**4本目のタブを足さない**。別ルートへ飛ぶものをタブに混ぜると `HistorySearchSchema` の `tab` の意味が壊れ、`history-page.tsx` の `onChange` 分岐（`month` / `week` / `analysis`）も崩れる。タブではなくリンクにする。
- 逆方向の導線（月次レビュー → `/history?month=...`）は §9.1 で既に持っているので、これで履歴 ⇄ レビューの相互リンクが揃う。
- `search={{ tab: "monthly" }}` を明示するのは、#52 が着地するまで `weekly` タブが「準備中」プレースホルダ（§9.6）だからである。#52 が `WeeklyReviewTab` を実装したら、この `search` を落として既定タブ（`weekly`）に任せるかは #52 側の判断でよい（本書の他の節には影響しない）。
- design-live-board.md #1「新しいルートも Paper Redesign の言語を使う」は `/review` 画面側（`PageTitle` + `Tabs variant="pills"`、§9）で満たしており、ナビタブの有無とは独立である。

**#52 / #58 への引き渡し（重要）**: 将来「レビューをナビタブに昇格させる」と決める場合、それは本書の変更ではなく次の3点セットの改訂になる。優先順で先に来る **#52（週次レビュー）が `/review` の一次導線の所有者**なので、判断も #52 側で行う。

1. CONTEXT.md「マイページ」の _Avoid_「8番目のナビタブ」の意図を1文に確定する（#50 相当の工程。マイページ限定の禁止なのか、`NAV` の本数上限なのか）。
2. pwa-mobile.md §10.1〜§10.3 を8本前提に改訂する。**`/review` を `MOBILE_PRIMARY`（現4本）に入れるのか「その他」Menu に入れるのかの決定を含む**（入れる場合は現4本のどれを落とすかも決める）。
3. pwa-mobile.md §17 の app-shell テスト期待値（下小口ナビの4リンク / 「その他」の中身）を、2 の決定に合わせて書き換える。

### 8.4 月の状態導出（`src/features/review/hooks/use-review-view.ts`、月次分のみ）

`use-history-view.ts` の `deriveHistoryView` と同じクランプ規則を流用する。**週次分（`weekAnchor` 相当）は #52 が実装する**ため、ここでは月次に必要な最小限だけを書く。

```ts
import { getRouteApi } from "@tanstack/react-router";
import { todayJst } from "~domain/jst";

import type { ReviewSearch, ReviewTab } from "~/features/review/schemas/review-search-schema";

const reviewRoute = getRouteApi("/review");

function yearMonthFromDateJst(dateJst: string): string {
  return dateJst.slice(0, 7);
}

export function deriveReviewMonth(search: ReviewSearch, today: string): string {
  const todayYearMonth = yearMonthFromDateJst(today);
  const requestedMonth = search.month ?? todayYearMonth;
  //? 未来月への遷移は禁止(history の deriveHistoryView と同じクランプ)。
  return requestedMonth > todayYearMonth ? todayYearMonth : requestedMonth;
}

export function useReviewView() {
  const search = reviewRoute.useSearch();
  const navigate = reviewRoute.useNavigate();
  const today = todayJst();
  const yearMonth = deriveReviewMonth(search, today);
  const tab: ReviewTab = search.tab ?? "weekly";

  return {
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
    tab,
    today,
    yearMonth,
  };
}
```

---

## 9. UI 構造（Mantine 優先 / Paper Redesign）

### 9.1 画面構成

```
/review
┌─────────────────────────────────────────────┐
│ レビュー                                       │ ← PageTitle（波下線）
│ ┌────────┬────────┐                          │
│ │  週次   │  月次   │  ← Tabs variant="pills"   │
│ └────────┴────────┘                          │
│                                               │
│  ◀  2026年8月  ▶   (今月へ)                    │ ← MonthlyReviewMonthNav
│                                               │
│  ┌───────────────┬───────────────┬─────────┐ │
│  │ 確定 1,240分   │ 稼働日数 18日   │ 見送り12件│ │ ← サマリーカード(3枚)
│  └───────────────┴───────────────┴─────────┘ │
│                                               │
│  月間の消化推移                                 │
│  ┌───────────────────────────────────────┐   │
│  │  [棒グラフ: 週1 週2 週3 週4 週5(進行中)]  │   │ ← BarChart(消化率%)
│  └───────────────────────────────────────┘   │
│                                               │
│  カテゴリ内訳の月比較（先月比）                    │
│  ┌───────────────────────────────────────┐   │
│  │ [グループ棒: 今月/先月 × カテゴリ]        │   │ ← BarChart(2系列)
│  ├───────────────────────────────────────┤   │
│  │ カテゴリ  今月  先月  増減              │   │ ← 数値表(併記, CONTEXT 履歴の慣習)
│  │ TOEIC対策 620分 540分 +80分(+14.8%)     │   │
│  │ 多聴      ...                          │   │
│  └───────────────────────────────────────┘   │
│                                               │
│  [今月(2026-08)を履歴で見る]                     │ ← /history?month=... へのリンク
└─────────────────────────────────────────────┘
```

この画面への**入口はナビタブではなく履歴画面のリンク**（§8.3）。`NAV` は7本のまま増やさないため、右小口インデックスタブ（デスクトップ）にも下小口タブ（モバイル・pwa-mobile.md §10）にも「レビュー」は現れない。

### 9.2 コンポーネント一覧

| ファイル | 責務 |
| --- | --- |
| `src/features/review/components/review-page.tsx` | Tabs の外枠。`Suspense` + `ReviewPending`（Shimmer）。週次タブは #52 が実装（本書ではプレースホルダのみ許容、§9.6） |
| `src/features/review/components/monthly-review-tab.tsx` | 月次タブの本体。`useSuspenseQuery` でデータ取得 |
| `src/features/review/components/monthly-review-tab-pending.tsx` | 構造モックの `<Shimmer loading>`（shimmer-from-structure.md パターン2） |
| `src/features/review/components/monthly-review-month-nav.tsx` | 月の前後移動（`learning-date-navigation.tsx` と同じ `ActionIcon` + `Tooltip` パターン） |
| `src/features/review/components/monthly-review-summary-cards.tsx` | サマリー3枚（確定分数・稼働日数・見送り件数） |
| `src/features/review/components/monthly-digest-trend-chart.tsx` | 週バケットの消化率 `BarChart`（`@mantine/charts`） |
| `src/features/review/components/monthly-category-comparison.tsx` | 今月/先月のグループ棒 `BarChart` + 数値表 |
| `src/features/review/hooks/use-review-view.ts` | §8.4 |
| `src/features/review/hooks/review-queries.ts` | `useMonthlyReview(todayJst, yearMonth)` |
| `src/features/review/lib/monthly-digest-labels.ts` | 週バケットの表示ラベル・部分週注記（純粋関数、§9.3） |
| `src/features/review/lib/category-comparison.ts` | 今月/先月の `byCategory` 突き合わせ・delta% 計算（純粋関数、§12-8） |

### 9.3 月間の消化推移チャート

```tsx
// src/features/review/lib/monthly-digest-labels.ts
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
/>
```

- `plannedCount === 0` の週（記録が1件も無い週、または当日除外後に空になった当月最終週）は `null` にして棒を出さない。0% と表示すると「サボった」に見えてしまい、CONTEXT「消化」の定義（計画があったかどうかの指標であり、無い週はそもそも指標が無い）に反する。
- `isPartial` な週バケットは棒の色を `orange.3`（薄い）にして注記する（`Alert` ではなく、バーの下に `Text size="xs" c="dimmed"` で「第5週は月末までのデータです」等、静かな注記に留める。CONTEXT 履歴の `_Avoid`「模試分析のような複雑ダッシュボード」を踏まえ、警告色は使わない）。
- Y軸は 0〜100% 固定（`yAxisProps={{ domain: [0, 100] }}`）。月をまたいでも軸のスケールが変わらないようにする。

### 9.4 カテゴリ内訳の月比較

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

- カテゴリの対応は**カテゴリ名の文字列**で行う（`categoryBreakdownValidator` が名前ベースの集計であるため、履歴機能全体と同じ設計。§12-8 で ID ベース案を検討し却下）。
- 「先月のみ」（今月0分）の行は一覧の末尾に固定する（`categorySortOrder = MAX_SAFE_INTEGER`）。カテゴリを削除した/使わなくなった場合に自然に一番下へ落ちる。
- グラフ側は `previous === 0 && current === 0` の行を除外して描画する（表には出すが、グラフのノイズにはしない）。

### 9.5 フォーム（Formisch/Valibot）は無し

月次レビューは読み取り専用画面で、ユーザー入力を保存する mutation を持たない（§4「見せない」列）。したがって Formisch のフォームは存在しない。唯一の入力は `/review` の検索パラメータ（月の前後移動）であり、これは §8 の Valibot スキーマ（`ReviewSearchSchema`）でルート境界のバリデーションを行う。これは valibot-validation.md の「境界だけ検証する」の対象であり、フォームスキーマとは別物である。

### 9.6 週次タブとの同居について

本チケットは `MonthlyReviewTab` の実装だけを確定する。`ReviewPage`（§9.2）は #52 が `WeeklyReviewTab` を実装するまでの間、`weekly` タブに「準備中です」というプレースホルダを出して構わない（既存に類例は無いが、`Tabs.Panel` が空でもレイアウトは破綻しない）。**#52 が実装され次第、プレースホルダを `WeeklyReviewTab` に差し替えるだけで済む**ように、`ReviewPage` は `MonthlyReviewTab` を直接 import せず `Tabs.Panel` 経由でのみ組み合わせる（§8.2 のルート定義どおり）。

---

## 10. 型の SSoT（convex-tanstack.md 準拠）

```ts
// src/features/review/hooks/review-queries.ts
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useMonthlyReview(todayJst: string, yearMonth: string) {
  return useSuspenseQuery(
    convexQuery(api.queries.review.monthlyReview.monthlyReview, { todayJst, yearMonth }),
  );
}
```

コンポーネントの props 型は `FunctionReturnType<typeof api.queries.review.monthlyReview.monthlyReview>` から派生させる。**`~/features/history/types/history` から `CategoryBreakdown` 等を import しない**（project-structure.md「Feature inter-dependencies forbidden」— `review` と `history` は兄弟 feature であり、互いに import できない）。

```ts
// src/features/review/types/monthly-review.ts
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type MonthlyReview = FunctionReturnType<typeof api.queries.review.monthlyReview.monthlyReview>;
export type MonthlyCategoryBreakdown = MonthlyReview["byCategory"][number];
```

---

## 11. エッジケース

| # | 状況 | 挙動 | 根拠 |
| --- | --- | --- | --- |
| 1 | `yearMonth` の形式が壊れている（URL 直接編集など） | `emptyMonthlyReview` を返す（全項目0/空配列） | `computeMonthBreakdown` の既存防御と同じパターン(§7.2) |
| 2 | `month` が未来月 | ルート側（`deriveReviewMonth`）で当月にクランプ。サーバは未来月を渡されても単に0件を返すだけで安全 | `deriveHistoryView` と同じクランプ規則(§8.4) |
| 3 | 前月にデータが無い（利用開始1か月目） | `previousConfirmedMinutes === 0` のとき、カテゴリ比較は全行「新規」表示。合計サマリーには専用の `Alert color="blue"`「先月のデータがありません」を出し、±% を表示しない | ゼロ除算・誤解を招く「-100%」を避ける(§9.4) |
| 4 | 当月レビュー中（`isCurrentMonth === true`） | 消化推移の最終バケット(群)が `isPartial: true` になり注記が付く。サマリーの確定分数・稼働日数は「今日まで」の実績としてそのまま出す(隠さない) | CONTEXT「学習量」は確定分数の合計であり、月が終わっていなくても実績は実績 |
| 5 | 月内に1件も記録が無い（丸ごと休養月 or アカウント作成前） | サマリー全て0。チャートは空状態（`plannedCount===0` の週は非表示、全週非表示なら「この月の記録はありません」の `EmptyState`） | `theme.ts` の `EmptyState` デフォルト props を使う |
| 6 | 削除済み（ゴミ箱）の記録・日 | 集計・トレンドの両方から除外（`liveRows`/`liveDayDatesFrom` を通す） | §7.2 のコメントで明示。忘れると復元前提のゴミ箱記録が実績に残るバグになる |
| 7 | 項目が削除されている（使用中は削除不可のはずだが、カテゴリ未設定の移行前データ等） | `aggregateBreakdownRows` 内の既存フォールバック（`item?.name ?? "不明"`）をそのまま使う。新しいフォールバックを増やさない | 既存 `historyBreakdown.ts` の挙動を流用(CVX-16) |
| 8 | カテゴリを月の途中で改名した | 今月と前月でカテゴリ名が変わっていると、旧名は「先月のみ」、新名は「新規」として出る（名前ベース突き合わせの既知の限界） | §12-8 で ID ベース案を検討し、既存設計との一貫性を優先して許容 |
| 9 | 月境界をまたぐ週（第1週・最終週） | 月内の日数だけの部分週として扱い、前月/翌月の日を混ぜない。`isPartial: true` | §6.2, §12-6 |
| 10 | 複数タブ/端末で同時に閲覧 | Convex の reactive query が自動で最新化する。専用の同期機構は不要 | 既存の全 query と同じ(Convex の標準動作) |
| 11 | 所有者間のデータ越境（IDOR） | `ownerQuery` が `ctx.ownerId` を強制し、index は常に `ownerId` で絞る。他所有者の `rows`/`days` は取得され得ない | CVX-04、既存の全 query と同じ設計 |
| 12 | オフライン（PWA #58 とは独立） | Convex クライアントの標準の再接続・キャッシュ挙動に従う。本書はオフライン専用の対応を持たない（PWA 対応は #58 の範囲） | pwa-mobile.md §7「担当範囲」の切り分けに合わせる |

---

## 12. 検討した代替案（グリル: 自問自答）

### 12-1. 月間ターゲット（月ごとの分数ノルマ）を新設すべきでは？

**却下。** CONTEXT「週間ターゲット」の `_Avoid` に「週ごとのスナップショット保存」があり、`targets` テーブルは常に**現在値だけ**を持つ設計になっている。月間ターゲットを新設しても、月の途中で目標値を変えた場合に過去月へ遡って正しい評価ができない（今の値で過去を裁くことになる）。マップの「Not yet specified」にも月間ターゲットは無く、新概念の導入は本チケット（仕様確定 → 実装）のスコープを超える。月次では実績のトレンドと比較に留める。

### 12-2. 週間ターゲットの「月内で何週達成したか」を集計すべきでは？

**却下（12-1 と同根）。** `targets` にスナップショットが無いため、過去の週にその時点の目標値を適用できない。ターゲットが常設1件（カテゴリごと）である以上、「先週は600分/週だったが今週は500分/週に変えた」といった変更があると、月内の集計が現在の目標値だけで塗り替えられ、実態と異なる「達成/未達成」を表示してしまう。実装可能にするには `targets` にスナップショット機構を追加する必要があり、それ自体が別チケット相当の決定である。**openQuestions に残す**（§ ticket 側）。

### 12-3. 目標階層（チェックポイント件数・長期目標の進捗）を月次レビューに出すべきでは？

**却下。** goal-hierarchy-layout.md は「#52（週次レビュー）が『いま何件抱えているか』を見せる自然な場所になる」としているが、これは**現在値**の話であり、月次の「トレンド」には馴染まない（目標ドキュメントは現在の状態しか持たず、月初の状態を遡って再現できない）。加えて、notifications.md/pwa-mobile.md が確立した「#48〜50・#53 に依存しない」設計原則を月次レビューにも適用する。目標の現在状況は既存の `/goals` 画面の担当のままとする。

### 12-4. コンディション別内訳を月次レビューにも出すべきでは（週次にありそうだから）？

**却下。** `/history` の分析タブが月スコープを選べば同じ `byCondition` が既に見られる（`monthBreakdown.byCondition`）。月次レビューの存在理由は「先月との比較」「月内トレンド」であり、既存の内訳ビューをもう一箇所に複製するのは重複 UI。CONTEXT 履歴の `_Avoid`「模試分析のような複雑ダッシュボード」の精神にも反する。画面の役割を絞る（§4）。

### 12-5. 消化推移は日次にすべきでは（週次バケットは粗すぎる）？

**却下。** 日次にすると月内で28〜31本の棒が並び、モバイル幅で潰れる。CONTEXT 履歴には既に「直近28暦日の曜日ごとの消化」という日次相当の粒度の指標があり、月次レビューが同じ粒度で重複する必要はない。週次バケット（4〜6本）は「月の中で尻すぼみ/尻上がりのどちらだったか」を一目で見せる目的に合っている。

### 12-6. 月境界をまたぐ週は「翌月へ持ち越す/切り捨てる」のではなく「7日固定」にすべきでは？

**却下。** 7日固定で前月・翌月の日を混ぜると、同じ暦日が2つの月の消化推移に二重計上され、「月間の消化推移の合計」と「月間サマリーの確定分数」が一致しなくなる（検証不能な不整合）。月内の日だけを部分週として扱い `isPartial` で区別する方が、月というくくりに対して常に正確である。

### 12-7. 前月比ではなく前年同月比（YoY）にすべきでは？

**却下。** spec.md の Problem Statement のとおり、本番（TOEIC）まで残り約6週間の学習ログとして始まったアプリであり、前年同月のデータは存在しない/意味を持たない。前月比（MoM）を採用する。

### 12-8. カテゴリ比較の delta% やラベルはサーバで計算して返すべきでは（クライアント計算は二重実装なのでは）？

**一部譲るが、却下。** 検討した結果、サーバは `byCategory` / `previousByCategory` という生の分数集計だけを返し、「新規」「先月のみ」等の表示ラベルや delta% はクライアントの純関数（`category-comparison.ts`）に置くと決めた。理由は次の2点:

1. 表示文言（日本語ラベル、パーセント表記の丸め方）は UI の関心であり、`convex/lib` に置くべきではない（CVX-09 の「純関数と副作用を分離する」の精神は「ドメイン計算」と「表示整形」の分離にも及ぶ。study-timer.md §6 の「時計の表示整形は UI 専用なので `src/features/board/lib` に置く」も同じ判断）。
2. 既存の `chart-data.ts`（履歴機能）も donut のセル生成や週タイトルの整形をクライアント側の純関数で行っており、月次レビューだけサーバ側で計算すると設計が割れる。

一方で、**カテゴリ名ベースの突き合わせという「対応関係の決定」自体は月固有の新しいロジック**であり、これを毎回コンポーネント内に書くと画面ごとに実装がずれるリスクがあるため、`category-comparison.ts` という専用の純関数ファイルに切り出す（コンポーネントに直書きしない）。

### 12-9. 週次レビュー未確定のまま月次を仕様化するのは手戻りリスクが大きいのでは？

**認める。** これは本書全体に対する最大の懸念であり、§0 で正面から扱った。対策は「新規テーブルを増やさない」「`/review` というルートの存在にも週次タブの中身にも依存しない、独立した1本の query として設計する」の2点に集約した。これにより、#52 が確定した内容が本書 §2 の仮定と異なっていても、書き直しが必要になるのは §2 と §8（ルート・入口の置き方）に限られ、§5〜§7（スキーマ・純関数・query 本体）はそのまま使える。人間の再確認ポイントとして decisionComment に明記する。

### 12-10. レビューは独立した画面なのだから、ナビタブ（8本目）を足すのが素直では？

**却下（当初案を撤回した）。** 本書の初稿は `NAV` の「履歴」と「項目」の間に「レビュー」を挿す案だったが、これは他仕様の**確定済みの**前提と衝突する。

- CONTEXT.md「マイページ」の _Avoid_ が「8番目のナビタブ」を明示的に禁じている。pwa-mobile.md §6.1・§8.3 と notifications.md は、この制約を回避する形（manifest の `shortcuts` は既存ルートのみ、インストール案内はマイページの1セクション）で設計されている。**制約を守っている先行3仕様がある状態で、後から来た本書が単独で制約を崩すのは筋が悪い。**
- pwa-mobile.md §10.3 は `NAV` を「既存の7本のまま。順序も変えない」と書き、モバイルを `MOBILE_PRIMARY` 4本 +「その他」3本に割り、§17 でその期待値をテストにしている。マップの優先順では **PWA（#58）が本チケット（#54）より後**なので、本書が8本にすれば #58 は `/review` の置き場所を持たないまま実装に入り、黙って「その他」に落ちる（= 4タップで到達する画面）か、テスト期待値が壊れる。

検討した3案:

| 案 | 判断 |
| --- | --- |
| (a) CONTEXT.md の _Avoid_ の意図（マイページ限定の禁止か、本数上限か）を1文に確定してから8本にする | **本チケットではやらない。** CONTEXT.md の語彙定義の改訂は #50 相当の独立工程であり、月次レビューの実装仕様の中で片手間に決めるべきものではない。判断が必要になった時点で #52 が行う（§8.3 の引き渡し） |
| (b) ナビタブにせず、履歴画面のリンクから開く | **採用。** `NAV`・CONTEXT.md・pwa-mobile.md のいずれにも触らずに済み、月次レビューの本体（§5〜§7・§9）は1行も変わらない。「履歴の隣にある振り返り」という情報構造としても自然で、逆方向のリンク（§9.1）と対になる |
| (c) 履歴の `Tabs` に4本目「レビュー」を足す | 却下。別ルートへ飛ぶものをタブに混ぜると `HistorySearchSchema` の `tab`（`month`/`week`/`analysis`）の意味と `history-page.tsx` の `onChange` 分岐が壊れる（§8.3） |

**譲る点**: (b) は発見しにくい。ナビタブなら常に見えるものが、履歴を開かないと見つからない。ただし利用者は所有者2名で、月次レビューは「月に1回開く画面」であって毎日の動線ではないため、常設タブの1本を占めるほどの頻度ではない（pwa-mobile.md §10.2 が「項目・プリセットはカタログの設定、ゴミ箱は復旧であって毎日触らない」として `MOBILE_PRIMARY` から外したのと同じ基準）。実際に使って発見性が問題になれば、§8.3 の引き渡し3点セットで昇格させればよい。

---

## 13. テスト（CVX-19、convex-test）

### 13.1 純関数 unit（`convex/lib/**/*.test.ts`、Node 環境）

| ファイル | ケース |
| --- | --- |
| `convex/lib/completionRate.test.ts`（新規） | `confirmedRatio` がゼロ除算を0にする／`completedCount` が4フィールドの和になる |
| `convex/lib/presetDigest.test.ts`（既存・無改修） | リファクタ後も既存のアサーションがそのまま通ることを確認（回帰） |
| `convex/lib/monthlyReview.test.ts`（新規） | `bucketDatesByWeek`: 月初が月曜でない月・月末が日曜でない月・31日ある月/28日の2月で正しく部分週ができる。`buildMonthlyDigestTrend`: 当日を含む週から当日を除外する／`plannedCount===0` の週で `digestRate===0` になる／`isPartial` が月境界と当日を含む週の両方で立つ |
| `convex/lib/jst.test.ts`（既存ファイルに追記） | `addMonthsJst("2026-01", -1) === "2025-12"`／`addMonthsJst("2026-12", 1) === "2027-01"`／`addMonthsJst("2026-08", 0) === "2026-08"` |

### 13.2 Convex 統合（`convex/monthlyReview.test.ts`、edge-runtime、`convex-test`）

`convexTest(schema)` + `t.withIdentity({ subject })`（testing.md の規約どおり）。

| ケース | 期待 |
| --- | --- |
| 未認証で呼ぶ | throw する（`ownerQuery` の認可ガード） |
| 所有者Aのデータを所有者Bとして読む | 所有者Bの結果は0/空（IDOR にならない。CVX-04） |
| 今月・前月それぞれに確定/未着手/進行中/スキップの記録がある | `byCategory` / `previousByCategory` / `confirmedMinutes` / `previousConfirmedMinutes` が正しく分かれる |
| ゴミ箱に入れた記録・日がある | 集計・トレンドの両方から除外される（§11-6） |
| 前月にデータが無い（アカウント作成月） | `previousConfirmedMinutes === 0`、`previousByCategory === []` |
| `todayJst` が対象月の途中（当月レビュー） | `isCurrentMonth === true`。当日を含む週バケットの `plannedCount` が当日ぶんを含まない |
| `yearMonth` が壊れた文字列 | 空の `MonthlyReviewDto` が返る（throw しない。§7.2 の防御） |

### 13.3 フロント integration（Testing Library、happy-dom）

`src/features/review/components/monthly-review-tab.test.tsx`:

- `useMonthlyReview` をモックし、サマリーカードの数値・カテゴリ比較表の行・「先月のデータがありません」の `Alert`（前月ゼロ時）が正しく描画されることを `getByRole` / `getByText` で確認。
- `renderWithMantine` を使用（testing.md 規約）。`data-testid` は使わない。

`src/features/review/lib/category-comparison.test.ts` / `monthly-digest-labels.test.ts`: 純粋関数として直接テスト（Vitest、`frontend` project）。

`app-shell.tsx` は無変更なので**ナビ関連のテストは追加しない**（pwa-mobile.md §17 の app-shell テスト期待値もそのまま）。履歴からの入口（§8.3）は `history-page.tsx` に `getByRole("link", { name: "レビューを見る" })` の1アサーションを足すだけでよい（`history-page` の既存テストは無いので、実装者判断で新規 `history-page.test.tsx` を作るかリンクのテストを省くかを選ぶ。月次レビュー本体の検証には影響しない）。

---

## 14. 実装チェックリスト

新規:

- `convex/lib/completionRate.ts` / `completionRate.test.ts`
- `convex/lib/monthlyReview.ts` / `monthlyReview.test.ts`
- `convex/queries/review/monthlyReview.ts`
- `convex/services/review/monthlyReview.ts`
- `convex/monthlyReview.test.ts`（統合）
- `src/lib/schemas/calendar-date-schema.ts`
- `src/features/review/schemas/review-search-schema.ts`
- `src/features/review/lib/review-route-search.ts`
- `src/features/review/lib/monthly-digest-labels.ts` / `.test.ts`
- `src/features/review/lib/category-comparison.ts` / `.test.ts`
- `src/features/review/hooks/use-review-view.ts`
- `src/features/review/hooks/review-queries.ts`
- `src/features/review/types/monthly-review.ts`
- `src/features/review/components/review-page.tsx`
- `src/features/review/components/monthly-review-tab.tsx` / `.test.tsx`
- `src/features/review/components/monthly-review-tab-pending.tsx`
- `src/features/review/components/monthly-review-month-nav.tsx`
- `src/features/review/components/monthly-review-summary-cards.tsx`
- `src/features/review/components/monthly-digest-trend-chart.tsx`
- `src/features/review/components/monthly-category-comparison.tsx`
- `src/routes/review.tsx`

改修:

- `convex/lib/presetDigest.ts`（`digestRate`/`plannedCount` を `completionRate.ts` へ委譲）
- `convex/lib/jst.ts`（`addMonthsJst` 追加）、`convex/lib/jst.test.ts`（追記）
- `convex/lib/validators.ts`（`monthlyDigestBucketValidator` / `monthlyReviewValidator` 追加）
- `src/features/history/schemas/history-search-schema.ts`（`DateJstSchema`/`YearMonthSchema` を `~/lib/schemas/calendar-date-schema` からの import に置換）
- `src/features/history/components/history-page.tsx`（`PageTitle` の右に `/review` へのリンクを追加。§8.3）

**無変更（意図的）**:

- `src/components/app-shell.tsx` — `NAV` は7本のまま。「レビュー」タブは追加しない（§8.3, §12-10）
- `CONTEXT.md` — 「マイページ」の _Avoid_「8番目のナビタブ」に触れない（§16）
- `docs/specs/pwa-mobile.md` — §10.1〜§10.3（`NAV` 7本・`MOBILE_PRIMARY` 4本）・§17（app-shell テスト期待値）に手を入れない

`vp check` / `vp test` / `vp run fallow`（`aggregateByCategory` 等の既存 export を新たに参照するため）/ `vp build` を実装後に通す（development-workflow.md の PR pre-check）。

---

## 15. 範囲外（このドキュメントが決めないこと）

- 週次レビュー画面の中身（対象範囲、祝い演出、目標階層との統合有無）→ #52
- 目標×記録の紐付け → #53（本書はこれに依存しない設計にした）
- 通知（`weeklyTargetMiss` 等）のリンク先を `/review` に差し替える作業 → #52/#56 側の1行変更（notifications.md §9.2 と同じ形）
- 月間ターゲットのスナップショット機構 → 未決（§12-1/12-2、openQuestions）
- **レビューをナビタブ（8本目）へ昇格させるかの判断 → #52**（本書は昇格させない設計を確定した。昇格させる場合は §8.3 の引き渡し3点セット: CONTEXT.md _Avoid_ の意図確定〔#50 相当の工程〕 → pwa-mobile.md §10.1〜§10.3 の8本前提への改訂〔`/review` を `MOBILE_PRIMARY` か「その他」かの決定を含む〕 → 同 §17 のテスト期待値の書き換え）
- PWA・オフライン対応 → #58
- AI 月次/週次サマリー（振り返り文の自動生成） → マップの「Not yet specified」のまま

---

## 16. CONTEXT.md / ADR への影響

**変更不要。** 月次レビューは CONTEXT.md の既存語彙（「履歴」「消化」「学習量」「週間ターゲット」）の定義を変えず、新しい語も導入しない（「月次レビュー」自体は #47 のタイトルに既出の機能名であり、画面の実装であって新概念ではない）。ADR-0005〜0011 のいずれとも矛盾しない。新規 ADR は不要。

**「マイページ」の _Avoid_「8番目のナビタブ」も無変更**（§8.3, §12-10）。本書は `NAV` を7本のまま据え置き、`/review` の入口を履歴画面のリンクにしたので、この _Avoid_ の**意図**（マイページ限定の禁止なのか `NAV` の本数上限なのか）を確定する必要が無い。その確定作業は CONTEXT.md の語彙定義の改訂であり、#50 相当の独立工程として #52 に引き渡す。
