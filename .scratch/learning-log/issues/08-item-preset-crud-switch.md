# 08 — 項目とプリセットの CRUD と切替

**What to build:** 所有者が項目を追加・改名・削除できる。項目はカテゴリを1つ持つ。使っている行がある項目は消せない。プリセットを追加・編集・削除できる。各雛形は項目・内容・目安分数を持つ。各曜日はプリセット1つ。今日だけ別プリセットに切り替えると未着手だけ差し替わり、確定とスキップは残る。

**Blocked by:** 03 — 今日を開くとシード済みプリセット行が並ぶ

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 項目の CRUD。カテゴリは TOEIC対策 / 多聴 / 多読 / 英会話 / その他 の1つ。行ごとにカテゴリを選ばない。模試は置かない
- [ ] 使っている行がある項目は消せない
- [ ] プリセットの CRUD。雛形は項目・内容・目安分数
- [ ] 各曜日はプリセット1つ。曜日を持つプリセットが二つある状態は保存時に拒否する
- [ ] 今日だけ別プリセットに切り替えられる。未着手だけ差し替わる。確定とスキップは残る
- [ ] 項目・プリセットの削除は即時。ゴミ箱には入らない（ゴミ箱本体は 11）
- [ ] 純関数 unit。曜日の排他、切替で未着手だけ置換、使用中項目は削除不可
- [ ] 公開 mutation の統合。CRUD と切替が所有者に通り、使用中削除は失敗する。未認証は throw
- [ ] フロント integration。項目とプリセットの編集、今日の切替。Convex はフック境界で stub

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices` `/modern-web-guidance`

TDD。`convex dev` を使う。`convex deploy` は使わない。フォームは Formisch と Valibot。Zod は使わない。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
