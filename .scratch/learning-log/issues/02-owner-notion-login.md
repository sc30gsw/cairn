# 02 — 所有者の Notion ログイン

**What to build:** 所有者が Notion でログインするとアプリに入れる。signup は閉じ、許可した email 以外は入れない。未ログインの訪問者は記録を見られない。デモの tasks 表は製品パスから消える。Notion は IdP だけ。アプリが正本。

**Blocked by:** 01 — テストランナー

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md と ADR-0001。GitHub の親 issue は未作成）。

## Follow these docs

実装は次の公式手順に従う。貼られた Convex ガイドの Next.js 例をそのままコピーしない。

- Convex コンポーネント。`@convex-dev/better-auth` のローカルコンポーネント手順（`createClient`、`auth.config` の `getAuthConfigProvider`、`npx auth generate`、`registerRoutes`、`ConvexBetterAuthProvider`）。パッケージは既に入っている。`vp add` 以外で入れ直さない
- フレームワーク。TanStack Start ガイドの `convexBetterAuthReactStart` と `VITE_CONVEX_URL` / `VITE_CONVEX_SITE_URL`。`convexBetterAuthNextJs` と `NEXT_PUBLIC_*` は使わない
- Notion。Better Auth の native `socialProviders.notion`（`NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET`）。クライアントは `authClient.signIn.social({ provider: "notion" })`。リダイレクトはアプリ origin の `/api/auth/callback/notion`。Notion 統合は email を読めること。ログイン後に Notion API で記録を読まない（ADR-0001）

ガイドのサンプルにある `emailAndPassword: { enabled: true }` はコピーしない。email/password は無効のまま。GitHub 例のままにしない。

## Acceptance criteria

- [ ] Notion の native social provider でログインできる。genericOAuth、email/password、WorkOS、Clerk、`@convex-dev/auth` は使わない
- [ ] `disableSignUp` と email allowlist。許可されていない Notion アカウントは入れない
- [ ] 未認証の公開 query は残さない。未ログインは記録画面に入れない
- [ ] 認可は convex-helpers の custom query / custom mutation。identity と email allowlist を通した所有者だけ ctx に載せる。Better Auth の user 行を認可のたびに引かない
- [ ] Better Auth の表はコンポーネント内。アプリ schema に複製しない
- [ ] 秘密は Convex deployment の env（BETTER_AUTH_SECRET、SITE_URL、NOTION_CLIENT_ID / SECRET、ALLOWED_EMAIL）。アプリ側は CONVEX_DEPLOYMENT、VITE_CONVEX_URL、VITE_CONVEX_SITE_URL、VITE_SITE_URL。Start は `/api/auth/$` で Convex HTTP へプロキシ。リダイレクトはアプリ origin の `/api/auth/callback/notion`
- [ ] 失敗は better-result のタグ付きエラーとして境界まで運ぶ
- [ ] Convex 統合テスト。未認証は throw、allowlist 外は throw、所有者なら通る。Notion OAuth の往復と `disableSignUp` のベンダー挙動はテストしない
- [ ] フロント integration。未ログインなら記録が見えない。Convex はフック境界で stub
- [ ] デモの tasks 表と未認証の tasks API は製品パスから消える

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices`

TDD。`convex dev` を使う。`convex deploy` は使わない。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
