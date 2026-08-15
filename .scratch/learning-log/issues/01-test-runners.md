# 01 — テストランナー

**What to build:** 所有者がまだログイン画面を見なくても、`vp test` がフロント integration・Convex 純関数 unit・Convex 公開関数の統合の3層で赤緑を返せる。既存の `cn` unit は残る。未認証の tasks デモはまだ消さない。このチケットは後続の TDD の土台。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md と ADR-0001 / 0002 / 0003。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] `vp test` が Vitest project を3つ回す。フロント（jsdom、Testing Library）、Convex 純関数（Node、Convex ランタイムを import しない）、Convex 統合（edge-runtime、`convex-test` + `withIdentity`）
- [ ] パッケージ追加は `vp add` だけ。`convex-test`、`@edge-runtime/vm`、`convex-helpers`、`@testing-library/react`、jsdom を足してよい。`vitest` 本体、`convex-helpers/testing`、Playwright は入れない
- [ ] フロント integration は Convex クライアントをフック境界で stub する。`convex-test` をフロントに pant しない
- [ ] Convex 統合は Better Auth コンポーネントを登録しない（コンポーネント API を叩くテスト以外）
- [ ] `vp check` と `vp test` が通る。警告も失敗のまま
- [ ] 良いテストの約束を守る。公開した振る舞いだけ。DB を直接覗く assert なし。期待値は CONTEXT のリテラル

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/tanstack-start`

TDD。`convex dev` を使う。`convex deploy` は使わない。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
