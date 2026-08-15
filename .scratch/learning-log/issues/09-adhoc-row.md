# 09 — その日限りの行

**What to build:** 所有者がプリセットにない行をその日に足せる。足した行も項目・内容・分数と状態を持ち、確定すれば学習量と共有文に入る。

**Blocked by:** 04 — 確定・スキップ・学習量・キーボード

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 今日または過去の日に、プリセット外の行を追加できる
- [ ] 追加した行は項目を1つ持つ。状態は未着手から始め、04 の確定・スキップが使える
- [ ] 確定したその日限りの行は学習量に入る。共有文にも入る（06 が完了していれば）
- [ ] 未来の日には行を足さない（03 の未来ルールを破らない）
- [ ] 公開 mutation の統合。所有者なら追加できる。未認証は throw
- [ ] フロント integration。その日に行を足せて確定できる。Convex はフック境界で stub

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices` `/modern-web-guidance`

TDD。`convex dev` を使う。`convex deploy` は使わない。フォームは Formisch と Valibot。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
