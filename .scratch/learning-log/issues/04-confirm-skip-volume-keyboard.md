# 04 — 確定・スキップ・学習量・キーボード

**What to build:** 所有者が画面遷移なしで1行をキーボード確定できる。確定時に内容と分数を上書きできる。やらなかった行はスキップできる。学習量は確定した行の分数だけ。未着手とスキップは実績に混ざらない。今日と過去は編集できる。

**Blocked by:** 03 — 今日を開くとシード済みプリセット行が並ぶ

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 行の状態は確定 / 未着手 / スキップだけ
- [ ] キーボードだけで確定できる。画面遷移なしで1件を終えられる
- [ ] 確定時に内容と分数を上書きできる
- [ ] スキップできる。未着手と「やらなかった」が区別できる
- [ ] 学習量は確定行の分数合計。未着手とスキップは足さない
- [ ] 今日と過去の日は編集できる
- [ ] 純関数 unit。学習量の合計。確定だけが入るリテラル
- [ ] 公開 mutation の統合。確定とスキップが所有者に通り、公開 query の学習量が変わる。未認証は throw
- [ ] フロント integration。確定とスキップと上書きが画面上で見える。Convex はフック境界で stub
- [ ] スマホでも確定・スキップが使える（枕元で今日を閉じられる範囲。就寝入力そのものは 05）

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices` `/modern-web-guidance`

TDD。`convex dev` を使う。`convex deploy` は使わない。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
