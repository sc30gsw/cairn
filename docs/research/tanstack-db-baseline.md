# TanStack DB / Convex 導入前ベースライン

実施日: 2026-09-10
対象: Cairn の読み取り全般、通常 mutation、カンバン、履歴、予定表示
目的: TanStack DB 導入前に、待ち時間とちらつきの再現可能な信号、既存テスト、Convex runtime の事実を整理する。

## 結論

現在の runtime insights には、読み取り量の上限超過や接近を示すイベントがない。したがって、TanStack DB が読み取りのネットワーク待ちを改善するという根拠は得られていない。読み取り側では直列化された query 開始が、mutation 側では楽観表示の不統一と複数 mutation の分割が、優先して検証すべき候補である。

認証済み画面を遅延ネットワーク下で操作する E2E 環境がこの実行環境にはなく、ちらつきの動的再現、Convex query の画面単位 latency、DOM の安定時間は未計測である。以下の mutation 所見は、コード経路から確認できる事実と、症状に結び付く仮説を分けて記録する。

## 実行した検証

| コマンド | 結果 |
| --- | --- |
| `vp test` | 253 files / 1,531 tests passed。Vitest duration 50.29s（並列実行時の別測定は 41.29s）。 |
| `vp test src/features/board/components/board-kanban.test.tsx` | 14 tests passed。Vitest duration 5.29s。 |
| `vp test src/features/board/components/board-kanban-card-menu.test.tsx` | 6 tests passed。Vitest duration 3.91s。 |
| `vp test src/features/today/components/row-editor.test.tsx` | 4 tests passed。Vitest duration 4.05s。 |
| `vp test src/features/history/components/history-page.test.tsx src/features/history/components/history-calendar.test.tsx` | 18 tests passed。Vitest duration 4.92s。 |
| `vp check` | 1,092 filesで警告・lintエラー・型エラーなし。20.4s。 |
| `vp build` | 2,211 modules transformed、1.08sで完了。大規模 barrel module と rrule の undefined import 警告が出たが、今回の症状との因果は未確認。 |

認証前のローカル SSR 応答は、sandbox の listen 制限を避けて開発サーバーを起動し、`GET /` を測定した。port 3001 の初回は TTFB 2.526s / total 2.526s、同じ URL の再訪は TTFB 0.449s / total 0.449s だった。これは Vite の変換・SSR warm-up を含む認証前の応答であり、日データや Convex 購読の latency の基準には使わない。

## Convex deployment の runtime evidence

読み取り対象は development deployment `dapper-crab-991`。`status → insights → tables → functionSpec` を read-only で実行した。直近72時間の insights は 6 件の warning で、全て `occRetried` だった。`documentsReadLimit`、`bytesReadLimit`、`documentsReadThreshold`、`bytesReadThreshold` は 0 件。

| Function | Table | OCC calls | 主な書き込み元 |
| --- | --- | ---: | --- |
| `mutations/calendarSync/applyPull:applyPull` | `calendarConnections` | 8 | `markStatus`、`setVisibleCalendars` |
| `mutations/calendarSync/applyPull:applyPull` | `externalCalendarEvents` | 3 | `applyPull` |
| `mutations/calendarSync/acquireOperation:acquireOperation` | `calendarSyncOperations` | 22 | `acquireOperation` |
| `adapter:updateMany` | `rateLimit` | 66 | Better Auth adapter |
| `mutations/calendarSync/finishPullPage:finishPullPage` | `externalCalendarEvents` | 1 | `applyPull` |
| `adapter:updateOne` | `session` | 1 | Better Auth adapter |

コード上の対応は、calendar sync が owner 条件・複合 index で外部予定を読み、イベントごとに `externalCalendarEvents` を削除・更新すること（`convex/services/calendarSync/applyPull.ts:14`）、同期ロックの同じ `calendarSyncOperations` 文書を取得・解放すること、pull 完了時にページ単位で外部予定を整理すること（`convex/services/calendarSync/finishCalendarPull.ts:81`）である。OCC retry の事実は確認できるが、通常の Cairn 画面読み取りやカンバンのちらつきとの因果は確認できない。Google 側の成功確認が必要な操作を例外にする方針とは整合する。

## 読み取りの所見

- `src/hooks/use-open-and-load-day.ts:11` は今日の場合 `open.mutateAsync()` を await してから `days.get` を呼ぶ。そのため初回の今日画面は `open → get` の直列経路になる。
- `src/features/board/components/board-schedule-tab.tsx:7` は `useOpenAndLoadDay` の Suspense が終わるまで `blocks` と `externals` の query hook を開始できない。予定表示は `day → blocks/externals` の waterfall 候補である。
- `src/features/history/components/history-analysis-tab.tsx:29` は 6 query を並列開始する設計だが、分析タブの初期表示は 6 購読・6 レスポンスを待つ。
- `src/router.tsx:26` の `defaultPreload: "intent"` と SSR query integration は存在するが、board / history / day route には route loader のデータ preload がない。route preload と query preload は分離している。

## mutation・ちらつきの所見

### 事実

- `src/features/board/components/board-kanban.tsx:215` の列間 D&D は、状態変更を await してから pending order を適用する。`pendingOrderRef` は一件分だけで、`shiftRow` は fire-and-forget である。
- `src/features/today/hooks/use-day-board-actions.ts:44` は通常の confirm / skip / unskip mutation を使う。ボード側だけが optimistic hook に差し替わっている（`src/features/board/hooks/board-mutations.ts:25`）。
- `src/lib/optimistic-day-rows.ts:26` の optimistic patch は `day.rows` だけを変更し、`volumeMinutes`、`shareMarkdown`、`canCopyYesterday`、review 情報などの派生値を同時に変更しない。一方、`convex/services/days/getDayPage.ts:30` はサーバー側でこれらを再計算する。
- `src/features/today/components/row-editor.tsx:179` の focus-within blur と各入力の blur が同じ保存関数を呼ぶ。`saveIfConfirmedDirty`（同:160）には in-flight ガードがない。
- 対象テストは mutation callback や順序計算を検証するが、実 Convex optimistic store → subscription 確定 → rollback の時系列、遅延中の二重操作、DOM の安定時間は検証しない。

### 症状に結び付く仮説（未再現）

1. 列間 D&D で、古い順序の列に一度入り、状態 mutation と順序 mutation の完了後に指定位置へ移る二段階表示が「戻る／跳ねる」に見える。
2. 日画面の状態変更が subscription 到着まで旧表示のままになり、操作直後に戻ったように見える。
3. 行の状態だけ先に変わり、学習量・review・共有文が後から変わるため、同一画面内で一時的に不一致になる。
4. blur イベントの重複で同じ confirm mutation が複数回送られ、遅延時の確定順序で表示が揺れる。
5. 複数 D&D の同時操作で `pendingOrderRef` が上書きされ、古い全 row ID を送って `applyOrder` が拒否する（`convex/services/rows/applyOrder.ts:18`）。

## 動的再現の不足と次の計測

この環境では認証済みブラウザ、遅延注入、ユーザーの画面データを安全に操作する fixture がない。Convex 単一 query の identity 付き latency 取得も 30 秒で完了しなかった。次の計測ではテスト用アカウントと固定データを用意し、次を各3回測る。

1. `/days/today`、`/board?tab=schedule`、`/history?tab=analysis` の navigation start、pending 終了、主要コンテンツ表示、query 完了。
2. schedule の day / blocks / externals の query 開始時刻を分け、直列化を確認。
3. カンバンの D&D と日画面の確定・編集・スキップで、クリックまたは blur から DOM 安定まで、MutationObserver による再描画回数、optimistic state の表示期間を測る。
4. 通常通信、遅延、保存失敗、連続操作、別画面の同一データを同じ fixture で比較する。

## 設計判断への入力

- TanStack DB の pilot は、まず eager collection と既存 Convex Query cache の接続を検証する。on-demand は、Convex の引数・index・削除通知・query key の設計を別途確定してから進める。
- ちらつき対策の受け入れ条件は、状態と順序の一貫した楽観表示、保存確定までの表示維持、失敗時の整合した rollback、派生値の更新範囲、フォーム入力との分離である。
- Google 連携の OCC warning はこの pilot の read/mutation baseline から分離する。Cairn 内の予定編集は即時反映し、Google 側の成功確認が必要な操作は別状態で扱う。

本資料は性能改善を実装したものではなく、#95 の wayfinder task を解決するためのベースラインである。

## 実装後のデータ層契約

日・ボード・カタログ・目標・方法・通知・ゴミ箱・タイマーの読み取りは `src/lib/tanstack-db/collections.ts` の typed query collection を利用でき、`DbProvider` は router と同じ runtime scope の `DbClient` を共有する。Convex の subscription が canonical snapshot を更新し、`useLiveQuery` はその snapshot を画面の派生 query として購読する。履歴・認証・検索などの補助読み取りは既存の Convex Query を継続し、段階的に移行できる境界を保つ。

通常の行・カンバン操作は Convex mutation の `withOptimisticUpdate` を使う。楽観値は rows・派生学習量・共有文・running timer を同時に更新し、Convex の mutation failure で自動 rollback する。D&D は状態変更と順序変更を `moveAndApplyOrder` の一つの Convex transaction にまとめる。

同じ rollback 境界をカタログ、プリセット、目標、週間ターゲット、方法カタログ、日メモ・コンディション、復習フラグにも適用する。サーバーで新しい ID が確定する作成操作と、Google 側の成功確認が必要な外部予定操作は、確定応答と subscription の更新を待つ。

Google 側の成功確認が必要な予定移動・削除は client-side optimistic patch を行わず、Convex の outbox と接続の同期状態・エラー表示で確認する。成功通知は Google への送信受付を表し、Google 側の同期完了とは区別する。

`createDayRowsCollection` と予定 collection は `syncMode: "on-demand"` を受け取れる。Convex 側で範囲・index・削除通知を備えた query が用意できた画面では、同じ typed factory に `syncMode: "on-demand"` を渡し、`useLiveQuery` の predicate で必要な subset だけを同期する。現在の画面は日・週の範囲が UI の表示単位と一致するため eager を使う。

日ページの query はブラウザ側で `prefetchQuery` を先に開始し、SSR では `open` の完了を待ってから Suspense query を描画する。これにより `open → get` の初期 waterfall と空状態の hydration を避け、Convex subscription が作成後の canonical snapshot を反映する。

オフライン時にブラウザへ書き込みを永続化する outbox は導入していない。今回の persistence は Convex server commit、subscription による再検証、失敗時の Convex optimistic rollback を指す。
