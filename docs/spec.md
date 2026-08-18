## Problem Statement

Notion の日次ログと学習記録で英語学習を残している。行の作成、テンプレ選択、子行追加、項目選択、分数入力が毎日続き、同じ事実をチェックと学習記録に二度書く。Markdown は数式で出るが検証も編集も辛い。睡眠とコンディションと学習量を並べて見れず、週合計や7日移動平均もない。空の日が失敗に見える。本番は 2026-09-27 で、残り約6週しかない。公開 URL のアプリにするので認証は必須だが、使うのは自分だけ。

## Solution

学習ログの正本をこのアプリに移す。起動は今日の記録。曜日に合うプリセットが未着手の行を並べ、キーボードだけで確定・スキップ・上書きできる。今夜の就寝は日付を選ばない。睡眠は起床した日に載り、7時間未満なら警告する（確定は止めない）。履歴の入口は月のカレンダーで、空マスは休養（学習量0）。週は Agenda で行を終日として並べる。確定行から Slack 用の共有文をコピーする。本番目標のカウントダウン、月曜始まりの週間学習量ゴール、CRUD できる障害プラン（if-then。行は自動で変えない）を持つ。Notion はログインだけ。

用語はリポジトリ直下の CONTEXT.md に従う。ADR-0001（Notion は IdP のみ）、ADR-0002（睡眠は起床日）、ADR-0003（プロセス目標であり OKR ツリーは作らない）を覆さない。

## User Stories

1. As an 所有者, I want Notion でログインする, so that 公開 URL でも自分だと証明できる
2. As an 所有者, I want 初回ログインのあと signup を閉じる, so that 他人がアカウントを作れない
3. As an 所有者, I want 許可した email 以外は入れない, so that 認証済みの他人もデータに触れない
4. As an 未ログインの訪問者, I want 記録画面に入れない, so that 学習内容が漏れない
5. As an 許可されていない Notion アカウント, I want ログインに失敗する, so that 所有者以外が入れない
6. As an 所有者, I want 起動すると今日の日が開く, so that 寝る直前や朝にすぐ入力できる
7. As an 所有者, I want 今日の曜日に合うプリセットの行が未着手で並ぶ, so that 項目・内容・目安分数を毎回選ばなくてよい
8. As an 所有者, I want 行をキーボードだけで確定する, so that 画面遷移なしで1件を終えられる
9. As an 所有者, I want 確定時に内容と分数を上書きする, so that 目安と違う実績を残せる
10. As an 所有者, I want やらなかった行をスキップする, so that 未着手と「やらなかった」を区別できる
11. As an 所有者, I want プリセットにない行をその日に足す, so that 予定外の学習も残せる
12. As an 所有者, I want 学習量は確定した行の分数だけを合計する, so that 未着手とスキップが実績に混ざらない
13. As an 所有者, I want 今夜の就寝時刻だけ打つ, so that 日付を選ばずに寝る直前に記録できる
14. As an 所有者, I want 朝に起床時刻を今日の日へ入れる, so that 睡眠がその日の学習と並ぶ
15. As an 所有者, I want 就寝 21:00・起床 5:30 なら睡眠 8.5 時間と出る, so that 日付またぎを手で計算しなくてよい
16. As an 所有者, I want 睡眠が 7 時間未満なら警告を見る, so that 教材より睡眠を守る判断ができる
17. As an 所有者, I want 警告中でも行を確定できる, so that 入力がロックされない
18. As an 所有者, I want コンディションを好調・普通・崩れたから選ぶ, so that その日の調子と学習量を後で並べられる
19. As an 所有者, I want メモを残す, so that 崩れた理由などをその日に書ける
20. As an 所有者, I want 行もコンディションもメモも睡眠もない暦日は日として存在しない, so that 開いていない日を失敗ログにしない
21. As an 所有者, I want 履歴の月カレンダーで空マスを休養として見る, so that 未記録と休養が同じ扱いで、カレンダー上は分かる
22. As an 所有者, I want 空の日の学習量を 0 分として 7 日移動平均に含める, so that 学習の密度が見える
23. As an 所有者, I want 週の Agenda で行が終日イベントとして並ぶ, so that その週に何を確定したか一覧できる
24. As an 所有者, I want カレンダーの日を開くとその日の全行と共有文が出る, so that 振り返りと Slack 投稿が同じ場所でできる
25. As an 所有者, I want 今日と過去の日は編集できる, so that 翌朝の修正や抜けの補完ができる
26. As an 所有者, I want 未来の日を開けても行が作られない, so that 計画をこのアプリに持ち込まない
27. As an 所有者, I want 今日だけ別プリセットに切り替える, so that 祝日などに雛形を差し替えられる
28. As an 所有者, I want 切替で未着手だけ差し替わり確定とスキップは残る, so that 既に終えた行が消えない
29. As an 所有者, I want 各曜日はプリセット1つだけ, so that 月曜に二つの雛形が重ならない
30. As an 所有者, I want プリセットを追加・編集・削除できる, so that 時間割が変わってもコードを触らない
31. As an 所有者, I want プリセットの各雛形に項目・内容・目安分数を持つ, so that 開いた瞬間に行が埋まる
32. As an 所有者, I want 項目を追加・改名・削除できる, so that 教材が変わっても列挙を焼き付けない
33. As an 所有者, I want 初期項目が Notion の種類（模試を除く）で入る, so that 移行初日から選べる
34. As an 所有者, I want 項目がカテゴリを1つ持つ, so that 共有文の見出しが自動で決まる
35. As an 所有者, I want カテゴリは TOEIC対策・多聴・多読・英会話・その他, so that Slack の型が安定する
36. As an 所有者, I want 使っている行がある項目を消せない, so that 過去の行が種類を失わない
37. As an 所有者, I want 確定行から共有文の Markdown をコピーする, so that Slack に貼れる
38. As an 所有者, I want カテゴリが1つなら平坦、2つ以上なら親+子, so that 短い日は浅く、複数カテゴリの日は読みやすい
39. As an 所有者, I want カテゴリ順は固定、カテゴリ内は入力順, so that 毎回同じ並びに貼れる
40. As an 所有者, I want 未着手とスキップが共有文に出ない, so that Slack にはやったことだけ載る
41. As an 所有者, I want 本番目標が1件あり初期値は 730〜850 と 2026-09-27, so that カウントダウンが初日から出る
42. As an 所有者, I want 本番目標をあとから編集できる, so that 目標点や日程が変わっても直せる
43. As an 所有者, I want 本番日までの日数が見える, so that 残り週を意識できる
44. As an 所有者, I want 月曜始まりの週に学習量のゴールを1つ置く, so that プロセス目標が具体的で難しい分数になる
45. As an 所有者, I want その週の確定分数とゴールを並べる, so that 履歴がフィードバックになる
46. As an 所有者, I want 障害プランを追加・編集・削除できる, so that 「もし崩れたらこうする」を書いておける
47. As an 所有者, I want 障害プランが行の状態を自動で変えない, so that スキップは自分で選ぶ
48. As an 所有者, I want 行と日をゴミ箱に入れ、復元できる, so that 消しミスを取り消せる
49. As an 所有者, I want ゴミ箱の行と日が 30 日後に完全削除される, so that 取り消し期間が無限に残らない
50. As an 所有者, I want 項目・プリセット・障害プランの削除は即時, so that 設定のゴミがゴミ箱に溜まらない
51. As an 所有者, I want スマホで就寝時刻を打つ, so that 枕元で今日を閉じられる
52. As an 所有者, I want 模試のスコアをこのアプリに入れない, so that 模試記録は Notion のまま
53. As an 所有者, I want リラックス工程を記録しない, so that 画面は学習・履歴・目標に絞れる
54. As an 所有者, I want JSON/CSV エクスポートが無い, so that v1 の範囲が記録と履歴と目標に留まる

## Implementation Decisions

- TanStack Start と Convex と Better Auth（`@convex-dev/better-auth`）と Mantine 9（core / dates / hooks）と `tailwind-preset-mantine` を使う。Notion ログインは native の social provider。genericOAuth は使わない。email/password は有効にしない。
- Better Auth の表はコンポーネント内に置く。アプリの schema に複製しない。ドメイン表はすべて所有者キーを持つ。未認証の公開 query は残さない。デモの tasks 表は捨てる。
- 認証ラッパは convex-helpers の custom query / custom mutation。identity と email allowlist を通した所有者だけ ctx に載せる。Better Auth の user 行を認可のたびに引かない。
- ドメインの不変条件は Convex ランタイムを import しない純関数に置く。公開 query / mutation は引数検証、所有者、純関数、DB 書きだけ。フロントは同じ純関数を表示に使ってよい。
- 日は JST の暦日。行は日に属する。状態は確定 / 未着手 / スキップ。項目はカテゴリを1つ持つカタログ。プリセットは曜日フラグと雛形の列。睡眠は就寝と起床。今夜は日付なしの就寝だけ。本番目標は1件。週間ゴールは月曜始まりの分数1つ。障害プランは if-then の短文。ゴミ箱は行と日のみ。
- 睡眠時間は起床日の起床から、直前の今夜または前日就寝を引く。7時間未満は警告フラグ。確定 mutation は警告でも成功する。
- 日を開く（今日または過去、まだ行がない）と、その曜日のプリセットから未着手行を作る。未来は日を開けても行を作らない。今日のプリセット切替は未着手だけ差し替え、確定とスキップは残す。曜日を持つプリセットが二つある状態は保存時に拒否する。
- 学習量は確定行の分数合計。7日移動平均は対象の暦7日で、日が無い日は 0。週間ゴールの実績も同じ定義。
- 共有文は確定行だけ。カテゴリ固定順（TOEIC対策、多聴、多読、英会話、その他）。1カテゴリは平坦、2カテゴリ以上は親+子。カテゴリ内は入力順。コピーは Mantine の CopyButton または useClipboard。
- 履歴の月は `@mantine/dates` の Calendar。空マスは休養。週は `@mantine/schedule` の AgendaView。行は終日イベント。ResourcesDayView は使わない。ホームは今日。
- 初期シード。項目は Distinction 2000、英会話、金のフレーズ、多読、英文法（解く）、英文法（復習）、出る文特急、その他。カテゴリ対応は Notion どおり（金フレ・英文法・出る文特急は TOEIC対策、Distinction 2000 は多聴、多読は多読、英会話は英会話、その他はその他）。本番目標は 730〜850 / 2026-09-27。プリセットは所有者が CRUD するので、初期の曜日割り当てと雛形分数はシードしてよい。
- 秘密は Convex deployment の env。BETTER_AUTH_SECRET、SITE_URL、NOTION_CLIENT_ID / SECRET、ALLOWED_EMAIL。アプリ側は CONVEX_DEPLOYMENT、VITE_CONVEX_URL、VITE_CONVEX_SITE_URL、VITE_SITE_URL。Better Auth インスタンスは Convex HTTP 上。Start は `/api/auth/$` でプロキシ。
- フロントのフォームは Formisch と Valibot。Zod は使わない。結果型は better-result。クラス名は cnfast の `cn`。相対 import は禁止。`~/*` が `src/*`。
- パッケージ追加は `vp add`。Vitest / Testing Library 系の本体を直接入れない。テスト runner は vite-plus。`convex-test` と `@edge-runtime/vm` と `convex-helpers` と `@testing-library/react`（および jsdom）と `@mantine/schedule` は足してよい。`vitest` 本体、`convex-helpers/testing`、Playwright は v1 に入れない。
- `vp test` は Vitest project を分ける。フロント（jsdom、src の test）、Convex 純関数（Node、lib の test）、Convex 統合（edge-runtime、公開関数の test）。`test.include` が src だけな現状は、この分割で置き換える。
- TDD。赤のテストを先に書く。縦スライス。実装詳細や private、DB を直接覗く assert は禁止。期待値は CONTEXT のリテラル。
- 開発は `convex dev`。本番向け `convex deploy` は使わない。

## Testing Decisions

良いテストは公開した振る舞いだけを見る。リファクタで内部が変わっても壊れない。期待値は仕様のリテラルであり、実装と同じ計算の再実行ではない。

フロントは Testing Trophy。静的解析は既存の `vp check`（警告も失敗）。unit は少なく、表示用の純関数や `cn` 程度。integration が本体で、Testing Library がルートと画面を叩く。Convex クライアントはフック境界で stub する。本物の `convex-test` をフロント integration に pant しない。e2e（ブラウザで Notion ログイン）は v1 の対象外。

Convex は Testing Pyramid。底は純関数の unit を厚くする（睡眠時間、警告、学習量、7日移動平均、共有文 Markdown、プリセット適用と切替、曜日の排他、未来の日に行を作らない、allowlist、ゴミ箱 30 日、項目が使用中なら削除不可）。中は公開 query / mutation の統合を薄くする（`convex-test` と `withIdentity`）。未認証は throw、allowlist 外は throw、所有者なら公開 mutation が通り公開 query で読める。永続とゴミ箱のスケジュールはこの層。頂点の e2e は v1 に置かない。

テストしないもの。生成コード、Better Auth コンポーネント内部、Notion OAuth の往復、`disableSignUp` のベンダー挙動、Mantine の描画、`ctx.db` を直接読む assert、薄い wrapper の同語反復。

既存の先例は `cn` の unit だけ。フロント integration と Convex 統合は新設する。

## Out of Scope

- 模試のスコア・分析、模試記録 DB。項目に模試を置かない
- リラックス工程
- JSON/CSV エクスポート
- 8/14 以前の Notion データ移行、Notion API 同期
- 複数ユーザー、共有、通知、AI 要約
- タスク・締切・時間割・計画の前提・判断の履歴（Notion に残す）
- OKR ツリー、WOOP ウィザード、障害プランによる自動スキップ
- WorkOS、Clerk、`@convex-dev/auth`、自前 JWT、genericOAuth、email/password
- Playwright / 本番 Notion を使う e2e
- ResourcesDayView、オフライン対応

## Further Notes

実装は Cloud Agent に任せる想定。ローカルで実装を始めない。次の工程は `/to-tickets`。

シードするプリセットの具体的な目安分数は、Notion ダッシュボードの時間割（朝 Distinction、英会話、昼 金フレと多読、午後 英文法と出る文特急、水曜は英文法なし、土日は自動行なし）に合わせてよい。所有者があとから編集する。
