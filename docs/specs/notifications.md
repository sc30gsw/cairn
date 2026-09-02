# 通知設計（#56）

- 対象: マップ #47 の6本目「通知」。**決定のみを行い、実装はしない。**
- 前提ドキュメント: [CONTEXT.md](../../CONTEXT.md) / [.claude/rules/convex-rules.md](../../.claude/rules/convex-rules.md)（CVX-01〜20）/ [ADR-0003](../adr/0003-process-goals-not-okr.md) / [ADR-0006](../adr/0006-checkpoints-replace-weekly-goals.md) / [ADR-0007](../adr/0007-denormalize-mastery-progress.md)
- 兄弟仕様: [goal-hierarchy-layout.md](goal-hierarchy-layout.md)（#48）/ [checkpoint-parent-backfill.md](checkpoint-parent-backfill.md)（#49）/ [study-timer.md](study-timer.md)（#51）/ [pwa-mobile.md](pwa-mobile.md)（#58）
- 調査: #55（通知配信手段）/ #57（PWA）。

> **調査原文の所在について（実装者への注意）**
> `research/notification-channels` ブランチは remote から消えている（`git ls-remote --heads origin` に存在しない。remote は `main` と `cursor/*` の2本だけ）。`docs/research/` にも通知の調査ファイルは無い（あるのは目標系の3本）。
> よって本書は **#55 / #57 のクローズ時に確定し、マップ #47 の「Decisions already locked」へ転記済みの調査結論**を一次情報として扱う（§2.1 の表がその全文相当）。原文が復活した場合は §2.1 の**事実記述**だけを突き合わせること。§2.2〜2.5 の**判断**は、原文の細部が増えても変わらない構造（in-app が最小コスト・Slack が最単純・Web Push は SW 前提・Email は PII 複製が必要）に依っている。

---

## 改訂（2026-09-02）: Web Push を後続チケット #68 で実装

§2.4 / §18.1 が「#58 完了後の後続チケット」に委ねた Web Push 一式を [web-push.md](./web-push.md) の決定で実装した。`pushSubscriptions` 表・`deliverWebPush` internalAction・`emitNotification` の schedule 行・SW の `push` / `notificationclick` / `pushsubscriptionchange` リスナー・マイページ通知タブの「この端末に届ける」。あわせて §6.2 の静穏時間（`quietFromHourJst` / `quietToHourJst` / `isQuietHourJst`）を「押し出し（Web Push）だけを止める」意味論のままコードに入れた。Slack に属する記述は引き続きコードに存在しない。

## 改訂（2026-08-24）: Slack 押し出しチャネルは実装から撤回

2026-08-24 のオーナー判断で Slack 押し出しチャネルは実装から撤回。v1 のチャネルはアプリ内通知欄のみ。Web Push は従来どおり #58 後の後続チケット所有。

以下の本文は Slack を含む当時の決定をそのまま残す（§ 番号の振り直しはしない）。Slack に属する記述 —— チャネル2本立て、`slackEnabled` / `slackWebhookUrl` / `slackFailureStreak` / `slackDeliveredAt` / `slackError`、`deliverSlack` / `deliveryPayload` / `markSlackDelivered` / `disconnectSlack`、および押し出しだけを止める静穏時間（`quietFromHourJst` / `quietToHourJst` / `isQuietHourJst`）—— はコードには存在しない。トリガー3種・`dedupeKey` の頻度上限・cron 2本・`eveningHourJst`・構造化ペイロードと共有純関数による文言生成は、記述どおり有効。

---

## 0. 決定サマリ

1. **チャネルは2本。アプリ内通知欄（必須・唯一の正）＋ Slack Incoming Webhook（オプトイン・押し出し）。** Web Push は **#58（PWA）完了後の後続チケット**が「同じ `notifications` 行を端末へ押し出すアダプタ」として足す（#56 も #58 も実装しない。所有者の確定は §2.4）。Email（`@convex-dev/resend`）は v1 不採用。
2. **トリガーは3種だけ。** `checkpointDeadline`（チェックポイント期限接近）/ `weeklyTargetMiss`（週間ターゲット未達の週末）/ `eveningUntouched`（夜の未着手）。本番目標のカウントダウン、達成の祝い、タイマー自動停止は採らない（§4.3）。
3. **通知はオプトイン。** `notificationSettings` 行が無い所有者は評価対象外。行が無いことがそのまま「通知しない」で、評価器の所有者列挙もこの表から引く。
4. **頻度上限は数えない。`dedupeKey` の粒度がそのまま上限。** `{kind}:{発火単位}` の1本キーで、所有者あたり **最大 2通/日 ＋ 週1通**。カウンタもレート制限機構も持たない。
5. **静穏時間（JST）は押し出しだけを止める。** 通知欄の行は静穏中でも作る。静穏で落とした押し出しは**翌朝へ持ち越さない**（行動できない催促は無価値）。
6. **cron は2本。** 評価は毎時0分の `internal.mutations.notifications.evaluate.evaluate` の1本だけ。もう1本は保持期間の掃除（`purgeExpired`）。3トリガーの「いま発火すべきか」は JST の暦日・時・曜日から純関数で決める。**UTC 換算を cron 定義に埋めない。**
7. **JST の「時」は Intl ではなく固定オフセット演算で出す。** JST は UTC+9:00 固定・夏時間なし。`new Date(now + JST_OFFSET_MS).getUTCHours()` は決定的で、`Intl` の `hour12` / `hourCycle` の実装差（深夜が `"24"` になる系）を踏まない。
8. **通知の中身は構造化ペイロードで保存し、文言は共有純関数で組む。** ただし目標名などの参照先テキストは生成時に非正規化して凍結する（親目標が消えても通知は読める）。
9. **Slack の Webhook URL は所有者データとして DB に持つが、query では絶対に返さない。** 書き込み専用フィールド＋`https://hooks.slack.com/services/` の前置検証＋連続失敗3回で自動停止。

---

## 1. 本仕様の範囲

| 含む | 含まない |
| --- | --- |
| チャネルの選定と根拠 | Web Push の実装一式（購読表・配信 action・SW リスナー・権限要求 UI）→ #58 完了後の後続チケット（§2.4 / §18） |
| トリガー3種の発火条件（境界値まで） | 週次レビュー画面（#52）・月次レビュー（#54）の中身 |
| `notifications` / `notificationSettings` のスキーマ | 目標×記録の紐付け（#53） |
| 関数サーフェス（1関数1ファイル） | Email 配信 |
| 頻度制御・静穏時間・保持期間 | 通知の A/B や文言の最適化 |
| 通知欄 UI とマイページの設定 UI | 通知からの直接操作（確定・達成チェック） |
| Valibot / Formisch のフォーム | 複数端末・複数セッションの区別 |
| `vite.config.ts` のカバレッジ include への追加（§13） | |

**#52 / #53 / #54 への依存は持たない。** `weeklyTargetMiss` は**今日すでに存在する** `targets` と既存サービス `services/targets/listWithProgress` だけを読む。#52 が週次レビュー画面を作ったら、通知のリンク先を `/goals` からそちらへ差し替えるだけで済む（§10.2 のリンク表1行の変更）。

**#48 / #49 への依存も持たない。** `checkpointDeadline` の対象判定は `deadline` と `achievedAt` だけを見る（`parentGoalId` を見ない。§4.2）。#48 が `parentGoalId` を足す前でも後でも、この評価器は1文字も変わらない。

---

## 2. チャネルの選定

### 2.1 調査結果（#55 / #57）の要約

| 手段 | 事実 | Convex 適合 |
| --- | --- | --- |
| Web Push | Service Worker 登録が必須。iOS は 16.4 以降 **かつホーム画面追加**が前提 | 送信は action から可能だが、受信基盤が PWA 側 |
| アプリ内通知欄 | 既存の reactive query で成立。実装コスト最小 | 最高（query 1本 + 表1つ） |
| Slack Incoming Webhook | action 1本で完結。Webhook URL はシークレット扱い必須 | 高（`fetch` は Convex ランタイムで動く。`"use node"` 不要） |
| Email（`@convex-dev/resend`） | `internalMutation` から直接呼べる | 高。ただし component 導入・API キー・検証済み送信ドメインが必要 |

PWA 調査（#57）の結論が効く: `vite-plugin-pwa` は TanStack Start の本番ビルドと非互換で、Serwist + 自作 Vite プラグイン＋Nitro 出力配線という**まとまった工事**が必要。そしてマップの優先順は **通知（6本目）→ PWA（7本目）**。

### 2.2 採用: アプリ内通知欄（v1 必須）

- Convex の reactive query がそのまま配信路になる。ポーリングも SW も要らない。
- 既読・未読という**導出できない状態**を持てる（§15 の反論10への答え）。
- 押し出しチャネル（Slack / 将来の Web Push）が失敗しても、通知そのものは失われない。**通知欄が正で、押し出しは写し。**

### 2.3 採用: Slack Incoming Webhook（v1 オプトイン）

「アプリを開かなければ届かない」を PWA 前に一つだけ解くために採る。根拠は**このアプリが既に Slack を前提にしている**こと — CONTEXT.md「共有文」は「クリップボードへコピーし、**Slack に貼るためのもの**」と定義されており、所有者の日課の中に Slack が既にある。通知先として新しい習慣を要求しない。

技術面でも最軽量: `internalAction` 1本、`fetch` 1回、`"use node"` 不要、依存追加ゼロ。

### 2.4 先送り: Web Push（#58 の**後続**チケット。#56 でも #58 でもない）

SW 登録が必要条件で、iOS はホーム画面追加まで要る。マップの優先順で PWA は通知の**後**なので、通知の実装セッションで SW を先に作るのは順序の逆転になる。

**所有者の確定（この段落が唯一の正。対応表は §18.1）**:

> **#58 は Service Worker の土台までしか作らない。** `push` / `notificationclick` / `pushsubscriptionchange` のリスナーも、購読を保存する表も、権限要求 UI も #58 では作らない。
> **#56（本書）も Web Push を実装しない。** 本書は設計だけを置き、実装対象は §10.5 のファイル一覧に限る（`deliverWebPush.ts` と `pushSubscriptions` は入っていない）。
> **Web Push 一式 —— `pushSubscriptions` 表・`deliverWebPush` internalAction・`emitNotification` の schedule 行・権限要求 UI・SW の `push` / `notificationclick` / `pushsubscriptionchange` リスナー —— は #58 完了後の後続チケットが、本書の設計を延長して1回で実装する。**

この確定が必要な理由: 以前の版は本書が「Web Push は #58 の仕事」と書き、`pwa-mobile.md` が「購読表とリスナーは #56 の仕事」と書いていた。両方が相手の成果物を待つので誰も実装せず、#58 の実装セッションは存在しない #56 のリスナーを探すことになる。**押し合いを解く唯一の方法は所有者を1つに決めることで、その所有者は「#58 完了後の後続チケット」である**（#58 の時点では通知の設計＝本書が既に存在し、SW の土台も揃っているので、そこで初めて一括で作れる）。

**先送りしても設計をやり直さないための約束**: 押し出しは `notifications` 行の *insert 後に scheduler で走るアダプタ* に閉じている（§10.2）。Web Push を足すときの差分は「`deliverWebPush` action 1本 ＋ 購読を保存する表1つ ＋ `emitNotification` の schedule 行1つ（＋ SW リスナーと権限要求 UI）」で、トリガー・ペイロード・静穏時間・dedupe はいっさい触らない。

### 2.5 不採用: Email

- Convex 適合は高いが、**cron 文脈で所有者のメールアドレスを知る手段がない**。identity は request 由来で、cron に identity は無い（CVX-05。実装上も `ownerQuery` / `ownerMutation` は `ctx.auth.getUserIdentity()` に依っており、cron からは使えない）。よってオプトイン時にアドレスをアプリ表へ複製する必要があり、Better Auth component が正本として持つ PII の二重管理・失効の追随という負債が発生する。
- さらに Resend の API キーと**検証済み送信ドメイン**が要る。1〜2人の学習ログに対して運用コストが釣り合わない。
- 通知の性質とも合わない: 本設計の3トリガーはいずれも「その時刻に見て、その日に動く」もので、メールの非同期性・受信箱での埋没と相性が悪い。

**再検討の条件**: Slack を持たない利用者が現れ、かつ PWA（#58）でも解決できない（iOS でホーム画面追加を拒む）とき。

---

## 3. 語彙（CONTEXT.md への追記案）

本書は CONTEXT.md を書き換えない（#50 相当のドキュメント確定工程に委ねる）。追記案を確定形で置く。

**通知**:
決めた時刻にサーバが作る催促1件。所有者ごとにオプトインし、通知欄で読む。同じ事実からは一度しか作らない。生成した時点の事実（目標名・件数）を文中に凍結する。
_Avoid_: トースト（操作直後の一時表示）と同義に扱うこと, プッシュ通知と同義に扱うこと, 達成の祝いを通知にすること, 期限超過の通知

**通知欄**:
ヘッダーのベルから開く、通知の履歴。未読件数を出す。開いただけでは既読にしない。30日で消える。
_Avoid_: ダッシュボード, 画面を開けば分かる状態の再掲, 通知欄から記録を操作すること

**押し出し**:
アプリを開いていなくても届く配信。v1 は Slack だけ。通知欄の行が正で、押し出しはその写し。
_Avoid_: 押し出しが失敗したら通知が無かったことにすること, Web Push を前提にすること

**静穏時間**:
JST の時刻帯。この間は押し出しをしない。通知そのものは作る。落とした押し出しは翌朝に持ち越さない。
_Avoid_: 通知の生成を止めること, 翌朝への持ち越し, 既定で無効にすること

**トースト**（既存概念の明示）:
`@mantine/notifications` による操作直後の一時表示（`src/lib/notify.ts` の `notifySuccess` / `notifyError`）。サーバ発の通知とは別物で、履歴も既読も持たない。
_Avoid_: 通知と同じ語で呼ぶこと

> **実装者向けの命名注意**: `@mantine/notifications` と本機能の名前が衝突する。トーストは既存の `notifySuccess` / `notifyError`（`src/lib/notify.ts`）のまま触らない。本機能の UI 名は `NotificationBell` / `NotificationTray`、フックは `useNotificationInbox`。

---

## 4. トリガーカタログ

### 4.1 3種の定義表

| kind | 発火時刻（JST） | 発火条件 | dedupeKey | リンク先 |
| --- | --- | --- | --- | --- |
| `checkpointDeadline` | 毎日 08:00 | 未達成チェックポイントのうち `0 ≤ 期限までの日数 ≤ 3` が1件以上 | `checkpointDeadline:{dateJst}` | `/goals` |
| `weeklyTargetMiss` | 土曜 09:00 | 週間ターゲットが1件以上あり、そのうち未達が1件以上 | `weeklyTargetMiss:{weekStartJst}` | `/goals` |
| `eveningUntouched` | 毎日 `eveningHourJst`（既定 21、18〜23 から選択） | 今日の未着手が1件以上（日が無ければ今日の曜日のプリセット行数） | `eveningUntouched:{dateJst}` | `/`（日） |

**「1発火単位 = 1通」の徹底**: 同じ日に複数のチェックポイントが接近していても通知は1通で、payload の配列に全件を入れる。複数カテゴリのターゲットが未達でも1通で、`shortfalls` 配列に全件を入れる。これで「目標が増えると通知が増える」経路が原理的に消える。

### 4.2 各トリガーの詳細

#### `checkpointDeadline` — チェックポイント期限接近

- 対象: `type === "mastery" && deadline !== undefined && achievedAt === undefined`。
  - `type` の値は `convex/lib/domain.ts` の `GOAL_TYPES = ["exam", "mastery"]`（英字。日本語ラベルは UI 側）。
  - **`parentGoalId` を見ない。** #48 の INV-1 は「`deadline` と `parentGoalId` は両方あるか両方ない」を services 層で守るので、#48 以降は「期限あり = 親あり」が成立する。それでも判定に `parentGoalId` を入れないのは、(a) #49 のバックフィル前の孤児（親が解決できない期限つき習得）も催促したいから、(b) 通知が #48/#49 の進捗に依存しないから。**期限を自分で置いた事実だけが催促の根拠**である。
- 窓: `daysLeft = daysUntil(todayJst, deadline)`（`convex/lib/jst.ts` の既存純関数）が `0 ≤ daysLeft ≤ CHECKPOINT_NEAR_DAYS(=3)`。
- **範囲判定にする理由**: 「3日前ちょうど」の等号判定にすると、cron が1回落ちた日の節目が永久に失われる。範囲なら翌朝の通知に含まれる。代償は「残り3日を切ると毎朝1通」になること — 期限を過ぎるまで最大4通（残り3/2/1/0）。自分で置いた期限に対して最終3日間の毎朝1通は過剰ではないと判断した（§15 反論6も参照）。
- **`daysLeft < 0`（期限超過）では発火しない。** CONTEXT.md「習得」の _Avoid_「未達の自動失敗記録」を通知でも守る。期限を過ぎたことは画面の表示が変わるだけ、が既存の決定。
- payload の `content` は目標の内容（`Doc<"goals">.content`）を生成時に写す。親目標のカスケード削除（#48 INV-6）で目標が消えても通知は読める。

#### `weeklyTargetMiss` — 週間ターゲット未達の週末

- 時刻: **土曜 09:00 JST**。
- **土曜の朝である理由**: 週は月曜始まり（CONTEXT.md「週間ターゲット」）なので土曜の朝には残り2日ある。日曜夜に出すと事後報告になり、それは週次レビュー（#52）の担当領域。通知は「まだ間に合ううちに動かす」ためのもの。
- 実績の読み: **既存サービス `services/targets/listWithProgress(ctx, ownerId, { weekStartJst })` をそのまま呼ぶ。** 画面（`/goals` の週間ターゲット、マイページの今日の状況）が見せている数字と通知の数字が同じ関数から出ることを保証する。
  - 同関数のシグネチャは `(ctx: QueryCtx, ownerId: string, args: { weekStartJst: string }) => Promise<TargetProgressDto[]>`。`MutationCtx` は `QueryCtx` に構造的に代入可能なので、評価器（mutation 文脈）からそのまま渡せる。
  - 同関数は内部で `requireWeekStartJst(args.weekStartJst)` を通す（月曜以外を拒否する）ので、**呼び出し側で `mondayOfWeek(dateJst)` に正規化してから渡す**。土曜に評価するので必ず今週の月曜になる。
- ターゲットが0件なら発火しない（設定が未完成なのはセットアップ Stepper / マイページ checklist の担当 — CONTEXT.md「セットアップ」）。
- 全件達成なら発火しない。**祝わない**（§4.3）。
- `shortfalls` は `achieved === false` のものだけ。`remaining = targetValue - current` は文言側で引く（保存しない — 引き算はいつでも同じ答えになる）。

#### `eveningUntouched` — 夜の未着手

- 時刻: 所有者ごとの `eveningHourJst`（既定 21、18〜23）。
- 「未着手」は `convex/lib/domain.ts` の `STATUSES = ["確定", "未着手", "進行中", "スキップ"]` の第2要素（日本語リテラル。`statusValidator` と同じ値）。
- 分岐:

| 今日の状態 | 発火 | `source` | `pendingCount` |
| --- | --- | --- | --- |
| 日があり、未着手の記録が1件以上 | する | `"day"` | 未着手の件数 |
| 日があり、未着手が0件（全部 確定/スキップ/進行中） | しない | — | — |
| 日が無く、今日の曜日のプリセットに行がある | する | `"preset"` | プリセットの行数 |
| 日が無く、今日の曜日のプリセットも無い/空 | しない | — | — |
| 日がゴミ箱にある（`deletedAt`） | 日が無い扱い（`getLiveDay` が null を返す） | — | — |

- **進行中は催促しない。** いま手を動かしている人を急かす通知は害しかない。未着手の件数だけを見る。
- **「日が無い暦日は休養」と矛盾しない理由**（§15 反論5の答え）: CONTEXT.md「休養」は **過去**で日が無いことを指す。この通知は**今日**の 18〜23 時に出るので、対象の暦日はまだ終わっていない。通知は日ドキュメントを作らないので、休養の意味論にも一切触れない。
- **プリセットも無い日（土日など自動行なし）に黙る理由**: 計画が無い日に催促するのは「休養を計画倒れに数える」こと（CONTEXT.md「履歴」_Avoid_）。プリセットの有無がそのまま「今日は計画があったか」の判定になる。

### 4.3 採用しなかったトリガー

| 案 | 却下理由 |
| --- | --- |
| 本番目標のカウントダウン節目（D-30 / D-7 / D-1） | 非行動的。「試験が近い」は何をすべきかを言わない。ADR-0003 の「アプリ内のフィードバックはプロセス（学習量）」に反する。カウントダウンは既に `/goals` とマイページに常時出ている |
| 週間ターゲット達成の祝い | 通知は行動を促すためのもの。褒めは週次レビュー（#52）の担当。祝いを足すと通知量が倍になり、催促の重みが薄れる |
| チェックポイント期限超過 | CONTEXT.md「習得」_Avoid_「未達の自動失敗記録」。期限を過ぎたら表示が変わるだけ、が既存の決定 |
| セットアップ未完了（週間ターゲット未設定の本番目標） | ホームの Stepper とマイページ checklist が同じ状態を既に見せている（CONTEXT.md「セットアップ」）。通知は3つ目の再掲になる |
| タイマー自動停止（#51 `timerAutoStoppedAt`） | #51 は行に目印を出して「分数を直してから確定して」と促す設計になっている。通知欄に出すのは同じ事実の二重表示 |
| 消化が低い曜日の助言 | 既に分析画面がプリセット画面へのリンクを出している（CONTEXT.md「履歴」）。28日窓の指標を毎日通知するのは頻度が合わない |

---

## 5. スキーマ変更（CVX-10/11/12/13/16）

### 5.1 `convex/lib/notifications.ts`（新規・純関数とドメイン定数）

`categories.ts` / `conditions.ts` / `boardScheduleColors.ts` と同じ「サブドメインの1ファイル」。Convex ランタイムを import しないので `~domain/notifications`（`tsconfig.json` の `"~domain/*": ["./convex/lib/*"]`）としてフロントからも読める。

```ts
import type { Weekday } from "./catalog";
import { daysUntil, todayJst, weekdayFromDateJst } from "./jst";
//? 型だけの import。実行時には消えるので validators.ts との循環にならない(§5.6)。
import type { NotificationSettingsDto } from "./validators";

//* 通知の種類。Convex validator / Valibot / UI が共有する固定タプル(CVX-16)。
export const NOTIFICATION_KINDS = [
  "checkpointDeadline",
  "eveningUntouched",
  "weeklyTargetMiss",
] as const satisfies readonly string[];

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

//* 夜の催促が数える対象がどこから来たか。日が無いときはプリセットの行数を数える(§4.2)。
export const NOTIFICATION_PENDING_SOURCES = ["day", "preset"] as const satisfies readonly string[];

export type NotificationPendingSource = (typeof NOTIFICATION_PENDING_SOURCES)[number];

//* 期限接近の窓。残り 0〜3 日を「接近」とする。負(期限超過)は含めない。
export const CHECKPOINT_NEAR_DAYS = 3;

//* 固定時刻トリガーの発火時(JST)。cron は毎時走り、ここと一致した回だけ評価する。
export const CHECKPOINT_HOUR_JST = 8;
export const WEEKLY_MISS_HOUR_JST = 9;
//? 土曜。週は月曜始まりなので、土曜朝はまだ2日残っている(§4.2)。
//? 曜日の値域は catalog.ts の Weekday(0=日〜6=土)。数値を裸で置かず型で縛る(CVX-16)。
export const WEEKLY_MISS_WEEKDAY = 6 satisfies Weekday;

//* 夜の催促に選べる時刻。
export const EVENING_HOUR_RANGE = { max: 23, min: 18 } as const satisfies Record<string, number>;

//* 静穏時間に選べる時刻(0〜23)。
export const QUIET_HOUR_RANGE = { max: 23, min: 0 } as const satisfies Record<string, number>;

//* 通知の保持期間。ゴミ箱(TRASH_TTL_MS)と同じ30日。
export const NOTIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

//* 1回の purge で読む上限。トランザクションを短く保つ(CVX-11 の .take による上限)。
export const NOTIFICATION_PURGE_BATCH = 200;

//* 通知欄が返す最大件数。理論上の在庫は「30日 × 最大3通/日」で90件(§6.1)。
export const NOTIFICATION_LIST_LIMIT = 50;

//* 本文に並べる明細の最大行数。超えた分は「…他N件」に畳む(§5.2)。
export const NOTIFICATION_BODY_LINE_LIMIT = 5;

//* Slack の Incoming Webhook 以外へは投げない(SSRF 防止。§9.2)。
export const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_/-]+$/;

//* 連続失敗でオプトインを自動的に落とす回数(§9.3)。
export const SLACK_FAILURE_STREAK_LIMIT = 3;

//* JST は UTC+9:00 固定・夏時間なし。時の算出は Intl を使わずこのオフセットで行う(§5.1 末尾)。
export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

//* 設定の既定値。行が無い所有者に query が**そのまま**返す値なので、
//? 形は notificationSettingsDtoValidator と1対1にしておく(services 側で足す値を作らない)。
export const NOTIFICATION_DEFAULTS = {
  enabled: false,
  eveningHourJst: 21,
  quietFromHourJst: 22,
  quietToHourJst: 7,
  slackConfigured: false,
  slackEnabled: false,
  slackFailureStreak: 0,
  triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
} as const satisfies NotificationSettingsDto;

//* 検証メッセージ。services と Valibot が同じ文言を共有する(CVX-16)。
export const EVENING_HOUR_MESSAGE = `夜の催促は${EVENING_HOUR_RANGE.min}〜${EVENING_HOUR_RANGE.max}時から選んでください`;
export const QUIET_HOUR_MESSAGE = `静穏時間は${QUIET_HOUR_RANGE.min}〜${QUIET_HOUR_RANGE.max}時で指定してください`;
export const SLACK_WEBHOOK_MESSAGE =
  "Slack の Incoming Webhook URL（https://hooks.slack.com/services/…）を入力してください";
export const SLACK_REQUIRED_MESSAGE = "Slack へ送るには Webhook URL が必要です";

//* 静穏時間の判定。from === to は「静穏なし」(24時間の静穏で全部黙るのを避ける)。
//? from > to は日付をまたぐ窓(既定の 22 → 7)。
export function isQuietHourJst(hourJst: number, fromHourJst: number, toHourJst: number): boolean {
  if (fromHourJst === toHourJst) {
    return false;
  }
  if (fromHourJst < toHourJst) {
    return hourJst >= fromHourJst && hourJst < toHourJst;
  }
  return hourJst >= fromHourJst || hourJst < toHourJst;
}

//* いま固定時刻トリガーの発火時刻か。cron の UTC 換算を関数側に閉じ込める。
export function dueFixedTriggers(dateJst: string, hourJst: number) {
  return {
    checkpointDeadline: hourJst === CHECKPOINT_HOUR_JST,
    weeklyTargetMiss:
      hourJst === WEEKLY_MISS_HOUR_JST && weekdayFromDateJst(dateJst) === WEEKLY_MISS_WEEKDAY,
  };
}

//* 期限接近の窓に入っているか(純関数、CVX-09)。
export function isDeadlineNear(todayDateJst: string, deadline: string): boolean {
  const daysLeft = daysUntil(todayDateJst, deadline);
  return daysLeft >= 0 && daysLeft <= CHECKPOINT_NEAR_DAYS;
}

export function deadlineDaysLeft(todayDateJst: string, deadline: string): number {
  return daysUntil(todayDateJst, deadline);
}

//* JST の時(0〜23)。mutation / action からだけ呼ぶ。query では呼ばない(CVX-14)。
//? JST は固定オフセットなので、UTC に +9h してから getUTCHours() で厳密に出る。
export function hourJst(now: number): number {
  return new Date(now + JST_OFFSET_MS).getUTCHours();
}

//* 「いま」の JST 座標。評価器は先頭で1回だけ時計を読み、以降はこの値を配る。
export function nowJst(now: number) {
  return { dateJst: todayJst(new Date(now)), hourJst: hourJst(now) };
}
```

> **`hourJst` を Intl で書かない理由（決定。実装者は判断しない）**
> `Intl.DateTimeFormat(..., { hour: "2-digit", hour12: false })` は、ロケールと実装によって深夜0時を `"24"` と返す系がある（`hour12` が `hourCycle` を上書きし、`h24` に落ちる経路）。`hourCycle: "h23"` を明示すれば回避できるが、**JST は UTC+9:00 固定・夏時間なし**なので、`new Date(now + JST_OFFSET_MS).getUTCHours()` が最も短く・決定的で・ロケールに依らない。日付側（`todayJst`）は既存の `Intl`（`en-CA`）実装をそのまま再利用する（作り直さない）。
>
> **`hourJst` / `nowJst` を `jst.ts` に置かず `notifications.ts` に置く理由**: `jst.ts` の冒頭コメントは「クエリ内では `Date.now()` を呼ばず、呼び出し側が `dateJst` を渡す」と宣言しており、時刻を読む関数をそこに混ぜると規約の見た目が濁る。時を読むのは通知の評価器だけなので、通知のファイルに置く。

### 5.2 `convex/lib/notificationCopy.ts`（新規・文言の SSoT）

```ts
import { TARGET_METRIC_UNITS } from "./domain";
import { NOTIFICATION_BODY_LINE_LIMIT } from "./notifications";
import type { NotificationPayload } from "./validators";

//? 明細が多いときは先頭 N 行だけ並べ、残りを「…他N件」に畳む。
//? Slack の1メッセージが長大化するのを防ぐ。件数は items.length から導出するので保存しない。
function joinLines(lines: readonly string[]): string {
  if (lines.length <= NOTIFICATION_BODY_LINE_LIMIT) {
    return lines.join("\n");
  }
  const shown = lines.slice(0, NOTIFICATION_BODY_LINE_LIMIT);
  return [...shown, `…他${lines.length - NOTIFICATION_BODY_LINE_LIMIT}件`].join("\n");
}

//* 通知の文言はここだけで組む。Slack のテキストも通知欄の表示も同じ関数を通る(CVX-16)。
//? 保存するのは数値と非正規化した参照先テキストだけ。文言そのものは保存しない —
//? 誤字の修正が過去分にも及ぶのが望ましい(凍結すべきは「事実」で「言い方」ではない)。
export function notificationMessage(payload: NotificationPayload): {
  body: string;
  title: string;
} {
  switch (payload.kind) {
    case "checkpointDeadline":
      return {
        body: joinLines(
          payload.items.map(
            (item) =>
              `・${item.content}（${item.daysLeft === 0 ? "今日まで" : `あと${String(item.daysLeft)}日`} / ${item.deadline}）`,
          ),
        ),
        title: "チェックポイントの期限が近づいています",
      };
    case "weeklyTargetMiss":
      return {
        body: joinLines(
          payload.shortfalls.map(
            (shortfall) =>
              `・${shortfall.categoryName} あと${String(shortfall.targetValue - shortfall.current)}${TARGET_METRIC_UNITS[shortfall.metric]}`,
          ),
        ),
        title: "今週の週間ターゲットが未達です",
      };
    default:
      return {
        body:
          payload.source === "day"
            ? `未着手が${String(payload.pendingCount)}件残っています。`
            : `今日はまだ開いていません。今日のプリセットに${String(payload.pendingCount)}件あります。`,
        title: "今日の残りがあります",
      };
  }
}
```

`switch` の最後を `default` にするのは既存の `currentForMetric`（`services/targets/aggregateByCategory.ts`）と同じ書き方。

### 5.3 `TARGET_METRIC_UNITS` の移動（SSoT の是正）

いま `src/lib/target-metric-units.ts` にある `TARGET_METRIC_UNITS`（`{ count: "件", days: "日", minutes: "分" }`、`as const satisfies Record<TargetMetric, string>`）を **`convex/lib/domain.ts` へ移す**。理由: サーバが組む Slack 本文に同じ単位が出るので、単位はもう UI 専有の飾りではない（`TARGET_METRICS` タプルと同じ層の値）。表示ラベル（`TARGET_METRIC_LABELS` = 「件数 / 実施日 / 分」）は UI のままにする。

| ファイル | 変更 |
| --- | --- |
| `convex/lib/domain.ts` | `TARGET_METRIC_UNITS` を追加（`TARGET_METRICS` / `TargetMetric` の直下） |
| `src/lib/target-metric-units.ts` | 削除（`vp run fallow` で参照残りを検出できる） |
| `src/features/goals/lib/target-metric-labels.ts` | `import { TARGET_METRIC_UNITS } from "~domain/domain"` に差し替え。**既存の `export { TARGET_METRIC_UNITS }` 再輸出はそのまま維持**し、下流を触らない |
| `src/features/today/lib/target-remainder.ts` | import 元を `~domain/domain` に差し替え |

### 5.4 `convex/lib/validators.ts` への追加

既存ファイルは冒頭で `import { type Infer, v } from "convex/values"` を済ませているので、追加するのは import 1行と下記の定義だけ。

```ts
import { NOTIFICATION_KINDS, NOTIFICATION_PENDING_SOURCES } from "./notifications";

const [checkpointDeadlineKind, eveningUntouchedKind, weeklyTargetMissKind] = NOTIFICATION_KINDS;
const [daySource, presetSource] = NOTIFICATION_PENDING_SOURCES;

//* 通知の種類。UI のフィルタと設定のキー集合がここから派生する。
export const notificationKindValidator = v.union(
  v.literal(checkpointDeadlineKind),
  v.literal(eveningUntouchedKind),
  v.literal(weeklyTargetMissKind),
);

export type NotificationKindDto = Infer<typeof notificationKindValidator>;

//? 参照先のテキストは生成時に写す。親目標がカスケード削除されても通知は読める(#48 INV-6)。
//? goalId は残すが、リンク先はページ(/goals)なので「開けない」ことは起きない。
const checkpointDeadlineItemValidator = v.object({
  content: v.string(),
  daysLeft: v.number(),
  deadline: v.string(),
  goalId: v.id("goals"),
});

const weeklyTargetShortfallValidator = v.object({
  categoryName: v.string(),
  current: v.number(),
  metric: targetMetricValidator,
  targetValue: v.number(),
});

//* 通知の中身。種類ごとに形が変わる discriminated union(目標の goalDocumentValidator と同じ流儀)。
//? 「1発火単位 = 1通」なので、複数件は配列で1つの payload に入る(§4.1)。
export const notificationPayloadValidator = v.union(
  v.object({
    dateJst: v.string(),
    items: v.array(checkpointDeadlineItemValidator),
    kind: v.literal(checkpointDeadlineKind),
  }),
  v.object({
    dateJst: v.string(),
    kind: v.literal(eveningUntouchedKind),
    pendingCount: v.number(),
    source: v.union(v.literal(daySource), v.literal(presetSource)),
  }),
  v.object({
    kind: v.literal(weeklyTargetMissKind),
    shortfalls: v.array(weeklyTargetShortfallValidator),
    weekStartJst: v.string(),
  }),
);

export type NotificationPayload = Infer<typeof notificationPayloadValidator>;

//* トリガーごとのオプトイン。キー集合は NOTIFICATION_KINDS と一致する。
//? 一致は評価器の `setting.triggers[kind]` アクセスで tsc が守る — キーを足し忘れると型エラーになる。
export const notificationTriggerPrefsValidator = v.object({
  checkpointDeadline: v.boolean(),
  eveningUntouched: v.boolean(),
  weeklyTargetMiss: v.boolean(),
});

export type NotificationTriggerPrefs = Infer<typeof notificationTriggerPrefsValidator>;

//* 通知欄の1行。readAt は boolean に畳む(dayDtoValidator の null 正規化と同じ規則)。
export const notificationDtoValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("notifications"),
  payload: notificationPayloadValidator,
  read: v.boolean(),
});

export type NotificationDto = Infer<typeof notificationDtoValidator>;

export const notificationPageValidator = v.object({
  items: v.array(notificationDtoValidator),
  unreadCount: v.number(),
});

export type NotificationPageDto = Infer<typeof notificationPageValidator>;

//* 設定の DTO。**slackWebhookUrl は含めない**(§9.2)。設定済みかどうかだけを boolean で出す。
export const notificationSettingsDtoValidator = v.object({
  enabled: v.boolean(),
  eveningHourJst: v.number(),
  quietFromHourJst: v.number(),
  quietToHourJst: v.number(),
  slackConfigured: v.boolean(),
  slackEnabled: v.boolean(),
  slackFailureStreak: v.number(),
  triggers: notificationTriggerPrefsValidator,
});

export type NotificationSettingsDto = Infer<typeof notificationSettingsDtoValidator>;

//* Slack 配信の入力。internalQuery が返し、internalAction が使う。公開 query では返さない。
export const slackDeliveryValidator = v.object({
  text: v.string(),
  webhookUrl: v.string(),
});

export type SlackDelivery = Infer<typeof slackDeliveryValidator>;
```

### 5.5 `convex/schema.ts`

```ts
  //? サーバ発の通知1件。dedupeKey が「同じ事実を二度作らない」の唯一の保証(§6.1)。
  //? 文言は保存しない — payload の数値と非正規化テキストから notificationMessage が組む。
  notifications: defineTable({
    dedupeKey: v.string(),
    ownerId: v.string(),
    payload: notificationPayloadValidator,
    readAt: v.optional(v.number()),
    slackDeliveredAt: v.optional(v.number()),
    slackError: v.optional(v.string()),
  })
    //? 通知欄は _creationTime 降順で読む。CVX-12 の「特定の _creationTime 順が必要」例外に当たる。
    .index("by_owner", ["ownerId"])
    //? 発火時の重複確認。eq(ownerId).eq(dedupeKey) + take(1)。
    .index("by_owner_and_dedupeKey", ["ownerId", "dedupeKey"]),

  //? 通知のオプトイン設定。行が無い = 通知しない。評価器の所有者列挙もこの表から引く(§10.5)。
  notificationSettings: defineTable({
    enabled: v.boolean(),
    eveningHourJst: v.number(),
    ownerId: v.string(),
    quietFromHourJst: v.number(),
    quietToHourJst: v.number(),
    slackEnabled: v.boolean(),
    slackFailureStreak: v.number(),
    //? 書き込み専用。公開 query の返り値に入れない(§9.2)。
    slackWebhookUrl: v.optional(v.string()),
    triggers: notificationTriggerPrefsValidator,
  })
    .index("by_owner", ["ownerId"])
    //? cron の所有者列挙。夜の催促は時が一致する所有者だけに絞れる(§10.5)。
    .index("by_enabled_and_eveningHourJst", ["enabled", "eveningHourJst"]),
```

**インデックスの正当化（CVX-12）**

| index | 用途 | 重複していない理由 |
| --- | --- | --- |
| `notifications.by_owner` | 通知欄（`eq(ownerId)` + `order("desc")`） | `by_owner_and_dedupeKey` のプレフィックスだが、後者で `order("desc")` すると（`dedupeKey` 降順 → `_creationTime` 降順）になり時刻順にならない。**CVX-12 が明記する「特定の `_creationTime` ソート順が必要」例外**そのもの |
| `notifications.by_owner_and_dedupeKey` | 発火時の存在確認（`take(1)`） | 上と用途が背反（片方は順序、片方は等値） |
| `notificationSettings.by_owner` | 設定の読み書き（upsert） | 下の index は先頭列が `enabled` なのでプレフィックス関係にない |
| `notificationSettings.by_enabled_and_eveningHourJst` | cron の所有者列挙 | 同上 |

`.filter()` はどこにも書かない（CVX-10）。取得後の絞り込みは TypeScript 側（`deletedAt` 除外・`achievedAt` 除外など）。`purgeExpired` は index を張らず `.take()` で読む（§10.2）。

### 5.6 `convex/lib/domain.ts`（`TARGET_METRIC_UNITS` の追加のみ。通知定数は再輸出**しない**）

`CATEGORIES` / `CONDITIONS` は `domain.ts` が末尾で再輸出しているが、**通知の定数は再輸出しない。**

**循環 import になるため。** `jst.ts` は `domain.ts` から `DATE_JST_PATTERN` を import している。`notifications.ts` は `jst.ts` から `daysUntil` / `weekdayFromDateJst` / `todayJst` を import する。ここで `domain.ts` が `notifications.ts` を再輸出すると `domain → notifications → jst → domain` の輪ができる。ESM は関数宣言なら耐えるが、`const` の初期化順に依存する壊れ方をするので作らない（`categories.ts` / `conditions.ts` が再輸出できているのは、それらが `jst.ts` を import しないからである）。

したがって:

- 通知の定数・メッセージ・純関数は **`~domain/notifications`（サーバ側は `./notifications`）から直接** import する。
- `domain.ts` への追加は `TARGET_METRIC_UNITS`（§5.3）だけ。これは `jst.ts` を参照しないので輪にならない。

```ts
// convex/lib/domain.ts に追加（TARGET_METRICS / TargetMetric の直下）
//* 週間ターゲットの単位。Slack 本文もサーバが組むので、単位はもう UI 専有の飾りではない(§5.3)。
export const TARGET_METRIC_UNITS = {
  count: "件",
  days: "日",
  minutes: "分",
} as const satisfies Record<TargetMetric, string>;
```

### 5.7 移行

**マイグレーション不要。両方とも新規テーブル。** 既存ドキュメントに触るのは §5.3 の import 差し替えだけで、値も形も変わらない。

- 既存の全所有者は `notificationSettings` 行を持たない = 通知 off。**既存利用者に無断で通知が飛ぶことはない**（オプトインの副作用として自動的に保証される）。
- ロールバック: 実装をひとつ前に戻すと2つのテーブルが孤立して残るだけ。学習量・履歴・共有文・目標にはいっさい触れていないので、破壊的なロールバック手順は不要。
- `@convex-dev/migrations` は入れない。

---

## 6. 頻度制御と静穏時間

### 6.1 上限は数える仕組みを持たない。`dedupeKey` の粒度がそのまま上限

```
checkpointDeadline:{dateJst}      → 1所有者あたり 1通/日
eveningUntouched:{dateJst}        → 1所有者あたり 1通/日
weeklyTargetMiss:{weekStartJst}   → 1所有者あたり 1通/週
```

**所有者あたり最大 2通/日 ＋ 週1通（土曜のみ3通）。** カウンタも「1日N通まで」の設定も持たない。理由:

- 数える機構は「数え間違い」というバグの部屋を作る。dedupeKey は**存在確認1回**で同じ効果を出す。
- 上限が設定でなく構造なので、トリガーを足すときに上限も自動で1つ増える（設計者が上限値を更新し忘れる経路が無い）。
- 目標や記録が増えても通知は増えない（複数件は1通に畳む — §4.1）。**「crowded な目標構成が通知の嵐になる」経路が原理的に無い。**

`emitNotification` は insert の直前に `by_owner_and_dedupeKey` で `take(1)` し、あれば何もしない。cron が同じ時刻に二重に走っても（再試行・手動実行）2通目は作られない。**べき等性はこの1箇所に閉じている。**

### 6.2 静穏時間（JST）

| 設定 | 既定 | 範囲 |
| --- | --- | --- |
| `quietFromHourJst` | 22 | 0〜23 の整数 |
| `quietToHourJst` | 7 | 0〜23 の整数 |

- 判定は `isQuietHourJst(hourJst, from, to)`（§5.1）。`from > to` は日付をまたぐ窓。`from === to` は**静穏なし**（24時間静穏で全部黙る状態を作らない）。
- **効くのは押し出し（Slack / 将来の Web Push）だけ。通知欄の行は静穏中でも作る。** 通知欄は pull（本人が開いたときに読む）なので、静穏の概念が意味を持たない。
- 静穏で落とした押し出しは**翌朝に持ち越さない**。行は残っているので情報は失われず、「昨夜の催促が今朝届く」= もう行動できない通知を作らない。
- 落ちたことを行に記録しない（`slackDeliveredAt` も `slackError` も undefined = 「Slack へは送っていない」）。代わりに**設定画面に明記する**: 「静穏時間中の通知は Slack へ送りません（通知欄には残ります）」。

**この設定が v1 で効く具体的な場面**（「固定時刻トリガーだけなら死んだ設定では？」への答え）:

1. `eveningHourJst` を 23 にし、静穏を既定（22〜7）のままにした所有者 → 通知欄には出るが Slack には出ない。**設定同士の衝突が実際に起きる。**
2. cron の遅延・再試行で発火が静穏時間帯にずれ込んだとき。
3. 後続チケット（#58 完了後・§2.4）で Web Push が入ったとき、静穏時間の意味論を**その時に決め直さなくてよい**。

同時に、v1 の既定値（夜21時・静穏22〜7）では静穏が押し出しを止めることは無い。**それが正しい既定である**（既定で黙る通知は要らない）。設定画面では「Slack を有効にした人だけに関係する」ことを明示する（§10.3）。

### 6.3 発火の見落としと遡り生成

| 状況 | 挙動 |
| --- | --- |
| cron が1回落ちた（その時が過ぎた） | その回は失われる。**遡って作らない** |
| cron が丸1日落ちた | `checkpointDeadline` は翌朝の範囲判定（残り0〜3日）に含まれるので実質回復する。`eveningUntouched` / `weeklyTargetMiss` はその日/その週ぶんを失う |
| 同じ時に2回走った | dedupeKey で2通目は作らない |
| 期限を編集した（3日後 → 明日） | dedupeKey は日単位なので、その日すでに通知済みなら翌朝から新しい `daysLeft` で出る |
| 通知を有効にした（`enabled: false → true`）| その回の発火は作らない。**次の該当時刻から**出る（設定保存が通知を吐かない） |

**遡り生成をしない理由**: 通知はその時刻に意味がある。夜の催促を翌朝作るのは「行動できない催促」で、通知欄の信頼を落とす。範囲判定（§4.2）を入れたのは、この方針のもとで**期限だけは取りこぼしを自己修復させる**ため。

---

## 7. 保持期間

- `NOTIFICATION_TTL_MS = 30日`。ゴミ箱の `TRASH_TTL_MS` と同じ値・別定数（意味が違うものを同じ定数で兼用しない）。
- 未読でも消す。**読まれない催促を永久に溜めない。**
- 掃除は `purgeExpired`（日次 cron）。読みは `.take(NOTIFICATION_PURGE_BATCH)` で上限を切り、1回で消し切れなくても翌日続く（30日境界を1日ずらすだけなので害がない）。

---

## 8. 関数サーフェス（CVX-01/02/03/04/05/20）

### 8.1 crons — 評価1本 ＋ 掃除1本

```ts
// convex/crons.ts に追加（既存の trash / avatar クレーム掃除の下）
crons.hourly(
  "evaluate notifications",
  { minuteUTC: 0 },
  internal.mutations.notifications.evaluate.evaluate,
  {},
);

crons.daily(
  "purge expired notifications",
  { hourUTC: 15, minuteUTC: 30 },
  internal.mutations.notifications.purgeExpired.purgeExpired,
  {},
);
```

`internal.*` のみを指す（CVX-05）。`crons.ts` は `api` を import しない（既存のまま）。既存 cron 名（`"purge expired trash"` / `"purge expired avatar upload claims"`）とは重複しない。

**トリガー3本に対して評価 cron が1本である理由**:

1. **UTC 換算をコードから追い出せる。** 08:00 JST = 前日 23:00 UTC、土曜 09:00 JST = 土曜 00:00 UTC。cron 定義に書くとオフバイワンの温床で、しかもテストできない。毎時走って JST 側で判定すれば、判定は `dueFixedTriggers` という**純関数のテスト対象**になる。
2. **`eveningHourJst` が所有者ごとに違う。** 固定 cron では per-user 時刻を表現できない。
3. `now` を1回だけ読み、3つの評価器に配れる（時計を読む場所が1箇所）。

**代償**: 1日24回の invocation。1〜2人のアプリでは無視できる。何もしない回は「`enabled` かつ `eveningHourJst` が一致する所有者」の index 読みだけで終わる（0件なら即 return）。

`minuteUTC: 0` は JST でも分0（JST は UTC+9:00 の固定オフセット、夏時間なし）。

### 8.2 internal 関数

| ファイル | export | 種別 | args | returns | 委譲先 |
| --- | --- | --- | --- | --- | --- |
| `convex/mutations/notifications/evaluate.ts` | `evaluate` | `internalMutation` | `{ now: v.optional(v.number()) }` | `v.null()` | `services/notifications/evaluate.ts` |
| `convex/mutations/notifications/purgeExpired.ts` | `purgeExpired` | `internalMutation` | `{ now: v.optional(v.number()) }` | `v.null()` | `services/notifications/purgeExpired.ts` |
| `convex/mutations/notifications/markSlackDelivered.ts` | `markSlackDelivered` | `internalMutation` | `{ error: v.optional(v.string()), notificationId: v.id("notifications") }` | `v.null()` | `services/notifications/markSlackDelivered.ts` |
| `convex/queries/notifications/deliveryPayload.ts` | `deliveryPayload` | `internalQuery` | `{ notificationId: v.id("notifications") }` | `v.union(slackDeliveryValidator, v.null())` | `services/notifications/deliveryPayload.ts` |
| `convex/actions/notifications/deliverSlack.ts` | `deliverSlack` | `internalAction` | `{ notificationId: v.id("notifications") }` | `v.null()` | （action 本体。§9.1） |

`internalMutation` / `internalQuery` / `internalAction` は `convex/_generated/server` から import する（`ownerQuery` / `ownerMutation` は `ctx.auth.getUserIdentity()` に依っており、cron / scheduler 文脈では使えない）。形は既存の `mutations/trash/purgeExpired.ts` にそろえる。

```ts
// convex/mutations/notifications/evaluate.ts — API 層は薄く保つ(CVX-02)
import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { evaluate as evaluateNotifications } from "../../services/notifications/evaluate";

//? now を引数で受けるのはテストの縫い目。cron は {} を渡し、テストは固定時刻を注入する。
export const evaluate = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => evaluateNotifications(ctx, args),
  returns: v.null(),
});
```

**`purgeExpired` の読み（決定済み。実装者は判断しない）**:

```ts
const cutoff = now - NOTIFICATION_TTL_MS;
//? 素のテーブルスキャンは組み込みの by_creation_time 昇順(= 最古から)なので、
//? .take で上限を切れば「古い順に最大200件」を読める(CVX-11 の許容手段)。
//? .filter は書かない(CVX-10)。cutoff の判定は TypeScript 側で行う。
const oldest = await ctx.db.query("notifications").take(NOTIFICATION_PURGE_BATCH);
for (const doc of oldest) {
  if (doc._creationTime < cutoff) {
    await ctx.db.delete("notifications", doc._id);
  }
}
```

`withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))` が生成型で通るならそちらでもよいが、**通らなくても実装が止まらないよう上の形を正とする**。`_creationTime` 用の独自 index は張らない（CVX-12）。

### 8.3 公開 query / mutation

| ファイル | export | 種別 | args | returns |
| --- | --- | --- | --- | --- |
| `convex/queries/notifications/list.ts` | `list` | `ownerQuery` | `{}` | `notificationPageValidator` |
| `convex/queries/notifications/settings.ts` | `settings` | `ownerQuery` | `{}` | `notificationSettingsDtoValidator` |
| `convex/mutations/notifications/saveSettings.ts` | `saveSettings` | `ownerMutation` | 下記 | `v.id("notificationSettings")` |
| `convex/mutations/notifications/markRead.ts` | `markRead` | `ownerMutation` | `{ notificationIds: v.array(v.id("notifications")) }` | `v.null()` |
| `convex/mutations/notifications/markAllRead.ts` | `markAllRead` | `ownerMutation` | `{}` | `v.null()` |
| `convex/mutations/notifications/disconnectSlack.ts` | `disconnectSlack` | `ownerMutation` | `{}` | `v.null()` |

`ownerQuery` / `ownerMutation`（`convex/lib/ownerFunctions.ts`）は `convex-helpers` の `customQuery` / `customMutation` で `ctx.ownerId` を注入し、未認証なら `ownerFromIdentity` 由来の `UnauthenticatedError` を `throwDomain` する（CVX-04）。全公開関数に args validator（CVX-03）。

```ts
// convex/mutations/notifications/saveSettings.ts
export const saveSettings = ownerMutation({
  args: {
    enabled: v.boolean(),
    eveningHourJst: v.number(),
    quietFromHourJst: v.number(),
    quietToHourJst: v.number(),
    slackEnabled: v.boolean(),
    //? 未指定 = 既存の URL を保つ。空文字は受け取らない(解除は disconnectSlack)。
    slackWebhookUrl: v.optional(v.string()),
    triggers: notificationTriggerPrefsValidator,
  },
  handler: async (ctx, args) => saveNotificationSettings(ctx, ctx.ownerId, args),
  returns: v.id("notificationSettings"),
});
```

**`list` は引数を取らない（CVX-14）**。`Date.now()` も `dateJst` も要らない — 未読かどうかは `readAt` の有無だけで決まり、相対時刻の表示（「3時間前」ではなく `M/D HH:mm`）はクライアントが `_creationTime` から作る。**query が時計を読む経路が構造的に無い。**

**`list` の読みは1回**:

```ts
//? 在庫は TTL(30日) × 最大3通/日 = 理論上90件。所有者条件つきの collect で足りる(CVX-11)。
const all = await ctx.db
  .query("notifications")
  .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
  .order("desc")
  .collect();
return {
  items: all.slice(0, NOTIFICATION_LIST_LIMIT).map(toNotificationDto),
  unreadCount: all.filter((doc) => doc.readAt === undefined).length,
};
```

未読数は**在庫全件**から数えるので、表示が50件で打ち切られてもバッジの数は正しい。

**`settings` は行が無いとき `NOTIFICATION_DEFAULTS` を返す**（`enabled: false`）。フォームの初期値がサーバ由来で1本になり、クライアントに既定値を書かない。

`saveSettings` は upsert（`targets.save` と同じ流儀。1所有者1行は services 側で守る）。**行の作成 = オプトイン**なので、この mutation が「通知を有効にする」の入口も兼ねる。保存自体は通知を発火させない（§6.3 最終行）。

**`markAllRead` を別 mutation にする理由**: `list` が返す `items` は最新50件なので、51件目以降の未読 id はクライアントに存在しない。「すべて既読にする」を id 配列で実装すると**画面に出ていない未読が既読にならず、バッジが下がらない**。所有者の未読を全件 patch する `{}` 引数の mutation にすれば、この不整合が構造的に起きない。`markRead` は行クリック（1件）用に残す。

### 8.4 services（1関数1ファイル、CVX-20）

| ファイル | 役割 |
| --- | --- |
| `services/notifications/evaluate.ts` | 評価の司令塔。時計を1回読み、所有者を列挙し、3評価器を回す |
| `services/notifications/loadDueSettings.ts` | 発火対象の `notificationSettings` を index で引く（§8.5） |
| `services/notifications/evaluateCheckpointDeadline.ts` | 期限接近の payload を作る（無ければ null） |
| `services/notifications/evaluateWeeklyTargetMiss.ts` | 未達ターゲットの payload を作る |
| `services/notifications/evaluateEveningUntouched.ts` | 夜の未着手の payload を作る |
| `services/notifications/emitNotification.ts` | dedupe 確認 → insert → 押し出しの schedule |
| `services/notifications/purgeExpired.ts` | TTL 超過の削除（§8.2） |
| `services/notifications/list.ts` | 通知欄の DTO を組む |
| `services/notifications/toNotificationDto.ts` | `Doc<"notifications">` → `NotificationDto`（`readAt` を `read` に畳む） |
| `services/notifications/settings.ts` | 設定 DTO（Webhook URL を落とす） |
| `services/notifications/saveSettings.ts` | upsert ＋ 値の検証 |
| `services/notifications/markRead.ts` | 所有権確認 ＋ `readAt` の patch |
| `services/notifications/markAllRead.ts` | 所有者の未読を全件 patch |
| `services/notifications/disconnectSlack.ts` | `slackWebhookUrl` 削除 ＋ `slackEnabled: false` ＋ streak リセット |
| `services/notifications/markSlackDelivered.ts` | 配信結果の記録 ＋ 連続失敗の自動停止 |
| `services/notifications/deliveryPayload.ts` | 通知 → `{ text, webhookUrl }` |
| `services/notifications/requireOwnedNotification.ts` | `requireOwnedGoal` / `requireOwnedRow` と同じ形の所有権ガード |
| `services/notifications/getOwnerSettings.ts` | `by_owner` で1行引く（無ければ null） |

`ctx.runQuery` / `ctx.runMutation` は**query / mutation の中では使わない**（CVX-08）。すべて同一トランザクション内の素の関数呼び出し。`ctx.run*` を使うのは `deliverSlack`（action）だけで、これは CVX-07 が認める「読みを1本の internalQuery に、書きを1本の internalMutation に畳み、その間に外部呼び出しを置く」形。

### 8.5 評価器のデータ読み（CVX-10/11）

```ts
// convex/services/notifications/evaluate.ts（骨格）
export async function evaluate(ctx: MutationCtx, args: { now?: number } = {}): Promise<null> {
  const now = args.now ?? Date.now();               //? mutation なので時計を読んでよい(CVX-14)
  const { dateJst, hourJst: hour } = nowJst(now);
  const due = dueFixedTriggers(dateJst, hour);
  const settings = await loadDueSettings(ctx, {
    fixedDue: due.checkpointDeadline || due.weeklyTargetMiss,
    hour,
  });

  for (const setting of settings) {
    const payloads = [
      due.checkpointDeadline && setting.triggers.checkpointDeadline
        ? await evaluateCheckpointDeadline(ctx, setting.ownerId, dateJst)
        : null,
      due.weeklyTargetMiss && setting.triggers.weeklyTargetMiss
        ? await evaluateWeeklyTargetMiss(ctx, setting.ownerId, dateJst)
        : null,
      hour === setting.eveningHourJst && setting.triggers.eveningUntouched
        ? await evaluateEveningUntouched(ctx, setting.ownerId, dateJst)
        : null,
    ];
    for (const payload of payloads) {
      if (payload !== null) {
        await emitNotification(ctx, setting, payload, now);
      }
    }
  }
  return null;
}
```

すべての promise を `await` する（CVX-17）。`ctx.db.*` は必ずテーブル名が第1引数（CVX-13）。

**所有者の列挙（`loadDueSettings`）**

```ts
//* 固定時刻トリガーの回は「有効な全所有者」、それ以外の回は「夜の時刻が一致する所有者」だけ。
//? どちらも index 条件つき。テーブル全体の無条件 collect はしない(CVX-11)。
export async function loadDueSettings(
  ctx: MutationCtx,
  args: { fixedDue: boolean; hour: number },
): Promise<Doc<"notificationSettings">[]> {
  if (args.fixedDue) {
    return await ctx.db
      .query("notificationSettings")
      .withIndex("by_enabled_and_eveningHourJst", (q) => q.eq("enabled", true))
      .collect();
  }
  return await ctx.db
    .query("notificationSettings")
    .withIndex("by_enabled_and_eveningHourJst", (q) =>
      q.eq("enabled", true).eq("eveningHourJst", args.hour),
    )
    .collect();
}
```

24回のうち22回は下側（時が一致する所有者だけ）を通る。上側を通るのは 08時と土曜09時。**`.collect()` の対象は「通知を有効にした所有者」で、`enabled` の index 条件がある**（`.filter` は使わない）。

スケーリングの注記: 有効所有者が数百人規模になったら、この1トランザクションを `ctx.scheduler.runAfter(0, internal.mutations.notifications.evaluateOwner.evaluateOwner, { ownerId })` に fan out する（scheduler は `internal.*` を指すので CVX-05 内）。**v1 ではしない**（§15 反論13）。

**各評価器の読み**

| 評価器 | 読むもの | index |
| --- | --- | --- |
| `evaluateCheckpointDeadline` | `goals`（`ownerId` + `type: "mastery"`）→ TS で `deadline !== undefined && achievedAt === undefined && isDeadlineNear(...)` | `by_owner_and_type` |
| `evaluateWeeklyTargetMiss` | 既存 `services/targets/listWithProgress(ctx, ownerId, { weekStartJst: mondayOfWeek(dateJst) })` を呼ぶ | 既存実装（`targets` / `rows` / `days` を週範囲で narrow） |
| `evaluateEveningUntouched` | `getLiveDay(ctx, ownerId, dateJst)` → あれば `liveRowsForDay(ctx, day._id)` で `status === "未着手"` を数える。無ければ `presets`（`ownerId` + `weekday: weekdayFromDateJst(dateJst)`）の `lines.length` | `by_owner_and_date` / `by_day` / `by_owner_and_weekday` |

すべて既存サービスと既存 index の再利用で、**新しい読み方を発明しない**。`.filter()` は使わない（CVX-10。`liveRowsForDay` 内の `Array.prototype.filter` は取得後の TS 側の絞り込みで、これは CVX-10 が認める形）。

**OCC について**: 21時台の評価は所有者が記録を確定している最中に走り得るので、`rows` の読みが書き込みと衝突して OCC 再試行になる可能性がある。Convex は mutation を自動再試行するので実害はなく、再試行後も dedupeKey で二重生成しない。**再試行安全性が dedupe に集約されていること**が、この設計で OCC を気にしなくていい理由。

---

## 9. Slack 配信

### 9.1 経路

```
evaluate (internalMutation)
  └─ emitNotification: insert notifications
       └─ ctx.scheduler.runAfter(0, internal.actions.notifications.deliverSlack.deliverSlack, { notificationId })
              │  ※ slackEnabled かつ URL 設定済みかつ静穏時間外のときだけ
              ▼
deliverSlack (internalAction)
  ├─ ctx.runQuery(internal.queries.notifications.deliveryPayload…)   ← 読みは1回
  ├─ fetch(webhookUrl, POST)                                          ← 外部呼び出し
  └─ ctx.runMutation(internal.mutations.notifications.markSlackDelivered…) ← 書きは1回
```

- `ctx.scheduler.runAfter` の対象は `internal.*`（CVX-05）。
- mutation から action を呼ぶのに `ctx.runAction` は**使わない**（CVX-06/07）。scheduler 経由なので、Slack が落ちていても記録のトランザクションは巻き戻らない。
- action は読み1回・外部1回・書き1回で、CVX-07 の推奨形そのまま。
- **`"use node"` は不要。** `fetch` は Convex ランタイムで使える。ファイル冒頭に `"use node"` を書かない（書くと無用にランタイムを分ける）。

```ts
// convex/actions/notifications/deliverSlack.ts
import { Result } from "better-result";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { SlackDeliveryError } from "../../lib/errors";

export const deliverSlack = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const delivery = await ctx.runQuery(
      internal.queries.notifications.deliveryPayload.deliveryPayload,
      args,
    );
    //? 通知が消えた/Slack が解除された場合は静かに終わる。
    if (delivery === null) {
      return null;
    }
    //? 外部呼び出しは Result で包む(better-result: 期待される失敗は throw にしない)。
    const posted = await Result.tryPromise({
      try: () =>
        fetch(delivery.webhookUrl, {
          body: JSON.stringify({ text: delivery.text }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      catch: (cause) => new SlackDeliveryError({ cause, message: "Slack への送信に失敗しました" }),
    });
    const error = Result.isError(posted)
      ? posted.error.message
      : posted.value.ok
        ? undefined
        : `Slack から ${String(posted.value.status)} が返りました`;
    await ctx.runMutation(internal.mutations.notifications.markSlackDelivered.markSlackDelivered, {
      error,
      notificationId: args.notificationId,
    });
    return null;
  },
  returns: v.null(),
});
```

`SlackDeliveryError` は `convex/lib/errors.ts` に `TaggedError("SlackDelivery")<{ cause?: unknown; message: string }>` として足す。**既存の `DomainError` union には入れない** — これはドメインエラーではなく配信の失敗で、`throwDomain` の対象ではない（`ConvexError` としてクライアントへ出さない）。

**本文の組み立て**（`services/notifications/deliveryPayload.ts`）:

```
{title}
{body}
{SITE_URL}
```

`SITE_URL` は既存の Convex deployment env（`docs/spec.md` の秘密一覧にある）。`convex/lib/env.ts` の必須 env 取得は使わず、**未設定ならリンク行を省く**（通知が env の欠落で落ちない）。

**リトライしない。** 通知はその時刻に意味があり、遅れて届く価値が低い。失敗は行（`slackError`）と設定（`slackFailureStreak`）に残す。

### 9.2 Webhook URL の扱い

`.claude/rules/common/security.md` は「秘密をソースに書かない」を禁じているが、これは**所有者が入力した所有者自身のデータ**であり、ソースにも env にも書かない。ただし bearer capability URL なので、次の4つを守る。

1. **公開 query では絶対に返さない。** `notificationSettingsDtoValidator` に `slackWebhookUrl` を入れない（§5.4）。DTO の形が SSoT なので、うっかり返す実装は returns validator で落ちる。返すのは `slackConfigured: boolean` だけ。
2. **前置検証（SSRF 防止）。** `saveSettings` の services 側で `SLACK_WEBHOOK_PATTERN` に一致しなければ `ValidationFailedError`（`SLACK_WEBHOOK_MESSAGE`）。同じ正規表現を Valibot 側でも使う（§11）。任意のホストへ POST させない。
3. **解除できる。** `disconnectSlack` が `slackWebhookUrl: undefined` に patch し、`slackEnabled: false`、`slackFailureStreak: 0` に戻す。
4. **UI に伏せる。** 設定済みなら `PasswordInput` に空の値と「設定済み（再入力で置き換え）」の description を出す。空のまま保存したときは既存 URL を保つ（`slackWebhookUrl` を送らない）。

**譲歩（明記する）**: Convex の保存時暗号化に依り、アプリ側で追加の暗号化はしない。Webhook URL の漏洩リスクは「自分の Slack チャンネルに他人が投稿できる」で、学習ログのデータ流出ではない。1〜2人のアプリでこの残余リスクを受け入れる。

### 9.3 失敗と自動停止

`markSlackDelivered` の1トランザクションで（CVX-15）:

| 結果 | notifications | notificationSettings |
| --- | --- | --- |
| 成功 | `slackDeliveredAt: now`、`slackError: undefined` | `slackFailureStreak: 0` |
| 失敗 | `slackError: message` | `slackFailureStreak: +1`。`SLACK_FAILURE_STREAK_LIMIT(=3)` に達したら `slackEnabled: false` |

自動停止は Webhook が失効した（チャンネル削除・アプリ削除）ときに毎回無駄な fetch を打ち続けないため。停止したことは**通知にしない**（新しい kind を作らない）。設定画面に `Alert` で出す:「Slack への送信が3回続けて失敗したため、連携を停止しました。URL を確認してください。」

`slackFailureStreak` は `saveSettings` で URL を入れ替えたときにも 0 に戻す（新しい URL に古い失敗回数を引き継がない）。

---

## 10. UI 構造（Mantine 優先 / Paper Redesign）

### 10.1 通知ベルの置き場所

ヘッダー（`src/components/app-shell.tsx`）のアカウントメニューの左。全画面共通。

**`src/components/` に置く（`src/features/notifications/` を作らない）理由**: `app-shell.tsx` は共有ゾーンにあり、`.claude/rules/typescript/project-structure.md` の「shared code may not import features」に縛られる。`AppShell` を描くのは `features/auth/components/owner-gate.tsx` だけなので、`accountMenu` と同じように prop で渡すと `features/auth → features/notifications` の feature 間依存になり、これも禁止。よって共有ゾーンが唯一の置き場であり、同時にそれが正しい — 通知欄はどの画面でも同じ形で出る全画面共通の部品である（`learning-date-navigation.tsx` / `condition-badge.tsx` と同じ位置づけ）。

`AppShell` は `OwnerGate` が `session.data` を確認した後にしか描かれないので、ベルの中は**常に認証済み**。prop も条件分岐も追加しない。

**差し替え箇所（正確に）**: `app-shell.tsx` のヘッダー `<Group align="center" gap="sm" justify="space-between" mb="lg" wrap="nowrap">` の中の、裸の `{accountMenu}` を次に置き換える。

```tsx
<Group align="center" gap="xs" wrap="nowrap">
  <Suspense fallback={<NotificationBellFallback />}>
    <NotificationBell />
  </Suspense>
  {accountMenu}
</Group>
```

`Suspense` の fallback は**中身を描かない構造モック**（`.claude/rules/web/shimmer-from-structure.md` パターン2）。`NotificationBellFallback` は `useNotificationInbox()` を呼ばない。

### 10.2 通知欄（`NotificationBell` / `NotificationTray`）

```
Indicator(color="orange", label=未読数, disabled=未読0)
└ Popover(position="bottom-end", width=340, withinPortal)
  ├ Popover.Target → ActionIcon(variant="default", aria-label="通知（未読 N 件）")
  │                   └ IconBell(size=18, stroke=1.5)
  └ Popover.Dropdown(p=0)
    └ Card                                  ← theme が SKETCH_RADIUS / PAPER_SHADOW を付ける
      ├ Group(justify="space-between")
      │  ├ Text(fw=600) 「通知」
      │  └ Button(variant="subtle", size="compact-xs") 「すべて既読にする」  ※未読>0 のみ
      ├ Divider
      ├ ScrollArea.Autosize(mah=360)
      │  └ Stack(gap=0)
      │     └ NotificationRow × N
      │        └ UnstyledButton(component={Link} to={リンク先})
      │           ├ Box(bg="orange.5", w=6, h=6, ...)      ← 未読の点。既読は非表示
      │           ├ Text(fw=600, size="sm") title
      │           ├ Text(size="xs", c="var(--cairn-muted-2)") body（複数行は改行のまま）
      │           └ Text(ff={NUMERAL_FONT}, size="xs", c="var(--cairn-muted)") M/D HH:mm
      └ EmptyState(size="sm")                              ← 0件のとき。IconBellOff
```

- **開いても既読にしない。** 行のクリック（= 遷移）で1件を既読（`markRead`）、明示ボタンで全件既読（`markAllRead`）。理由: 未読バッジは「まだ手を付けていない催促の数」であってほしい。ポップオーバーを開いた瞬間に0になると、催促の意味が消える。
- `EmptyState` は Mantine core のコンポーネント（`error-state.tsx` / `not-found-state.tsx` と同じ使い方）。
- リンク先（`src/lib/notification-link.ts` の純関数）:

| kind | to |
| --- | --- |
| `checkpointDeadline` | `/goals` |
| `weeklyTargetMiss` | `/goals` |
| `eveningUntouched` | `/`（日） |

  ルート文字列は UI の関心なので `convex/lib` には置かない。#52 が週次レビュー画面を作ったら `weeklyTargetMiss` の1行を差し替える。
- 未読数のバッジは `color="orange"`（primary）。**赤は使わない** — 赤は削除・危険の予約色（`design-live-board.md`）。
- 時刻は `NUMERAL_FONT`（`src/lib/theme.ts` から import。数値は読める書体に分ける）。`dayjs` で `M/D HH:mm`（`dayjs` は既存依存）。
- ハードコードした hex は書かない。色は Mantine のトークン（`orange.5`）と `--cairn-*` 変数のみ。`SKETCH_RADIUS` / `PAPER_SHADOW` は `theme.ts` 内で `Card` に適用済みなので、コンポーネント側で再指定しない（`theme.ts` はこれらを export していない = 個別に使う必要がない、が現状の設計）。
- `Popover.Target` に `Indicator` を包む形で ref 警告が出る場合は、`Indicator` を `Popover` の外に出して `ActionIcon` を直接 `Popover.Target` にする（見た目は同じ。実装者はこの2択のうち動く方を選べばよく、他の判断は不要）。

**データ取得**（`src/hooks/use-notification-inbox.ts`）

```ts
export function useNotificationInbox() {
  return useSuspenseQuery(convexQuery(api.queries.notifications.list.list, {}));
}
```

`convexQuery` + `useSuspenseQuery`（`.claude/rules/web/convex-tanstack.md`）。ルートローダーで `ensureQueryData` しない（同ルールの禁止事項）。ミューテーションは `useConvexMutation`（`src/hooks/use-notification-mutations.ts`。既存 `goals-mutations.ts` と同じ流儀）。

**アクセシビリティ**

- `ActionIcon` に `aria-label={未読数を含む文字列}`。未読数が視覚だけに乗らない。
- 行は `UnstyledButton component={Link}` なのでキーボードで到達・Enter で遷移できる。
- 「すべて既読にする」は `Button`（`aria-label` 不要、文字が説明になっている）。
- ポップオーバーは Mantine が `Escape` で閉じる。テストでは Floating UI が測れないので `getByRole(..., { hidden: true })` を使う（`.claude/rules/common/testing.md`）。

### 10.3 マイページの通知設定セクション

`src/features/my-page/components/my-page.tsx` の `Stack` に `NotificationSettingsSection` を足す（`PasskeySection` の下、`TodaySummarySection`（`Suspense` 内）の上）。既存セクションと同じ `Card` + 見出しの形で、`Suspense fallback={<PendingComponent />}` に包む（`TodaySummarySection` と同じ）。

```
Card
├ Title(order=2) 「通知」
├ Text(size="sm", c="dimmed") 「決めた時刻に催促を作ります。既定では通知欄にだけ出ます。」
├ Alert(color="yellow", variant="light")   ※ enabled === false のとき
│   「通知はまだ有効になっていません。」
├ Alert(color="red", variant="light")      ※ slackFailureStreak >= SLACK_FAILURE_STREAK_LIMIT
│   「Slack への送信が3回続けて失敗したため、連携を停止しました。URL を確認してください。」
├ Alert(color="yellow", variant="light")   ※ eveningHourJst が静穏窓の中 かつ slackEnabled
│   「夜の催促の時刻が静穏時間の中にあります。Slack へは送られません（通知欄には残ります）。」
└ Form(of={form})
   ├ Switch  「通知を使う」                          path=["enabled"]
   ├ Fieldset「知らせる内容」
   │  ├ Switch 「チェックポイントの期限が近いとき（3日前から毎朝8時）」 path=["triggers","checkpointDeadline"]
   │  ├ Switch 「週間ターゲットが未達のとき（土曜9時）」               path=["triggers","weeklyTargetMiss"]
   │  └ Switch 「夜に未着手が残っているとき」                          path=["triggers","eveningUntouched"]
   ├ Select  「夜の催促の時刻」 18〜23時                path=["eveningHourJst"]
   ├ Group
   │  ├ Select 「静穏時間の開始」 0〜23時              path=["quietFromHourJst"]
   │  └ Select 「静穏時間の終了」 0〜23時              path=["quietToHourJst"]
   │  └ Text(size="xs") 「静穏時間は Slack への送信だけを止めます。通知欄には残ります。」
   ├ Fieldset「Slack へ送る」
   │  ├ Switch      「Slack へ送る」                   path=["slackEnabled"]
   │  ├ PasswordInput「Incoming Webhook URL」          path=["slackWebhookUrl"]
   │  │   description: 設定済みなら「設定済み。置き換えるときだけ入力してください。」
   │  └ Button(color="red", variant="subtle") 「Slack 連携を解除」 ※ slackConfigured のみ
   └ Button(type="submit") 「保存」
```

- **1つの Formisch フォーム＋保存ボタン**にする（`target-form.tsx` と同じ流儀）。Switch を押した瞬間に保存する方式は採らない — 「静穏の開始/終了」「Webhook URL」と混在すると、保存の粒度が2種類になって「どこまで保存されたか」が読めなくなる。
- 初期値は `settings` query の返り値を `useForm({ initialInput })` に渡す（`slackWebhookUrl` の初期値は常に `""`）。既定値をクライアントに書かない（§8.3）。
- 「Slack 連携を解除」は `disconnectSlack` を直接叩く（フォームの外。`modals.openConfirmModal` で確認）。破壊的操作なので Confirm を出すのは既存の流儀。
- 保存成功/失敗のトーストは既存 `notifySuccess` / `notifyError`（`src/lib/notify.ts`）。
- 時刻の Select は `NUMERAL_FONT` で「21時」のように出す。0〜23 / 18〜23 の配列生成は `src/features/my-page/lib/hour-options.ts` の純関数。

### 10.4 Shimmer

| 境界 | fallback |
| --- | --- |
| ヘッダーのベル | `NotificationBellFallback`（`src/components/notification-bell-fallback.tsx`）— `Shimmer loading` の中に静的な `ActionIcon` の形だけを置く。`useNotificationInbox` を呼ばない |
| マイページの通知セクション | 既存の `PendingComponent`（他セクションと同じ）で足りる。個別 Shimmer は作らない |

`ShimmerProvider` は `__root.tsx` に既にあるので色は指定しない。`React.memo` は付けない（React Compiler。`react-conventions.md`）。

### 10.5 触るファイル一覧（実装チェックリスト）

**Convex（新規）**

```
convex/lib/notifications.ts
convex/lib/notificationCopy.ts
convex/actions/notifications/deliverSlack.ts
convex/queries/notifications/list.ts
convex/queries/notifications/settings.ts
convex/queries/notifications/deliveryPayload.ts
convex/mutations/notifications/evaluate.ts
convex/mutations/notifications/purgeExpired.ts
convex/mutations/notifications/markSlackDelivered.ts
convex/mutations/notifications/saveSettings.ts
convex/mutations/notifications/markRead.ts
convex/mutations/notifications/markAllRead.ts
convex/mutations/notifications/disconnectSlack.ts
convex/services/notifications/*.ts   (§8.4 の17本)
```

**Convex（変更）**

```
convex/schema.ts            2テーブル追加
convex/lib/validators.ts    §5.4
convex/lib/domain.ts        TARGET_METRIC_UNITS の追加のみ
                            (notifications.ts の再輸出はしない。循環 import になる。§5.6)
convex/lib/errors.ts        SlackDeliveryError（DomainError union には入れない）
convex/crons.ts             2エントリ追加
```

**フロント（新規）**

```
src/components/notification-bell.tsx
src/components/notification-tray.tsx
src/components/notification-bell-fallback.tsx
src/hooks/use-notification-inbox.ts
src/hooks/use-notification-mutations.ts
src/lib/notification-link.ts
src/features/my-page/components/notification-settings-section.tsx
src/features/my-page/components/notification-settings-form.tsx
src/features/my-page/schemas/notification-settings-schema.ts
src/features/my-page/lib/hour-options.ts
src/features/my-page/types/notification-settings.ts
```

**フロント（変更）**

```
src/components/app-shell.tsx                        ヘッダーの {accountMenu} を Group で包む（§10.1）
src/features/my-page/components/my-page.tsx         セクション追加
src/features/goals/lib/target-metric-labels.ts      import 元を ~domain/domain へ（再輸出は維持）
src/features/today/lib/target-remainder.ts          同上
src/lib/target-metric-units.ts                      削除
vite.config.ts                                      カバレッジ include に新規ファイルを追加（§13）
```

---

## 11. フォーム（Valibot / Formisch）

```ts
// src/features/my-page/schemas/notification-settings-schema.ts
import * as v from "valibot";

import {
  EVENING_HOUR_MESSAGE,
  EVENING_HOUR_RANGE,
  QUIET_HOUR_MESSAGE,
  QUIET_HOUR_RANGE,
  SLACK_WEBHOOK_MESSAGE,
  SLACK_WEBHOOK_PATTERN,
} from "~domain/notifications";

//? 検証メッセージも正規表現もサーバと共有のドメイン定数を使う。ここで手書きしない(CVX-16)。
const HourJstSchema = v.pipe(
  v.number(QUIET_HOUR_MESSAGE),
  v.integer(QUIET_HOUR_MESSAGE),
  v.minValue(QUIET_HOUR_RANGE.min, QUIET_HOUR_MESSAGE),
  v.maxValue(QUIET_HOUR_RANGE.max, QUIET_HOUR_MESSAGE),
);

const EveningHourSchema = v.pipe(
  v.number(EVENING_HOUR_MESSAGE),
  v.integer(EVENING_HOUR_MESSAGE),
  v.minValue(EVENING_HOUR_RANGE.min, EVENING_HOUR_MESSAGE),
  v.maxValue(EVENING_HOUR_RANGE.max, EVENING_HOUR_MESSAGE),
);

//? 空欄は「既存の URL を保つ」。undefined に畳んで mutation の引数から落とす
//? (goal-schema.ts の OptionalDateJstSchema と同じ流儀)。
const SlackWebhookSchema = v.pipe(
  v.string(SLACK_WEBHOOK_MESSAGE),
  v.trim(),
  v.check((value) => value === "" || SLACK_WEBHOOK_PATTERN.test(value), SLACK_WEBHOOK_MESSAGE),
  v.transform((value) => (value === "" ? undefined : value)),
);

export const NotificationSettingsSchema = v.object({
  enabled: v.boolean(),
  eveningHourJst: EveningHourSchema,
  quietFromHourJst: HourJstSchema,
  quietToHourJst: HourJstSchema,
  slackEnabled: v.boolean(),
  slackWebhookUrl: SlackWebhookSchema,
  triggers: v.object({
    checkpointDeadline: v.boolean(),
    eveningUntouched: v.boolean(),
    weeklyTargetMiss: v.boolean(),
  }),
});

export type NotificationSettingsFormOutput = v.InferOutput<typeof NotificationSettingsSchema>;
```

**「Slack 有効 かつ URL 未設定」の検証をスキーマに入れない理由**: 既に設定済みなら空欄が正しい入力なので、スキーマだけでは判定できない（`slackConfigured` はサーバ由来）。フォーム側で `slackEnabled && !slackConfigured && slackWebhookUrl === undefined` のとき送信ボタンを `disabled` にし、`PasswordInput` に `error={SLACK_REQUIRED_MESSAGE}` を出す。**サーバ側でも同じ条件を services で拒否する**（`ValidationFailedError`、`SLACK_REQUIRED_MESSAGE`）— 境界は二重に守る。

- Mantine の `Switch` は `onChange` が `ChangeEvent` なので `field.props` をそのまま spread できる（`formisch.md`「イベントベース」）。ただし値は `checked` に渡す: `checked={field.input}`。
- `Select` は値ベースなので `onChange` を上書きし、既存 `onRequiredSelect`（`src/lib/select.ts`。`(value: string) => void` を受ける）で null を弾いてから `Number(value)` に戻す。
- 送信ペイロードの型は `FunctionArgs<typeof api.mutations.notifications.saveSettings.saveSettings>` から導出する（`src/features/my-page/types/notification-settings.ts`。既存 `src/features/goals/types/mutations.ts` と同じ流儀。手書きしない — CVX-16）。

---

## 12. エッジケース決定表

| # | 状況 | 決定 |
| --- | --- | --- |
| 1 | `notificationSettings` 行が無い所有者 | 評価対象外。`settings` query は `NOTIFICATION_DEFAULTS`（`enabled: false`）を返す |
| 2 | `enabled: false` | 評価対象外。行と設定値は残す（再開時に復元される） |
| 3 | トリガー個別 off | その種類だけ作らない。他は作る |
| 4 | 静穏時間中の発火 | 通知欄の行は作る。Slack は送らない。持ち越さない |
| 5 | `quietFromHourJst === quietToHourJst` | 静穏なし（全時刻で押し出す） |
| 6 | `eveningHourJst` が静穏窓の中 | 行は作る、Slack は出ない。フォームで警告するが**保存は拒否しない** |
| 7 | 同じ時に cron が2回走った | dedupeKey で2通目を作らない |
| 8 | cron が丸1日落ちた | 遡って作らない。期限接近だけは範囲判定で自己修復 |
| 9 | 期限を編集した（当日すでに通知済み） | その日は増えない。翌朝から新しい `daysLeft` で出る |
| 10 | チェックポイントが達成された | 対象外（`achievedAt !== undefined`）。既に作られた通知は消さない（履歴なので） |
| 11 | 親目標がカスケード削除された（#48 INV-6） | 子の通知は残る。payload の `content` が非正規化されているので読める。リンクは `/goals` |
| 12 | 期限超過（`daysLeft < 0`） | 発火しない |
| 13 | 期限が4日以上先 | 発火しない |
| 14 | 期限つき習得に親が無い（#49 バックフィル前の孤児） | **発火する**（`parentGoalId` を判定に使わない。§4.2） |
| 15 | 週間ターゲットが0件 | 発火しない |
| 16 | 週間ターゲットが全件達成 | 発火しない（祝わない） |
| 17 | 今日の日がゴミ箱にある | 「日が無い」扱い（`getLiveDay` が null）→ プリセット分岐へ |
| 18 | 今日の未着手が0件（全部 確定/スキップ/進行中） | 発火しない |
| 19 | 進行中だけが残っている | 発火しない（手を動かしている人を急かさない） |
| 20 | 日が無く、その曜日のプリセットも無い | 発火しない |
| 21 | 未来の日 | 評価対象は常に今日だけ。未来は読まない |
| 22 | 明細が6件以上 | payload は全件保持。本文は先頭5行＋「…他N件」（§5.2） |
| 23 | `markRead` に他人の通知 id | `requireOwnedNotification` が `ForbiddenError`（IDOR 防止、CVX-04） |
| 24 | `markRead` に既読の id | 何もしない（`readAt` を上書きしない） |
| 25 | `markRead` に空配列 | 何もしない（成功して `null` を返す） |
| 26 | `markAllRead` で未読0件 | 何もしない（成功して `null` を返す） |
| 27 | 通知0件 | `EmptyState`（`IconBellOff` +「通知はありません」） |
| 28 | 未読が50件を超えた | `items` は最新50件。未読数は在庫全件から数えるので正確。「すべて既読にする」は `markAllRead` なので51件目以降も既読になる（§8.3） |
| 29 | 通知を有効にした直後 | その回は発火しない。次の該当時刻から（§6.3） |
| 30 | `slackEnabled` を off にした | `slackWebhookUrl` は保持（再開時に再入力不要）。解除は `disconnectSlack` だけ |
| 31 | `saveSettings` で URL を差し替えた | `slackFailureStreak` を 0 に戻す（新 URL に古い失敗を引き継がない） |
| 32 | Slack が非2xx / ネットワーク失敗 | リトライしない。`slackError` を記録し、streak を +1。3回で自動停止 |
| 33 | Webhook URL が Slack 以外のホスト | `saveSettings` が `ValidationFailedError`（SSRF 防止） |
| 34 | Slack 有効・URL 未設定 | フォームで送信不可。サーバ側でも拒否 |
| 35 | `deliverSlack` 実行時に通知が purge されていた | `deliveryPayload` が null → 静かに終了 |
| 36 | `SITE_URL` が未設定 | Slack 本文からリンク行だけ落とす。通知は落とさない |
| 37 | 夏時間 | JST に夏時間は無い。UTC+9:00 固定（`JST_OFFSET_MS`） |
| 38 | 通知が30日を超えた | `purgeExpired` が削除。未読でも消す（読まれない催促を永久に溜めない） |
| 39 | 1回の purge で消し切れない（201件以上） | 翌日の cron が続きを消す。境界が1日ずれるだけ（§7） |

---

## 13. カバレッジ設定（`vite.config.ts`）

`vite.config.ts` の `test.coverage` は **`include` を明示列挙する allowlist** で、しきい値は branches / functions / lines / statements すべて 80。列挙していないファイルは計測対象にならないため、**新規ファイルを include に足さないと「テストを書いたのにカバレッジに現れない」「書かなくても落ちない」の両方が起きる。** 実装セッションが忘れないよう、追加対象を決めておく。

**include に追加する（テストを書く。§14 が対応）**

```
convex/lib/notifications.ts
convex/lib/notificationCopy.ts
convex/services/notifications/**/*.ts
convex/queries/notifications/**/*.ts
convex/mutations/notifications/**/*.ts
src/lib/notification-link.ts
src/features/my-page/lib/hour-options.ts
```

`src/features/**/schemas/**/*.ts` は既に include に入っているので、`notification-settings-schema.ts` は自動で対象になる。

**include に追加しない（既存の慣習に合わせる）**

- `convex/actions/notifications/deliverSlack.ts` — 外部 `fetch` の薄い wiring 層。既存の `convex/actions/**` も include されていない。
- `src/components/notification-bell.tsx` / `notification-tray.tsx` / `notification-bell-fallback.tsx`、`src/hooks/use-notification-*.ts`、`src/features/my-page/components/notification-settings-*.tsx` — 既存の `*-page.tsx` / `*-mutations.ts` / hooks と同じ「薄い composition/wiring 層」の扱い。挙動は §14.3 の結合テストで確認する。

---

## 14. テスト計画（CVX-19）

### 14.1 純関数（`convex-lib` プロジェクト / Node、`convex/lib/**/*.test.ts`）

`convex/lib/notifications.test.ts`

- `isQuietHourJst`: 同日窓（9→17）の内外、日付をまたぐ窓（22→7）の 23時 / 3時 / 7時 / 21時、`from === to` で常に false。
- `dueFixedTriggers`: 08時で checkpoint のみ true、土曜09時で weekly のみ true、日曜09時で両方 false、その他の時で両方 false。
- `isDeadlineNear` / `deadlineDaysLeft`: `daysLeft` = -1 / 0 / 3 / 4 の境界。
- `hourJst`: JST の 00時 / 09時 / 23時に対応する epoch（`Date.UTC` で組む）。**深夜0時が 0 を返し 24 を返さないこと**を明示的に assert する。
- `nowJst`: 日付境界（15:00 UTC = 翌日 00:00 JST）。

`convex/lib/notificationCopy.test.ts`

- 3種すべての `title` / `body`。`daysLeft === 0` が「今日まで」になること。`source === "preset"` の文言。複数件が改行で並ぶこと。**6件以上で先頭5行＋「…他1件」になること**。単位（分/日/件）が `TARGET_METRIC_UNITS` から出ること。

### 14.2 Convex 統合（`convex-integration` / edge-runtime、`convexTest(schema)` + `t.withIdentity`）

`convex/notifications.test.ts`

| # | テスト |
| --- | --- |
| 1 | 設定行が無い所有者では `evaluate` が何も作らない（オプトイン） |
| 2 | `enabled: false` では何も作らない |
| 3 | 08時 JST の `now` を注入 → 期限3日後の未達成チェックポイントで1件作られる |
| 4 | 同じ `now` で `evaluate` を2回呼んでも1件のまま（dedupe） |
| 5 | 期限が4日後 / 前日（超過）/ 達成済み では作られない |
| 6 | 同日に接近が3件 → 通知は1件、payload の `items` が3要素 |
| 7 | `parentGoalId` を持たない期限つき習得でも作られる（#49 前の孤児） |
| 8 | 土曜09時 JST → 未達ターゲット1件以上で1件。ターゲット0件・全件達成では0件 |
| 9 | 日曜09時では weekly が作られない |
| 10 | 21時 JST・今日の未着手2件 → `source: "day"` / `pendingCount: 2` |
| 11 | 21時 JST・日なし・その曜日のプリセット3行 → `source: "preset"` / `pendingCount: 3` |
| 12 | 21時 JST・日なし・プリセットなし → 0件 |
| 13 | 21時 JST・未着手0件（確定とスキップだけ）→ 0件 |
| 14 | 進行中だけが残っている → 0件 |
| 15 | 今日の日がゴミ箱にある → プリセット分岐に落ちる |
| 16 | `eveningHourJst: 18` の所有者は 18時に発火し、21時には発火しない |
| 17 | `triggers.eveningUntouched: false` で夜だけ止まり、期限接近は出る |
| 18 | 静穏時間中の発火: 行は作られるが `scheduler` に何も積まれない |
| 19 | `slackEnabled` かつ静穏外: `scheduler` に `deliverSlack` が1件積まれる |
| 20 | `settings` query の返り値に `slackWebhookUrl` キーが存在しない |
| 21 | `saveSettings` に Slack 以外のホストの URL → reject |
| 22 | `saveSettings` で URL を省略しても既存 URL が保たれる（`slackConfigured` が true のまま） |
| 23 | `saveSettings` で URL を差し替えると `slackFailureStreak` が 0 に戻る |
| 24 | `slackEnabled: true` かつ URL 未設定の `saveSettings` → reject |
| 25 | `disconnectSlack` 後に `slackConfigured: false` / `slackEnabled: false` |
| 26 | `markSlackDelivered` の失敗3回で `slackEnabled: false` になる |
| 27 | `markSlackDelivered` の成功で `slackFailureStreak` が 0 に戻る |
| 28 | `markRead`: 他人の通知 id で reject（IDOR） |
| 29 | `markRead`: 空配列で成功し何も変わらない |
| 30 | `markAllRead`: 未読を全件既読にする（`NOTIFICATION_LIST_LIMIT` 超えを含む） |
| 31 | `list`: `_creationTime` 降順、`items` が最大50件、`unreadCount` が在庫全件から数えられている |
| 32 | `purgeExpired`: 31日前は消え、29日前は残る |
| 33 | 未認証で `list` / `settings` / `saveSettings` / `markRead` / `markAllRead` / `disconnectSlack` が throw（CVX-04） |
| 34 | 所有者Aの `evaluate` が所有者Bの通知を作らない（`ownerIsolation.test.ts` の流儀） |

`now` はすべて引数注入（`{ now: Date.UTC(...) }`）。実時刻に依存するテストを書かない。

### 14.3 UI（`frontend` / happy-dom、`renderWithMantine`）

- `notification-tray.test.tsx`: 未読が `aria-label` に出る / 0件で `EmptyState` / 行のクリックで `markRead` が呼ばれる / 「すべて既読にする」で `markAllRead` が呼ばれる。Popover の中は `getByRole(..., { hidden: true })` で取る。
- `notification-link.test.ts`: 3種の to。
- `notification-settings-form.test.tsx`: Slack 有効 + URL 未設定で保存不可 / Slack 以外のホストでエラー文言 / 静穏窓の中に夜の時刻を置くと警告 Alert が出る。ラベルは `getByLabelText(/…/)`（Mantine の必須アスタリスク対策）。`Select` のオプションは `{ hidden: true }`。
- `hour-options.test.ts`: 18〜23 と 0〜23。

**テストしないもの**: Slack への実 POST、`fetch` のベンダー挙動、Mantine の描画、`ctx.db` を直接読む assert。

---

## 15. 実装順序と受け入れ条件

| 段 | 内容 | 受け入れ条件 |
| --- | --- | --- |
| 1 | `convex/lib/notifications.ts` + `notificationCopy.ts` + `TARGET_METRIC_UNITS` の移動 + カバレッジ include（§13） | §14.1 が緑。`vp check` と `vp run fallow` が緑（削除したファイルの参照残りが無い） |
| 2 | schema 2テーブル + validators + `getOwnerSettings` / `settings` query / `saveSettings` / `disconnectSlack` | §14.2 の 20〜25、33 が緑 |
| 3 | `emitNotification` + 3評価器 + `evaluate` + 評価 cron | §14.2 の 1〜19、34 が緑 |
| 4 | `list` / `markRead` / `markAllRead` / `purgeExpired` + purge cron | §14.2 の 28〜32 が緑 |
| 5 | 通知ベル + 通知欄（`app-shell.tsx` の差し替え） | §14.3 の tray / link が緑。既存の app-shell 関連テストが緑 |
| 6 | マイページの通知設定セクション + フォーム | §14.3 の form が緑 |
| 7 | `deliveryPayload` + `deliverSlack` + `markSlackDelivered` | §14.2 の 26〜27 が緑。手動確認: 自分の Slack に1通届く |

**段3までで機能として成立する**（通知欄に出る）。段7（Slack）は独立して落とせる。

**全体の受け入れ条件**

- `vp check` / `vp test` / `vp build` / `vp run fallow` がすべて緑。
- `convex:convex-reviewer` を `convex/` に走らせ、CVX チェックリスト（args validator / `requireUser` 相当 / `internal.*` / `.filter` なし / index 条件つき `.collect` / query 内 `Date.now()` なし / テーブル名第1引数 / `await` 漏れなし）を通す（CVX-18）。
- 既存所有者に通知が飛んでいない（`notificationSettings` が空のまま = オプトイン）。

---

## 16. 検討した代替案（自己グリル）

### 反論1: 「アプリ内通知欄は通知ではない。Web Push こそが答えで、PWA を先にやるべきだ」

**半分認める。** 「アプリを開かないと届かないもの」を通知と呼ぶのは語の拡張だ。ただし順序を入れ替えない理由がある: (a) マップの優先順は通知 → PWA で、これは所有者が決めた順序である。(b) #57 の調査によれば PWA 化は `vite-plugin-pwa` 非互換の回避（Serwist + 自作プラグイン + Nitro 出力配線）というまとまった工事で、通知の実装セッションに抱き合わせると両方が遅れる。(c) 通知の**難しい部分は配信ではなく「何をいつ知らせるか・二度知らせない・黙るべき時に黙る」**であり、そこは配信手段に依存しない。段3までで作るものは Web Push が来ても1行も捨てない。

**譲歩の明示**: v1 の `eveningUntouched` は「その夜アプリを開いた人」にしか届かない（Slack を繋がない限り）。それでも in-app に出す価値はある（開いたときに「未着手2件」が催促として立っている）が、これは PWA 前の**縮退運転**だと認める。だから Slack を同時に入れる（反論2へ）。

### 反論2: 「Slack へ投げるのは学習ログの責務外。通知先が Slack なら学習ログではなく Slack ボットを作れ」

**却下。** CONTEXT.md「共有文」は「クリップボードへコピーし、**Slack に貼るためのもの**」と定義済みで、Slack はこのアプリの外部連携先として既に語彙に入っている。新しい依存も新しい習慣も要求していない。実装も `internalAction` 1本・`fetch` 1回・依存追加ゼロで、「ボットを作る」規模の話ではない。

### 反論3: 「静穏時間は固定時刻トリガーしかない設計では死んだ設定だ。UI を作る意味がない」

**部分的に認める。** 既定値（夜21時・静穏22〜7）では静穏が押し出しを止めることは無い。それでも入れる理由は §6.2 の3点（`eveningHourJst` を23時にした所有者との衝突は**実際に起きる**、cron 遅延、Web Push の後続チケットで意味論を決め直さなくてよい）。加えて、ticket が明示的に要求している要件でもある。

**譲歩**: v1 では静穏時間は **in-app には効かない**。設定画面にそう明記する（「静穏時間は Slack への送信だけを止めます」）。効かないものを効くように見せるのが最悪の選択で、それは避けた。

### 反論4: 「毎時 cron は無駄。3本の固定 cron で足りる」

**却下、ただしコストは認める。** 3本にすると (a) 08:00 JST = **前日** 23:00 UTC、土曜09:00 JST = 土曜00:00 UTC という換算が cron 定義に埋まってテスト不能になる。(b) `eveningHourJst` の per-user 設定が表現できない（固定21時に落とすしかない）。(c) 時計を読む場所が3箇所に散る。毎時1本なら判定が `dueFixedTriggers` という純関数のテスト対象になる。

**譲歩**: 1日24回の invocation を払う。何もしない回のコストは index 1本の読み（多くは0件）で、1〜2人のアプリでは無視できる。

### 反論5: 「夜の未着手は『日が無い暦日は休養』『開いていない日を失敗ログにしない』と矛盾する」

**却下。** CONTEXT.md「休養」は**過去**で日が無いことを指す。この通知は**今日**の 18〜23 時に出るので、対象の暦日はまだ終わっていない — 失敗の記録ではなく、まだ動ける時間帯への催促である。さらに通知は日ドキュメントを一切作らないので、休養の意味論に触れない（21時に催促して、結果その日を開かなければ、その日は普通に休養になる）。

プリセットが無い曜日（土日など自動行なし）に黙るのは、「休養を計画倒れに数えない」（CONTEXT.md「履歴」_Avoid_）の直接の適用である。

### 反論6: 「残り3日を切ると毎朝1通は多い。3日前と当日の2回に絞れ」

**却下。** 節目の等号判定（`daysLeft === 3` / `=== 0`）にすると cron が1回落ちた日の節目が永久に失われ、しかも「失われた」ことを誰も気づけない。範囲判定なら翌朝に自己修復する。**通知の設計で最も避けたいのは「静かに出なくなる」ことで、「1通多い」はその次の悪さでしかない。**

数の上でも過剰ではない: 期限を切ったチェックポイントは親ごとに同時1〜2件の粒度（CONTEXT.md「チェックポイント」）で、複数件は1通に畳む。最悪でも最終3日間に4通（朝1通ずつ）。うるさければトリガー単位で off にできる。

### 反論7: 「期限超過を通知しないのは不親切だ。過ぎたことを知らせないと放置される」

**却下。** CONTEXT.md「習得」の _Avoid_ に「未達の自動失敗記録」があり、ADR-0006 も「期限を過ぎても表示が変わるだけ」と決めている。期限超過の通知は、システムが所有者に失敗を告げる行為で、この決定の精神に反する。過ぎた期限は `/goals` の表示が示し、期限は自由に編集できる（CONTEXT.md「習得」）。

### 反論8: 「文言まで DB に凍結すべきだ。ADR-0007 は『履歴は後の学習で書き換わらない』と決めている」

**部分的に採る。** 凍結すべきは**事実**であって**言い方**ではない、と切った。目標名・件数・日付・残り量は生成時に payload へ写して凍結する（親目標が消えても読める）。文言の組み立ては純関数に置き、誤字の修正が過去分にも及ぶようにする。これは「履歴の無修正主義」に反しない — 表示テキストの誤字は履歴の内容ではない。

**代償**: `notificationMessage` の出力形を変えると過去の通知の見た目も変わる。通知は30日で消えるので影響は限定的。

### 反論9: 「Webhook URL を DB に持つのは `security.md` の『秘密をハードコードするな』違反だ」

**却下（ただし残余リスクは認める）。** あの規則が禁じているのはソースと（クライアントに配られる）env への埋め込みで、これは所有者が入力した所有者自身のデータである。env は per-user にできないので、DB 以外に置き場がない。守るのは4点（公開 query で返さない・前置検証・解除できる・UI で伏せる）。

**譲歩**: アプリ層での追加暗号化はしない。漏洩時の被害は「自分の Slack チャンネルに他人が投稿できる」で、学習記録の流出ではない。1〜2人のアプリでこの残余リスクを受け入れる。

### 反論10: 「通知テーブルは不要。期限が近い目標は query で導出できる。テーブルは非正規化の重複だ」

**最も強い反論。部分的に認める。** `checkpointDeadline` と `eveningUntouched` の**発火条件そのもの**は読み取り時に導出できる。それでも表が必要な理由は3つ:

1. **既読/未読は導出できない状態である。** 「見た」はユーザーの行為で、データからは復元できない。
2. **押し出しには「一度だけ送った」という永続的な発火記録が必要。** dedupe をメモリや導出でやる方法はない。
3. **「その時点の事実」の保存。** 朝8時の「あと3日」を夜に読むとき、導出では「あと3日」ではなく「あと2日」になり得る（日付をまたぐ）。催促は発せられた時点の文脈を持つべきだ。

**認める部分**: 通知欄は「画面を開けば分かること」を二重に見せる面がある。だから**通知欄をダッシュボードにしない**と決めた（§3 の _Avoid_ に明記）。通知欄が持つのは発火した事実の履歴だけで、集計も現在値も出さない。集計は履歴画面と週次/月次レビュー（#52 / #54）の担当。

### 反論11: 「Email の方が確実だ。Slack を持たない人はどうする」

**却下、条件つき。** §2.5 の通り、cron 文脈で所有者のメールアドレスを知るには Better Auth component が持つ PII をアプリ表へ複製する必要があり、失効追随を含む負債になる。加えて検証済み送信ドメインの運用が要る。Slack を持たず、かつ #58 の PWA でも解決しない（iOS でホーム画面追加を拒む）利用者が現れたら再検討する。

### 反論12: 「1所有者あたり最大3通/日は少なすぎる/多すぎる」

**少なすぎではない。** 3トリガーは互いに時間帯が離れており（朝8時・土曜9時・夜21時）、それぞれが独立した行動を促す。多すぎでもない（1日2通が定常）。そして重要なのは、**この上限が設定値ではなく dedupeKey の粒度から出てくる構造的性質**であること。上限を「設定」にすると、トリガーを足したときに上限値の更新を忘れる経路が生まれる。

### 反論13: 「1トランザクションで全所有者を評価すると OCC で落ちる」

**認めるが、v1 では対処しない。** Convex は OCC 衝突時に mutation を自動再試行し、再試行後も dedupeKey が二重生成を防ぐ。所有者数が数百規模になったら `ctx.scheduler.runAfter` で所有者ごとに fan out する（§8.5 に明記済み）。いま fan out すると、失敗した所有者だけ通知が出ないという部分失敗をデバッグする必要が生まれ、利得を上回る。

### 反論14: 「Switch を押した瞬間に保存すべきだ。保存ボタンは古い」

**却下。** 同じフォームに「静穏の開始/終了」と「Webhook URL」があり、これらは即時保存に向かない（入力途中の値が保存される）。保存の粒度が2種類あると「どこまで保存されたか」が読めなくなる。既存の `target-form.tsx` と同じ「1フォーム＋保存ボタン」に揃える。

### 反論15: 「`markAllRead` は要らない。id 配列の `markRead` 一本でいい」

**却下。** `list` が返すのは最新50件で、在庫は最大90件になり得る（30日 × 最大3通/日）。id 配列方式だと**画面に無い未読が既読にならず、バッジが下がらない**という目に見えるバグになる。`{}` 引数の `markAllRead` は所有者の未読を全件 patch するので、この不整合が構造的に起きない。関数が1本増えるコストより、バッジが下がらないバグの方が高い。

### 反論16: 「JST の時を `Intl` で出さないのは車輪の再発明だ。`jst.ts` は `Intl` を使っている」

**却下。** 日付側（`todayJst`）は既存の `Intl`（`en-CA`）をそのまま再利用する（作り直さない）。時だけ固定オフセット演算にする理由は、`hour: "2-digit"` + `hour12: false` の組み合わせが実装によって深夜0時を `"24"` と返し得ること（`hour12` が `hourCycle` を上書きして `h24` に落ちる経路）。`hourCycle: "h23"` の明示でも回避できるが、**JST が UTC+9:00 固定・夏時間なし**である以上、`getUTCHours()` の方が短く・決定的で・テストしやすい。ロケール依存の落とし穴を1つ減らす。

### 反論17: 「`purgeExpired` を index なしのテーブルスキャンで書くのは CVX-11 違反だ」

**却下。** CVX-11 が禁じているのは「結果が大きくなり得る・無制限の `.collect`」で、`.take(n)` は同ルールが明示的に認める上限手段である。素のスキャンは組み込み `by_creation_time` 昇順（= 最古から）なので、`.take(200)` は「最も古い200件」を読む正しい形になる。専用 index を張れば1回で正確に絞れるが、**`_creationTime` のための index は CVX-12 の趣旨（組み込みで足りるものに index を足さない）に反する**。1日1回・上限200件の掃除に、追加 index のストレージと書き込みコストを払う価値はない。

---

## 17. 境界（このドキュメントが持たないもの）

- SW の生成・登録・更新フロー / manifest / iOS のホーム画面追加 → #58（Web Push のリスナーと購読表は #58 でも作らない。§2.4）
- Web Push 一式（`pushSubscriptions` 表・`deliverWebPush` internalAction・`emitNotification` の schedule 行・権限要求 UI・SW の `push` / `notificationclick` / `pushsubscriptionchange` リスナー）→ **#58 完了後の後続チケット**（§2.4 / §18）
- 週次レビュー画面の中身、`weeklyTargetMiss` のリンク先差し替え → #52
- 月次レビュー → #54
- 目標×記録の紐付け → #53
- 通知からの直接操作（通知欄で確定する・達成チェックを入れる）→ 採らない（通知は催促で、操作は元の画面で行う）
- 通知の集計・分析（何通出て何通読まれたか）→ 持たない
- 複数端末・複数セッションの区別 → 持たない（通知は所有者単位）

---

## 18. CONTEXT.md / ADR / spec.md への影響と引き渡し

| 対象 | 影響 |
| --- | --- |
| `CONTEXT.md` | §3 の5項目（通知 / 通知欄 / 押し出し / 静穏時間 / トースト）を追記。既存項目の書き換えは**不要**（「休養」「日」「週間ターゲット」「チェックポイント」の定義はそのまま使えることを §4.2 で確認済み） |
| `docs/spec.md` | §Out of Scope の「ユーザー間のデータ共有、**通知**、AI 要約」から「通知」を削る改訂が必要。v1 の範囲外だった判断を、マップ #47 が覆した |
| ADR | **ADR-0012 の新設を提案する**（本書では作らない）。題: 「通知はアプリ内通知欄を正とし、押し出しは Slack を暫定、Web Push は PWA の後」。ADR の3条件を満たす — 覆すのに費用がかかる（表と評価器の形が決まる）/ 文脈なしでは驚く（なぜ Web Push でないのか）/ 本物のトレードオフ（§2 と §16 反論1・2・11） |
| ADR-0003 / 0006 / 0007 | 覆さない。ADR-0003 の「プロセス優先・成果目標での自動判定をしない」は §4.3（カウントダウン却下・祝い却下）で、ADR-0006 の「未達の自動失敗記録をしない」は §4.2（期限超過を通知しない）で、ADR-0007 の凍結の精神は §16 反論8で継承している |

### 18.1 Web Push の所有者表

`docs/specs/pwa-mobile.md` §22.1 はこの表と同一の内容にすること（§2.4 の確定に対応する唯一の割り当て表）。

| 項目 | #58（PWA の土台） | #56（本書・通知） | #58 完了後の後続チケット |
| --- | --- | --- | --- |
| `sw/service-worker.ts` の存在と「`serwist.addEventListeners()` の前に自前リスナーを足す」作法 | **作る** | — | その作法に従ってリスナーを足す |
| SW の `push` / `notificationclick` / `pushsubscriptionchange` リスナー | 作らない | 作らない | **作る** |
| `pushSubscriptions` 表（validator + index） | 作らない | 作らない | **作る**（本書 §5 のスキーマ規約に従う） |
| `deliverWebPush` internalAction ＋ `emitNotification` の schedule 行 | — | 作らない（設計のみ・§2.4 / §9.1） | **作る** |
| 通知権限の要求 UI | 置き場所（マイページ「アプリとして使う」セクション）だけ作る | 作らない | **セクションの中身として作る** |
| 通知欄・Slack 押し出し・トリガー・静穏時間・dedupe | — | **作る**（v1） | 触らない |
| iOS 未インストール時のフォールバック | 事実の明示のみ | **通知欄と Slack がそのままフォールバックである**（§2.2 / §2.3） | 触らない |

> `pwa-mobile.md` は #58 の所有ドキュメントなので本書からは書き換えない。**#58 の実装/改訂セッションは、`pwa-mobile.md` の「`pushSubscriptions` は #56 の所有物」「`push` / `notificationclick` ハンドラは #56 が `sw/service-worker.ts` に追記」系の記述（§0.8 / §1 の範囲表 / §5 末尾 / §13.2 / §19-1 / §22.1）を、上表と同じ「Web Push の所有者は #58 完了後の後続チケット」に揃えること。** それが済むまで、Web Push の所有者に関する正は §2.4 と本節である。

### 18.2 その他の引き渡し

- **#52（週次レビュー）**: `weeklyTargetMiss` のリンク先を `/goals` から週次レビュー画面へ差し替える（`src/lib/notification-link.ts` の1行）。「祝い」は通知ではなく週次レビューが担う（§4.3）。
- **#50（目標階層のドキュメント確定）**: §3 の CONTEXT 追記案と §18 の ADR-0012 提案・`spec.md` の Out of Scope 改訂を、同じ工程で処理できる。
- **#48 / #49**: 本書は `parentGoalId` に依存しないので、順序の制約は無い（先後どちらでもよい）。
