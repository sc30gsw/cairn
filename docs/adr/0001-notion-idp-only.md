# Notion は IdP のみ。記録の正本は本アプリ

> **Superseded by [0009-general-account-auth.md](./0009-general-account-auth.md).** 単一所有者 allowlist と Notion-only signup 制限は廃止。以下は履歴参照用。

Notion の日次ログと学習記録をアプリに置き換える。ログインだけ Better Auth の Notion OAuth（`@convex-dev/better-auth`）に任せ、Notion API での継続同期も一時 import もしない。記録は Convex 上の日と行が正本。公開 URL なので認証は必須だが、signup は閉じ email allowlist で所有者以外を拒否する。

同期や「Notion も生き残す」は、二重入力（R3）に戻る。WorkOS や自前 JWT、genericOAuth は Notion ログインが本命なら遠回り。
