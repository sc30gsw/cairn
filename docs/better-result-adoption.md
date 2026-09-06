# better-result 採用状況

このドキュメントは cairn における [better-result](https://better-result.dev/) の採用方針と、2026-09-06、`7edac72` 時点のエラー境界監査を記録する。後続の修正依頼により、下記の採用状況を更新した。スキル別の判定は [best-practices監査](best-practices-review-2026-09-06.md) を参照。

## 方針

- **期待される失敗**（検証、認証、外部 API、パース）は `Result` + `TaggedError` で表現する。
- **シリアライズ境界**（Convex RPC、HTTP、worker message、永続化）では検証可能なプレーン値に変換する。同じ実行環境内のReact props/stateはシリアライズ境界ではない。
- **プログラマエラー**（不変条件違反、到達不能分岐）は throw のままにする。

正本: [`.claude/rules/typescript/better-result.md`](../.claude/rules/typescript/better-result.md)

## エラー型（`src/lib/errors.ts`）

| 型 | 用途 |
| --- | --- |
| `MutationFailedError` | Convex mutation 失敗（`runMutation`） |
| `ValidationFailedError` | Valibot パース失敗（ID 変換など） |
| `AuthActionError` | Better Auth クライアント操作失敗 |

## 採用済み

### Convex コア

- `convex/lib/errors.ts` — `TaggedError` ベースのドメインエラー
- `convex/lib/ownerFunctions.ts` — 認可ラッパ
- `src/lib/run-mutation.ts` — `Promise<Result<T, MutationFailedError>>` を返す。通知を共通化しながら、呼び出し元で成功時だけclose/reset/後続処理を実行できる。

### フロントエンド ID パース（`src/types/item.ts`）

```typescript
parseItemId(id: string): Result<ItemId, ValidationFailedError>
unwrapItemId(result): ItemId  // 検証済み境界でのみ使用
```

Select / DnD など UI 由来で既に有効な ID がある箇所は `unwrap*` を使う。フォーム submit 前のユーザー入力は `Result` をそのまま扱う。

### 認証アクション（`src/features/auth/lib/auth-actions.ts`）

- `Result.tryPromise` + `AuthActionError` で Better Auth 呼び出しをラップ
- `AuthActionResult` は `Result<void, AuthActionError>`。`useAuthActionTransition` がResultを保持し、`AuthActionFeedback` や `authActionErrorMessage` が表示へ変換する。

新規コードは `~/features/auth/lib/auth-actions` を直接 import する。

## 未採用 / 意図的に Result にしない箇所

- Formisch フィールド検証 — Valibot スキーマ + Formisch の `field.errors` が SSoT
- Convex query 結果 — TanStack Query + Suspense が読み込み・エラー境界を担当
- `location.reload()` などブラウザ制御 — 認証の sign-in / sign-up 成功時のみ（プロフィール更新は `authClient.getSession()` で session 再取得）

## 追加時チェックリスト

1. 期待される失敗か？ → `Result` + `TaggedError`
2. 境界を越えるか？ → プレーン型に変換してから return
3. 呼び出し元は `.match` / `Result.isError` で分岐するか？
4. テストで成功・失敗両方をカバーしたか？

## 修正済みの経路

2026-09-06の修正で、次を実装・検証した。

- Google APIの本文読み取りまでResult境界を拡張し、HTTP状態とcauseを保持。200/503の本文失敗、401、204の回帰テストを追加。
- runMutationの結果をcallerへ返し、試験結果を含む全callerの成功後処理を照合。編集画面の入力保持、タイマー停止失敗後の確定阻止、DnD失敗時の一時順序破棄を検証。
- avatar JSONをValibotとConvex ID validatorで検証。依存引数・戻り値は生成APIから導出。サーバー側のID所属・所有者検証を維持。
- Web Pushのpermission/registration/getSubscription/subscribe/unsubscribeをResult化。ブラウザ停止済み・DB解除未完了を別の状態として示し、保存失敗後もendpointを保持して再試行。
- カレンダー解除をtableごと100件のバッチにし、別mutationで継続。disconnectingを保持し、中断後の再開と旧jobの拒否を検証。

AuthのonSuccess callbackは、session再取得などの外部I/Oも含む既存契約としてResultへ変換する。既存テストにも明記されており、純粋callbackの不変条件と未分類I/Oを混同して一律throwへ変更していない。任意storage・best-effortのPush再登録/配送は、監査で確定した障害ではないため既存方針を維持した。

最後のWeb Push表示調整を含めて `vp check --fix` / `vp run type-ssot-check` / `vp test`（233ファイル・1365件）/ `vp build` が成功。`vp run doctor`のローカル診断も指摘なし。以下の検索件数・カタログ・経路説明は `7edac72` の監査記録で、修正前の状態を示す。

## 監査対象・APIの事実

better-result 3.0.1がインストール済み。`node_modules/better-result/dist/index.d.mts` で `Result.try` / `tryPromise` / `gen` / `isError`、`TaggedError`、`Panic` / `panic`、`matchError`、Standard Schema対応の `Result.codec` を確認した。既存のConvex例外契約をResult envelopeへ全面変更する提案はしない。

追跡対象の `src/`、`convex/`、`sw/`、`scripts/`、ルート実行設定を棚卸しした。テスト、生成API・route tree・Better Auth生成schema、vendorは対象外。テストは挙動の根拠として別に参照した。集計対象800ファイルはTS/TSX/JS/JSX/MTS/MJS/CSS/HTML。publicにはこの集計対象拡張子の追跡実装がなく、offline HTMLはscriptsで生成する。画像・manifest・文書は失敗の発生源となるコードに含めない。

全領域を候補検索し、共通の失敗境界と下記の具体経路を精読した。800ファイルすべての各分岐を精読したという意味ではない。検索0件の領域も表に残し、個別に追えなかった経路は未確認とする。

## 検索証拠

同じ固定HEADに対する行ベース正規表現検索。複数分類が同じ行に一致するため、合算して障害数にしない。コメント・正常系のnullも含む候補数であり、意味の分類は次節を優先する。

| 分類 | 一致行数 | 内容 |
| --- | ---: | --- |
| throw | 26 | ドメイン例外、認証ラッパ内throw、設定不備、redirect、不変条件 |
| catch / .catch | 30 | Resultのcatchプロパティを含む。1行はuse-busyの既存コメント |
| reject / Promise.reject | 4 | crop画像変換2、transitionからの再reject2 |
| Result | 190 | import・型・呼び出しを含む |
| TaggedError定義 | 14 | Domain5、Google2、avatar3、frontend共通3、WebPush1 |
| parse / safeParse / assert / unwrap | 38 | validation候補。schema定義自体は別のvalidator群も参照 |
| return sentinel | 257 | null/undefined/false/空配列/状態文字列。正常なabsenceも含む |
| 外部・永続I/O | 400 | fetch、authClient、ctx.db/storage/scheduler/run*等の候補 |
| 境界・表示 | 247 | ConvexError、throwDomain、JSON、presentError、notifyError等 |

検索対象パターンは上表のリテラルに加えて `readFile` / `writeFile` / `execSync` / `spawn` / `sendNotification`、`errorComponent` / `createServerFn`。`graft callers runMutation` で利用経路を確認し、`graft grep throwDomain` と `graft grep runMutation` で索引内の全出現を確認した。検索範囲外の動的コードや依存内部は件数に含めない。

ドメインエラーの生成は計132サイト。`Unauthenticated` 1、`Forbidden` 4、`NotFound` 40、`Conflict` 17、`ValidationFailed` 70。関数・メッセージごとの業務要件が同じとは扱わず、共通する輸送形式と表示方針だけをグループ化する。

## 失敗カタログと処置

| 群 | 発生条件・根拠 | 現在の経路 | 処置 / 未確認 |
| --- | --- | --- | --- |
| D1 認証・権限 | ownerFromIdentity、requireOwned系、profile claim。Unauthenticated1 / Forbidden4 | Domain TaggedError→throwDomain→ConvexError→UI表示 | 既存tag維持。所有者はサーバー認証から取得。全操作の認可を侵入試験したわけではない。 |
| D2 不在 | NotFound40。削除済みのitem/goal等 | 同じDomain輸送境界 | 保持。正常な「未作成」はnullとして区別。各nullの全要件照合は未完。 |
| D3 業務競合 | Conflict17。タイマー状態、順序、切断途中等 | 同じDomain輸送境界 | 保持。回復操作を表示層で選択。全メッセージでreloadが最適かは未確認。 |
| D4 入力 | ValidationFailed70。日付、点数、期間、編集可能条件等 | サーバーvalidation→Domain輸送。FormischはValibotのfield.errors | 境界を維持。入力検証のメッセージ関数が返すstring/nullを盲目的にResultへ変換しない。 |
| G1 OAuth token | googleAccessToken.tsのtoken取得・不足scope・SDK reject | GoogleAuthError→needsReauthまたは表示 | causeを内部保持し安全な案内へ。実OAuth失効・更新の再現は未実施。 |
| G2 Google HTTP | googleCalendar.tsのfetch、HTTP status/reason、parse | GoogleCalendarError→isAuthFailure/isRetryable/isGone→scheduler/status | 既存の操作・status・reasonを保持。BP-02の本文I/O漏れを最優先で塞ぐ。判別union化は別途、全consumerを確認してから。 |
| G3 同期競合 | pushOne/recordPush、pending置換、operation lease | skipped/conflict/changed等の結果、再取得・再送・状態保存 | 業務上の正常な競合結果はErrorへ変換しない。切断清掃の容量はBP-01。 |
| A1 認証操作 | auth-actions/profile-actionsのBetter Auth error、Googleリンク | AuthActionError→AuthActionResult→transition→feedback | SDK呼び出しの境界は維持。広いcatchにonSuccess callbackも含むため、プログラム不備を通常の認証失敗として隠す可能性は未整理。 |
| M1 mutation | runMutationに渡したConvex mutationのreject | MutationFailedError→notifyError→void | BP-03。成功時の後処理に必要なResultを返す。silent時の通知省略と失敗結果の消去は別の判断にする。 |
| U1 avatar | MIME/サイズ、crop失敗、uploadHTTP、JSON、claim、profile更新 | AvatarTooLarge/UnsupportedType/UploadFailed/AuthAction | 既存tagを基本維持。外部JSONをValibotで検証（BP-04）。uploadのHTTP/parse/claimの失敗はoperation付きに分ける候補。 |
| W1 ブラウザPush | 非対応、鍵なし、権限拒否、SWなし、subscribe失敗 | WebPushError(reason)またはnull/Promise reject | reason unionを維持。requestPermission/getRegistration/getSubscriptionも外部境界として扱う。初回currentPushSubscriptionのreject処理は未整備。 |
| W2 Push配送 | web-push SDKのstatus/reject、購読失効 | status number/undefined→webPushOutcome→goneだけ削除 | best-effort配信か再試行必須かの運用判断が必要。causeが失われるため診断情報を安全に残す改善候補。 |
| B1 storage | local/sessionStorage拒否・quota | 6ヘルパーがResultをnull/voidへ変換 | UI任意設定ならbest-effortで妥当。OAuth接続pending markerの失敗との区別を追跡すべき。秘密tokenは保存しない。 |
| B2 SW | JSON不正、navigate/renew失敗、register失敗 | null/ignored rejection、次回起動で再登録 | 不正pushを無視する境界は妥当。継続的失敗の可観測性は未確認。 |
| Q1 query/route | Convex query reject、SSR token取得失敗、route日付不正 | Query/Suspense→RootErrorComponent、redirect | frameworkの例外・redirect契約を維持。Result envelopeは不要。 |
| P1 defect/config | env.ts、jst.ts、schedule-instant、DayBoard context、my-page user、検証済みIDのunwrap | Error/throw→framework境界またはCLI終了 | 不変条件と設定不備はthrowを維持。既存Errorを一律Panicへ変える必要はない。新規Result combinator内の不変条件はpanicを検討。 |
| T1 build/tool | fs/sharp/build/injectManifest、不在output、type-ssot-check | top-level reject、stderr、exit、false/null | CLI自身が最終境界。Result採用の優先度は低い。build出力なしを成功skipとしてよいかは配備要件次第。 |

未知の外部例外を取り込む必要がある場合は、一時的な `UnhandledException` にoperationとcauseの対応を記録する。恒久的な万能エラー型にしない。第三者I/Oのcatch内と、その後の純粋callbackの不変条件違反を区別する。

## 端から端まで確認した経路

1. **認可**：ownerCtx→ctx.auth→ownerFromIdentity→Unauthenticated/ownerId→ownerMutation/service→throwDomain。Convexがmutationをロールバックし、フロントではpresentErrorがtagを検証して日本語案内へ変換する。秘密値・ErrorインスタンスをConvexError.dataへ入れない。
2. **試験結果保存**：ExamResultModal→use-goal-dialogs→useGoalsBoardActions.onSetExamResult→runMutation→Convex setExamResult→requireOwnedGoal/点数・日付validation。失敗通知後にvoidで戻り、モーダルが閉じる（BP-03）。サーバーの記録は変更されないが、画面入力を保持できない。
3. **外部予定送信**：move/remove mutation→queueExternalChange→内部scheduler→所有者lease→pending取得→Google patch/delete→finishまたはretry。新しいpendingによる置換とsettled tombstoneは旧ジョブを防ぐ。Google本文rejectはResult分岐前に抜ける（BP-02）。ネットワーク失敗時にGoogle側で操作済みか不明な場合もあるため、既存の同一event IDへの再送・gone処理を維持する。
4. **Googleログイン**：公開config→条件付きbutton→signIn.social→Better Auth OAuth→callback→SSR/provider。SDK errorはAuthActionResult、callback失敗はauthError=googleで日本語案内。認証tokenをResultでシリアライズして渡す実装にはしない。
5. **画像**：crop→uploadAvatarBlob→型/サイズ検査→upload URL→fetch→claimAvatarUpload→metadata/owner検証→profile更新。upload失敗の表示はあるが、HTTP JSONのキャストはBP-04。claim後のprofile更新失敗時の全クリーンアップ順序は追加検証対象。
6. **Web Push**：WebPushSection→ブラウザpermission/SW/subscribe→Convex subscribePush→配信action→SDK→失効購読prune→service workerで表示。最初のpermission/registrationと一覧取得はResult外でrejectし得る。runMutationによる成否消去後のUI更新も、M1の同種候補。通知データはアプリ内にも残るため、Push失敗を通知データ消失と同一視しない。
7. **任意ストレージ/worker**：safe-storageは失敗をデフォルト値に落とす。service workerは壊れたpush JSONを破棄し、配信URLはサーバー側の通知リンクから生成。worker messageは固定typeをconsumer側で判別。全ブラウザのquota・権限拒否は未検証。

## 境界とcodec

| producer → consumer | 現在の形式 | codec判断 |
| --- | --- | --- |
| Convex service → 同一実行内caller | Result、DomainError、通常値 | in-processなので不要。ドメイン失敗のthrow混在は今後のslice内で整理。 |
| Convex function → React query/mutation | validator付き通常値、ConvexError.data `{tag,message}` | Result envelopeを輸送していないため `Result.codec` は不要。現行tagと表示契約を維持。 |
| TanStack serverFn → root route | token/null等のframework管理値 | Resultではない。SSRの既存契約を維持し、独自error envelopeを追加しない。 |
| Better Auth → frontend actions | ライブラリのdata/error契約 | 受信後にAuthActionResult化。独自codecは不要。 |
| Google HTTP → client | JSON/HTTP→Valibot→Result | GoogleはResult producerではない。Valibotで外部値を検証。BP-02修正対象。 |
| Storage HTTP → avatar | JSON→現在は型assertion | BP-04。Valibot schemaが必要。Result codecの対象ではない。 |
| action → scheduler / Convex DB | validator由来args、pending/settled/status | operation stateを保存。Error/Resultインスタンスを保存しない。 |
| backend → Web Push → worker | JSONのWebPushMessage | workerのruntime shape検査を維持。型のみのimportでは検証されないことに注意。 |
| worker → window | 固定typeのmessage | 同じ配備だが信頼境界として入力確認。Result envelopeなし。 |
| UI actions → React state/props | Resultをそのまま保持 | シリアライズ境界ではないためcodec不要。 |
| browser storage / CLI | string/null、stderr/exit | Resultを保存していない。codec不要。 |

将来Result envelopeをRPC・queue・永続化へ導入する場合にだけ、名前付きの `Result.codec` と4方向のStandard Schemaを定義する。public/永続データはsafe deserialize、成功・全tag・不正payload・秘密値除去のテストを必須とする。現在はcodecがないこと自体を違反にしない。

## 内部診断とユーザー表示

- 内部にはoperation・status/reason・cause・必要なIDを保持し、accessToken、refreshToken、Cookie、upload URL等をログ・DTOへ流さない。
- 利用者には入力修正、再試行、再ログインの案内を表示する。Domain tagの表示対応は `satisfies Record<DomainError["_tag"], ...>` が網羅性を支える。
- Google HTTPのraw messageはlastErrorへ保存される経路がある。今回、秘密漏洩を再現したわけではない。外部のmessageをそのまま利用者へ出す経路は、構造化された内部診断と表示用メッセージの分離対象。
- 同じトランザクションの失敗はConvexにロールバックを任せる。Google書き込みのような外部副作用はロールバックできないため、再試行・pending・tombstoneを維持する。

## 推奨する実装順序

1. **Google API本文のI/O境界**：最初のsliceに推奨。`googleCalendar.ts` と直接のテストに閉じ、既存のGoogleCalendarError・retry契約を維持してBP-02を修正できる。200/非2xx本文reject、fetch reject、JSON不正、204を確認する。
2. **カレンダー清掃の分割処理**：BP-01。Result型移行ではないが、信頼性のため同じ優先度。lease・disconnecting・アカウント変更と旧ジョブの安全性を保つ設計が必要。
3. **試験結果フォームの保存結果**：BP-03。mutation→Result→フォーム保持/closeまでを一つのsliceとし、validation/認可失敗時に入力が残ることを検証。その後、同じrunMutationを使う画面へ広げる。
4. **avatar HTTP応答の検証**：BP-04。生成API型・Valibotを使い、wrong type/null/欠損を通信境界で拒否する。
5. **Web PushブラウザI/Oと診断**：W1/W2。取得/購読/解除の失敗を統一し、best-effort配信の運用判断を記録する。

この順序を元に後続の修正を実施した。Google I/O、清掃、フォーム、avatar、Web Pushブラウザ境界は上記の「修正済みの経路」を参照。Push配信運用の変更や全ドメイン関数のResult化を必要とするものではない。

## 未確認事項と検証ログ

- 正常なabsenceと失敗を表す257 sentinel候補の個別要件、全132 Domain生成サイトのユーザー要件、全runMutation利用者の後処理を逐一検証したわけではない。共有境界・代表経路の評価から未確認領域まで「完全準拠」と推定しない。
- 第三者SDK・Convex内部がrejectする全条件、全ブラウザのStorage/Push例外、全フォームの障害時UIは未網羅。
- 2026-09-06：全領域の候補検索、API型確認、上記7経路の追跡。BP-02は実関数・mock fetchで200/503のbody rejectを再現し、fetch rejectのResult化とも比較した。
- `vp check` と `vp run type-ssot-check` は今回成功。同じソースに対する直前の `vp test` は231ファイル・1332件成功、build成功。監査文書以外の変更はない。
- 本文の旧経路は監査時点の証拠として保持している。実装したsliceと検証は冒頭に記載。セキュリティ・配備・長期容量の未知を、静的テスト成功で埋め合わせない。

## 全領域のカバレッジ

次の表の件数は検索確認したファイル数。精読欄は代表境界・関連差分を示し、全ファイル精読を意味しない。UIの通常値を直接扱う領域にも共通のquery/mutation境界がある。

| 領域 | 検索ファイル数 | entry point | 精読・照合の根拠 | 失敗 / 境界 | 未確認 |
| --- | ---: | --- | --- | --- | --- |
| `convex` | 8 | auth/http/crons/schema/migrations | auth/options, owner接続 | 認証SDK、環境値→HTTP/Convex | migration全データ経路 |
| `convex/actions` | 8 | calendarSync、notifications action | pushExternal/Source、sync、deliverWebPush | Google/SDK/内部RPC→scheduler/status | 全SDK reject条件 |
| `convex/betterAuth` | 3 | component auth/adapter | 公式component接続 | Better Auth API→component DB | 依存内部の全例外 |
| `convex/lib` | 59 | ownerFunctions、validators、Google client | Domain errors、Google I/O、schema境界 | D1-D4/G1-G2→ConvexError/Result | 全validator業務要件 |
| `convex/mutations` | 85 | ownerMutation/internalMutation | calendar outbox/operation/profile境界 | DB mutation→validator付き応答 | 全mutation障害注入 |
| `convex/queries` | 40 | ownerQuery/internalQuery | publicConfig/pending/connectionAccess | DB query→Query/Suspense | 全query障害注入 |
| `convex/services` | 189 | 業務service群 | calendar、goals、profile、notifications | Domain132サイトとDB→共有境界 | 全業務分岐の意味精査 |
| `doctor.config.ts` | 1 | doctor設定 | 設定の役割 | 独立した業務失敗なし | ルール網羅性 |
| `scripts` | 4 | build-icons/build-sw/render-offline/type-check | build-sw出力判定、icons I/O | fs/build→stderr/exit | 配備先別skip要件 |
| `src` | 3 | router/styles/devtools | router client/設定境界 | 設定不備→framework | styles全視覚確認 |
| `src/components` | 31 | 共通UI/通知/SW registrar | error state、Push/SW境界 | shared query/mutation、browser API | 全共通UIの障害時挙動 |
| `src/features/auth` | 9 | OwnerGate/login/account form | auth actions/form/config | Better Auth→Result→feedback | 実OAuthと全端末 |
| `src/features/board` | 49 | BoardPage/schedule/kanban | 差分schedule/日付/権限 | shared query/mutation、時刻assert | 全DnD失敗遷移 |
| `src/features/catalog` | 19 | catalog pages/actions | runMutation共通境界で評価 | shared query/mutation、form validation | 個別画面の精読未完 |
| `src/features/goals` | 44 | GoalsBoard/ExamResultModal | 試験結果の保存経路 | mutation→void→close | 他のgoalフォーム |
| `src/features/history` | 40 | history pages/hooks | 検索・共通境界で評価 | shared query/mutation、正常absence | 個別集計・画面の精読未完 |
| `src/features/legal` | 4 | privacy/terms | 検索で独立I/O候補0 | 静的表示 | 文面の法的妥当性は対象外 |
| `src/features/methods` | 12 | methods page/actions | runMutation共通境界で評価 | shared query/mutation | 個別画面の精読未完 |
| `src/features/my-page` | 29 | profile/calendar/Push/status | avatar、calendar、WebPushSection | SDK/HTTP→Result/void→UI | 全profile更新補償 |
| `src/features/onboarding` | 10 | onboarding flow | 検索・共通境界で評価 | shared form/query/mutation | 個別画面の精読未完 |
| `src/features/review` | 23 | review pages/forms | 検索・共通境界で評価 | shared form/query/mutation | 個別画面の精読未完 |
| `src/features/today` | 28 | DayPage/DayBoard/actions | provider不変条件、共通境界 | query/mutation、defect throw | 全今日操作の失敗遷移 |
| `src/features/trash` | 8 | TrashPage | runMutation共通境界で評価 | query/mutation | 復元全条件の精読未完 |
| `src/hooks` | 21 | mutation/query hooks、auth transition | auth transition/calendar sync | Convex→UI、Promise再reject | 全hook呼び出し元 |
| `src/lib` | 49 | runMutation/errors/storage/Push/auth | Resultと表示の共通境界 | G/A/M/W/B/Q各群 | 全browser例外 |
| `src/routes` | 18 | root/file routes/auth API | SSR token、root error、redirect | framework/RPC→root UI | 全loader障害 |
| `src/types` | 4 | ID/DTO型境界 | schema由来IDとunwrap契約 | validation Result/意図的throw | 全UIのID供給保証 |
| `sw` | 1 | push/click/subscriptionchange/message | worker4イベント境界 | JSON/Browser API→通知/ignore | 全ブラウザの再登録 |
| `vite.config.ts` | 1 | dev/test/build設定 | plugins/test/types設定 | 設定とbuild→CLI | 全配備先の出力検証 |
