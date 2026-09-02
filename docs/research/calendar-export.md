# 本番日・チェックポイント期限の外部カレンダー連携方式調査

- 作成日: 2026-09-02
- 対象: 本アプリ（TOEIC 学習ログ、TanStack Start + Convex ^1.44.0 + Better Auth、所有者1人 + 実質2ユーザー）の本番目標の本番日・チェックポイント期限（・実行ボードの予定ブロック）を Google / Apple / Outlook のカレンダーへ出す方式
- 目的: Convex httpAction による iCalendar（.ics）購読フィード（方式A）と、Google Calendar API を OAuth で叩く書き込み方式（方式B）を一次情報（RFC・公式ドキュメント・公式サポート記事・ソースコード）で比較し、実装セッションに渡せる解像度で推奨をまとめる
- 前提となる既存の設計判断:
  - `docs/adr/0009-general-account-auth.md` — 認証は Better Auth（Notion OAuth + email/password/username）。**アカウント連携は v1 では行わない**（Notion OAuth と email/password は別 JWT `subject` になり、データは分離されたまま）
  - `docs/adr/0001-notion-idp-only.md` / `docs/spec.md` — `genericOAuth` は使わない方針。ソーシャルプロバイダを追加するなら Better Auth のネイティブ `socialProviders` を使う
  - `CONTEXT.md`「本番目標」「習得」「長期目標」「チェックポイント」の定義（本番日・チェックポイント期限は全日=日付のみ、時刻を持たない）
  - `convex/schema.ts` の `boardScheduleEvents`（実行ボードの予定タブ。`startAt`/`endAt` は時刻つきの ISO 文字列、`rowId` で記録に紐づく）と `docs/specs/study-timer.md` §15「時間ブロックは**計画**（自分で置く予定）であり、計測ログではない」
  - `.claude/rules/convex-rules.md` CVX-04（公開関数の認可）/ CVX-05（scheduler・crons は internal のみ）/ CVX-06（`ctx.runAction` はランタイムが異なる場合のみ）
  - Convex 側は本アプリでは `queries/` `mutations/` `actions/` `services/` のドメイン分割（CVX-20）。認証は `convex/lib/ownerFunctions.ts` の `ownerQuery`/`ownerMutation`（`ctx.auth.getUserIdentity()` に基づく）
- 関連 Issue: [#75](https://github.com/sc30gsw/cairn/issues/75)（カレンダー外部連携の方式調査）/ 地図 [#66](https://github.com/sc30gsw/cairn/issues/66)
- 出典の扱い: 各主張に出典 URL を付す。一次ソース（RFC 本文・公式ドキュメント・公式サポート記事・ソースコード）で裏付けが取れなかったものは **[未検証]** と明記した。設計判断であり文献からは直接導けないものは「推測」と明記した。ネットワーク経由の取得は本セッションのサンドボックス方針で `rfc-editor.org` / `w3.org` / `support.google.com` / `support.apple.com` / `support.microsoft.com` / `docs.convex.dev` / `better-auth.com` への直接アクセスが遮断されていたため、(a) IETF RFC は GitHub 上の複数の独立したミラー（`robur-coop/caldav`, `juxt/tick`, `w3ctag/capability-urls` 等、内容はバイト単位で一致）から本文を取得し正規の RFC番号・章番号で引用、(b) Convex / Better Auth は該当 OSS リポジトリ（`get-convex/convex-backend` の `npm-packages/docs`、`better-auth/better-auth` の `docs/content`、`get-convex/better-auth` の `docs/content`）内のドキュメントソース（.mdx）をそのまま取得、(c) Google/Apple/Microsoft の公式サポート記事のみは直接取得できず、検索結果に埋め込まれた本文抜粋を根拠にした。(c) に該当する箇所はその旨を明記し、抜粋で確認しきれない細部は [未検証] とした。

---

## 1. 要約

**結論: 本番日・チェックポイント期限は方式A（Convex httpAction による capability-URL 型 .ics 購読フィード）を採用する。方式B（Google Calendar API への OAuth 書き込み）は v1 では見送る。**

理由は大きく3つ:

1. 方式Bは Google 以外（Apple / Outlook）に書き込むには各社ごとの別実装が要り、「3社に出す」という要求に対してコストが人数分（3倍）に増える。方式Aは RFC 5545 という共通フォーマット1つで3社とも「購読」できる（§3.6）。
2. 方式Bは Better Auth のアカウント連携（`accountLinking`）機能を使わないと成立しないが、ADR-0009 は「アカウント連携は v1 では行わない」と明記しており、これを覆す設計変更になる（§4.3）。
3. 方式Aは CVX-04 が要求する「公開関数の認可」を素直な形（`ctx.auth` セッション）では満たせない（httpAction を外部カレンダーが定期ポーリングする際、Authorization ヘッダは付けられない）が、これはトークン照合という別形の認可に置き換えれば足りる、実装量の小さい問題である（§5）。方式Bはこの種の設計変更を要求しないが、そもそも実装量・秘密情報の管理コストが方式Aよりずっと重い。

| 観点 | 方式A: httpAction + .ics 購読 | 方式B: Google Calendar API 書き込み |
|---|---|---|
| 実装量 | 小。httpAction 1本 + ICS 文字列生成の純関数1つ | 中〜大。OAuth スコープ追加、トークン取得・リフレッシュ、Calendar API 呼び出しの action、UI（連携ボタン） |
| 秘密情報 | 購読用トークン（capability URL の一部）のみ。DB に保存し検証に使う | Google の `access_token`/`refresh_token`（Better Auth の `account` テーブルに保存。`encryptOAuthTokens` で暗号化可） |
| 対応カレンダーの広さ | Google / Apple / Outlook いずれも標準で ICS 購読に対応（§3.6） | Google のみ。Apple には CalDAV、Outlook には Microsoft Graph の別実装が要る（§4.5） |
| 更新の即時性 | 各社のポーリング間隔に依存し、数時間〜24時間程度の遅延がある（§3.6、[未検証]な細部あり） | API 呼び出し直後に反映（ほぼ即時) |
| 失効の扱い | トークンを DB から失効させれば以後 404/410（W3C TAG 推奨、§3.7）。カレンダー側のキャッシュが残る間は見え続ける | OAuth トークンを取り消せば以後呼び出し不可。個々のイベントは作成済みのものが残る（明示的に削除呼び出しが必要） |
| CVX-04 との整合 | httpAction は `ctx.auth` セッションを持たない外部ポーラーからのリクエストなので、`requireUser` は使えない。トークン照合による同等の認可をハンドラ内に実装する必要がある（§5.1） | 通常の `action`/`mutation` なので `ownerMutation`/`ownerQuery` 相当の認可がそのまま使える |
| テストのしやすさ | `convex-test` の `t.fetch(url, init)` で httpAction を直接叩けるため容易（§5.4） | Google API 呼び出し部分はモックが必要（`convex-test` は外部 HTTP をモックしない）。Better Auth のトークン取得部分は `convexTest` でモック可能 |

---

## 2. 前提: 本アプリのデータモデルにおける「出す対象」

`convex/lib/validators.ts` の `goalDocumentValidator` から:

- 本番目標（試験タイプ）: `examDate: v.string()` — `CONTEXT.md`「本番目標」の「本番日」に対応。`convex/lib/domain.ts` の `DATE_JST_PATTERN`（`YYYY-MM-DD`）に従う暦日文字列で、時刻を持たない。**終日イベント**として表現するのが自然。
- 習得（チェックポイント区分）: `deadline: v.optional(v.string())` — `parentGoalId` を持つ（親=本番目標 or 長期目標）ものが `CONTEXT.md`「チェックポイント」。こちらも同じ日付文字列で時刻を持たず、**終日イベント**。
- `boardScheduleEvents`（実行ボードの予定タブ）: `startAt`/`endAt` は `convex/lib/scheduleInstant.ts` の `requireScheduleInstant` で正規化される ISO 時刻つき文字列（`convex/services/boardSchedule/blocks.ts`）。**時刻つきイベント**。

`docs/specs/study-timer.md` §15 は「実行ボードの時間ブロック（`boardScheduleEvents`）は変わらない。ブロックは**計画**で計測ログではない」と明記しており、予定ブロックはユーザー自身がアプリ内で置くものであって、外部カレンダーの操作から生まれるものではない。したがって外部カレンダー→本アプリの**逆方向同期は不要**という結論は本アプリのデータモデルから直接導ける（推測ではなく設計上の事実）。何を「読み取り専用で出す」かは以下§6で改めて整理する。

---

## 3. 方式A: Convex httpAction + iCalendar（.ics）購読フィード

### 3.1 RFC 5545 の必須プロパティ

RFC 5545（iCalendar）は VCALENDAR コンポーネント本体（`icalbody`）の必須プロパティを次のように定義する:

> "An iCalendar object MUST include the "PRODID" and "VERSION" calendar properties. In addition, it MUST include at least one calendar component."
> — RFC 5545 §3.6

- **PRODID**（§3.7.3）: "The property MUST be specified once in an iCalendar object." 例: `PRODID:-//ABC Corporation//NONSGML My Product//EN`
- **VERSION**（§3.7.4）: "This property MUST be specified once in an iCalendar object." 値は `2.0`。例: `VERSION:2.0`

VEVENT コンポーネント（§3.6.1）の必須プロパティは:

> "The following are REQUIRED, but MUST NOT occur more than once. dtstamp / uid / ... The following is REQUIRED if the component appears in an iCalendar object that doesn't specify the "METHOD" property; otherwise, it is OPTIONAL ... dtstart /"
> — RFC 5545 §3.6.1（Format Definition）

つまり **UID・DTSTAMP は常に必須**、**DTSTART はカレンダーレベルの METHOD プロパティを指定しない限り必須**（本アプリのように読み取り専用の購読フィードとして配信する場合は METHOD を付けない設計が妥当なので、事実上 DTSTART も必須になる）。

- **UID**（§3.8.4.7）: "The 'UID' itself MUST be a globally unique identifier. ... Implementations MUST be able to receive and persist values of at least 255 octets for this property." 推奨形式は「ドメイン名を `@` の右辺、日時＋一意な識別子を左辺にする」。本アプリでは目標ドキュメントの Convex `_id`（例 `goals` の `Id<"goals">`）＋アプリの固定ドメイン識別子を組み合わせれば安定して一意になる。
- **DTSTAMP**（§3.8.7.2）: 生成時刻。

出典: RFC 5545（IETF Standards Track, 2009年9月）<https://www.rfc-editor.org/rfc/rfc5545>

### 3.2 終日イベントの書き方（DTSTART;VALUE=DATE と DTEND の排他的終端）

RFC 5545 §3.8.2.4（DTSTART）と §3.8.2.2（DTEND）:

> "Value Type: The default value type is DATE-TIME. ... The value type can be set to a DATE value type." （DTSTART・DTEND共通の記法）

具体例（§3.6.1 の公式サンプル、複数日にまたがる終日イベント）:

```
BEGIN:VEVENT
UID:20070423T123432Z-541111@example.com
DTSTAMP:20070423T123432Z
DTSTART;VALUE=DATE:20070628
DTEND;VALUE=DATE:20070709
SUMMARY:Festival International de Jazz de Montreal
TRANSP:TRANSPARENT
END:VEVENT
```

このサンプルの直前の解説文:

> "The following is an example of the 'VEVENT' calendar component used to represent a multi-day event scheduled from June 28th, 2007 to July 8th, 2007 inclusively. Note that the 'DTEND' property is set to July 9th, 2007, since the 'DTEND' property specifies the non-inclusive end of the event."
> — RFC 5545 §3.6.1

すなわち **DTEND は排他的終端（non-inclusive end）**。本番日・チェックポイント期限のように「1日だけの終日イベント」を作る場合は、`DTSTART;VALUE=DATE:20261115` に対して `DTEND;VALUE=DATE:20261116`（翌日）を指定する必要がある。なお同§は DTEND/DURATION を省略した場合の既定動作も定めている:

> "For cases where a 'VEVENT' calendar component specifies a 'DTSTART' property with a DATE value type but no 'DTEND' nor 'DURATION' property, the event's duration is taken to be one day."
> — RFC 5545 §3.6.1

したがって1日だけの終日イベントは DTEND を省略しても仕様上は正しい（多くのクライアントもこの既定に従う）が、明示的に `DTEND;VALUE=DATE` を1日後に指定したほうが挙動が読みやすく、Google/Apple/Outlook いずれの実装差異にも影響されにくい（推測: 相互運用性を優先する設計判断）。

出典: RFC 5545 §3.6.1, §3.8.2.2, §3.8.2.4 <https://www.rfc-editor.org/rfc/rfc5545>

### 3.3 更新の反映: SEQUENCE / LAST-MODIFIED / METHOD

- **SEQUENCE**（§3.8.7.4）: "When a calendar component is created, its sequence number is 0. It is monotonically incremented by the 'Organizer's' CUA each time the 'Organizer' makes a significant revision to the calendar component." 本番日やチェックポイント期限を編集したら SEQUENCE を1つ増やすことで、クライアント側に「これは新しいバージョンだ」と伝える意味づけになる。ただし本アプリのように**フィード全体を毎回サーバ側で動的生成する**方式では、購読側は基本的にフィード取得のたびに全 VEVENT を作り直す（同じ UID の VEVENT を新しい内容で置き換える）ため、SEQUENCE は「必須ではないが付けておくと親切」という位置づけになる（推測）。
- **LAST-MODIFIED**（§3.8.7.3）: "This property specifies the date and time that the information associated with the calendar component was last revised... The property value MUST be specified in the UTC time format." 目標ドキュメントの更新時刻（Convex の `_creationTime` や、更新時に自前で持つ `updatedAt` 相当のフィールド）をここに入れておくと、クライアントが差分検出の参考にできる。
- **METHOD**（§3.7.2）: "If this property is not present in the iCalendar object, then a scheduling transaction MUST NOT be assumed. In such cases, the iCalendar object is merely being used to transport a snapshot of some calendar information; without the intention of conveying a scheduling semantic." これはまさに本アプリの用途（スケジューリングの往復ではなく、読み取り専用のスナップショット配信）に一致する。**METHOD は省略するのが素直な設計**という結論になる。

METHOD を敢えて `PUBLISH` にする選択肢もあるが、iTIP（RFC 5546）は `METHOD:PUBLISH` の VEVENT に対して次の制約を課す:

> "Constraints for a METHOD:PUBLISH of a VEVENT ... | ORGANIZER | 1 | ..." （ORGANIZER は1回必須）
> — RFC 5546 §3.2.1

個人の学習ログアプリに「主催者(ORGANIZER)」概念はなく、これを満たすためだけに自分のメールアドレス等を ORGANIZER として詰めるのは過剰である。したがって **METHOD は付与しない**（RFC 5545 の既定どおり「スナップショットの配信」として扱う）のが本アプリには適切、という設計判断になる（推測だが RFC 5546 の制約から直接導ける）。

出典: RFC 5545 §3.7.2, §3.8.7.3, §3.8.7.4 <https://www.rfc-editor.org/rfc/rfc5545>; RFC 5546（iTIP）§3.2.1 <https://www.rfc-editor.org/rfc/rfc5546>

### 3.4 拡張プロパティ: X-WR-CALNAME と RFC 7986（NAME / REFRESH-INTERVAL / SOURCE）

RFC 5545 は非標準プロパティ（`X-` 接頭辞）を正式に許容している:

> "Property Name: Any property name with a 'X-' prefix ... Conformance: This property can be specified in any calendar component."
> — RFC 5545 §3.8.8.2

`X-WR-CALNAME`（カレンダー名の表示に使われる、Apple iCal 由来とされる非標準プロパティ）はこの枠組みの実例だが、RFC 5545 自体には登場しない。これを置き換える形で標準化されたのが RFC 7986（2016年、"New Properties for iCalendar"）である:

- **NAME**（§5.1）: "This property is used to specify a name of the iCalendar object that can be used by calendar user agents when presenting the calendar data to a user." 例: `NAME:Company Vacation Days`
- **REFRESH-INTERVAL**（§5.7）: "This property specifies a suggested minimum interval for polling for changes of the calendar data from the original source of that data. ... The value of this property SHOULD be used by calendar user agents to limit the polling interval for calendar data updates to the minimum interval specified." 例: `REFRESH-INTERVAL;VALUE=DURATION:P1W`
- **SOURCE**（§5.8）: "This property identifies a location where a client can retrieve updated data for the calendar."

ただし REFRESH-INTERVAL の実効性には注意が必要で、RFC 7986 のセキュリティ考慮事項自身がこう書いている:

> "The 'REFRESH-INTERVAL' property could be used by an attacker to make a client carry out rapid requests to the server hosting the calendar by specifying a very short duration... Clients MUST ensure that they throttle requests to the server to a reasonable rate. In most cases, updating a public calendar once per day would suffice. If the 'REFRESH-INTERVAL' is any less than that, clients SHOULD warn the calendar user and allow them to override it with a longer value."
> — RFC 7986 §7

つまり REFRESH-INTERVAL は「クライアントが尊重すべき（SHOULD）」提案値に過ぎず、強制力はない。実際に Google/Apple/Outlook がこのプロパティをどこまで尊重するかは§3.6のとおり公式文書からは確認できておらず [未検証]。`X-WR-CALNAME`／`NAME`／`REFRESH-INTERVAL` は「付けておいて損はないが、更新間隔を確実に制御する手段ではない」という位置づけで実装するのが妥当（推測）。

出典: RFC 7986 §5.1, §5.7, §5.8, §7 <https://www.rfc-editor.org/rfc/rfc7986>; X-WR-CALNAME が RFC 7986 以前の非標準拡張として広く使われてきた経緯は複数の二次情報で言及されているが [未検証]（例: Mozilla Bugzilla #168176 <https://bugzilla.mozilla.org/show_bug.cgi?id=168176>）。

### 3.5 `webcal://` スキーム

`webcal://` は IANA の provisional URI scheme registry に登録がある:

> "(last updated 2012-09-23) Resource Identifier (RI) Scheme name: webcal"
> — IANA URI Schemes Registry <https://www.iana.org/assignments/uri-schemes/prov/webcal>（本セッションでは直接アクセスできず、登録の存在と最終更新日は検索結果からの引用であり、登録内容の詳細本文は [未検証]）

`webcal:` は Apple が iCal（Mac OS X 10.2, 2002年）向けに考案したスキームで、OS/ブラウザにハンドラ登録されていれば「ダウンロード」ではなく「購読」の意図をクライアントに伝える、という実務的な位置づけがある [未検証・二次情報]。実装としては、通常の `https://` URL をそのまま公開しつつ、UI 上で「カレンダーに追加」リンクの href だけ `webcal://` に置き換える（スキームを除いた残りは同一の URL）のが一般的なパターンである（推測）。`https://` の ICS URL 自体は Google「URL で追加」・Apple「カレンダーを購読」・Outlook「インターネットカレンダーの購読」のいずれでも受け付けられるため、`webcal://` の対応は必須ではなく UX 向上の追加要素という位置づけになる。

### 3.6 各カレンダーの購読更新間隔

3社とも「ポーリング型」の購読であり、リアルタイム反映ではない。

- **Google カレンダー**: 「URL で追加」機能で外部 ICS フィードを購読できる。コミュニティサポートのスレッドでは「変更が反映されるまで最大12時間ほどかかる」「新規購読の取得に最大24時間ほどかかる」といった記述が繰り返し見られるが、これは Google 公式ヘルプ記事（`support.google.com/calendar/answer/37100`）自体の文言を本セッションから直接確認できておらず、検索結果に現れるコミュニティの引用に基づく。**具体的な時間（12時間 / 24時間）は [未検証]**。「数時間〜24時間程度のポーリング間隔があり、即時反映ではない」という定性的な事実は複数の独立したスレッドから一致して確認できる。
  出典（未検証な引用元として）: Google Calendar Community, "Google Calendar does not sync URL-linked calendars within 12 hours as stated" <https://support.google.com/calendar/thread/12658899>
- **Apple カレンダー（Mac）**: 公式ヘルプに「購読したカレンダーごとに Auto-refresh（自動更新）ポップアップメニューから更新頻度を選べる」という設定項目がある:
  > "Click the Auto-refresh pop-up menu, then choose an option."
  > — Apple サポート「Refresh calendars on Mac」<https://support.apple.com/guide/calendar/refresh-calendars-icl1024/mac>（検索結果からの引用。ポップアップメニューの具体的な選択肢一覧＝「5分ごと」「15分ごと」「30分ごと」「1時間ごと」「1日ごと」「1週間ごと」等の**列挙は本セッションでは確認できず [未検証]**）。少なくとも Apple はユーザーが更新頻度を選べる UI を提供しており、これは Google/Outlook との明確な違いである。
- **Outlook（Outlook.com / Outlook on the web）**: 公式サポート記事に基づく検索結果の要約:
  > 「更新はおよそ3時間ごとに行われるが、24時間以上かかることもある」
  出典: Microsoft サポート「Import or subscribe to a calendar in Outlook.com or Outlook on the web」<https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web-cff1429c-5af6-41ec-a5b4-74f2c278e98c>（検索結果からの引用。正確な文言・数値は [未検証]）

**設計上の含意**: 本番日・チェックポイント期限は「決まってから何日も先」の予定であることが多く（`CONTEXT.md`「本番目標」はカウントダウンの軸）、数時間〜1日程度の反映遅延は実用上大きな問題にならないと考えられる（推測）。即時性を求めるなら方式Bだが、§4で述べる理由からv1では採用しない。

### 3.7 capability URL（トークン付き購読 URL）のセキュリティ

W3C TAG のファインディング「Good Practices for Capability URLs」（2014年10月、TR版）は、まさに Google カレンダーの秘密アドレスを実例として挙げている:

> "Google Calendar provides Private Addresses for XML and iCalendar formats of a calendar. These can be used by anyone within a feed reader or a calendar programme to provide access to the calendar, but users are warned 'Your calendar's Private Address was designed for your use only, so be sure not to share this address with others.'"
> — W3C TAG, Good Practices for Capability URLs §2.3

推奨事項（§5.1, §5.2）から、本アプリの設計に直結するものを抜粋する:

> "Capability URLs should be https URLs. ... Capability URLs should expire. ... If capability URLs are controlled by an authenticated user, it should be possible for that user to revoke the capability URLs associated with the resource that they control. They should be able to create multiple such capability URLs so that they can revoke access through a compromised capability URL without affecting access from other capability URLs. ... The path under which capability URLs are found should be listed within robots.txt ... Access to the URL space in which capability URLs reside should be rate limited."
> "Good unique URLs include an unguessable unique identifier created through a secure random number generator."
> "When capability URLs expire, servers should respond to the URL with either a 410 Gone or a 404 Not Found response."
> — 同 §5.1, §5.2

また Referer 経由の漏洩リスクについて:

> "There are more subtle routes for exposure too. If a link to another site... is followed on a page accessed through a capability URL, that site may be notified of the capability URL through the Referer HTTP header."
> — 同 §4.1

本アプリへの適用（推測を含む設計への落とし込み）:

- トークンは暗号学的に安全な乱数（例: 128bit 以上のランダム値の Base64url）で発行し、URL のパス末尾（例 `/calendar/<token>.ics`）に置く。連番やユーザー ID からの推測を避ける。
- トークンはユーザーごとに専用のドキュメント（例 `calendarFeedTokens` テーブル、`ownerId` と1対1）として Convex DB に保存し、httpAction はリクエストのトークンをこのドキュメントに照合して所有者を特定する。これは `ctx.auth.getUserIdentity()` に依存しない、トークン照合という別形の認可になる（§5.1 で詳述）。
- ユーザーがマイページ等から「トークンを再発行（失効）」できる操作を用意する（W3C TAG の「複数の capability URL を作れて、個別に取り消せるべき」という推奨に対応。ただし本アプリは1トークン運用でも「再発行して古いものを無効化する」という単純化で要件は満たせる、と考えられる=推測）。
- フィード自体は他サイトへのリンクを含まないプレーンテキスト（`text/calendar`）なので、Referer 経由の漏洩は httpAction の応答そのものではなく「トークン URL をブラウザで直接開いて、そのページから別サイトへ遷移する」ような使い方をしない限り発生しにくい（推測）。

出典: W3C TAG, Good Practices for Capability URLs（TR, 2014年10月版）§2.3, §4.1, §5.1, §5.2 <https://www.w3.org/TR/capability-urls/>（本文は GitHub 上の同一内容のエディターズドラフト <https://github.com/w3ctag/capability-urls>（gh-pages ブランチ）経由で取得。内容は W3C 版と同一）

### 3.8 Convex httpAction の実装上の制約

**レスポンスヘッダ**: httpAction のハンドラは標準の Fetch API `Response` を返すだけでよく、任意のヘッダを設定できる:

> "http.route({ path: '/', method: 'GET', handler: httpAction(async (ctx, request) => { return new Response(...) }) })"
> — Convex 公式ドキュメント「HTTP Actions」<https://docs.convex.dev/functions/http-actions>（本文は OSS リポジトリ `get-convex/convex-backend` の `npm-packages/docs/docs/functions/http-actions.mdx` から取得）

したがって `Content-Type: text/calendar; charset=utf-8` や `Cache-Control` 等は `new Response(icsBody, { headers: { "Content-Type": "text/calendar; charset=utf-8" } })` のように普通に設定できる。RFC 5545 は media type 登録で次のように定めている:

> "Type name: text / Subtype name: calendar ... The charset supported by this revision of iCalendar is UTF-8."
> — RFC 5545 §8.1

**CORS**: ブラウザから直接フェッチする用途ではなくカレンダーアプリのサーバー間ポーリングが主用途なので CORS 設定は基本的に不要だが、Convex 公式ドキュメントは CORS が必要なケースの一般的な対処（`OPTIONS` ハンドラの追加）を案内している:

> "To make requests to HTTP actions from a website you need to add Cross-Origin Resource Sharing (CORS) headers to your HTTP actions." "if you see 'CORS error'... you likely need to configure CORS headers and potentially add a handler for the pre-flight OPTIONS request"
> — 同上

**実行時間・サイズの上限**: Convex 公式「Limits」ページ:

> "Query/mutation execution time: 1 second" / "Convex runtime action execution time: 30 minutes" / "Node runtime action execution time: 10 minutes" / "HTTP action response size: 20 MiB"
> — Convex 公式ドキュメント「Limits」<https://docs.convex.dev/production/state/limits>（`npm-packages/docs/docs/production/state/limits.mdx` から取得）

httpAction は「クエリ・ミューテーションと同じ環境（デフォルトの V8 ランタイム）で動く」とも明記されている:

> "HTTP actions run in the same environment as queries and mutations so also do not have access to Node.js-specific JavaScript APIs. HTTP actions can call actions, which can run in Node.js." "Request and response size is limited to 20MB."
> — 同上「HTTP Actions」ドキュメント

本アプリのユースケース（数十〜数百件の目標・チェックポイントを ICS 文字列に変換して返すだけ）はこれらの上限に対して十分小さく、実行時間・サイズの制約が問題になることは実質的にない（推測）。

**ルーティングとトークンの受け渡し**: httpAction は「引数バリデーションを提供しない」ため、リクエストの解析は完全にハンドラの責任である:

> "HTTP actions do not support argument validation, as the parsing of arguments from the incoming Request is left entirely to you."
> — 同上

また `http.route` はパス末尾の動的セグメントを自動キャプチャする機能を持たず、`pathPrefix` で前方一致させたうえで `request.url` から手動でパースする:

> "http.route({ pathPrefix: '/profile/', method: 'GET', handler: getProfile }) // matches `/profiles/`, `/profiles/abc`, and `/profiles/a/c/b`"
> — Convex ソースコード `npm-packages/convex/src/server/router.ts` の JSDoc（`get-convex/convex-backend` リポジトリ）

したがって本アプリでは `http.route({ pathPrefix: "/calendar/", method: "GET", handler: ... })` を `convex/http.ts` に追加し、ハンドラ内で `new URL(request.url).pathname` からトークン部分を取り出して検証する形になる。既存の `authComponent.registerRoutes(http, createAuth)`（Better Auth のルート、通常 `/api/auth/*` 配下）と衝突しないパス（`/calendar/*` 等）を選べば共存できる。

出典: Convex 公式ドキュメント「HTTP Actions」「Limits」「Runtimes」<https://docs.convex.dev/functions/http-actions>, <https://docs.convex.dev/production/state/limits>, <https://docs.convex.dev/functions/runtimes>（いずれも `get-convex/convex-backend` リポジトリの `npm-packages/docs/docs/` 配下のソースから取得）; RFC 5545 §8.1 <https://www.rfc-editor.org/rfc/rfc5545>

---

## 4. 方式B: Google Calendar API を OAuth で叩く

### 4.1 必要スコープ

Google Calendar API v3 の Discovery Document（Google が公開する機械可読な一次情報）から、`events.insert`（イベント作成）が要求するスコープの一覧:

```json
["https://www.googleapis.com/auth/calendar",
 "https://www.googleapis.com/auth/calendar.app.created",
 "https://www.googleapis.com/auth/calendar.events",
 "https://www.googleapis.com/auth/calendar.events.owned"]
```

各スコープの説明（同 Discovery Document の `auth.oauth2.scopes` から）:

| スコープ | 説明 |
|---|---|
| `.../auth/calendar` | "See, edit, share, and permanently delete all the calendars you can access using Google Calendar" |
| `.../auth/calendar.events` | "View and edit events on all your calendars" |
| `.../auth/calendar.events.owned` | "See, create, change, and delete events on Google calendars you own" |
| `.../auth/calendar.app.created` | "Make secondary Google calendars, and see, create, change, and delete events on them" |

`calendar.app.created` は「アプリ専用のセカンダリカレンダー」を作ってそこにだけ書き込める最小権限のスコープで、ユーザーの既存カレンダー全体へのアクセスを要求しない。本アプリの用途（本番日等を専用カレンダーとして見せる）に最も適合する最小権限スコープはこれになる（推測: 最小権限の原則からの設計判断）。

出典: Google Calendar API v3 Discovery Document <https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest>（本セッションから直接取得・確認済み）

### 4.2 Better Auth でのアクセストークン取得・リフレッシュ

Better Auth はソーシャルプロバイダの OAuth トークンを `account` テーブルに保存する。ソースコード上のフィールド定義・テストから:

```
accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, idToken, scope
```

（`packages/core/src/db/schema/account.ts`, `packages/core/src/db/test/get-tables.test.ts` 等、`better-auth/better-auth` リポジトリ）

サーバーサイドでは `getAccessToken` エンドポイントが有効期限切れを検知して自動的にリフレッシュする:

> "In stateless OAuth flows, `storeAccountCookie` stores provider account data, including OAuth token material, in the encrypted `account_data` cookie. `getAccessToken({ useAccountCookie: true })` can refresh expired provider access tokens when the account cookie contains a refresh token and a known access-token expiry."
> — Better Auth 公式ドキュメント「Session Management」（`better-auth/better-auth` リポジトリ `docs/content/docs/concepts/session-management.mdx`）

> "Pass `useAccountCookie: true` to `getAccessToken`, `refreshToken`, or `accountInfo` when the signed cookie should select the account. These APIs require an explicit `accountId` or `useAccountCookie: true`; omitting both selectors is invalid."
> — 同「Reference / Options」（`docs/content/docs/reference/options.mdx`）

Google のリフレッシュトークンを確実に得るには初回同意時に `accessType: "offline"` を指定する必要がある:

> "accessType: 'offline', prompt: 'select_account consent'" ... "Google only issues a refresh token the first time a user consents to your app."
> — Better Auth 公式ドキュメント「Google」（`docs/content/docs/authentication/google.mdx`）

Convex 側からこれらの Better Auth API を呼び出す経路は、`@convex-dev/better-auth` の component client が提供する `getAuth()` を使う:

```ts
const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
await auth.api.getAccessToken({
  body: { providerId: "google", userId },
  headers,
});
```

（`@convex-dev/better-auth` 公式ドキュメント「Component Client」より。原文: "Better Auth API endpoints can be called directly from the server, and many require headers to be passed in containing a session token for the current user. This method provides both the auth object and headers for convenience."）

このパターンはドキュメント上は `mutation` の例だが、`ActionCtx` も同じ `ctx` 引数を要求するだけなので `action` からも同様に呼べる（`ctx` の型が合えばよい、という Convex の一般的な性質からの推測）。Google Calendar API 自体への `fetch` 呼び出しは、Convex のデフォルトランタイム（Node.js ではない V8 環境）でも行える:

> "actions are allowed to call third-party HTTP endpoints via the browser-standard `fetch` function." "By default actions also run in Convex's custom JavaScript runtime with all of its advantages including no cold starts."
> — Convex 公式ドキュメント「Runtimes」<https://docs.convex.dev/functions/runtimes>

したがって CVX-06（`ctx.runAction` はランタイムが異なる場合のみ）に照らすと、Google Calendar API を素の `fetch` で叩くだけなら `"use node"` は不要で、通常の `action`（同一ファイル・同一トランザクション文脈内の関数）として書ける。

出典: Better Auth ソースコード・ドキュメント（`better-auth/better-auth` リポジトリの `packages/core/src/db/schema/account.ts`, `docs/content/docs/concepts/session-management.mdx`, `docs/content/docs/reference/options.mdx`, `docs/content/docs/authentication/google.mdx`）<https://github.com/better-auth/better-auth>; `@convex-dev/better-auth` ドキュメント（`get-convex/better-auth` リポジトリ `docs/content/docs/api/component-client.mdx`）<https://github.com/get-convex/better-auth>; Convex「Runtimes」<https://docs.convex.dev/functions/runtimes>

### 4.3 既存アカウントへの Google 連携可否（ADR-0009 との緊張）

Better Auth はアカウントリンク機能を持ち、クライアント/サーバー双方から呼べる:

> "To link an account to a social provider, you can use the `linkAccount` function with the `authClient`" ... `await authClient.linkSocial({ provider: "google" })`
> — Better Auth 公式ドキュメント「OAuth」（`docs/content/docs/concepts/oauth.mdx`）

設定オプションとして `accountLinking.enabled`（既定 true）、`accountLinking.trustedProviders`、`accountLinking.allowDifferentEmails`（メールアドレスが異なるアカウントへのリンクを許可）等がある（`docs/content/docs/reference/options.mdx`）。技術的には Better Auth は「Notion OAuth でログイン中のユーザーに Google を後から連携する」ことをサポートしている。

しかし本アプリの `docs/adr/0009-general-account-auth.md` は明記している:

> 「**アカウント連携は v1 では行わない。** Notion OAuth と email/password は別 JWT `subject` になり、データは分離されたまま。同一人物が両方使う場合は別アカウントとして扱う。」

したがって方式Bを実装するには、この ADR の決定を覆す（アカウント連携機能を v1 の範囲に含める）設計変更が前提になる。これは「本番日をカレンダーに出す」という比較的小さな要求に対して不釣り合いに大きい変更であり、方式Aを避ける積極的な理由にはならない一方で、方式Bを選ばない消極的な理由として明確である（設計判断・推測ではなく ADR との直接の矛盾）。

なお、Google を新規ソーシャルプロバイダとして追加すること自体は `docs/spec.md`「genericOAuth は使わない」という既決とも整合する（Better Auth のネイティブ `socialProviders.google` を使えばよく、`genericOAuth` プラグインは不要）。問題はプロバイダ追加の是非ではなく、**既存アカウントへの連携**が ADR-0009 の対象範囲だという点にある。

出典: Better Auth 公式ドキュメント「OAuth (Account Linking)」「Reference / Options」（`better-auth/better-auth` リポジトリ）<https://github.com/better-auth/better-auth>; `docs/adr/0009-general-account-auth.md`（本リポジトリ）

### 4.4 Convex action からの呼び出し手順（まとめ）

1. `convex/auth.ts` の `createAuthOptions` に `socialProviders.google`（`clientId`/`clientSecret` は `process.env` から、`.claude/rules/common/security.md` の秘密情報管理方針に従う）を追加する。
2. ユーザーが「Google カレンダーに連携する」操作をすると `authClient.linkSocial({ provider: "google" })` が呼ばれ、`account` テーブルにトークンが保存される（ADR-0009 の見直しが必要、§4.3）。
3. `convex/actions/calendar/syncGoogleCalendar.ts`（仮）のような public/internal action で `authComponent.getAuth(createAuth, ctx)` → `auth.api.getAccessToken({ body: { providerId: "google", userId }, headers })` でアクセストークンを得る。
4. 得たトークンで `fetch("https://www.googleapis.com/calendar/v3/calendars/<id>/events", { headers: { Authorization: \`Bearer ${accessToken}\` }, ... })` を呼び、イベントを作成・更新・削除する。
5. 本番目標やチェックポイントを編集した既存の `mutation` から、この action を `ctx.scheduler.runAfter(0, internal.actions.calendar.syncGoogleCalendar.sync, {...})` のように非同期でキックする（CVX-07: 同期処理を1つの内部アクションにまとめ、`ctx.runQuery`/`ctx.runMutation` の連打を避ける設計が要る）。

### 4.5 Apple / Outlook への拡張コスト

Google Calendar API のような公式 REST API に相当するものとして:

- **Apple**: CalDAV（RFC 4791）でユーザーの iCloud カレンダーに書き込む方法はあるが、iCloud の認証は「App用パスワード」等 OAuth とは別の仕組みであり、Better Auth の `socialProviders` の枠組みに乗らない。少なくとも Google 用に組んだコードはそのまま流用できず、CalDAV クライアント実装が別途必要になる。[未検証な部分あり: 本セッションでは Apple の CalDAV 認証方式の一次ドキュメントまでは確認していない]
- **Outlook**: Microsoft Graph API（`POST /me/events`）で書き込みは可能だが、Microsoft Entra ID（旧 Azure AD）アプリ登録・別スコープ・別トークンフローが必要で、これも Google 用の実装をそのまま使い回せない。

つまり方式Bを「3社すべてに拡張する」場合、実装コストはほぼ3倍になる（各社ごとに OAuth 登録・スコープ・API 呼び出し・エラーハンドリングを個別に持つ）。これに対し方式Aは RFC 5545 という共通フォーマット1つで3社とも購読できる（§3.6）。「3社に出す」という要求そのものが、方式Bを選ばない理由として強く効く（設計判断）。

---

## 5. 方式A実装時の CVX-04 整合性とテスト容易性

### 5.1 CVX-04（公開関数の認可）との関係

`convex-rules.md` CVX-04 は「公開関数は `requireUser(ctx)`（本アプリでは `ownerQuery`/`ownerMutation` 経由の `ctx.auth.getUserIdentity()`）で認可する」ことを求める。この仕組みは Convex の `ctx.auth` が Authorization ヘッダ中の JWT を検証して成立する:

> "You can leverage Convex's built-in authentication integration and access a user identity from `ctx.auth.getUserIdentity()`" ... "call your endpoint with an Authorization header including a JWT token"
> — Convex 公式ドキュメント「HTTP Actions」

しかし Google/Apple/Outlook のカレンダークライアントが ICS フィードを定期的に GET する際、カスタムの Authorization ヘッダを付けさせることはできない（カレンダーアプリの購読機能は「URLを1つ登録して定期ポーリングする」だけの単純なクライアントであり、`webcal://`/`https://` の URL 以外の認証情報を扱う仕組みを持たない、というのが§3.6・§3.7で見た各社の実装の共通点）。したがって httpAction ハンドラは `ctx.auth.getUserIdentity()` に依存する `requireUser` 相当の認可を使えず、**トークンをリクエスト（URLパス）から取り出し、DB に保存された発行済みトークンと照合する**という別形の認可ロジックをハンドラ内に自前で実装する必要がある。これは CVX-04 の「公開関数は認可を必ず行う」という趣旨には合致するが、既存の `ownerQuery`/`ownerMutation` ヘルパーをそのまま使い回せない、という実装上の注意点として明記しておく（設計判断）。

### 5.2 データモデルへの追加

トークンの発行・失効・照合には最低限、次のようなテーブルが必要になる（推測、具体的なフィールド名は実装セッションで確定):

- `calendarFeedTokens`: `ownerId`（`by_owner` index）、`token`（ランダム値、`by_token` index で高速照合）、失効時は行削除または `revokedAt` を立てる。

### 5.3 レスポンス生成の純関数化（CVX-09）

ICS 文字列の生成自体（VCALENDAR/VEVENT の組み立て、行の折り返し・エスケープ等 RFC 5545 §3.1〜3.3 が定めるテキスト形式のルール）は副作用のない純粋関数として `convex/services/calendarFeed/` 配下に置き、httpAction ハンドラ本体は「トークン照合 → データ取得 → 純関数で ICS 文字列生成 → Response 返却」という薄い層にとどめるのが CVX-02/CVX-09 の思想に沿う。

### 5.4 テストのしやすさ

`convex-test`（本プロジェクトの `package.json` では `^0.0.55` を使用）は `t.fetch(url, init)` で登録済みの httpAction ルートを直接呼び出せる:

> "Your test can call HTTP actions registered by your router" ... "Mocking the global `fetch` function doesn't affect `t.fetch`, but you can use `t.fetch` in a `fetch` mock to route to your HTTP actions."
> — Convex 公式ドキュメント「convex-test」<https://docs.convex.dev/testing/convex-test>（`get-convex/convex-backend` リポジトリ `npm-packages/docs/docs/testing/convex-test.mdx` から取得）

したがって「有効なトークンで 200 と正しい ICS 本文が返る」「無効・失効済みトークンで 404 が返る（W3C TAG §5.1 の推奨どおり）」「本番日が終日イベントとして DTSTART;VALUE=DATE/DTEND;VALUE=DATE を持つ」といった振る舞いは、`convex-test` の `t.fetch` を使って CVX-19 の要求する「状態遷移のガード」テストと同じやり方で書ける。方式Bで必要になる Google Calendar API 呼び出しのモック（外部 HTTP のスタブが要る）より、方式Aのテストは自己完結していて書きやすい。

出典: Convex 公式ドキュメント「convex-test」<https://docs.convex.dev/testing/convex-test>; `package.json`（本リポジトリ、`convex-test": "^0.0.55"`）

---

## 6. 何を出すか（推測を含む整理）

`CONTEXT.md` の定義と `convex/schema.ts` から素直に導ける対象は次の3種類:

| 対象 | データ | イベント種別 | 外部カレンダーへの出し方 |
|---|---|---|---|
| 本番日 | `goals.examDate`（試験タイプ、1件） | 終日（DTSTART;VALUE=DATE のみ、1日） | 方式Aの ICS フィードに VEVENT を1件 |
| チェックポイント期限 | `goals.deadline`（`parentGoalId` を持つ習得） | 終日 | 同上、目標の数だけ VEVENT を並べる |
| （任意）長期目標の期限 | `goals.deadline`（`parentGoalId` を持たない習得） | 終日 | Issue #75 の本文は「本番日・チェックポイント期限」のみを明示要求しているが、同じ `deadline` フィールドなので技術的には同時に出せる。出す/出さないは UX 判断であり本調査の範囲外（推測） |
| 予定ブロック | `boardScheduleEvents.startAt/endAt` | 時刻つき | 同じ ICS フィードに VEVENT（DTSTART/DTEND を DATE-TIME で）として追加することは技術的には可能。ただし下記の理由で優先度は低い（推測） |

**予定ブロックの逆同期について**: §2で確認したとおり `docs/specs/study-timer.md` §15 は「時間ブロックは**計画**であり、計測ログではない」と明言しており、これはユーザーがアプリの実行ボード上で能動的に置くものである。外部カレンダー（Google/Apple/Outlook）側でこのブロックを編集・削除できるようにする（＝外部→本アプリの逆方向同期）ニーズは、少なくとも Issue #75 / #66 の記述からは要求されておらず、実装すると「どちらが正本か」の競合解決ロジックが新たに必要になる（本アプリ内では `rowId` で記録に紐づく、という本アプリ固有の意味を外部カレンダーは持てない）。したがって**予定ブロックは（出すとしても）本アプリ→外部カレンダーの一方向のみで十分**、というのが本調査の結論である（推測。ADR-0001 が「二重入力」を明示的に避けている既決の考え方 <docs/adr/0001-notion-idp-only.md> とも整合する）。

なお予定ブロックは時刻つきのため、DTSTART/DTEND を DATE-TIME 値型で出す場合はタイムゾーン（`VALUE=DATE-TIME` に UTC の `Z` を付けるか、`TZID=Asia/Tokyo` パラメータを付けるか）の設計が必要になる。本番日・チェックポイント期限（終日・`VALUE=DATE`）にはこの問題がないため、まず終日イベント2種類（本番日・チェックポイント期限）だけを方式Aで出し、予定ブロックの輸出は必要になった時点で別途検討する、という段階的な実装が妥当と考えられる（推測）。

---

## 参考文献

### RFC / 標準仕様
- RFC 5545, "Internet Calendaring and Scheduling Core Object Specification (iCalendar)" — <https://www.rfc-editor.org/rfc/rfc5545>
- RFC 5546, "iCalendar Transport-Independent Interoperability Protocol (iTIP)" — <https://www.rfc-editor.org/rfc/rfc5546>
- RFC 7986, "New Properties for iCalendar" — <https://www.rfc-editor.org/rfc/rfc7986>
- IANA URI Schemes Registry, "webcal" (provisional) — <https://www.iana.org/assignments/uri-schemes/prov/webcal>（本セッションでは検索結果経由の確認のみ、[未検証]）
- W3C TAG Finding, "Good Practices for Capability URLs" — <https://www.w3.org/TR/capability-urls/>（同一内容のソース: <https://github.com/w3ctag/capability-urls>）

### Google
- Google Calendar API v3 Discovery Document — <https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest>
- Google カレンダー ヘルプ「URL でカレンダーを追加する」— <https://support.google.com/calendar/answer/37100>（検索結果経由、詳細な数値は [未検証]）

### Apple
- Apple サポート「Subscribe to calendars on Mac」— <https://support.apple.com/guide/calendar/subscribe-to-calendars-icl1022/mac>
- Apple サポート「Refresh calendars on Mac」— <https://support.apple.com/guide/calendar/refresh-calendars-icl1024/mac>（検索結果経由、更新間隔の選択肢一覧は [未検証]）

### Microsoft
- Microsoft サポート「Import or subscribe to a calendar in Outlook.com or Outlook on the web」— <https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web-cff1429c-5af6-41ec-a5b4-74f2c278e98c>（検索結果経由、詳細な数値は [未検証]）

### Convex
- Convex 公式ドキュメント「HTTP Actions」— <https://docs.convex.dev/functions/http-actions>
- Convex 公式ドキュメント「Limits」— <https://docs.convex.dev/production/state/limits>
- Convex 公式ドキュメント「Runtimes」— <https://docs.convex.dev/functions/runtimes>
- Convex 公式ドキュメント「convex-test」— <https://docs.convex.dev/testing/convex-test>
- Convex OSS リポジトリ（ドキュメント・ソース双方の取得元）— <https://github.com/get-convex/convex-backend>

### Better Auth / @convex-dev/better-auth
- Better Auth 公式ドキュメント「OAuth（Account Linking）」— <https://www.better-auth.com/docs/concepts/oauth>
- Better Auth 公式ドキュメント「Session Management」— <https://www.better-auth.com/docs/concepts/session-management>
- Better Auth 公式ドキュメント「Reference / Options」— <https://www.better-auth.com/docs/reference/options>
- Better Auth 公式ドキュメント「Google」— <https://www.better-auth.com/docs/authentication/google>
- Better Auth OSS リポジトリ（ドキュメント・ソース双方の取得元）— <https://github.com/better-auth/better-auth>
- `@convex-dev/better-auth` 公式ドキュメント「Component Client」— <https://labs.convex.dev/better-auth/api/component-client>
- `@convex-dev/better-auth` OSS リポジトリ — <https://github.com/get-convex/better-auth>

### 本リポジトリ内の一次情報
- `CONTEXT.md`（本番目標・習得・長期目標・チェックポイントの定義）
- `convex/schema.ts`（`goals`, `boardScheduleEvents` のテーブル定義）
- `convex/lib/validators.ts`（`goalDocumentValidator`, `examGoalFields`, `masteryGoalInputFields`）
- `convex/lib/ownerFunctions.ts`（`ownerQuery`/`ownerMutation`、`ctx.auth.getUserIdentity()` ベースの認可）
- `convex/http.ts`, `convex/auth.ts`（Better Auth の httpAction 登録の現状）
- `convex/services/boardSchedule/blocks.ts`（`boardScheduleEvents` の時刻正規化）
- `docs/adr/0009-general-account-auth.md`（アカウント連携は v1 では行わない）
- `docs/adr/0001-notion-idp-only.md`, `docs/spec.md`（genericOAuth を使わない方針、二重入力を避ける設計思想）
- `docs/specs/study-timer.md` §15, §17-5（予定ブロックは計画であり計測ログではない）
- `.claude/rules/convex-rules.md`（CVX-01〜20）
- `package.json`（`convex@^1.44.0`, `convex-test@^0.0.55`, `better-auth@^1.6.28`, `@convex-dev/better-auth@^0.12.5`）
- GitHub Issue [#75](https://github.com/sc30gsw/cairn/issues/75), 地図 [#66](https://github.com/sc30gsw/cairn/issues/66)
