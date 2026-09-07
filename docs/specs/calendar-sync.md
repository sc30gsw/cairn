# カレンダー同期（Google カレンダーとの双方向同期）

- 状態: 決定済み・実装済み（2026-09-06）。決定の経緯は [ADR-0017](../adr/0017-google-calendar-two-way-sync.md)（購読フィードの置き換え）と [ADR-0016](../adr/0016-google-login-replaces-notion.md)（Google ログイン・アカウント連携）。置き換えた旧仕様は [calendar-feed.md](./calendar-feed.md)。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)（CVX-02 services 分離、CVX-04 `ownerQuery`/`ownerMutation`/`ownerAction`、CVX-05 scheduler は `internal.*`、CVX-07 action の読み書きは最小、CVX-15 同一トランザクション）、[security.md](../../.claude/rules/common/security.md)、[better-result.md](../../.claude/rules/typescript/better-result.md)、[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)。
- 語彙: `CONTEXT.md`「カレンダー同期」「外部予定」「予定」。

2026-09-07 の複数アカウント拡張は [multiple-google-calendars.md](./multiple-google-calendars.md)、[ADR-0018](../adr/0018-multiple-google-calendar-connections.md)、[ADR-0019](../adr/0019-calendar-connections-do-not-grant-sign-in.md) に従う。

## 1. 決定の要約

| 論点 | 決定 |
| --- | --- |
| 方向 | **双方向**。アプリ → Google は本番日・未達成チェックポイントの期限（終日・空き）と予定（時刻つき・予定あり）。Google → アプリは、アプリ発の予定の**移動・時間変更・削除**（予定）と**日付変更**（本番日・期限。削除は目標を消さず次の同期で予定を戻す）。外部予定は写しとして予定タブに出す |
| Notion カレンダー | 公開 API が無いので直接は繋がない。接続した Google アカウントの予定を表示する製品なので、Google に書けば出る |
| 認証 | Better Auth の既存 Google / email / username / password / パスキーを維持する。追加 Google アカウントはカレンダー専用で、新しいログイン権限を付けない。接続開始時の所有者付き・期限付き要求を OAuth state と結びつけ、選んだ Google subject を照合する |
| スコープ | 閲覧用の追加は `calendar.events.readonly` と `calendar.calendarlist.readonly`。保存先に選ぶときだけ `calendar.events` を追加認可する。既存の書き込み権限と offline refresh を維持する |
| 書き込み先 | ユーザーが接続と実 calendarId の組を1つ選ぶ。Google の writer / owner / writerWithoutPrivateAccess を対象にする。既存ユーザーは元の保存先を維持し、新規ユーザーは選ぶまで送信しない。変更時は Cairn が作った既存 Google 予定だけを移動する |
| 表示カレンダー | 複数 Google アカウントを同時に維持し、各接続で表示対象を選ぶ。既定は Google 側で表示中かつ内容を取得できるカレンダー。同じ ownerId + calendarId + eventId の写しを1件に統合する。別カレンダーの招待や同名同時刻の予定は統合しない |
| 写しの期間 | 過去 30 日〜未来 90 日（`CALENDAR_SYNC_WINDOW`）。範囲外は写しから消す。本番日・期限は期間に関わらず Google へ出す |
| 変更検知 | 接続・カレンダーごとに `events.list` の syncToken を管理し、7日ごとに全件を再取得する。表示対象と、アプリ発予定の変更を戻すための保存先を取得する。予定タブ表示時・「今すぐ同期」・毎日 JST 02:00 / 14:00 に実行する。Convex cron は UTC `0 5,17 * * *`。ブラウザーの定期ポーリングは追加しない |
| アプリ → Google の即時送信 | 目標・予定を変えるサービス（goals の create / update / remove / setAchieved / setExamResult、boardSchedule の create / update / move / remove / removeForRow）の末尾で `scheduleSourceSync` を呼び、同じトランザクションで `internal.actions.calendarSync.pushSource` を `runAfter(0)` に積む。接続が無ければ何もしない |
| 対応表 | `calendarSyncLinks { sourceKind: goal / block, sourceId, calendarId, googleEventId, googleUpdated, payloadKey, appChangedAt }`。Google のクライアント指定 ID は base32hex 限定で Convex の `_id` を使えない |
| 競合 | **後の更新が勝つ**。送信の記録（`recordPush`）は計画時の対応表の姿（`expected`）と今の姿を比べる楽観ロックで、別の送信が先に走っていたら書かず、自分が新しく作った予定は消す（cron と即時送信の並走で二重作成・古い値の上書きを起こさない）。対応表より先に取り込みが走って自分の予定が外部予定として写っていたら、記録時に写しを消す。`appChangedAt`（アプリ側の未送信の変更時刻）と Google の `updated` を比べ、Google が新しければ戻し、そうでなければ次の送信でアプリの値が Google を上書きする。自分の送信の反射（`updated === googleUpdated`）は無視する |
| 解除 | 接続単位で処理する。出力先を持たない接続はその写しとカーソルを消す。出力先の接続は Cairn が作った Google 予定を削除してから解除し、保存先を未設定にする。認可失効で Google 側を削除できない場合は残る可能性を通知する。別接続・Cairn の元データ・既存ログイン権限を維持する |
| 失効 | 認証エラーはその接続だけを needsReauth にする。他の接続は取得を続け、古い写しは最終同期時刻とともに残す。cron は needsReauth・解除中の接続を触らない。ボードの連携ボタンに未同期件数、設定に再接続を表示する。一時的な送信失敗は従来の 30秒・2分・10分の再試行を維持する |
| 通知 | 同期エラーは通知欄に出さない（`CONTEXT.md`「通知」の3トリガーを崩さない） |
| Google に出す予定の形（Q17） | 予定: 題名 = 予定の題名、説明 = 「項目名 ／ ひとこと」+ アプリの日ページへのリンク（`SITE_URL` があるとき）、色はアプリの色を Google の色に近似、予定あり。本番日: 「本番: 〈内容〉」終日・空き、説明に目標スコア。期限: 「期限: 〈内容〉」終日・空き、説明に親目標 |
| Google ログインの `prompt` | `select_account`（アカウントを毎回選べる。`consent` にしないのはログインのたびに同意画面を出さないため。リフレッシュトークンはカレンダー権限を付ける同意で得る） |
| ランタイム | Google を叩く action は `convex/actions/calendarSync/` に `"use node"` 付きで置く（Convex は `actions/` 配下の全ファイルに `"use node"` を要求する。読み書きは `internal.*` の query / mutation 経由） |

## 2. スキーマ

データ構造は `convex/schema.ts` を正本とする。

- `calendarConnections`: 所有者・Google subject ごとの接続。外部予定の閲覧専用方針、Google 書き込み権限、表示対象、同期状態を持つ。閲覧専用でない接続は所有者につき1つで、その Google アカウントは `calendarOutputSettings.editableGoogleAccountId` が示す（移行前の接続、無ければ最初の接続。再接続しても維持）。
- `calendarOutputSettings`: 所有者ごとの保存先と移動世代、移動中の状態。
- 外部予定・カーソル・対応表・未送信操作: 接続 ID を持つ。旧データは元の接続を決定的に解決して移行する。
- 認可要求と Google identity のログイン方針: カレンダー接続とは独立して保持し、接続解除でログイン方針を失わない。

`startAt` / `endAt` は予定と同じ schedule instant（`YYYY-MM-DD HH:mm:ss`、JST）。終日は `00:00:00`〜`23:59:59` の規約（予定タブの終日判定と同じ）。

## 3. 関数

| ファイル | 種別 | 役割 |
| --- | --- | --- |
| `lib/calendarSync.ts` | 定数 | スコープ・期間・状態・文言 |
| `lib/googleCalendar.ts` | 純関数 + fetch | Google Calendar API v3 の薄いクライアント（`GoogleCalendarError` を Result で返す。401/403 = 権限、404/410 = 消えている、410 = トークン失効） |
| `lib/googleAccessToken.ts` | Better Auth | `getGoogleAccessToken`（`auth.api.getAccessToken({ body: { providerId, accountId, userId } })`、headers 無し）、`listGoogleAccounts` |
| `services/calendarSync/eventPayload.ts` | 純関数 | 目標 / 予定 → Google のイベント（色の近似対応 `GOOGLE_EVENT_COLOR_IDS`、`payloadKey`） |
| `services/calendarSync/pulledEvent.ts` / `instant.ts` / `window.ts` | 純関数 | Google のイベント → アプリの形、RFC 3339 ↔ schedule instant、写しの期間 |
| `services/calendarSync/scheduleSourceSync.ts` | mutation 側 | `scheduleGoalSync` / `scheduleBlockSync`（対応表に `appChangedAt` を刻み、送信アクションを積む） |
| `services/calendarSync/applyPull.ts` / `finishCalendarPull.ts` | mutation 側 | 差分の反映（戻す / 写す）、差分トークンの保存と写しの掃除 |
| `services/calendarSync/pushOne.ts` / `pullCalendar.ts` / `runOwnerSync.ts` | action 側 | 1件の送信、1カレンダーの取り込み、所有者1人の全件突き合わせ（取り込み → 送信） |
| `queries/calendarSync/status` / `listExternal` | `ownerQuery` | 接続の状態、予定タブの範囲の外部予定 |
| `mutations/calendarSync/setVisibleCalendars` / `moveExternal` / `removeExternal` | `ownerMutation` | 表示カレンダーの変更、外部予定の移動・削除（写しを先に動かし、`pushExternal` を積む） |
| `actions/calendarSync/connect` / `disconnect` / `syncNow` | `ownerAction` | 接続（認可要求から Google subject を確定 → 保存済みスコープ確認 → カレンダー一覧 → `upsertConnection` → 初回同期）、解除、今すぐ同期 |
| `mutations/calendarAuth/begin` | `ownerMutation` | 所有者・期限・用途・必要なら対象 Google subject を固定した認可要求の作成 |
| `actions/calendarSync/setOutput` / `retryOutputChange` | `ownerAction` | 保存先変更、途中の移動の再開。認可失効時は対象接続だけを再接続し、同じ移動を再開できる |
| `actions/calendarSync/pushSource` / `pushExternal` / `syncOwner` / `syncAll` | `internalAction` | 差分送信（再試行つき）、外部予定の操作の送信、所有者の突き合わせ、cron の入口 |

## 4. UI

- ログイン画面: 「Google でログイン」（`publicConfig.googleSignIn` が true のときだけ）。
- ボードの予定タブの「Google カレンダー連携」から共通設定を開く。アカウントごとの表示対象・最終同期・状態・手動同期・再接続・解除、Google アカウント追加、共通の「Cairn の予定の保存先」を表示する。保存先は Formisch の選択フォームを送信して確定する。追加認可が必要なら選んだアカウントに対してだけ同意画面を開く。OAuth 復帰 URL の要求 ID とタブ内の要求別印を照合し、サーバーが照合したアカウントで接続を仕上げる。元の表示日・週・ビューと設定画面を保持する。
- マイページ **アカウント設定**: ボードと共通の `CalendarSyncSection` で接続・表示対象・同期・解除を管理する。
- 日付色: 既存の日本の祝日判定を使い、祝日・日曜は赤、土曜は青。Google の表示対象チェックは予定表示だけに作用する。
- 実行ボード **スケジュールタブ**: 外部予定を**日・週・月・年ビュー**に予定色で表示する。Google 側が色を付けていない予定の既定色は、編集できる接続はラベンダー、追加アカウントの閲覧専用接続はフラミンゴ。月は件名と省略時の一覧、年は日付マーカーと予定一覧で確認する。通常予定と共通の編集モーダルで、件名・日時・Google の予定色を編集し、削除できる。終日予定は日付で編集する。カレンダー名と連携アカウントのメールアドレス、Google 上の予定にも変更が反映される説明を表示する。「削除」ボタンは Tooltip と確認画面で Google 側からも削除されることを伝える。Google の読み取り専用カレンダーと追加アカウントの外部予定は編集・削除不可。保存先に選んでも、この制限は変えない。未送信の変更は件名・色・日時をまとめて保持し、直後のドラッグ移動で変更を失わない。新規作成・記録への紐づけはしない。タブを開いたとき `syncNow` を一度呼ぶ。

## 5. テスト

- 複数接続: `calendarMultipleConnections.test.ts`、`calendarConnectionsSync.test.ts`、`calendarOutputMigration.test.ts` で所有者境界、3アカウント、重複排除、閲覧専用の強制、接続単位の失敗・解除、既存データの移行、ページを跨ぐ保存先移動・再開を確認する。
- 認証: `calendarAuth.test.ts`、`calendarAuthConnect.test.ts`、`lib/calendarGoogleAuth.test.ts`、`lib/googleAccessToken.test.ts` で要求の期限・対象・一度だけの消費、OAuth と直接 ID token のログイン拒否、既存ログインと refresh、認可失効と一時的な通信障害の区別を確認する。実際の Google 接続の検証にはテスト用アカウントが別途必要。
- `convex/calendarSync.test.ts`: fetch を偽 Google（カレンダーごとの予定と変更番号の差分トークン）に差し替え、`lib/googleAccessToken` を `vi.mock`。接続と一覧、スコープ不足の拒否、予定の作成・移動・削除の送信、終了した本番・達成したチェックポイントの削除、外部予定の写しと期間、表示カレンダーの変更、Google 側の移動・削除の反映（予定 / 本番日）、外部予定のアプリからの移動・削除、解除、権限切れ。
- `convex/calendarSync.test.ts` はさらに、送信記録の楽観ロック（conflict）、レート制限の 403 の再試行、差分トークン失効（410）と 7 日ごとの全件取り直し、アプリ側が勝つ競合、Google で終日化された予定の書き戻し、外部予定の送信の再試行と諦め、別アカウントでの再接続を確かめる。純関数は `pulledEvent.test.ts` / `window.test.ts` も。純関数は `services/calendarSync/eventPayload.test.ts`（時刻だけの変更で `payloadKey` が変わる）と `lib/googleCalendar.test.ts`（401 / 403 / 429 の分類）。
- `convex/authPublicConfig.test.ts`: Google 設定、offline、アカウント連携。
- UI: `board-calendar-sync-button.test.tsx`（Tooltip、設定の開閉と表示位置の保持、OAuth後の復帰と接続仕上げ）、`calendar-sync-section.test.tsx`、`login-screen.test.tsx`、`board-schedule-events.test.ts`（外部予定の変換）。

## 6. 運用

- 複数接続への初回デプロイ前に手動バックフィルは必須ではない。既存接続、出力先、Google 予定 ID と旧 scheduled action の引数を解決する互換処理を残す。段階的に移行する場合は既存の `migrations:run` から `backfillCalendarConnections`、続いて Links / Cursors / Events / Changes / Operations の各 backfill を実行する。接続参照の必須化と互換処理の削除は、実データの移行完了を確認した後の別変更とする。
- Convex deployment env: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`（`NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` は不要）。
- Google Cloud Console の「ブランディング」に載せるリンク: ホームページ `<SITE_URL>/`、プライバシーポリシー `<SITE_URL>/privacy`、利用規約 `<SITE_URL>/terms`。どちらもログイン不要の公開ページ（`src/features/legal/`、本文は `content/*.ts`、Google ユーザーデータの Limited Use 開示を含む）。ログイン画面の下にも同じリンクを置く。
- Google Cloud Console: OAuth クライアント（ウェブ）に承認済みリダイレクト URI `<SITE_URL>/api/auth/callback/google`（Better Auth の `baseURL` は `SITE_URL`。Start が `/api/auth/$` を Convex HTTP へプロキシする）と、承認済み JavaScript 生成元に `SITE_URL`。Google Calendar API を有効化。OAuth 同意画面のスコープに `calendar.events.readonly`、`calendar.events`、`calendar.calendarlist.readonly`（sensitive）を追加。公開ステータスが「テスト」のままだとリフレッシュトークンが 7 日で失効し毎週の再接続になるので、利用者2人のままでも「本番」に公開する（sensitive スコープの審査を通さない間は「未確認のアプリ」の警告画面が出るが、進める）。
- デプロイ前に Convex ダッシュボードで旧 `calendarFeedTokens` テーブルを空にする（スキーマから消えたテーブルに行が残っていると push が止まることがある）。

## 7. 端ケース

| ケース | 挙動 |
| --- | --- |
| Google でアプリ発の予定を消した | 予定はアプリでも消える（記録は残る）。本番日・期限は目標が残り、次の同期で新しい予定が Google に作られる |
| Google で本番日を終日以外に変えた | 開始日だけを本番日として戻す |
| Google で予定を終日に変えた | 戻さない（予定は時刻つきのみ）。対応表に「アプリ側の変更」を刻み、次の送信でアプリの時刻に書き戻す |
| アプリと Google で近い時刻に変えた | `appChangedAt` と `updated` の新しい方が勝つ |
| 差分トークンが失効（410） | そのカレンダーだけ期間で全件を取り直し、無くなった写しを消す |
| 表示カレンダーを外した | 写しと差分トークンを捨て、再び入れたら全件を取り直す |
| Google で権限を取り消した | `needsReauth`。ボードの同期設定から「もう一度接続」で `linkSocial` をやり直す |
