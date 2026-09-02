# Web Push（#68）

- 状態: 決定済み・実装済み（2026-09-02）。地図 [#66](https://github.com/sc30gsw/cairn/issues/66)。調査 [#67](https://github.com/sc30gsw/cairn/issues/67) → [docs/research/web-push-convex.md](../research/web-push-convex.md)。
- 前提: [notifications.md](./notifications.md) §2.4 / §6.2 / §9.1 / §18.1、[pwa-mobile.md](./pwa-mobile.md) §5 / §22.1。本書はその「#58 完了後の後続チケット」の成果物で、トリガー・ペイロード・dedupe は触らない。
- 守る規約: [CVX-01〜20](../../.claude/rules/convex-rules.md)（CVX-05 scheduler は `internal.*`、CVX-06 `"use node"` は配信 action だけ、CVX-07 action の読み書きは各1回）、[better-result.md](../../.claude/rules/typescript/better-result.md)、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)。

## 1. 決定の要約

| 論点 | 決定 |
| --- | --- |
| 権限要求の時機と文言 | 自動では出さない。マイページ **通知タブ**の「この端末に届ける」カードの `Button`「この端末で通知を受け取る」（ユーザー操作）からだけ `Notification.requestPermission()` を呼ぶ。拒否済みなら赤い `Alert`「通知がブラウザで拒否されています…」を出しボタンは無効 |
| 置き場所 | pwa-mobile.md §8.3 の「アプリとして使う」節は未実装だったため、Web Push は通知の一部として**通知タブ**（`/my-page/notifications`）の `NotificationSettingsSection` の下に `WebPushSection` を置く。iOS の前提（ホーム画面追加）はカード内に一文で示す（standalone 起動中は出さない。UA 判定はしない） |
| 購読の粒度 | **1端末 = 1行**。所有者は複数端末を持てる。`pushSubscriptions { endpoint, expirationTime?, keys: { auth, p256dh }, ownerId }`、index は `by_owner_and_endpoint` だけ（`by_owner` は接頭辞なので張らない・CVX-12）。登録は endpoint ごとの upsert |
| 配信 | `emitNotification` が行を insert した直後に `ctx.scheduler.runAfter(0, internal.actions.notifications.deliverWebPush…)`。ただし **静穏時間中**か **端末が1つも無い**ときは予約しない（通知欄の行は作る）。action は読み1回（`webPushDelivery`）→ `web-push` で端末ごとに送信 → 書き1回（`pruneWebPushSubscriptions`） |
| 失効の掃除 | `WebPushError.statusCode` が **404 / 410** の購読を消す。429 やその他は何もしない（次の通知で再送。action は at-most-once なので再試行機構は持たない＝ notifications.md §6.3 の方針） |
| 静穏時間 | notifications.md §6.2 のとおり**押し出しだけを止める**。`notificationSettings.quietFromHourJst` / `quietToHourJst`（既定 22 / 7、`from === to` は静穏なし）を今回コードに入れ、設定フォームに2つの `Select` を足す。静穏で落とした押し出しは翌朝に持ち越さない |
| 文言と遷移先 | サーバー側で `webPushMessage()`（`notificationMessage` + `notificationLink`）が `{ title, body, url, tag: dedupeKey }` を組んで送る。SW は形を確かめて `showNotification` するだけ（SSoT は1箇所）。`notificationclick` は開いているタブを focus して `url` へ navigate、無ければ `openWindow`。`src/lib/notification-link.ts` は `convex/lib/notificationLink.ts` の再輸出にした |
| 鍵 | VAPID の秘密鍵・公開鍵・subject は **Convex deployment の環境変数**（`WEB_PUSH_VAPID_PRIVATE_KEY` / `WEB_PUSH_VAPID_PUBLIC_KEY` / `WEB_PUSH_VAPID_SUBJECT`）。公開鍵は `queries/notifications/webPushConfig`（`ownerQuery`）で配る（`VITE_` に複製しない。未設定なら `null` を返し UI が案内する） |
| エラー型 | クライアントは `WebPushError`（better-result `TaggedError`、`reason: unsupported / missing-key / denied / no-service-worker / subscribe-failed`）を `Result` で返し、UI はエラートーストにする。サーバー側の送信失敗は状態コードだけを見る |
| `pushsubscriptionchange` | SW は同じ鍵で再購読し、開いているページに `PUSH_SUBSCRIPTION_CHANGED` を postMessage。ページ側 `PushSubscriptionSync`（app-shell）が起動時とこの合図で現在の購読を upsert する。iOS はこのイベントを出さないので、失効は配信時の 404 / 410 に任せる |
| テストの線引き | convex-test で購読の upsert / 所有者分離 / 予約の有無 / 静穏 / action の掃除（`web-push` は `vi.mock`、鍵は `vi.stubEnv`）。SW のリスナーはテスト対象外（型検査のみ）。UI は `WebPushSection` を Testing Library で |
| 語彙 | `CONTEXT.md`「通知」に押し出しと静穏時間の一文、「マイページ」に通知タブの構成 |

## 2. スキーマと関数

```ts
pushSubscriptions: defineTable({
  endpoint: v.string(),
  expirationTime: v.optional(v.number()),
  keys: pushSubscriptionKeysValidator, // { auth, p256dh }
  ownerId: v.string(),
}).index("by_owner_and_endpoint", ["ownerId", "endpoint"]);

notificationSettings: … quietFromHourJst: v.optional(v.number()), quietToHourJst: v.optional(v.number()) …
```

| ファイル | 種別 | 役割 |
| --- | --- | --- |
| `convex/lib/notifications.ts` | 純関数 | `QUIET_HOUR_RANGE` / `QUIET_HOUR_DEFAULTS` / `isQuietHourJst`、`NOTIFICATION_DEFAULTS` に静穏の既定 |
| `convex/lib/webPush.ts` | 純関数 | `webPushOutcome(statusCode)`、`webPushMessage(notification)`、`readVapidKeys(env)`、`WEB_PUSH_ENV` |
| `convex/lib/notificationLink.ts` | 純関数 | 通知の種類 → 遷移先（通知欄と Web Push が共有） |
| `mutations/notifications/subscribePush` / `unsubscribePush` | `ownerMutation` | 端末の登録（upsert）/ 解除 |
| `queries/notifications/pushSubscriptions` | `ownerQuery` | 所有者の端末一覧（`_id` / `endpoint` / `_creationTime`） |
| `queries/notifications/webPushConfig` | `ownerQuery` | 公開鍵（無ければ `null`） |
| `queries/notifications/webPushDelivery` | `internalQuery` | 通知1件の文言と所有者の購読一覧。通知が無い・端末が無いなら `null` |
| `mutations/notifications/pruneWebPushSubscriptions` | `internalMutation` | 失効した購読の一括削除 |
| `actions/notifications/deliverWebPush` | `internalAction`（`"use node"`） | `web-push` で端末ごとに送り、404 / 410 を掃除 |
| `services/notifications/emitNotification.ts` | — | insert 後に静穏・端末有無を見て予約。`now` を引数で受ける |
| `convex.json` | — | `node.externalPackages: ["web-push"]` |

## 3. UI と SW

- `src/lib/web-push.ts`: `isWebPushSupported` / `notificationPermission` / `currentPushSubscription` / `subscribeWebPush(publicKey)`（`Result<SubscribePushInput, WebPushError>`）/ `unsubscribeWebPush()`（解除した endpoint）
- `src/features/my-page/components/web-push-section.tsx`: 状態は「非対応」「鍵未設定」「拒否」「未登録」「この端末に届きます」の5つ。登録済み端末数を併記
- `src/components/push-subscription-sync.tsx`: app-shell に置く。権限が granted のときだけ起動時と SW の合図で upsert
- `notification-settings-form.tsx`: 「静穏時間の開始 / 終了」`Select` と注記「静穏時間は端末への通知（Web Push）だけを止めます」
- `sw/service-worker.ts`: `push` / `notificationclick` / `pushsubscriptionchange` を `serwist.addEventListeners()` の前に追加（Serwist 公式サンプルと同じ順序）

## 4. 運用（鍵の用意）

```bash
vp dlx web-push generate-vapid-keys
npx convex env set WEB_PUSH_VAPID_PUBLIC_KEY '<publicKey>'
npx convex env set WEB_PUSH_VAPID_PRIVATE_KEY '<privateKey>'
npx convex env set WEB_PUSH_VAPID_SUBJECT 'mailto:<owner email>'
```

dev / prod の deployment それぞれに設定する。鍵を入れ替えたら既存の購読は無効になるので、各端末で「止める」→「受け取る」をやり直す。

## 5. テスト

- 純関数: `convex/lib/webPush.test.ts`、`convex/lib/notifications.test.ts`（`isQuietHourJst`）
- 統合: `convex/webPush.test.ts`（upsert / 所有者分離 / 解除、公開鍵、予約は1回、端末無し・静穏は予約なし、404/410 の掃除、鍵無し・通知消失は何もしない）
- UI: `web-push-section.test.tsx`、`notification-settings-form.test.tsx`（静穏の入力）

## 6. 端ケース

| ケース | 挙動 |
| --- | --- |
| 権限を拒否した | 赤い案内。ブラウザ設定で許可すれば同じボタンから登録できる |
| iOS Safari でホーム画面に追加していない | `PushManager` が無いので「非対応」の案内 + 手順の一文 |
| 同じ端末が再登録した | endpoint が同じなら行は増えず鍵だけ更新 |
| 端末を初期化して endpoint が変わった | 古い行は次の配信で 410 → 削除。新しい購読は `PushSubscriptionSync` が upsert |
| 静穏時間中に夜の催促が当たる | 通知欄には出るが端末には届かない。設定フォームの注記で明示 |
| 鍵が未設定の deployment | UI は登録できない旨を出し、action は静かに終わる。通知欄は従来どおり |
| action が失敗した（429 など） | 再送しない。次の通知で改めて送る |
