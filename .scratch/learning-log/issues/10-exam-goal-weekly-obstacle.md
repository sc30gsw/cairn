# 10 — 本番目標・週間ゴール・障害プラン

**What to build:** 所有者が本番目標のカウントダウンを見られる。初期値は 730〜850 と 2026-09-27。あとから編集できる。月曜始まりの週に学習量のゴールを1つ置き、その週の確定分数と並べられる。障害プランを CRUD できる。障害プランは行の状態を自動で変えない。模試スコアと OKR ツリーと WOOP ウィザードは作らない。

**Blocked by:** 04 — 確定・スキップ・学習量・キーボード

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md と ADR-0003。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 本番目標は1件。初期値はスコア 730〜850、本番日 2026-09-27。編集できる。本番日までの日数が見える。アプリ内フィードバックには使わない
- [ ] 週間ゴールは月曜始まりの週に分数1つ。その週の学習量（確定分数）と並べる。毎日ノルマや項目ごとの週間ノルマは作らない
- [ ] 障害プランは if-then の短文。追加・編集・削除できる。削除は即時。行の状態を自動で変えない。コンディションから自動スキップしない
- [ ] 模試のスコアを入れない。リラックス工程を記録しない
- [ ] 公開 mutation の統合。所有者なら本番目標・週間ゴール・障害プランを読める・書ける。未認証は throw。障害プラン保存が行の状態を変えない
- [ ] フロント integration。カウントダウン、週間の分数ゴールと実績、障害プランの CRUD。Convex はフック境界で stub

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices` `/modern-web-guidance`

TDD。`convex dev` を使う。`convex deploy` は使わない。フォームは Formisch と Valibot。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
