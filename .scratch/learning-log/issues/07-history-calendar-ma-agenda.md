# 07 — 履歴カレンダー・7日移動平均・Agenda

**What to build:** 所有者が月カレンダーで空マスを休養として見られる。空の日の学習量は 0 分として 7 日移動平均に入る。週は Agenda で行が終日イベントとして並ぶ。カレンダーの日を開くとその日の全行と共有文が出る。日付降順の一覧は主画面にしない。

**Blocked by:** 04 — 確定・スキップ・学習量・キーボード

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 履歴の入口は `@mantine/dates` の Calendar。空マスは休養（未記録と休養は同じ）
- [ ] 7日移動平均は対象の暦7日。日が無い日は 0。記録した日だけでの平均を移動平均と呼ばない
- [ ] 週は `@mantine/schedule` の AgendaView。行は終日イベント。ResourcesDayView は使わない
- [ ] カレンダーの日を開くとその日の全行と共有文が出る（共有文の生成ルールは 06。06 が未完なら確定行の表示だけでも日を開ける）
- [ ] パッケージ追加は `vp add`。`@mantine/schedule` を足してよい
- [ ] 純関数 unit。7日移動平均に欠け日 0 を含めるリテラル
- [ ] 公開 query の統合。月と週の学習量が所有者に読める。未認証は throw
- [ ] フロント integration。空マスが休養に見える。週 Agenda に終日の行が見える。Convex はフック境界で stub

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices` `/modern-web-guidance`

TDD。`convex dev` を使う。`convex deploy` は使わない。実装開始時に modern-web-guidance でカレンダーと長いリストのガイドを search してから書く。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
