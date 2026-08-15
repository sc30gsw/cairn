# 03 — 今日を開くとシード済みプリセット行が並ぶ

**What to build:** 所有者がアプリを開くと今日の日が出る。今日の曜日に合うプリセットの行が未着手で並ぶ。過去の空の日を開くと同じく未着手行が作られる。未来の日は開けても行は作られない。行もコンディションもメモも睡眠もない暦日は日として存在しない。

**Blocked by:** 02 — 所有者の Notion ログイン

**Status:** ready-for-agent

## Parent

学習ログ spec（CONTEXT.md と ADR-0001。GitHub の親 issue は未作成）。

## Acceptance criteria

- [ ] 起動は今日（JST の暦日）。ホームは今日の記録
- [ ] 項目の初期シード（模試なし）。Distinction 2000、英会話、金のフレーズ、多読、英文法（解く）、英文法（復習）、出る文特急、その他。カテゴリは金フレ・英文法・出る文特急が TOEIC対策、Distinction 2000 が多聴、多読が多読、英会話が英会話、その他がその他
- [ ] プリセット初期シード。平日は Distinction、英会話、金フレ、多読、英文法（解く/復習）、出る文特急。水曜は英文法なし。土日は学習行を自動生成しない。分数は時間割に合わせてよい
- [ ] 今日または過去で、まだ行がない日を開くと、その曜日のプリセットから未着手行が作られる
- [ ] 未来の日を開けても行は作られない
- [ ] 行もコンディションもメモも睡眠もない暦日は日として存在しない
- [ ] 各曜日はプリセット1つ。曜日を持つプリセットが二つある状態は保存時に拒否する（このチケットではシードがそれを破らないこと）
- [ ] 純関数 unit。プリセット適用、未来の日に行を作らない、曜日の排他
- [ ] 公開 mutation の統合。所有者なら今日を開いて未着手行が読める。未認証と allowlist 外は throw
- [ ] フロント integration。ログイン済みなら今日の未着手行が見える。Convex はフック境界で stub

## Agent skills

### When implementing

`/implement` `/poteto-mode` `/better-auth-best-practices` `/auth-setup` `/convex-advisor` `/convex-helpers-guide` `/adopt-better-result` `/tanstack-start` `/react-best-practices` `/modern-web-guidance`

TDD。`convex dev` を使う。`convex deploy` は使わない。

### When reviewing

`/convex-reviewer` `/code-reviewer` `/thermos`
