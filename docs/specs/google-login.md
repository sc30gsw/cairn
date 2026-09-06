# Google ログイン

Better Auth の Google OAuth を使い、メール・ユーザー名・パスキーと同じアカウントにログインします。Google カレンダーの権限は、ボードの同期設定で連携するときに追加で求めます。

## 設定

Google Cloud Console で OAuth クライアントを作成し、アプリケーションの種類を「ウェブアプリケーション」にします。

| 項目 | ローカル開発 | 公開環境 |
| --- | --- | --- |
| 承認済み JavaScript 生成元 | `http://localhost:3000` | Cairn の HTTPS オリジン |
| 承認済みリダイレクト URI | `http://localhost:3000/api/auth/callback/google` | `<SITE_URL>/api/auth/callback/google` |

Better Auth の `baseURL` は Convex 環境変数 `SITE_URL` です。TanStack Start が `/api/auth/$` を Convex HTTP に転送するため、Google にはアプリ側の URL を登録します。`localhost` と `127.0.0.1` は別のオリジンです。

接続する Convex デプロイメントに次の環境変数を設定します。

| 名前 | 内容 |
| --- | --- |
| `SITE_URL` | Cairn のオリジン。ローカル開発は `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | 32文字以上のランダムな認証用秘密鍵 |
| `GOOGLE_CLIENT_ID` | 作成した OAuth クライアントの ID |
| `GOOGLE_CLIENT_SECRET` | 同じ OAuth クライアントのシークレット |
| `AUTH_DISABLE_SIGNUP` | 新規アカウント作成を止める場合は `true`。既存ユーザーはログイン可能 |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `SITE_URL` 以外にも許可するオリジンがある場合のみ、カンマ区切りで指定 |

秘密鍵や Google のシークレットに `VITE_` を付けないでください。Convex 側の環境変数として設定し、リポジトリには保存しません。Web アプリの `.env.local` には、同じデプロイメントの `VITE_CONVEX_URL` と `VITE_CONVEX_SITE_URL` を設定します。

`GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` が両方設定されると、ログイン画面に「Googleでログイン」が表示されます。表示判定中はボタンと同じ寸法のshimmer skeletonを表示し、未設定と判定されたら非表示にします。取得失敗時は再確認できます。待機中もメール・パスキーのログインを操作でき、動きを減らす設定ではshimmerを停止します。Google 同意画面をテスト公開している場合は、ログインするアカウントをテストユーザーに登録してください。

## 動作確認

1. `vp dev` でアプリを起動し、未ログイン状態で「Googleでログイン」を押します。
2. 通信中はボタンが待機表示になり、重複送信できないことを確認します。
3. Google でアカウントを選び、Cairn のホームに戻ってログインできることを確認します。
4. Google 側でキャンセルするとホームのログイン画面に戻り、日本語のエラー文と再試行ボタンが表示されます。Google のエラー詳細は画面に表示しません。
5. ログアウト後に同じ Google アカウントで入り、既存の記録が見えることを確認します。

ログイン時の要求は Google の標準スコープ `openid`、`email`、`profile` です。カレンダー同期の設定は [calendar-sync.md](./calendar-sync.md) を参照してください。ログインのたびに同意画面を要求しないよう、`prompt` は `select_account` にしています。

ボタンの表示可否は、ログイン前に `queries/auth/publicConfig` から取得します。共有の Convex クライアントに `expectAuth: true` を設定すると、この公開クエリも認証待ちになります。`src/router.tsx` ではこのオプションを指定せず、保護されたデータへのアクセスは Convex 側の認証チェックと `OwnerGate` で制御します。

`accessType: offline` を設定していますが、Google は通常、初回同意時だけリフレッシュトークンを発行します。過去の許可が残っていてカレンダーの再接続でも復旧しない場合は、Google アカウントの「サードパーティ製のアプリとサービス」から Cairn のアクセスを取り消した後、ボードの同期設定から連携をやり直してください。保存する OAuth トークンは Better Auth が暗号化します。

## 検証範囲

回帰テストは Google ボタンの設定による表示切り替え、送信中の重複操作防止、開始失敗後の再試行、OAuth エラーから戻った表示、成功・失敗時の戻り先を確認します。実際の Google 同意とセッション作成には、上記の OAuth クライアント設定とテストユーザーによる動作確認が必要です。

参照: [Better Auth Google](https://better-auth.com/docs/authentication/google)、[Convex と TanStack Start の連携](https://labs.convex.dev/better-auth/framework-guides/tanstack-start)。
