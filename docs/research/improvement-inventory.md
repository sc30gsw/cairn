# 既存機能の改善点の棚卸し

- 作成日: 2026-09-02
- 対象: [Issue #80](https://github.com/sc30gsw/cairn/issues/80)「既存機能の改善点の棚卸し」（親地図 [#66](https://github.com/sc30gsw/cairn/issues/66)）
- 目的: `vp check` / `vp run type-ssot-check` / `vp test` / `vp run fallow` / `vp run doctor` と静的走査の結果を分類し、地図の「Not yet specified」にある「既存機能の改善点の具体化」を、実装セッションで直す小改善と、決定が要る論点とに振り分ける。
- 前提となる既存の設計判断: `.claude/rules/**`（コーディング規約・Convex 規約 CVX-01〜20・Shimmer 規則）、`docs/specs/study-timer.md` §17-11、`docs/specs/monthly-review.md` §13-9 / §13-13、`docs/specs/pwa-mobile.md` §22.2。
- 注記: ここに書くのは事実（ツールの出力とコードの走査）と、それに対する分類である。設計上の判断が要るものは「決定が要る」と明記し、地図のチケットへ送る。実機（iOS / Android）でしか確認できない項目は「実機確認」として残す。

---

## 1. 要約

| # | 項目 | 分類 | 規模 | 触るファイル | 関連する規約 |
| --- | --- | --- | --- | --- | --- |
| 1 | CI の4本（check / type-ssot-check / test / build 相当）はベースラインで全て緑。テスト 193 ファイル・1123 件通過 | 事実 | — | — | `common/development-workflow.md` |
| 2 | react-doctor は所見ゼロ（Score API は 403 で未取得） | 事実 | — | — | `react-conventions.md` |
| 3 | fallow「循環依存 20 件」は convex-test のモジュール自動読込による偽陽性と推定。実害なし | 偽陽性（推定） | 小 | `convex/*.test.ts` の `convexTest(schema)` 呼び出し、または `.fallowrc.json` | CVX-19 |
| 4 | fallow「`@tanstack/react-router-devtools` が本番で使用」は `import.meta.env.DEV` ゲートの動的 import のため偽陽性 | 偽陽性 | — | `src/routes/__root.tsx` | — |
| 5 | fallow「`tailwindcss` が本番で使用」はビルド時プラグイン経由の参照で devDependency が正しい。偽陽性 | 偽陽性 | — | `vite.config.ts` | — |
| 6 | fallow「`nitro` はテスト専用」は誤りで `vite.config.ts` のビルドプラグイン。ただし dependencies に置く必要があるかは要確認 | 要確認 | 小 | `package.json` | — |
| 7 | `Suspense fallback={null}` が3箇所。Shimmer 規則「すべてのローディング状態に Shimmer」に照らすと差し替え候補 | 小改善 | 小 | `src/routes/__root.tsx`、`src/routes/index.tsx`、`src/routes/my-page.index.tsx` | `web/shimmer-from-structure.md` |
| 8 | `ActionIcon` は全件 `aria-label` あり、`img` の `alt` 抜けなし、非インタラクティブ要素への `onClick` なし | 事実 | — | — | `/accessibility` |
| 9 | 禁止パターン（`console.*`、`interface`、`src` 内の相対 import）は生成物 `routeTree.gen.ts` を除きゼロ | 事実 | — | — | `common/coding-style.md` |
| 10 | `rows.pause` の改名（計測なしの「進行中 → 未着手」を pause と呼ぶ不一致） | 小改善（決定済み） | 中 | `convex/mutations/rows/pause.ts`、`convex/services/rows/*`、ボードの楽観更新フック、既存テスト | `docs/specs/study-timer.md` §17-11 |
| 11 | `buildWeeklyDigest` / `elapsedDaysInWeek` の中立名へのリネーム | 小改善（任意） | 小 | `convex/lib/weeklyReview.ts` と月次・週次の services | `docs/specs/monthly-review.md` §13-13 |
| 12 | 日付系引数の検証規則が2本ある（日・週は throw、月は空 DTO） | **決定が要る** | 中 | `convex/lib/*` の `requireDateJst` / `requireWeekStartJst`、`convex/services/history/computeMonthBreakdown.ts`、月次レビューの services | `docs/specs/monthly-review.md` §13-9、CVX-16 |
| 13 | 400 行超のファイルが5本（最大 647 行）。800 行の上限には未達 | 監視 | — | `convex/lib/validators.ts`（647）、`goal-form-fields.tsx`（559）、`method-catalog-board.tsx`（547）、`preset-list.tsx`（469）、`item-list.tsx`（439） | `common/coding-style.md` §File size |
| 14 | PWA の実機確認6件（起動画面の色、OAuth の戻り、module SW の登録、出力ディレクトリ、ソフトキーボードと下小口バー、`useNetwork` の存在） | 実機確認 | — | `docs/specs/pwa-mobile.md` §22.2 | — |

**振り分け**: 7・10・11 は決定不要なので実装セッションで直す（地図の Notes に記す）。12 は決定が要るので地図の新チケットにする。3・6 は実装セッションで事実確認して直す（決定不要）。14 は所有者の実機でしか確認できないため、地図の Not yet specified に「実機確認待ち」として残す。

---

## 2. 監査の実行結果

実行環境: Node 24.20.0、`vp install` 済み（Vite+ 0.2.1、pnpm 11.8.0）。ブランチ `claude/wayfinder-feature-suggestions-c7vf1b`、ベース `a530cd5`。

| コマンド | 結果 |
| --- | --- |
| `vp check` | pass。876 ファイルの整形と 847 ファイルの lint / 型検査に警告・エラーなし |
| `vp run type-ssot-check` | OK |
| `vp test` | 193 ファイル・1123 テスト通過（68 秒） |
| `vp run fallow` | 終了コード 1。テスト専用依存 1、本番で使う dev 依存 2、循環依存 20 |
| `vp run doctor` | 851 ファイル走査、所見なし。Score API は 403 |

`vp build` はこの棚卸しでは実行していない（CI の4本目。実装セッションの各コミット前に回す）。

---

## 3. fallow 所見の分類

### 3.1 循環依存 20 件（偽陽性と推定）

20 件すべてが `convex/authPublicConfig.test.ts` を経由し、相手はいずれも `convex/*.test.ts`。しかし両者の import は `convex-test`、`vite-plus/test`、`./_generated/api`、`./schema`、`./auth` だけで、テストファイル同士を import してはいない。`convex/_generated/api.d.ts` にもテストファイルへの参照は無い（`grep` で 0 件）。

推定される原因は、テストが `convexTest(schema)` をモジュール一覧なしで呼んでいる点にある。convex-test はモジュール一覧が渡されないとき `import.meta.glob` で `convex/` 配下の `.ts` を全部（テストファイルを含めて）動的に読み込むため、fallow の「1 dynamically loaded」エントリがテスト同士を結び、A → glob → B → glob → A の環に見える。

対処の候補（決定不要・小）:

- `convex/test.modules.ts` のような1ファイルで `import.meta.glob("./**/!(*.test).ts")` を定義し、各テストの `convexTest(schema, modules)` に渡す。テストが読むモジュール集合が明示され、fallow の環も消える。
- それでも残るなら `.fallowrc.json` で該当パターンを抑制する（最後の手段）。

### 3.2 依存の分類

| パッケージ | fallow の指摘 | 実態 | 判断 |
| --- | --- | --- | --- |
| `nitro` | テスト専用の本番依存 | `vite.config.ts` が `nitro/vite` を import し、Vitest 実行時だけ外している。テスト専用ではなくビルド専用 | dependencies のままで良いか devDependencies へ移すかは、本番の起動形（`.output` を node で動かすとき nitro を要求するか）を確認して決める。小 |
| `@tanstack/react-router-devtools` | 本番で使う dev 依存 | `src/router-devtools.tsx` を `import.meta.env.DEV` の中で動的 import。本番バンドルには入らない | 偽陽性。変更なし |
| `tailwindcss` | 本番で使う dev 依存 | `@tailwindcss/vite` プラグイン経由の参照。実行時には要らない | 偽陽性。変更なし |

---

## 4. a11y とローディングの走査

走査方法は静的（`src/**/*.tsx` の正規表現走査）。実機のスクリーンリーダー確認は含まない。

- `ActionIcon` は `aria-label` か `title` を持たないものが 0 件。
- `<img>` / `<Image>` で `alt` が無いものは 0 件。
- `div` / `span` / `Box` / `Paper` / `Group` / `Stack` への `onClick` は 0 件（クリック可能なものは `Button` / `ActionIcon` / `UnstyledButton` / `Link`）。
- `Suspense fallback={null}` が3箇所: `src/routes/__root.tsx`（Router Devtools の遅延読込。開発時のみなので対象外）、`src/routes/index.tsx`（`HomeSetupStepper`）、`src/routes/my-page.index.tsx`。後2者は Shimmer 規則に照らすと、構造を写した小さな `Fallback` コンポーネントに置き換える候補。ただし Stepper は「表示しない」状態が多数派なので、`null` のままの方がレイアウトの跳ねが小さい可能性がある。実装セッションで実物を見て判断する（決定不要の範囲）。

---

## 5. 既知の負債（spec が別チケットに送ったもの）

| 項目 | 出所 | 内容 | 分類 |
| --- | --- | --- | --- |
| `rows.pause` の改名 | `docs/specs/study-timer.md` §17-11 / §19 | 「進行中 → 未着手」を pause と呼ぶ関数名が、計測の一時停止と読み違えられる。改名は `KanbanStatusMove` の union、楽観更新フック、テストに広がるため別チケット扱いとされた | 決定済み・実装のみ。中 |
| `buildWeeklyDigest` / `elapsedDaysInWeek` の中立名 | `docs/specs/monthly-review.md` §13-13 | 両関数は週固有ではないが `convex/lib/weeklyReview.ts` に「weekly」の名で置かれ、月次から import している | 任意・非ブロッキング。小 |
| 日付系引数の検証規則の統一 | `docs/specs/monthly-review.md` §13-9 | 日・週の引数は `requireDateJst` / `requireWeekStartJst` が throw、月の `yearMonth` は `computeMonthBreakdown` が空 DTO を返す。2規則が併存 | **決定が要る**（throw に寄せるか、空 DTO に寄せるか）。中 |

---

## 6. 実機確認が要るもの

`docs/specs/pwa-mobile.md` §22.2 の6件はこの環境（ヘッドレス、iOS 実機なし）では確認できない。

1. iOS のホーム画面アプリで `apple-touch-startup-image` が無いときの起動画面の色
2. ホーム画面アプリで Notion OAuth が同一 web app 内に戻るか
3. `type: "module"` の SW が所有者の iOS で登録できるか
4. `.output/public` が実際の出力ディレクトリか、`/sw.js` のキャッシュヘッダ
5. ソフトキーボード表示時に下小口バーが入力欄に被らないか（被るなら `@media (max-height: 26em) { display: none }`）
6. `@mantine/hooks` の `useNetwork` / `useMediaQuery` の存在（`node_modules` が入った今、これだけは確認できる。実装セッションで型を見て潰す）

---

## 7. ファイル規模

`src` と `convex`（生成物・テストを除く）で 400 行を超えるファイルは5本。800 行の上限には達していない。

| ファイル | 行数 | 所感 |
| --- | --- | --- |
| `convex/lib/validators.ts` | 647 | validator の SSoT で、機能が増えるたびに伸びる。Web Push・復習・カレンダー購読で validator が増えるので、ドメインごとの分割（`convex/lib/validators/<domain>.ts` を `validators.ts` から再 export）を実装セッションの初手で検討する |
| `src/features/goals/components/goal-form-fields.tsx` | 559 | 本番の結果（#72）で試験の枝にフィールドが増える。分割の契機になる |
| `src/features/methods/components/method-catalog-board.tsx` | 547 | 直近のマージ。触る予定なし |
| `src/features/catalog/components/preset-list.tsx` | 469 | 祝日設定（#78）で上部に設定が乗る。分割の契機になる |
| `src/features/catalog/components/item-list.tsx` | 439 | 触る予定なし |

---

## 8. 地図への反映

- **Notes に追記（実装セッションで直す小改善）**: `fallback={null}` の Shimmer 化（Stepper は実物で判断）、`rows.pause` の改名、`buildWeeklyDigest` の中立名、convex-test のモジュール一覧の明示、`nitro` の依存区分の確認、`validators.ts` のドメイン分割。
- **新チケット（決定が要る）**: 日付系引数の検証規則の統一。
- **Not yet specified に残す**: PWA の実機確認6件（所有者の端末が要る）。

---

## 9. 実施結果（2026-09-02、地図 #66 の実装セッション）

| # | 項目 | 結果 |
| --- | --- | --- |
| 7 | `Suspense fallback={null}` の Shimmer 化 | **据え置き（理由をコードに残した）**。`HomeSetupStepper` と `MyPageOnboardingExtras` はセットアップ済みの所有者には何も出ない条件付き UI なので、骨組みを見せる Shimmer はかえって「何かが来る」と誤認させる。`__root.tsx` の devtools は開発時のみ。3箇所とも `//?` コメントで判断を明示 |
| 10 | `rows.pause` の改名 | **実施**。`rows.unstart`（`convex/mutations/rows/unstart.ts` / `services/rows/unstart.ts`）、`KanbanStatusMove` は `"unstart"`、フックは `useOptimisticUnstartRow` / `useBoardUnstartRow` / `onUnstart`。`docs/specs/study-timer.md` に改訂節 |
| 11 | `buildWeeklyDigest` / `elapsedDaysInWeek` の中立名 | **実施**。`buildDigest` / `elapsedDaysInRange`（ファイルは `convex/lib/weeklyReview.ts` のまま）。`docs/specs/monthly-review.md` 改訂節 |
| 12 | 日付系引数の検証規則 | **throw に統一**（#81）。`requireYearMonth` を `convex/lib/dateArgs.ts` に追加し、`computeMonthBreakdown` / `monthlyReview` の空 DTO を撤去。規則は `dateArgs.ts` のコメントと `.claude/rules/convex-rules.md` CVX-03 の補足に記載 |
| 13 | `convex/lib/validators.ts` のドメイン分割 | **実施**。777 行（Web Push・復習・カレンダー購読の追加後）を `convex/lib/validators/{core,history,goals,methods,trash,boardSchedule,review,notifications,calendarFeed}.ts` に分け、`validators.ts` は再輸出だけ。import 側（`~domain/validators` / `../lib/validators`）は無変更 |
| 3 | convex-test のモジュール一覧を1箇所に | **見送り**。`import.meta.glob` は Vite 固有で、`convex/` 配下に置くと Convex のバンドル対象になって deploy が壊れる。`src/` 側に置くと convex のテストから `src` を参照する依存の向きになる。fallow の循環依存は偽陽性として受容のまま |
| 6 | `nitro` の依存区分 | **据え置き**。`nitro/vite` はビルド時プラグインだが、`.output` のサーバー起動が nitro のランタイムを要求するかはこの環境（本番の起動形が不明）では確認できない。`dependencies` のままにする方が安全側 |
