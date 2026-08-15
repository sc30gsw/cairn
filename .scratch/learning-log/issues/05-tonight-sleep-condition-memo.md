# 05 — 今夜の睡眠・コンディション・メモ

**What to build:** 所有者が日付を選ばず今夜の就寝だけ打てる。朝に起床を今日へ入れると睡眠がその日に載る。就寝 21:00・起床 5:30 なら 8.5 時間。7時間未満は警告するが、行の確定は止めない。コンディションは好調 / 普通 / 崩れた。メモをその日に残せる。

**Blocked by:** 03 — 今日を開くとシード済みプリセット行が並ぶ

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md と ADR-0002。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 今夜は日付を持たない。就寝時刻だけを受け取る。明日の日を開いて就寝を入れない
- [ ] 睡眠は起床した暦日に属する。就寝した暦日には載せない
- [ ] 就寝 21:00・起床 5:30 なら睡眠 8.5 時間（日付またぎ）
- [ ] 7時間未満なら警告を見る。警告中でも行を確定できる
- [ ] コンディションは好調 / 普通 / 崩れた の3つ。スコア化しない
- [ ] メモをその日に残せる
- [ ] 睡眠だけ入れた暦日は日として存在する。睡眠も行もコンディションもメモもない暦日は日ではない
- [ ] 純関数 unit。睡眠時間、7時間警告フラグ。確定 mutation は警告でも成功する
- [ ] 公開 mutation の統合。今夜の就寝、今日の起床、コンディション、メモ。未認証は throw
- [ ] フロント integration。今夜の就寝が日付ピッカーなし。警告が見える。確定はロックされない。Convex はフック境界で stub
- [ ] スマホで就寝時刻を打てる

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices` `/modern-web-guidance`

TDD。`convex dev` を使う。`convex deploy` は使わない。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
