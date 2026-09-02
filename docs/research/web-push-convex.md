# Web Push を Convex バックエンドから配信する実装方式

- 作成日: 2026-09-02
- 対象: 本アプリ（TanStack Start + Convex `^1.44.0` + Serwist の PWA、学習ログアプリ）に Web Push 押し出し配信を追加する場合の実装方式
- 目的: [notifications.md](../specs/notifications.md) §2.4 と [pwa-mobile.md](../specs/pwa-mobile.md) §5/§22.1 が「#58 完了後の後続チケット」に委ねた Web Push 一式（購読表・配信 action・SW リスナー・権限要求 UI）を実装する際に、一次情報（公式ドキュメント・ソースコード・仕様書）だけを根拠に採るべき技術方式を確定させる
- 前提となる既存の設計判断:
  - [notifications.md](../specs/notifications.md) §2.4（Web Push の所有者は #58 完了後の後続チケット。押し出しは `notifications` 行の insert 後に scheduler で走るアダプタに閉じる）、§5（`notifications` / `notificationSettings` のスキーマ規約、`payload` を discriminated union で保存し文言は生成しない）、§6（静穏時間は押し出しだけを止める。通知欄の行は静穏中でも作る）、§8（関数サーフェスは `internalMutation` / `internalQuery` / `internalAction` を1関数1ファイルで置く）、§18.1（Web Push の所有者表）
  - [pwa-mobile.md](../specs/pwa-mobile.md) §5（`sw/service-worker.ts` の確定形。自前リスナーは `serwist.addEventListeners()` の前に足す作法）、§22.1（Web Push の所有者表。notifications.md §18.1 と同一内容）
  - [.claude/rules/convex-rules.md](../../.claude/rules/convex-rules.md) CVX-05（scheduler / crons の対象は `internal.*` のみ）、CVX-06（`"use node"` はランタイムが違うときだけ）、CVX-07（action 内の `ctx.run*` は束ねる）
  - 関連 Issue: [#67](https://github.com/sc30gsw/cairn/issues/67)（本調査の対象チケット）/ 地図 [#66](https://github.com/sc30gsw/cairn/issues/66)
- 出典の扱い: 一次ソース（公式ドキュメント本文・RFC・ソースコード）で裏付けが取れなかったものは **[未検証]**、設計判断であって文献から直接は導けないものは「推測」と明記する。
- **実行環境の制約について**: 本セッションのネットワークegressポリシーは `docs.convex.dev` / `developer.mozilla.org` / `webkit.org` / `datatracker.ietf.org` / `rfc-editor.org` など任意ドメインへの直接アクセスを組織ポリシーでブロックしている（`curl` / WebFetch とも `403 policy denial`）。そのため本書の一次情報は次の代替経路で取得した一次ソースそのものである（要約サイトではない）:
  1. **Convex 公式ドキュメントのソース**: `docs.convex.dev` は Convex 社の OSS リポジトリ [get-convex/convex-backend](https://github.com/get-convex/convex-backend) の `npm-packages/docs/docs/**/*.mdx` から生成されている（同リポジトリの `npm-packages/docs/README.md` が Docusaurus サイトの実装であることを明記）。本書はこの `.mdx` ソースを `raw.githubusercontent.com` 経由で直接取得して引用した — サイト表示のスクレイピングではなく、ドキュメントのソースファイルそのものである。
  2. **MDN**: `developer.mozilla.org` の内容は [mdn/content](https://github.com/mdn/content) リポジトリの Markdown ソースそのもので、ブラウザ対応表は [mdn/browser-compat-data](https://github.com/mdn/browser-compat-data) の構造化 JSON データそのものである。両方とも GitHub raw 経由で直接取得した。
  3. **ライブラリの実装**: `web-push`（npm）/ `http_ece`（npm）/ Serwist公式サンプル（`serwist/serwist` リポジトリ）はソースコードを直接読んだ。
  4. **WebKit blog / RFC 本文**は直接フェッチできなかったため、該当箇所は WebSearch 経由の要約引用に留め、可能な限り MDN の `browser-compat-data`（一次情報）で数値・対応状況を裏付けた。RFC 本文からの直接引用ができなかった箇所は文中に明記する。

---

## 1. 要約

| # | 論点 | 推奨する実装方式 | 根拠の強さ |
| --- | --- | --- | --- |
| 1 | VAPID署名 / RFC 8291 暗号化の実行場所 | `convex/actions/notifications/deliverWebPush.ts` に `"use node"` を付け、`web-push` npm パッケージ（Node 版）を使う。デフォルト(V8)ランタイムでの Web Crypto 自前実装は**理論上は可能**だが、本番採用は推奨しない（§2） | 一次情報で確定（Convex公式docsソース + web-push本体のソースコード） |
| 2 | Push service の HTTP応答の扱い | `sendNotification` が投げる `WebPushError.statusCode` で分岐: `410`(Gone)と`404`(Not Found)は購読を`pushSubscriptions`から削除、`429`は`Retry-After`に従い当該購読への再送のみ止める（他購読は続行） | RFC本文は間接引用だが、web-push本体の実装・MDN・複数ベンダー文書と整合 |
| 3 | iOS Safari の要件 | 16.4以降 **かつ** ホーム画面追加(standalone)必須。`Notification.requestPermission()`はユーザー操作起点で呼ぶ。`pushsubscriptionchange`はiOS Safariでは**未実装**なので、期限切れ検知は「配信時の410/404」に一本化し、能動的な再購読UIは持たない | MDN browser-compat-data（一次データ）で確定 |
| 4 | Serwist SW へのリスナー追加 | `push` / `notificationclick` を **`serwist.addEventListeners()` より前**に `self.addEventListener` で足す。これは cairn独自ルールではなく **Serwist公式サンプル自体がこの順序**（§5） | 一次ソース（Serwist公式リポジトリのサンプルコード）で確定 |
| 5 | Convex配信フローの設計 | `notifications` insert 後に `ctx.scheduler.runAfter(0, internal.actions.notifications.deliverWebPush...)` で起動。action内は「購読一覧を1回の`internalQuery`で読み、送信結果に応じて失効行を1回の`internalMutation`(batch)で削除」に束ねる(CVX-07)。VAPID秘密鍵は Convex deployment env var、公開鍵はクライアントの`VITE_`env varに複製 | 一次情報（Convex公式docs + convex-js公式ソース）+ 本リポジトリの既存パターン（`deliverSlack`）との整合 |
| 6 | 購読の粒度とJSON形 | 1端末(=1 `ServiceWorkerRegistration`)につき1`PushSubscription`行。所有者は複数端末を持てるので`pushSubscriptions`は`ownerId`に対して1対多。保存する形は`{endpoint, keys:{p256dh, auth}, expirationTime}` | MDN（mdn/content 一次ソース）で確定 |

以降の章は上表の各行を、質問の1〜6の順で詳細に裏付ける。

---

## 2. VAPID署名とRFC 8291ペイロード暗号化はConvexのどのランタイムで実行できるか

### 2.1 Convexの2つのランタイムと利用可能なAPI(一次情報)

Convex公式ドキュメントのソース(`docs.convex.dev/functions/runtimes`の実体。[get-convex/convex-backend `npm-packages/docs/docs/functions/runtimes.mdx`](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/functions/runtimes.mdx))は、既定ランタイムで使える Web Crypto API を明示的に列挙している:

> #### Web Crypto APIs
> - crypto
> - CryptoKey
> - SubtleCrypto

同じページの「Node APIs」節:

> A few Node.js APIs are available in the default runtime. If you need more than these, see the Node.js runtime.
> - `process.env`
> - `AsyncLocalStorage`
> - `AsyncResource`

つまり **`node:crypto` や `node:https` は既定(V8)ランタイムに含まれない**。含まれるのは`process.env`・`AsyncLocalStorage`・`AsyncResource`の3つだけで、`crypto.subtle`（Web Crypto標準API）は既定ランタイムで動く。

Actionsの節(同ページ):

> Actions are unrestricted by the same rules of determinism as query and mutation functions. Notably actions are allowed to call third-party HTTP endpoints via the browser-standard `fetch` function.
> By default actions also run in Convex's custom JavaScript runtime with all of its advantages including no cold starts and a browser-like API environment.

[`docs.convex.dev/functions/actions`の実体(`functions/actions.mdx`)](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/functions/actions.mdx)も同じことを明言:

> By default, actions run in Convex's environment. This environment supports `fetch`, so actions that simply want to call a third-party API using `fetch` can be run in this environment... Actions running in Convex's environment are faster compared to Node.js, since they don't require extra time to start up before running your action (cold starts).
> Actions needing unsupported NPM packages or Node.js APIs can be configured to run in Node.js by adding the `"use node"` directive at the top of the file.

本リポジトリに checked-in されている `convex/_generated/ai/guidelines.md`(Convex CLIが`^1.44.0`向けに生成した一次情報。CLAUDE.mdが「まず読め」と指示するファイル)も同内容を明記している:

> `fetch()` is available in the default Convex runtime. You do NOT need `"use node";` just to use `fetch()`.
> Always add `"use node";` to the top of files containing actions that use Node.js built-in modules.
> Never add `"use node";` to a file that also exports queries or mutations.

### 2.2 実行時間・メモリの上限(一次情報)

[`docs.convex.dev/functions/actions`の「Limits」節](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/functions/actions.mdx)、および[`docs.convex.dev/production/state/limits`の実体(`production/state/limits.mdx`)](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx)の「Execution time and scheduling」表:

| 項目 | 値 |
| --- | --- |
| Convex runtime action execution time | **30 minutes** |
| Node runtime action execution time | **10 minutes** |
| Convex runtime memory | 64 MiB |
| Node.js runtime memory | 512 MiB |
| Node action の引数サイズ上限 | 5 MiB（既定は16 MiB） |

（`actions.mdx`本文は簡略化した「Actions time out after 10 minutes」という記述もあるが、`limits.mdx`のほうがランタイム別の正確な内訳であり、本書はこちらを一次の数値として採用する。）

### 2.3 `web-push`(npm)はNode専用である(ソースコードで確認)

`web-push`パッケージ本体([web-push-libs/web-push](https://github.com/web-push-libs/web-push)、`registry.npmjs.org`で確認したlatest = 3.6.7)のソースを直接読んだ結果:

- `src/vapid-helper.js`: `import crypto from 'node:crypto';` — VAPID鍵生成(`crypto.createECDH('prime256v1')`)とJWT署名(`jws.sign`、ES256、PEM形式に変換するためasn1.jsでECの秘密鍵をDER/PEM化)に使用。
- `src/encryption-helper.js`: `import crypto from 'node:crypto';` — ローカルECDH鍵ペア生成(`crypto.createECDH`)とsalt生成(`crypto.randomBytes`)に使用。
- `src/web-push-lib.js`: `import https from 'node:https';` — push serviceへのHTTPリクエスト送信に`fetch`ではなく`node:https`を直接使用。
- ペイロード暗号化(RFC 8291 / aes128gcm)の実体は依存パッケージ`http_ece`(1.2.1、[martinthomson/encrypted-content-encoding](https://github.com/martinthomson/encrypted-content-encoding))。そのソース(`registry.npmjs.org`のtarballを取得して確認)は`var crypto = require('crypto');`を使い、`crypto.createCipheriv` / `crypto.createDecipheriv` / `crypto.createECDH` / `crypto.createHmac` / `crypto.randomBytes` というNode `crypto`モジュール固有の同期APIを直接呼んでいる。

これらは Web Crypto標準の`SubtleCrypto`(`crypto.subtle.*`、Promiseベース)ではなく、Node独自の`crypto.createECDH` / `createCipheriv` / `createHmac`という**ストリーム指向の同期API**であり、Convexの既定ランタイムには存在しない(§2.1)。

**結論**: `web-push`をそのまま使うなら`"use node"`が必須。これはCVX-06「`ctx.runAction`を使うのはランタイムをまたぐときだけ」がまさに想定しているケース(V8→Node)であり、CVX-06に沿った使い方になる。

### 2.4 デフォルト(V8)ランタイムでのWeb Crypto自前実装は実現可能か

理論的な実現性を評価する。RFC 8291 / RFC 8292を自前実装するには次の暗号プリミティブが要る:

| 必要な操作 | Web Crypto(`SubtleCrypto`)での対応 |
| --- | --- |
| ECDH鍵共有(P-256) | `deriveBits({name:"ECDH", namedCurve:"P-256", public:...})` |
| HKDF(SHA-256)によるCEK/nonce導出 | `deriveBits({name:"HKDF", ...})` |
| AES-128-GCMでの暗号化 | `encrypt({name:"AES-GCM", iv}, key, data)` |
| VAPID JWTのES256署名 | `sign({name:"ECDSA", hash:"SHA-256"}, key, data)` |

MDNのソース([mdn/content](https://github.com/mdn/content) `files/en-us/web/api/subtlecrypto/derivebits/index.md`)は次のように明記している:

> This function supports the same derivation algorithms as `deriveKey()`: ECDH, HKDF, PBKDF2, and X25519.

同じくMDN `subtlecrypto/sign/index.md`:

> Signatures are encoded as the s1 and s2 values specified in RFC 6090 (known respectively as r and s in RFC 4754), each in big-endian byte arrays, with their length the bit size of the curve rounded up to a whole number of bytes. These values are concatenated together in this order.

これは**JWS(JWT)のES256がそのまま要求する`r || s`の生バイト列形式**そのものであり、Node の `crypto.sign()` が返す ASN.1 DER 形式(`web-push`が`asn1.js`を使ってPEM変換までしている手間の理由)とは違い、変換なしでJWTの署名部に使える。つまり **ES256 JWT署名に関してはWeb Crypto実装のほうがNode実装より素朴に書ける**という技術的な事実がある。

一方でConvexの既定ランタイムは「`fetch`はActionsのみで使える」(§2.1)ため、push serviceへのPOSTは`fetch()`で行えばよく、`node:https`は不要。理屈の上では:

1. VAPID鍵ペア(P-256)を`crypto.subtle.generateKey`で生成・保存
2. `crypto.subtle.sign("ECDSA", ..., jwtSigningInput)`でES256 JWTを自前生成
3. `crypto.subtle.deriveBits("ECDH", ...)` → `deriveBits("HKDF", ...)` でRFC 8291のCEK/nonceを導出
4. `crypto.subtle.encrypt("AES-GCM", ...)`でペイロードを暗号化
5. `fetch()`でpush serviceへPOST

という一連の処理は、**既定(V8)ランタイムのactionだけで完結する**ことが一次情報(§2.1のWeb Crypto API列挙)から読み取れる。

**ただし本書はこの自前実装を推奨しない**。理由(推測/設計判断):

- RFC 8291のレコードフレーミング(パディング境界、レコードサイズ、salt/keyidの符号化)は仕様の解釈を誤りやすく、`web-push`のようによく使われるOSS実装でもデコード側の相互運用性バグが歴史的に報告されてきた領域である。自前実装は**確認が難しい暗号バグ**を生みやすい。
- 本アプリは所有者2名・端末数台という小規模用途であり、Node action(10分タイムアウト・512MB)の制約が問題になる余地がない。V8ランタイムの30分タイムアウトや常時ウォームという利点は、この用途では実利が乏しい。
- Convex公式・コミュニティのいずれからも、既定ランタイム向けのWeb Push自前実装のリファレンス実装は確認できなかった[未検証: 存在しないことの証明はできないため「見つからなかった」に留める]。

**推奨**: `convex/actions/notifications/deliverWebPush.ts`に`"use node";`を付け、`web-push`パッケージをそのまま使う。CVX-06の「ランタイムが違うときだけ`"use node"`」という条件そのものに合致する。

---

## 3. Push service へのHTTPレスポンスの扱い

### 3.1 RFC 8030の応答コードの意味

RFC 8030 (*Generic Event Delivery Using HTTP Push*) 本文は直接フェッチできなかった([datatracker.ietf.org](https://datatracker.ietf.org/doc/html/rfc8030) / [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc8030) ともにこの環境のegressポリシーでブロック)。WebSearch経由で取得できた同RFC本文の引用は以下:

> **201 (Created)**: A 201 (Created) response indicates that the push subscription was created. A URI for the push message subscription resource that was created in response to the request MUST be returned in the Location header field.
> **404 (Not Found)**: if there are outstanding requests to an expired push message subscription resource from a user agent... this MUST be signaled by returning a 404 (Not Found) status code.
> **410 (Gone)**: ...if the user agent fails to acknowledge the receipt of the push message and the push service ceases to retry delivery of the message prior to its advertised expiration, then the push service MUST push a failure response with a status code of 410 (Gone).

[未検証: RFC本文からの直接引用ではなく検索エンジン経由の引用のため、実装前に一次テキストでの再確認を推奨]

429については、RFC本文の直接引用は取得できなかった。一般的なHTTP意味論([RFC 6585]で定義される429 Too Many Requests、`Retry-After`ヘッダ併用)が push service 実装(FCM/Mozilla Autopush等)にもそのまま適用されるというのが業界共通の理解だが、Web Push特有の記述はこの環境からは直接確認できなかった。[未検証]

### 3.2 `web-push`ライブラリの実装が示す実務上の扱い(一次情報 = ソースコード)

`web-push`本体(`src/web-push-lib.js`、§2.3で読んだソース)は、レスポンスが2xx以外なら例外なく`WebPushError`を投げる:

```js
if (pushResponse.statusCode < 200 || pushResponse.statusCode > 299) {
  reject(new WebPushError(
    'Received unexpected response code',
    pushResponse.statusCode,
    pushResponse.headers,
    responseText,
    requestDetails.endpoint
  ));
}
```

`WebPushError`は`statusCode` / `headers` / `body` / `endpoint`を保持する。Serwist公式サンプル([serwist/serwist `examples/next-web-push/app/notification/route.ts`](https://github.com/serwist/serwist/blob/main/examples/next-web-push/app/notification/route.ts))はこれをそのままHTTPレスポンスへ中継する実装例を示している:

```js
} catch (err) {
  if (err instanceof webPush.WebPushError) {
    return new NextResponse(err.body, {
      status: err.statusCode,
      headers: err.headers,
    });
  }
  ...
}
```

### 3.3 本アプリでの推奨実装

| statusCode | 意味 | `pushSubscriptions`行の扱い |
| --- | --- | --- |
| 201 | 配信キューへの受理成功 | そのまま維持 |
| 404 | 購読が push service 側に存在しない(URLが無効・誤り) | 削除 |
| 410 | 購読が失効(ユーザーが通知をブロック、端末でアプリを削除、等) | 削除 |
| 429 | push service 側のレート制限 | 削除しない。`Retry-After`があれば従うが、v1では単に当該送信を諦めて次回発火を待つ(再送キューは持たない — notifications.mdの「静穏で落とした押し出しは翌朝へ持ち越さない」という既存方針(§6.3)と一貫させる) |
| その他 4xx/5xx | 一時的な障害 | 削除しない。ログのみ |

CVX-07に従い、これらの判定結果は**action内でオンメモリに集計してから、1回の`internalMutation`にまとめて渡す**(削除対象の`pushSubscriptions`のIDを配列で渡し、mutation側でループ削除)。

---

## 4. iOS Safari のWeb Push要件

MDNの`browser-compat-data`(GitHub: [mdn/browser-compat-data](https://github.com/mdn/browser-compat-data)、`api/PushManager.json` / `api/ServiceWorkerGlobalScope.json` / `api/Notification.json`を直接取得して確認した一次データ)より:

### 4.1 対応バージョンとホーム画面追加の必須性

`api/PushManager.json`の`safari_ios`エントリ:

```json
"safari_ios": {
  "version_added": "16.4",
  "notes": "Notifications are supported in web apps saved to the home screen."
}
```

`api/Notification.json`の`requestPermission_static`の`safari_ios`エントリはさらに踏み込んで明記している:

```json
"safari_ios": {
  "version_added": "16.4",
  "partial_implementation": true,
  "notes": "The parent `Notification` interface is undefined unless the page is a web app saved to the home screen. The app's manifest must have a non-default `display` value."
}
```

つまり **iOS Safari単体(ホーム画面に追加していないタブ内Safari)では`Notification`インターフェース自体が`undefined`になる**。これはpwa-mobile.md §2.3-4「iOS は 16.4 以降 かつホーム画面追加が前提」という既存の事実整理と一致する一次確認である。加えて `manifest.webmanifest` の `display` が非既定値(`standalone`等)であることが条件になっている点は、pwa-mobile.md §6.1で既に`"display": "standalone"`を確定形として持っているため、この要件は満たされている。

WebKit公式ブログ([webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/))の記述はWebSearch経由の引用に留まるが、MDNのbrowser-compat-dataと整合する内容として:

> A web app that has been added to the Home Screen can request permission to receive push notifications as long as that request is in response to direct user interaction — such as tapping on a 'subscribe' button provided by the web app.

[WebKit blogは直接フェッチ不可のため、この引用はWebSearch経由。MDNのbrowser-compat-dataという一次データと整合する範囲でのみ採用する]

### 4.2 `Notification.requestPermission()`のユーザー操作起点要件

MDNのソース(`files/en-us/web/api/notification/requestpermission_static/index.md`)自体は仕様として「must」とまでは書いていないが、例示コードに明記:

> Note that the request should be made in response to user interaction: below, the method is called in the click event handler.

`browser-compat-data`の`api/PushManager.json`の`subscribe`エントリはFirefoxについて明確な強制を記録している(参考。Safariにも同様の実務的制約があるとされるが、Safari固有の"must"はcompat-data上には見当たらなかった):

```json
"firefox": {
  "version_added": "44",
  "notes": "From Firefox 72 onwards, can only be called in response to a user gesture such as a `click` event."
}
```

Safari(iOS含む)についてbrowser-compat-data上に同種の強制記述は無かった[未検証: 無いことは「Safariに制約が無い」ことを意味しない。実機での確認を推奨]。実装上は**全ブラウザ共通でクリック/タップハンドラ内から呼ぶ**のが安全側の方針になる(既にpwa-mobile.md §8.3の「ホーム画面に追加」ボタンや、notifications.mdの通知トグルUIはボタン操作起点になっている設計と自然に整合する)。

### 4.3 `pushsubscriptionchange`はiOS Safariでは非対応

`api/ServiceWorkerGlobalScope.json`の`pushsubscriptionchange_event`エントリ:

```json
"safari": {
  "version_added": "16",
  "notes": "Notifications are supported on macOS Ventura and later."
},
"safari_ios": {
  "version_added": false
}
```

**macOS版Safari(デスクトップ)は16で対応しているが、iOS版Safariは`version_added: false` — つまり非対応**。これはMDNの`pushsubscriptionchange_event`のUsage notesが述べる一般論とも整合する:

> This may occur if the subscription was refreshed by the browser, but it may also happen if the subscription has been revoked or lost.

**設計への含意**: iOS端末では購読の暗黙の失効を`pushsubscriptionchange`で検知できない。既存の§3(本書)で確定した「配信時の404/410で購読行を削除する」フローが、iOSにおける唯一の実務的な失効検知手段になる。能動的な定期再検証(例: 起動時に`pushManager.getSubscription()`と`expirationTime`を突き合わせる)は別途UIの責務として持つ必要があるが、**SWの`pushsubscriptionchange`リスナーだけに頼る設計はiOSで機能しない**ことを実装者は認識すべき。

### 4.4 バッジ・アイコンの制約

`api/Notification.json`:

```json
"badge": {
  "safari": { "version_added": false, "impl_url": "https://webkit.org/b/280160" },
  "safari_ios": "mirror"
},
"icon": {
  "safari": {
    "version_added": false,
    "impl_url": "https://webkit.org/b/280162",
    "notes": "The property can be set, but has no effect."
  },
  "safari_ios": "mirror"
}
```

Safari(macOS・iOSとも)は`NotificationOptions.badge`が未対応、`icon`は「設定はできるが効果がない」。**Safariでは通知に独自アイコン/バッジを表示させることはできず、OS標準のアプリアイコンが使われる**という前提でUIの見た目を設計する必要がある(iOS/macOS以外のChromium系ブラウザでは`icon`/`badge`とも対応している — 同ファイルの`chrome`/`edge`/`opera`エントリで確認済み)。

---

## 5. Serwist SWへの `push` / `notificationclick` / `pushsubscriptionchange` リスナー追加作法

### 5.1 リスナーの追加順序(一次情報 = Serwist公式サンプル)

Serwist公式リポジトリ([serwist/serwist](https://github.com/serwist/serwist))には`examples/next-web-push`という Web Push 専用サンプルが存在する。その`app/sw.ts`(全文をそのまま引用):

```ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: { /* ... */ },
});

self.addEventListener("push", (event) => {
  const data = JSON.parse(event.data?.text() ?? '{ title: "" }');
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: "/icons/android-chrome-192x192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});

serwist.addEventListeners();
```

**これはcairnの独自ルールではなく、Serwist公式サンプル自体が`push`/`notificationclick`のリスナーを`serwist.addEventListeners()`より前に置いている。** pwa-mobile.md §5末尾の「自前リスナーは`addEventListeners()`より前に足すのが Serwist の作法」というコメントは、この公式サンプルの実装パターンと一致する一次情報の裏付けが取れた。

既存の`sw/service-worker.ts`(cairn。§5コメント参照)は`message`リスナーを既にこの順序で追加しており、Web Push実装時は同じ位置に`push`/`notificationclick`/`pushsubscriptionchange`を追記すればよい。

### 5.2 `showNotification`のオプション

Serwistサンプルは`body`と`icon`のみを渡しているが、[MDNの`ServiceWorkerGlobalScope: push`イベント](https://github.com/mdn/content/blob/main/files/en-us/web/api/serviceworkerglobalscope/push_event/index.md)のサンプルは`event.data.json()`でJSONペイロードをパースする形を示す:

```js
self.addEventListener("push", (event) => {
  let message = event.data.json();
  switch (message.type) {
    case "init": doInit(); break;
    case "shutdown": doShutdown(); break;
  }
});
```

本アプリの`notificationPayloadValidator`(discriminated union、convex/lib/validators.ts)をそのままJSONペイロードとしてpushし、SW側で`payload.kind`に応じて`notificationMessage()`(convex/lib/notificationCopy.ts)相当のロジックで文言を組む設計が既存のnotifications.md §5.2の文言SSoTと自然に整合する(ただしSWはConvexのモジュールを直接importできないため、文言組み立てロジックをSWに持たせるか、サーバー側で組んだ`title`/`body`をペイロードに含めて送るかは実装時の判断になる。後者のほうがSSoTを1箇所に保てるため望ましい、と考えられる — 推測)。

### 5.3 `notificationclick`での既存クライアントfocus定型

上記Serwistサンプルの`notificationclick`ハンドラが示す定型:

1. `event.notification.close()`
2. `self.clients.matchAll({ type: "window", includeUncontrolled: true })`で開いているタブを列挙
3. `focused`なクライアントを優先して`client.focus()`
4. 該当タブが無ければ`self.clients.openWindow(url)`で新規タブを開く

これは[MDNの`pushsubscriptionchange`イベントのサンプル](https://github.com/mdn/content/blob/main/files/en-us/web/api/serviceworkerglobalscope/pushsubscriptionchange_event/index.md)が示す再購読パターンとも矛盾しない共通のボイラープレートであり、cairnでも同じ形をそのまま採用できる。遷移先URLは`notifications.md`の「リンク先」列(`/goals`または`/`)を`payload`に含めて送ることで、`openWindow(url)`にそのまま渡せる。

### 5.4 `pushsubscriptionchange`リスナー

MDNの当該ページ(§5.3で引用)のサンプルコードは、購読が失効した際に**同じオプションで再購読し、新旧の購読情報をサーバーへ送る**という定型を示す:

```js
self.addEventListener("pushsubscriptionchange", (event) => {
  const subscription = self.registration.pushManager
    .subscribe(event.oldSubscription.options)
    .then((subscription) => fetch("register", { method: "post", body: JSON.stringify({
      old: getPayload(event.oldSubscription),
      new: getPayload(subscription),
    })}));
  event.waitUntil(subscription);
});
```

ただし§4.3で確認した通り**iOS Safariはこのイベント自体が発火しない**(`version_added: false`)。実装するのはAndroid Chrome等での自動更新に備えるためであり、iOSでの失効検知は§3の配信時404/410ハンドリングに委ねる。

---

## 6. Convex側の配信フロー設計とVAPID鍵の管理

### 6.1 CVX-05/06/07への適合

提案する関数分割(既存の`deliverSlack`パターン(notifications.md §8.2)を踏襲):

```
convex/mutations/notifications/emitNotification.ts   (internalMutation, 既存 evaluate.ts の内部から呼ばれる insert 相当)
  └─ notifications.insert() 直後に
     ctx.scheduler.runAfter(0, internal.actions.notifications.deliverWebPush.deliverWebPush, { notificationId })

convex/queries/notifications/pushSubscriptionsForOwner.ts  (internalQuery)
  └─ ownerId に紐づく pushSubscriptions を1回の by_owner index 読みで全件取得

convex/actions/notifications/deliverWebPush.ts  ("use node"; internalAction)
  └─ 1) ctx.runQuery(internal.queries.notifications.pushSubscriptionsForOwner, {ownerId}) … 1回
     2) 購読ごとに webPush.sendNotification(...) をfetchではなくNode https経由で並行実行
     3) 結果を集計(成功/404,410で削除対象/429で見送り)
     4) ctx.runMutation(internal.mutations.notifications.recordWebPushDeliveryResults, {toDelete: [...]}) … 1回
```

- `ctx.scheduler.runAfter(0, internal.*, ...)`はCVX-05(scheduler/cronsのターゲットは`internal.*`のみ)に適合。[convex-js公式ソース `src/server/scheduler.ts`](https://github.com/get-convex/convex-js/blob/main/src/server/scheduler.ts)のJSDocは実行保証の違いも明記している:

  > **Scheduled mutations** are guaranteed to execute **exactly once**. They are automatically retried on transient errors.
  > **Scheduled actions** execute **at most once**. They are not retried and may fail due to transient errors.

  これは[`docs.convex.dev/scheduling/scheduled-functions`の実体](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/scheduling/scheduled-functions.mdx)にも同内容で記載されている。**`deliverWebPush`はactionなので、失敗しても自動再送されない**。v1のSlack押し出しと同じく「失敗したら次回発火まで待つ」設計(notifications.md §6.3の遡り生成をしない方針)と一貫させれば、追加のリトライ機構は不要という判断になる(既存方針の延長。推測ではなく既存決定の適用)。

- action内の読み書きを「1回の`internalQuery`+1回の`internalMutation`」に束ねるのはCVX-07そのもの。Convex公式の`actions.mdx`「Best practices」節も同じ理由を述べている:

  > Multiple runQuery / runMutations execute in separate transactions and aren't guaranteed to be consistent with each other... Additionally, you're paying for multiple function calls when you don't have to.

- `"use node"`ファイル(`deliverWebPush.ts`)は他のquery/mutationをexportしてはいけない、という制約は`convex/_generated/ai/guidelines.md`(§2.1で引用)通りにファイルを分離すれば自動的に満たされる。

### 6.2 VAPID鍵の置き場所

[`docs.convex.dev/production/environment-variables`の実体](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/environment-variables.mdx)より:

> You can add up to 512 environment variables... Environment variable values cannot be larger than 8KiB.
> You can access environment variables in Convex functions using `process.env.KEY`.

VAPID秘密鍵(base64url、32バイト → 43文字程度)は8KiB制限に対して十分小さい。設定は`npx convex env set WEB_PUSH_VAPID_PRIVATE_KEY '...'`(開発・本番デプロイメントそれぞれに設定。同ドキュメントの「dev/prodで別々の値を持てる」という節に沿う)。`deliverWebPush.ts`(Node action)内で`process.env.WEB_PUSH_VAPID_PRIVATE_KEY`として読む。

`subject`(RFC 8292のVAPID `sub`クレーム。`https:`または`mailto:`のURL — `web-push`の`validateSubject`がこの2種類のみ許可することをソースコードで確認済み、§2.3)も同様に`WEB_PUSH_VAPID_SUBJECT`という環境変数に置く。

### 6.3 公開鍵をクライアントへ渡す方法

VAPID公開鍵はPush APIの`PushManager.subscribe({applicationServerKey: ...})`にそのまま渡す値であり、設計上秘匿する必要が無い(MDNの`PushManager.subscribe()`のサンプル(`files/en-us/web/api/pushmanager/subscribe/index.md`)も公開鍵をクライアントコードに埋め込む例を示している)。

.claude/rules/common/security.mdの「`import.meta.env.VITE_*`は決定的に復号されクライアントバンドルに入る」という既存規約に沿い、公開鍵は`VITE_WEB_PUSH_PUBLIC_KEY`としてdotenvxで管理する(サーバー側の`WEB_PUSH_VAPID_PRIVATE_KEY`とペアで、鍵ローテーション時は両方を同時に更新する運用上の注意点になる — 設計判断/推測)。Convexの公開queryを1本用意して配布する方式も技術的には可能(CVX-04の`requireUser`を通せば認証済みユーザーへの配布になる)だが、値が非秘匿である以上ビルド時定数のほうが往復が1回減り単純、というのが本書の判断である。

---

## 7. 購読の粒度とPushSubscriptionのJSON形

### 7.1 粒度: 1端末 = 1 `PushSubscription`

MDNの`PushSubscription`インターフェースの説明(`files/en-us/web/api/pushsubscription/index.md`):

> Each browser uses a particular push service. A service worker can use `PushManager.subscribe()` to subscribe to the supported service, and use the returned `PushSubscription` to discover the endpoint where push messages should be sent.

`PushSubscription`は特定の`ServiceWorkerRegistration`(=特定のブラウザ・特定のオリジンでのSW登録)に紐づく。同一所有者が複数端末(自宅PC・スマホ・タブレット)でこのアプリをインストールすれば、端末ごとに別々の`PushSubscription`(別々の`endpoint`)が発行される。したがって`pushSubscriptions`テーブルは**`ownerId`に対して1対多**であるべきで、`ownerId`のほかに`endpoint`(または`endpoint`のハッシュ)を一意キーの一部にする必要がある(notifications.md §18.1が言う「本書 §5 のスキーマ規約に従う」の実務上の帰結)。

### 7.2 保存すべきJSON形

`PushSubscription.toJSON()`(`files/en-us/web/api/pushsubscription/tojson/index.md`):

> Return value: A JSON object. It contains the subscription endpoint, `expirationTime` and public keys, as an `endpoint` member, an `expirationTime` member and a `keys` member.

`files/en-us/web/api/pushsubscription/index.md`のサンプルコードが示す具体的な形:

```js
const subscriptionObject = {
  endpoint: pushSubscription.endpoint,
  keys: {
    p256dh: pushSubscription.getKey("p256dh"),
    auth: pushSubscription.getKey("auth"),
  },
};
```

つまり保存すべきは:

| フィールド | 型 | 用途 |
| --- | --- | --- |
| `endpoint` | `string` | push serviceのURL。VAPID JWTの`aud`クレームの元にもなる(`web-push`の`vapid-helper.js`は`new URL(subscription.endpoint)`から`audience`を組み立てている) |
| `keys.p256dh` | `string`(base64url) | RFC 8291のECDH公開鍵 |
| `keys.auth` | `string`(base64url) | RFC 8291の認証シークレット |
| `expirationTime` | `number \| null` | 購読の有効期限(ミリ秒)。ほとんどの実装で`null` |

Convexのvalidatorとしては

```ts
v.object({
  endpoint: v.string(),
  keys: v.object({ p256dh: v.string(), auth: v.string() }),
  expirationTime: v.optional(v.number()),
  ownerId: v.string(),
})
```

という形が素直に対応する(notifications.md §5のスキーマ規約 — CVX-16のdomain SSoT・CVX-13のテーブル名明示 — に沿って`convex/lib/validators.ts`に置く想定)。`ownerId`と`endpoint`の組で一意になるようインデックスを張る(`by_owner_and_endpoint`)ことで、同一端末からの再購読が重複行を作らないようにできる(設計判断)。

---

## 参考文献

### Convex公式(ソース経由で直接確認)

- Convex Runtimes — <https://docs.convex.dev/functions/runtimes>(ソース: <https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/functions/runtimes.mdx>)
- Convex Actions — <https://docs.convex.dev/functions/actions>(ソース: <https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/functions/actions.mdx>)
- Convex Limits — <https://docs.convex.dev/production/state/limits>(ソース: <https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/state/limits.mdx>)
- Convex Environment Variables — <https://docs.convex.dev/production/environment-variables>(ソース: <https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/production/environment-variables.mdx>)
- Convex Scheduled Functions — <https://docs.convex.dev/scheduling/scheduled-functions>(ソース: <https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/scheduling/scheduled-functions.mdx>)
- convex-js `Scheduler`インターフェース — <https://github.com/get-convex/convex-js/blob/main/src/server/scheduler.ts>
- 本リポジトリの`convex/_generated/ai/guidelines.md`(Convex CLIが`^1.44.0`向けに生成した一次情報)

### ライブラリのソースコード

- `web-push`(npm, 3.6.7) — <https://github.com/web-push-libs/web-push>(`src/vapid-helper.js` / `src/web-push-lib.js` / `src/encryption-helper.js`を直接確認)
- `http_ece`(npm, 1.2.1) — <https://github.com/martinthomson/encrypted-content-encoding>
- Serwist公式Web Pushサンプル — <https://github.com/serwist/serwist/tree/main/examples/next-web-push>(`app/sw.ts` / `app/notification/route.ts` / `app/SendNotification.tsx`)

### MDN(mdn/contentおよびmdn/browser-compat-dataのソースを直接確認)

- Push API — <https://developer.mozilla.org/en-US/docs/Web/API/Push_API>
- PushSubscription — <https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription>
- PushSubscription.toJSON() — <https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription/toJSON>
- PushManager.subscribe() — <https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe>
- ServiceWorkerGlobalScope: push event — <https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/push_event>
- ServiceWorkerGlobalScope: pushsubscriptionchange event — <https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/pushsubscriptionchange_event>
- Notification.requestPermission() — <https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static>
- SubtleCrypto.deriveBits() — <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits>
- SubtleCrypto.sign() — <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign>
- SubtleCrypto.encrypt() — <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt>
- browser-compat-data: `api/PushManager.json` / `api/PushSubscription.json` / `api/ServiceWorkerGlobalScope.json` / `api/Notification.json` — <https://github.com/mdn/browser-compat-data/tree/main/api>

### RFC(直接フェッチ不可。WebSearch経由の引用、[未検証]表記のとおり要再確認)

- RFC 8030, *Generic Event Delivery Using HTTP Push* — <https://www.rfc-editor.org/rfc/rfc8030>
- RFC 8291, *Message Encryption for Web Push* — <https://www.rfc-editor.org/rfc/rfc8291>
- RFC 8292, *Voluntary Application Server Identification (VAPID) for Web Push* — <https://www.rfc-editor.org/rfc/rfc8292>

### WebKit(直接フェッチ不可。WebSearch経由の引用、MDN browser-compat-dataとの整合のみ確認)

- Meet Web Push — <https://webkit.org/blog/12945/meet-web-push/>
- Web Push for Web Apps on iOS and iPadOS — <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>

### 本リポジトリの前提文書

- [docs/specs/notifications.md](../specs/notifications.md)
- [docs/specs/pwa-mobile.md](../specs/pwa-mobile.md)
- [.claude/rules/convex-rules.md](../../.claude/rules/convex-rules.md)
- [sw/service-worker.ts](../../sw/service-worker.ts)
- [scripts/build-sw.ts](../../scripts/build-sw.ts)
- [convex/schema.ts](../../convex/schema.ts)
- [convex/crons.ts](../../convex/crons.ts)
- [convex/lib/validators.ts](../../convex/lib/validators.ts)
