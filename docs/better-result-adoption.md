# better-result 採用状況

このドキュメントは cairn における [better-result](https://better-result.dev/) の採用方針と、PR #36 時点での実装境界を記録する。

## 方針

- **期待される失敗**（検証、認証、外部 API、パース）は `Result` + `TaggedError` で表現する。
- **シリアライズ境界**（React コンポーネント、Convex ハンドラの戻り値）ではプレーンオブジェクトに変換する。
- **プログラマエラー**（不変条件違反、到達不能分岐）は throw のままにする。

正本: [`.claude/rules/typescript/better-result.md`](../.claude/rules/typescript/better-result.md)

## エラー型（`src/lib/errors.ts`）

| 型 | 用途 |
| --- | --- |
| `MutationFailedError` | Convex mutation 失敗（`runMutation`） |
| `ValidationFailedError` | Valibot パース失敗（ID 変換など） |
| `AuthActionError` | Better Auth クライアント操作失敗 |

## 採用済み

### Convex コア

- `convex/lib/errors.ts` — `TaggedError` ベースのドメインエラー
- `convex/lib/ownerFunctions.ts` — 認可ラッパ
- `src/lib/run-mutation.ts` — mutation 結果を `Result` でラップ

### フロントエンド ID パース（`src/types/item.ts`）

```typescript
parseItemId(id: string): Result<ItemId, ValidationFailedError>
unwrapItemId(result): ItemId  // 検証済み境界でのみ使用
```

Select / DnD など UI 由来で既に有効な ID がある箇所は `unwrap*` を使う。フォーム submit 前のユーザー入力は `Result` をそのまま扱う。

### 認証アクション（`src/features/auth/lib/auth-actions.ts`）

- `Result.tryPromise` + `AuthActionError` で Better Auth 呼び出しをラップ
- コンポーネント境界では `{ errorMessage: string | null }` に変換（`AuthActionResult`）
- `submitAuthAction`（`submit-auth-action.ts`）がフォーム共通のエラー表示を担当

`use-auth-actions.ts` は後方互換の re-export のみ。新規コードは `~/features/auth/lib/auth-actions` を直接 import する。

## 未採用 / 意図的に Result にしない箇所

- Formisch フィールド検証 — Valibot スキーマ + Formisch の `field.errors` が SSoT
- Convex query 結果 — TanStack Query + Suspense が読み込み・エラー境界を担当
- `location.reload()` などブラウザ制御 — 成功時の副作用として直接呼ぶ

## 追加時チェックリスト

1. 期待される失敗か？ → `Result` + `TaggedError`
2. 境界を越えるか？ → プレーン型に変換してから return
3. 呼び出し元は `.match` / `Result.isError` で分岐するか？
4. テストで成功・失敗両方をカバーしたか？
