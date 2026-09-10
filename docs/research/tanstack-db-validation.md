# TanStack DB 移行差分の検証

2026-09-10。対象は PR #98 のブランチ `codex/tanstack-db-convex`。

## 合意した境界

[Issue #97 の確定コメント](https://github.com/sc30gsw/cairn/issues/97#issuecomment-5613413825) に従い、読み取りは TanStack DB の live collection、通常 mutation は Convex の optimistic localStore と自動 rollback を使う。保存・認可・業務トランザクションは Convex が担う。Google 外部操作の完了は外部の成功を確認してから表示する。

Convex の mutation は SDK が求める Promise の成功・拒否を維持する。アプリケーションで扱う失敗は既存の `runMutation` が `Result.tryPromise` で `MutationFailedError` に変換する。Result オブジェクトを Convex RPC に渡したり、失敗を成功値に置き換えたりしない。

## 今回修正した問題

- PR の react-doctor が指摘した `Date.now()` の3箇所は、楽観更新 callback をモジュールスコープへ移した。callback の型は Convex `OptimisticUpdate` と生成 API の `FunctionArgs` から導出する。時刻の取得は mutation 実行時に行う。
- mutation ラッパーの同期 callback 制約を維持し、SDK の型と比較する型テストを追加した。
- 一覧 collection は応答内の位置を保存し、LiveQuery がその位置で並べる。順序の変更・元の値への復元・全削除を、実際の QueryClient、DbClient、DbProvider、LiveQuery で検証した。要素の型は Convex の戻り値から導出する。
- 行追加時に未着手の予定時間を確定済み学習量へ加算しない。プリセット切替では進行中・確定・スキップ行を残し、その後ろへ新しい未着手行を追加する。保持条件と学習量・共有文の計算は既存の正本の関数を再利用する。
- 目標の指標を変更する際、旧指標の `current` を新指標の実績として表示しない。指標が同じ場合だけ既存の実績を使って楽観更新する。
- Issue #93 本文のオンライン専用方針に合わせ、localStorage の独自送信キューと再接続時の独自リプレイを削除した。SDK の通信・再接続処理は維持する。

## 検証結果

- `vp check` 成功。
- `vp test` は259ファイル、1,549テスト成功。
- `vp build` 成功。依存ライブラリの barrel import と rrule の default export に関する警告あり。
- `vp run type-ssot-check` 成功。
- `vp run fallow` 指摘なし。
- `vp exec react-doctor . --verbose --yes --scope changed` 指摘なし。スコア API に接続できず、点数は取得できていない。

## 残る検証・修正

仮IDを生成する `src/lib/optimistic-id.ts` は、仮IDを保存済みの Convex ID と同じ型として扱う。プリセットや方法レーンなどで、作成完了前にそのIDを使う別の mutation を実行できる。pending entity を保存済み entity と区別し、実IDが確定するまで依存操作を待機・無効化する設計とテストが必要。

今回の collection テストは Query cache から LiveQuery への伝播を検証する。実際の認証済みブラウザと WebSocket 通信での、連続操作・サーバー失敗・rollback・認証切替を通した検証は未完了。初回表示・再訪・ちらつきの実測値も取得していない。性能改善を実証済みとは扱わない。

on-demand sync は eager と同じ接続を使うだけでは成立しない。subset を含む query key と Convex adapter の互換性は [Issue #94](https://github.com/sc30gsw/cairn/issues/94#issuecomment-5610520487) の未解決条件として残る。
