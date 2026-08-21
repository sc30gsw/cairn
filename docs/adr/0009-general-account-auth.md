# 一般アカウント認証とユーザーごとのデータ分離

Notion OAuth に加え、email / password / username による一般 signup / signin を許可する。記録の正本は Convex のまま。各ユーザーのデータは JWT の `subject`（`ownerId`）で分離する。

単一所有者の email allowlist（`ALLOWED_EMAIL`）と初回所有者だけ signup 可の制限は廃止する。新規ユーザーは空のカタログから始め、項目・プリセット・目標は各自が CRUD する。Notion 由来の初期シードは `catalog.ensure` 経由でのみ投入可能とし、`days.open` では自動 seed しない。

Notion OAuth は併用可能（設定時のみ UI に表示）。メール確認は v1 では行わない。

## フロントエンド構成（SSOT）

| 関心 | 正本 |
| --- | --- |
| フォーム入力 | `src/features/auth/schemas/account-auth-schema.ts`（Valibot → Formisch） |
| セッション型 | `authClient.$Infer.Session.user` → `Pick` で `AppShellUser` |
| Notion ボタン表示 | `convex/queries/auth/publicConfig`（`notionOAuthConfigured()` と同一判定） |
| 認証操作 | `src/features/auth/hooks/use-auth-actions.ts` |

`LoginScreen` / `AuthAccountMenu` は hooks 経由で authClient を呼び、`OwnerGate` は props でコールバックを渡さない。共有 `AppShell` は `accountMenu` スロットのみ受け取り、feature から auth UI を compose する（bulletproof-react の単方向依存）。

