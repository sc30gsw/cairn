# プリセット曜日のバックフィル

- 対象: `presets.weekday` から `presets.weekdays` への移行
- 実装: `convex/migrations.ts` の `backfillPresetWeekdays`
- 変換規則: `convex/lib/catalog.ts` の `migratePresetWeekdayFields`

## 適用手順

1. `convex/schema.ts` と新しい API をデプロイする。`weekday` は旧クライアント互換のため、移行完了までは optional のまま残す。
2. デプロイ先でバックフィルを1回実行する。

```sh
vp exec convex run migrations:backfillPresetWeekdays
```

3. マイグレーションコンポーネントの状態が完了になったことを確認する。

```sh
vp exec convex run --component migrations lib:getStatus --watch
```

4. プリセット画面で曜日未設定のプリセットが残っていないことを確認し、残ったものは所有者が曜日を選んで保存する。

旧形式の有効な曜日は1要素の `weekdays` に移される。範囲外の旧値はデータを捨てずに `weekdays: []` として隔離し、画面で修復できるようにする。すでに `weekdays` がある行は再実行しても変更せず、旧 `weekday` だけが残る混在行では旧フィールドを除去する。移行期間中の list DTO は旧クライアント向けに `weekday` も併記するが、新しい書き込みと画面の正本は `weekdays` である。

本番で実行する前に対象デプロイのバックアップまたはスナップショットを取得する。移行後は旧 `weekday` の値を自動復元できないため、ロールバックが必要な場合はコードだけを戻さず、データの復旧方針も決めてから行う。

## 検証

変換規則は `convex/lib/catalog.test.ts` で、旧形式・範囲外の値・混在行・再実行を検証する。通常の書き込み API は `weekday` と `weekdays` のどちらか一方を受け付け、両方の指定と曜日なしは拒否する。
