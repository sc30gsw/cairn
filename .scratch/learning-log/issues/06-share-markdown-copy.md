# 06 — 共有文をコピー

**What to build:** 所有者が確定した行から Slack 用 Markdown をコピーできる。カテゴリが1つなら平坦、2つ以上なら親+子。カテゴリ順は固定（TOEIC対策、多聴、多読、英会話、その他）。カテゴリ内は入力順。未着手とスキップは出ない。

**Blocked by:** 04 — 確定・スキップ・学習量・キーボード

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 共有文は確定行だけから作る。アプリ内の正本ではない
- [ ] カテゴリが1つなら平坦。2つ以上なら親+子
- [ ] カテゴリ順は TOEIC対策、多聴、多読、英会話、その他。カテゴリ内は入力順
- [ ] 未着手とスキップは共有文に出ない
- [ ] コピーは Mantine の CopyButton または useClipboard
- [ ] 純関数 unit。平坦とネストの両方を CONTEXT のリテラルで固定
- [ ] フロント integration。コピー操作が見える。Convex はフック境界で stub。クリップボード API の実ブラウザ往復は必須にしない

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/adopt-better-result` `/tanstack-start` `/react-best-practices` `/modern-web-guidance`

TDD。`convex dev` を使う。`convex deploy` は使わない。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
