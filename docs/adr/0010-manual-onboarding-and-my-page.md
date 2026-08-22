# ADR 0010: 手動オンボーディングとマイページ

## Status

Accepted

## Context

新規ユーザーは空のカタログから始める。自動 seed は行わず、項目・プリセット・本番目標・週間ターゲットを自分で登録する必要がある。以前の `EmptyCatalogBanner` は単一メッセージだけで、優先順位や全体像が伝わりにくかった。

また、アカウント設定（表示名・ユーザー名・パスワード・アイコン・パスキー）とセットアップ進捗を一か所で見る画面がなかった。

## Decision

1. **ホーム (`/`)** — `SetupStepper`（Mantine Stepper + Tooltip）で未完了ステップを1つずつ案内する。優先順は 項目 → プリセット → 本番目標 → 週間ターゲット。「あとで設定」は `localStorage`（`cairn:onboarding:dismissed:<stepId>`）に記録する。
2. **マイページ (`/my-page`)** — アカウントメニューから開く。プロフィール（256px アバター + crop/upload）、アカウント編集（Formisch + Valibot）、パスキー管理、今日の状況、セットアップ checklist、カタログ例（閲覧専用）を置く。
3. **Convex SSoT** — セットアップ完了判定は `convex/lib/setupStatus.ts` の純関数 + `queries.setup.status`。実カタログ seed は `convex/lib/catalog.ts`（`SEED_ITEMS` / `ensureCatalog`）が TOEIC 向け SSoT。マイページのカタログ例プレビューは `ONBOARDING_CATALOG_SAMPLES`（`src/features/onboarding/constants/catalog-samples.ts`）の閲覧専用サンプルで、seed データとは独立した参考表示。表示カテゴリ（`CatalogSampleDisplayCategory`）はアプリのカテゴリ列挙（TOEIC対策 / 多聴 / 多読 / 英会話 / その他）にマップせず、科目非依存の例示ラベルとして完全にスタンドアロン。フロントは自動 seed しない。
4. **パスキー** — Better Auth `passkey` プラグイン。新規登録後にモーダル（スキップ可）。スキップ時は初回マイページ訪問で1回だけ再プロンプト。
5. **better-result** — クライアントのプロフィール/アップロード操作は `Result` でエラーを型付けする。

## Consequences

- 空カタログでもホームとマイページの両方から次の一手が分かる。
- メール変更は v1 対象外（Better Auth の change-email フローは別 ADR で検討）。
- `EmptyCatalogBanner` は削除し、Stepper に置き換える。
