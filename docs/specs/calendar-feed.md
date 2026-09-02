# カレンダー購読フィード（#76）

- 状態: 決定済み・実装済み（2026-09-02）。地図 [#66](https://github.com/sc30gsw/cairn/issues/66)。調査 [#75](https://github.com/sc30gsw/cairn/issues/75) → [docs/research/calendar-export.md](../research/calendar-export.md)。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)（CVX-04 の別形＝トークン照合、CVX-09 純関数、CVX-15）、[security.md](../../.claude/rules/common/security.md)、[better-result.md](../../.claude/rules/typescript/better-result.md)。

## 1. 決定の要約

| 論点 | 決定 |
| --- | --- |
| 方式 | **A: Convex `httpAction` による capability-URL 型の iCalendar（.ics）購読フィード**。B（Google Calendar API へ OAuth 書き込み）は不採用: Google 以外に出すには会社ごとの別実装が要り、Better Auth のアカウント連携（ADR-0009 で v1 は行わない）を覆す設計変更になり、秘密情報（access/refresh token）の管理が重い。即時性の差（数時間〜1日）は本番日・期限の性質上受け入れる |
| 載せる予定 | **進行中の本番の本番日**と**未達成のチェックポイントの期限**（どちらも終日）。終了した本番（結果あり）・達成済みチェックポイント・長期目標（期限なし）・予定ブロック（`boardScheduleEvents`）は載せない。予定ブロックは「計画」でアプリ内で置くものなので、外部へ出しても一方向で、v1 では見送る |
| トークン | `calendarFeedTokens { ownerId, token }`、index は `by_owner` と `by_token`。**所有者につき1本**。暗号学的乱数 32 バイトを base64url（43 文字）。発行 = 再発行（同じミューテーション。古いトークンは同じトランザクションで消え、以後 404）。停止は行の削除 |
| httpAction の認可 | `GET /calendar/<token>.ics`（`pathPrefix: "/calendar/"`）。セッションは無いので、パスのトークンを `by_token` で照合して所有者を解く（CVX-04 の趣旨を別形で満たす）。形が違う・無効なら **404**（`text/plain`, `cache-control: no-store`。W3C TAG の推奨）。成功は `200`, `content-type: text/calendar; charset=utf-8`, `cache-control: private, max-age=3600` |
| ICS の形 | RFC 5545: `VERSION:2.0` / `PRODID` / `CALSCALE` と、RFC 7986 の `NAME` + 互換の `X-WR-CALNAME`、`REFRESH-INTERVAL;VALUE=DURATION:P1D`（提案値）。各 VEVENT は `UID:<goalId>@cairn` / `DTSTAMP` / `DTSTART;VALUE=DATE` / `DTEND;VALUE=DATE`（翌日＝排他的終端）/ `SUMMARY` / `DESCRIPTION` / `TRANSP:TRANSPARENT`。`METHOD` は付けない（スナップショットの配信）。75 オクテット折り返し・エスケープあり・CRLF |
| 更新の反映 | UI に明記: 「反映は各カレンダーの取得間隔に従います（Google は最大 24 時間ほど、Outlook は約 3〜24 時間、Apple は設定で選べます）。URL を知っている人は誰でも読めるので渡さないでください」 |
| テスト | `convex-test` の `t.fetch` は `http.ts`（Better Auth 依存）をテストのモジュール一覧から外しているため使わず、**内部 query `feedByToken` と純関数 `calendarFeedResponse` / `buildIcs` を直接テスト**する |
| 語彙 | `CONTEXT.md` に「カレンダー購読」を追加。Avoid: 逆同期、外部カレンダーからの記録作成、予定ブロックを載せること（v1） |

## 2. 関数

| ファイル | 種別 | 役割 |
| --- | --- | --- |
| `convex/lib/ics.ts` | 純関数 | `buildIcs(events, nowMs)`、`escapeIcsText`、`foldIcsLine`、`icsDate`、`icsTimestamp` |
| `convex/lib/calendarFeedToken.ts` | 純関数 | `generateCalendarFeedToken`（`crypto.getRandomValues`）、`calendarFeedTokenFromPath`、`calendarFeedPath` |
| `services/calendarFeed/feedEvents.ts` | 純関数 | 目標一覧 → 終日イベント（本番日 / 未達成の期限、日付順）。`isActiveExamGoal` を共有 |
| `queries/calendarFeed/status` | `ownerQuery` | `{ token: string \| null }` |
| `mutations/calendarFeed/issue` / `revoke` | `ownerMutation` | 発行（再発行）/ 停止 |
| `queries/calendarFeed/feedByToken` | `internalQuery` | トークン → 所有者 → イベント。無効なら `null` |
| `actions/calendarFeed.ts` | `httpAction` | パスからトークン → 読み1回 → `calendarFeedResponse` |
| `convex/http.ts` | — | `http.route({ pathPrefix: "/calendar/", method: "GET", handler: calendarFeed })` |

## 3. UI

`src/features/my-page/components/calendar-feed-section.tsx` をマイページ**アカウント**タブの `PasskeySection` の下に置く。未発行なら「購読 URL を発行」。発行済みなら読み取り専用の URL、`CopyButton`、`webcal://` の「カレンダーアプリで開く」、「URL を作り直す」（Confirm）、「購読を止める」（Confirm）。URL は `VITE_CONVEX_URL` の `.convex.cloud` を `.convex.site` に読み替えて組む（`src/lib/convex-site-url.ts`）。

## 4. テスト

- 純関数: `convex/lib/ics.test.ts`（エスケープ・折り返し・終日・必須プロパティ・METHOD なし）、`convex/lib/calendarFeedToken.test.ts`、`src/lib/convex-site-url.test.ts`
- 統合: `convex/calendarFeed.test.ts`（発行 / 再発行で旧トークン 404 / 停止、載る予定と載らない予定、所有者分離、Response の形）
- UI: `calendar-feed-section.test.tsx`

## 5. 端ケース

| ケース | 挙動 |
| --- | --- |
| 本番日を編集した | 次の取得で同じ UID の VEVENT が新しい日付になる（購読側は UID で置き換える） |
| チェックポイントを達成にした | 次の取得で VEVENT が消える |
| 結果を入れて本番を終了した | 本番日の VEVENT が消える。次の本番を作ればその本番日が載る |
| トークンを知られた | 「URL を作り直す」で即 404。カレンダー側のキャッシュが残る間は見えることがある |
| 予定が0件 | VEVENT の無い妥当な VCALENDAR を返す |
