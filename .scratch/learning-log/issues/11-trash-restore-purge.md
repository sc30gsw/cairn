# 11 — 行と日のゴミ箱

**What to build:** 所有者が行と日をゴミ箱に入れ、復元できる。ゴミ箱の行と日は 30 日後に完全削除される。項目・プリセット・障害プランの削除は即時のまま。数秒の Undo だけにはしない。期限なしの永久保管にもしない。

**Blocked by:** 04 — 確定・スキップ・学習量・キーボード

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 行と日をゴミ箱に入れられる。復元できる
- [ ] ゴミ箱の行と日は 30 日後に完全削除される
- [ ] 項目・プリセット・障害プランの削除は即時。ゴミ箱に溜まらない
- [ ] 使っている行がある項目は消せない（08 と同じ不変条件。ゴミ箱経由でも破らない）
- [ ] 純関数 unit。30 日経過の判定をリテラルで固定
- [ ] 公開 mutation とスケジュールの統合。所有者なら削除と復元ができる。30 日後の完全削除が走る。未認証は throw
- [ ] フロント integration。ゴミ箱と復元が見える。Convex はフック境界で stub

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices`

TDD。`convex dev` を使う。`convex deploy` は使わない。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
