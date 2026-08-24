# PWA・モバイル最適化設計（#58）

- 状態: 決定済み（2026-08-24）。実装は別セッション。
- 対象: ホーム画面追加（マニフェスト・アイコン・スプラッシュ）、Service Worker の生成経路とキャッシュ範囲、オフラインで何を出して何を出さないか、実行ボードのモバイル操作性（ドラッグ代替）、右小口インデックスタブのモバイル挙動の見直し。
- 前提となる調査: #57（`research/pwa-support`。ブランチは本セッション時点でリモートに存在しないため、[issue #57 のコメント](https://github.com/sc30gsw/cairn/issues/57#issuecomment-5389415572)の要点を根拠として引く）。要点は §2.3。
- 守る規約: [convex-rules.md](../../.claude/rules/convex-rules.md)（CVX-01〜20。ただし本仕様はバックエンド変更を持たない — §13）、[design-live-board.md](../../.claude/rules/web/design-live-board.md)（Paper Redesign・ライト固定・ハードコード hex 禁止）、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)、[react-conventions.md](../../.claude/rules/typescript/react-conventions.md)、[development-workflow.md](../../.claude/rules/common/development-workflow.md)（`vp` 以外のパッケージマネージャ禁止）。
- このドキュメントの担当範囲: **PWA の土台とモバイル操作性**。Web Push の購読・配信・通知欄は #56 の範囲（§22.1 で境界を切る）。週次/月次レビューの集計、目標階層、タイマーは範囲外。

---

## 0. 決定サマリ

1. **オフラインは「殻」だけ。データは1バイトも出さない。** Convex は公式にオフライン同期を提供しない（#57）。よって SW は **静的資産（script / style / フォント / アイコン）だけ**をキャッシュし、**SSR された HTML と Convex のデータは絶対にキャッシュしない**。圏外での起動は `offline.html`（precache 済みの1枚の紙）を出す。呼称も「app-shell 型 PWA」ではなく **「静的資産キャッシュ + オフライン貼り紙」** に統一する（§3）。
2. **`vite-plugin-pwa` は使わない。Serwist + ビルド後段スクリプト。** TanStack Start 本番ビルド非互換（TanStack/router#4988、upstream 未解決）を Vite プラグインで回避しようとすると Nitro の出力配線に踏み込む。代わりに `vp build` の**後**に `node scripts/build-sw.ts` を走らせ、`.output/public` を実測して precache manifest を作り、同じディレクトリに `sw.js` を書く。Vite プラグインを1つも足さない（§4）。
3. **書き込みは止めない。5秒未解決なら警告する。** Convex クライアントは短時間の切断中の mutation をキューして再接続時に送る。これを潰すと地下鉄10秒の常用ケースが悪化する。よって `runMutation` に「5秒経っても未解決なら『まだ保存されていません』の永続通知」を足すだけにする。`navigator.onLine` はバナー表示のみに使い、送信判断には使わない（嘘をつくため）（§9）。
4. **SW の更新は自動で奪わない。** `skipWaiting: false` / `clientsClaim: false`。新版を検知したら Mantine の通知に「更新する」ボタンを出し、押されたら `SKIP_WAITING` を postMessage → `controllerchange` → `location.reload()`。デプロイ直後にタブが古いチャンクを掴んだまま入れ替わる事故を避ける（§8）。
5. **モバイルナビは上部の横スクロール列を捨て、下小口タブにする。** ホーム画面起動（standalone）ではブラウザ枠が無く、画面最上部はステータスバー/ノッチ側で親指から最も遠い。7本を上部に横並べる現行 `MobileTabs` は、はみ出した項目が見えないまま `size="compact-sm"`（タップ領域 44px 未満）で並ぶ。**日 / ボード / 履歴 / 目標** の4本 + 「その他」Menu（項目 / プリセット / ゴミ箱）を画面下端に固定する。デスクトップの右小口レールは無変更（§10）。
6. **実行ボードのモバイルはドラッグを捨て、カード上の Menu で動かす。** 5列縦積み + 長押しドラッグ + ページスクロールは三重に衝突していて成立していない。列は**横スナップスクロール**（1画面1列）にし、各カードの `⋮` Menu から「移動」（状態遷移）と「上へ / 下へ」（並べ替え）を出す。既存の純関数 `resolveKanbanStatusMove` / `computeOrderedRowIds` と確定モーダルの経路をそのまま再利用する。**確定はドラッグ経路と1本に統合し、#51 が決めた `stopTimer` → 計測値プレフィル → 確定モーダル の順を必ず通す**（メニュー経路で目安分数のまま確定して計測を捨てないこと）（§11）。
7. **スプラッシュは所有者の実機1機種分だけ生成する。** iOS は Web App Manifest の標準ではなく Apple 独自の `apple-touch-startup-image` で、全機種を網羅すると20枚以上になる。media query が一致しない機種は「無地の起動画面」に落ちるだけで崩れないので、iPhone 1サイズだけ用意する（§6.4）。
8. **Convex のスキーマ・関数は一切変えない。** PWA はクライアント側の話であり、購読情報を持つ `pushSubscriptions` は #56 の所有物。ここで先に作らない（§13）。

---

## 1. 本仕様の範囲

| 含む | 含まない |
| --- | --- |
| `manifest.webmanifest` / アイコン / iOS メタ / スプラッシュ | 通知の購読・配信・権限 UI 本体（#56） |
| Service Worker のソース・生成経路・キャッシュ戦略 | Convex のオフライン書き込みキュー自作 |
| オフライン時の UI（バナー・未保存警告・`offline.html`） | オフライン読み取りキャッシュ（§19-3 で却下） |
| SW の更新通知 UI | Web Push の `push` / `notificationclick` ハンドラ（#56 が `sw/service-worker.ts` に追記） |
| モバイルナビ（下小口タブ）への差し替え | デスクトップの右小口レールの見た目変更 |
| 実行ボード カンバンのドラッグ代替・横スナップ列 | カンバンの列定義・状態機械そのもの（不変） |
| 実行ボード スケジュールタブのモバイル操作（ドラッグ無効化 + 明示ボタン） | `@mantine/schedule` のモバイル向け作り替え |
| 入力ズーム抑止 / safe-area / タップ領域 / 日付ロールオーバー | オンボーディングツアーのモバイル調整 |

---

## 2. 現状（コードから確認した事実）

### 2.1 PWA 資産は何も無い

| 事実 | 場所 |
| --- | --- |
| `public/` には `favicon.svg` の1枚だけ。manifest・アイコン PNG・SW は無い | `public/` |
| `head()` の `meta` は `charSet` / `viewport`（`width=device-width, initial-scale=1`）/ `title` の3つだけ。`theme-color`・apple 系メタ・`rel="manifest"` は無い | `src/routes/__root.tsx` |
| Vite プラグインは tailwind / tanstackStart / react / nitro / babel の5つ。PWA 系は無い | `vite.config.ts` |
| クライアント専用エントリファイルは無い（TanStack Start の既定に任せている）。したがって SW 登録は `__root.tsx` 配下のコンポーネントから行うしかない | `src/router.tsx` / `src/routes/__root.tsx` |
| 起動は今日の日（`/`）。CONTEXT「履歴」の「アプリの起動は今日の日」と一致 → `start_url: "/"` で整合する | `src/routes/index.tsx` |

### 2.2 モバイルの現状

| 事実 | 場所 |
| --- | --- |
| 右小口インデックスタブ（`IndexTabsRail`）は `visibleFrom="sm"`。`writing-mode: vertical-rl` + 交互回転 + 左辺なしのスケッチ枠 | `src/components/app-shell.tsx` / `app-shell.module.css` |
| モバイルは `MobileTabs` = `ScrollArea hiddenFrom="sm"` の中に7本の `Button size="compact-sm"`。紙シートの**外側・上**に置かれている | 同上 |
| ページ外枠は `Box maw={1180} px={{base:"sm",sm:"xl"}} py={{base:"md",sm:"xl"}}`。safe-area の考慮は無い | `src/components/app-shell.tsx` |
| `html` / `body` の背景は `--cairn-desk`（机）。中身が `.cairn-paper-sheet`（紙） | `src/styles.css` |
| カンバンは `<div className="grid gap-3 md:grid-cols-5">`。列は 未着手 / 進行中 / 確定 / スキップ + チェックポイントの5つ。`< md` では**縦に5段積み**になる | `src/features/board/components/board-kanban.tsx` |
| ドラッグは `@hello-pangea/dnd`（`useDnd()` の動的 import）。掴む所は `ActionIcon size="sm"`（≒26px）の `IconGripVertical` のみ | 同上 |
| ドラッグ完了時の分岐は純関数に寄っている（`resolveKanbanStatusMove` / `computeOrderedRowIds` / `hasRowOrderChanged`）。`確定` へ落とすとき `needsKanbanConfirmEditor(row)` なら確定モーダルを開く | `src/features/board/lib/kanban-order.ts` / `board-kanban.tsx` |
| スケジュールタブは既に**タップ経路がある**。`onEventClick` → `handleEventClick` → `openEditFromEvent` で編集フォームが開く。作成は `onSlotDragEnd` → `openCreate(start, end)` の**ドラッグのみ** | `board-schedule.tsx` / `use-board-schedule-ui.ts` |
| 全 mutation は `runMutation`（better-result + Mantine 通知）を1本通る。オフライン分岐は無い | `src/lib/run-mutation.ts` |
| `todayJst()` はレンダー中に呼ばれる。時計では再レンダーしないので、常駐したまま JST 日付が変わると古い「今日」を掴み続ける | `src/features/board/hooks/use-board-view.ts` 他 |
| `localStorage` は `safe-storage.ts` 経由で try/catch 済み（パスキープロンプト・「あとで設定」） | `src/lib/safe-storage.ts` / `src/lib/passkey-storage.ts` |

### 2.3 #57 調査の要点（本仕様の前提。再調査しない）

1. `vite-plugin-pwa` は TanStack Start の本番ビルドと非互換（TanStack/router#4988、upstream 未解決）。Serwist + 自作 Vite プラグインでの回避は確認済みだが **Nitro の出力ディレクトリ配線が別途必要**。`vite-plus` 自体は任意の Vite プラグインを許容する。
2. Convex は公式に「完全なオフライン同期は提供していない」と明言。短時間の再接続は自動で吸収されるが、長時間オフラインでの書き込み配送とオフライン読み取りキャッシュの永続化は**保証されない**。
3. iOS Safari は**ホーム画面追加によって ITP の7日間ストレージ削除ポリシーから除外**される（SW 登録・`localStorage` を含む）。スプラッシュは Manifest 標準ではなく Apple 独自の `apple-touch-startup-image`。
4. SW 登録は Web Push の**必要条件**（iOS は 16.4 以降かつホーム画面追加が前提）。PWA 化は Web Push の必要条件だが十分条件ではない。

---

## 3. オフラインの範囲（決定と根拠）

### 3.1 決定

| 種類 | 扱い | 理由 |
| --- | --- | --- |
| ナビゲーション（HTML ドキュメント） | **`NetworkOnly` + フォールバックで `/offline.html`**。キャッシュしない | SSR HTML には認証状態と所有者のデータが埋まる。マルチユーザー（`ownerId` 分離）なので、別時点・別所有者の HTML を焼き付けるのは事故 |
| 同一オリジンの script / style | `StaleWhileRevalidate` | ハッシュ付き（= 実質不変）だが、ハッシュ形式に依存した正規表現を書かずに安全側へ倒せる。即描画も得られる |
| Google Fonts の CSS | `StaleWhileRevalidate` | 手書きフォント（Yomogi）はこのデザインの本体。CSS だけ先に返れば FOUT が短い |
| Google Fonts のフォントファイル | `CacheFirst`（1年 / 最大12件） | 内容が URL に固定されている |
| `manifest.webmanifest` / `favicon.svg` / `icons/*.png` / `offline.html` | **precache** | 小さく、決定的で、オフライン起動に必須 |
| `/api/**`（Better Auth プロキシを含む） | **どのルートにも一致させない**（SW は素通し） | 認証応答をキャッシュすると別セッションのトークンを返しうる |
| Convex（WebSocket / `*.convex.cloud`） | 素通し | WebSocket は SW が介入しない。HTTP アクションも横取りしない |
| Convex のクエリ結果 | **キャッシュしない** | §19-3 |

### 3.2 「オフラインでデータが見えない PWA」に意味があるのか

得るものは4つ。どれもオフライン読み取りとは独立している。

1. **iOS の ITP 7日削除からの除外**（#57-3）。認証トークンは `localStorage` にある（[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md) の明記された tradeoff）。ホーム画面追加をしないと1週間空けるたびに再ログインになる。このアプリは「毎日ではないが続ける」使い方なので、ここが実利として一番大きい。
2. **ホーム画面から1タップ、ブラウザ枠なしで起動**。CONTEXT「スマホで就寝時刻を打つ」相当の「枕元で今日を閉じる」動線が短くなる。
3. **Web Push の必要条件**（#56 の土台。iOS は特にホーム画面追加が前提）。
4. **電波が細い場所での即描画**。フォントと JS がローカルに居るので、Convex の初回応答待ちの間も紙の画面が出る。

### 3.3 オフラインで「書けそう」に見せない

これが 3.1 の対価。UI 側で3つ必ずやる（§9）。

- オフライン検知中は紙シートの先頭に黄色い `Alert`（「オフラインです。記録の保存はできません。」）。
- 5秒経っても解決しない mutation には「まだ保存されていません。アプリを閉じると失われます。」の永続通知。
- `offline.html` に「オフラインでは記録できません」と明記し、復帰時に自動で元の画面へ戻る。

---

## 4. ビルド経路（Serwist + ビルド後段スクリプト）

### 4.1 なぜ Vite プラグインを作らないか

#57 が確認した回避策（Serwist + 自作 Vite プラグイン）は、**Nitro の出力ディレクトリを推測する**という一番壊れやすい部分を残す。`vp build` が終わった時点で `.output/public` は確定しているので、そこを**実測**して SW を書けば推測が消える。副作用として dev には SW が存在しなくなるが、これは利点である（dev の SW キャッシュは事故の温床）。

### 4.2 パッケージ追加

```bash
vp add serwist            # 9.5.12 — SW ランタイム（依存は idb と @serwist/utils のみ）
vp add -D @serwist/build  # 9.5.12 — precache manifest の注入（injectManifest）
vp add -D sharp           # 0.35.x — アイコン PNG の生成（ビルドでは走らせない。§6.3）
```

`@serwist/build` は zod に依存する。**devDependency の推移依存であり、アプリのコードに zod は入らない**（spec.md「Zod は使わない」はアプリコードの規約）。`vp run fallow` が `sharp` / `@serwist/build` を未使用と誤検知する可能性があるので、`doctor.config.ts` / fallow の除外設定が必要なら実装時に足す。

### 4.3 ファイルとスクリプト

```
sw/
├── service-worker.ts      # SW 本体（§5）
└── tsconfig.json          # lib: WebWorker。メイン tsconfig の include には入らない
scripts/
├── build-sw.ts            # vp build の後段。バンドル → manifest 注入 → .output/public へ
└── build-icons.ts         # 手動実行。favicon.svg → public/icons/*.png（§6.3）
public/
├── favicon.svg            # 既存
├── manifest.webmanifest   # 新規（静的。§6.1）
└── icons/                 # 新規。build-icons.ts の出力をコミットする
```

`package.json` の `scripts`（`sortScripts: true` なのでアルファベット順に入る）:

```json
{
  "build": "vp build && node scripts/build-sw.ts",
  "build:sw": "node scripts/build-sw.ts",
  "icons": "node scripts/build-icons.ts"
}
```

`node scripts/build-sw.ts` は Node の型ストリップに乗る（`engines.node >= 24.17.0`）。既存の `scripts/type-ssot-check.mjs` が `.mjs` である前例に反するが、`src/lib/paper-tokens.ts`（§9.3）を直接 import できる利点が大きい。**もし実行環境の Node が TS を読めなかった場合の逃げ道**: `scripts/build-sw.mjs` に改名し、トークンは `paper-tokens.ts` から生成した JSON を経由させる。

`.gitignore` に `.pwa/` を追加する（SW の中間バンドル出力）。`vite.config.ts` の `lint.ignorePatterns` に `sw/**` を追加する（`self` / `ServiceWorkerGlobalScope` を前提にした宣言が oxlint の env と噛み合わないため）。`fmt.ignorePatterns` は**追加しない**（整形はかける）。

### 4.4 `scripts/build-sw.ts`（確定形）

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { injectManifest } from "@serwist/build";
import { build } from "vite-plus"; //? vite からの直接 import は禁止(development-workflow.md)

import { renderOfflineHtml } from "./render-offline-html";

const ROOT = process.cwd();
const OUT = resolve(ROOT, ".output/public");
const INTERMEDIATE = resolve(ROOT, ".pwa");

//* 1) SW をバンドルする。minify しない — self.__SW_MANIFEST の注入点を確実に残すため。
await build({
  configFile: false,
  logLevel: "warn",
  build: {
    emptyOutDir: true,
    lib: { entry: resolve(ROOT, "sw/service-worker.ts"), fileName: () => "service-worker.js", formats: ["es"] },
    minify: false,
    outDir: INTERMEDIATE,
    target: "es2022",
  },
});

//* 2) オフライン貼り紙を Paper Redesign トークンから生成する(§9.3)。
await mkdir(OUT, { recursive: true });
await writeFile(resolve(OUT, "offline.html"), renderOfflineHtml(), "utf8");

//* 3) .output/public を実測して precache manifest を注入し、sw.js を書く。
const { count, size, warnings } = await injectManifest({
  globDirectory: OUT,
  //? HTML と JS/CSS は precache しない。殻だけ(§3.1)。
  globPatterns: ["offline.html", "manifest.webmanifest", "favicon.svg", "icons/*.png"],
  swDest: resolve(OUT, "sw.js"),
  swSrc: resolve(INTERMEDIATE, "service-worker.js"),
});

for (const warning of warnings) {
  process.stderr.write(`[build-sw] ${warning}\n`);
}
process.stdout.write(`[build-sw] precached ${count} files (${size} bytes)\n`);
```

`injectManifest` は**バンドルしない**（型定義に明記されている）ので、1) と 3) の2段が必須。`injectionPoint` の既定値は `"self.__SW_MANIFEST"` なので指定しない。

`renderOfflineHtml` は `scripts/render-offline-html.ts` に置き、`~/lib/paper-tokens` 相当を**相対パスで** import する（`scripts/` は tsconfig の `include` 外で `~` alias が効かない。相対 import 禁止ルールは `src/**` の PostToolUse hook が対象なので、`scripts/` では相対で良い）。

---

## 5. Service Worker（`sw/service-worker.ts`、確定形）

```ts
/// <reference lib="webworker" />
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;

const serwist = new Serwist({
  cacheId: "cairn",
  //? 自動で奪わない。更新は画面側のボタンで(§8.2)。
  clientsClaim: false,
  skipWaiting: false,
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: [
    {
      //* ドキュメントは絶対にキャッシュしない。SSR HTML には認証状態と所有者のデータが埋まる(§3.1)。
      matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: new NetworkOnly(),
    },
    {
      //? /api/** は一致させない。認証応答をキャッシュしない(§3.1)。sw.js 自身も除く。
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin &&
        !url.pathname.startsWith("/api/") &&
        url.pathname !== "/sw.js" &&
        (request.destination === "script" || request.destination === "style"),
      handler: new StaleWhileRevalidate({ cacheName: "cairn-assets" }),
    },
    {
      matcher: ({ url }) => url.origin === "https://fonts.googleapis.com",
      handler: new StaleWhileRevalidate({ cacheName: "cairn-font-css" }),
    },
    {
      matcher: ({ url }) => url.origin === "https://fonts.gstatic.com",
      handler: new CacheFirst({
        cacheName: "cairn-font-files",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxAgeSeconds: 365 * DAY, maxEntries: 12 }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [{ matcher: ({ request }) => request.destination === "document", url: "/offline.html" }],
  },
});

//* 画面から「更新する」を押されたときだけ待機中の SW を昇格させる(§8.2)。
//? addEventListeners() より前に自前のリスナーを足すのが Serwist の作法。
self.addEventListener("message", (event) => {
  if (event.data !== null && typeof event.data === "object" && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

serwist.addEventListeners();
```

決定の理由:

- `navigationPreload` は**有効にしない**。ナビゲーションは `NetworkOnly` なので得がなく、preload レスポンスの取り回しで壊れる余地だけが残る。
- `fallbacks` は `runtimeCaching` を変異させ、各エントリに `PrecacheFallbackPlugin` を足す仕様。だから `NetworkOnly` のナビゲーションルートを**明示的に置く必要がある**（ルートに一致しないリクエストは SW を素通りしてフォールバックが効かない）。
- `sw/tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "WebWorker"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022",
    "types": []
  },
  "include": ["."]
}
```

#56 はこのファイルに `push` / `notificationchange` / `notificationclick` のリスナーを `serwist.addEventListeners()` の**前**に足す。SW スクリプトが差し替わっても `PushSubscription` は `ServiceWorkerRegistration` に紐づくので購読は失われない。

---

## 6. マニフェスト・アイコン・スプラッシュ

### 6.1 `public/manifest.webmanifest`（確定形）

```json
{
  "id": "/",
  "name": "学習ログ",
  "short_name": "学習ログ",
  "description": "TOEIC 本番に向けた、その日の学習の記録。",
  "lang": "ja",
  "dir": "ltr",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": ["standalone", "minimal-ui"],
  "background_color": "#DAD8CE",
  "theme_color": "#DAD8CE",
  "categories": ["education", "productivity"],
  "icons": [
    { "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "今日", "url": "/" },
    { "name": "ボード", "url": "/board" },
    { "name": "目標", "url": "/goals" }
  ]
}
```

決定の理由:

- `background_color` / `theme_color` はどちらも `--cairn-desk`（`#DAD8CE` = 机）。紙は画面の中身であり、その外側 = OS の枠は机であるべき。起動画面もステータスバーも机色に沈む。**この2つの hex は `src/lib/paper-tokens.ts` の値と一致していなければならない**（§9.3 のテストで縛る）。
- `orientation` は**指定しない**。タブレット横置きを禁じる理由がない。
- `shortcuts` にアイコンは付けない（省略可。Android 長押しメニューでラベルだけ出る）。CONTEXT「マイページ」の _Avoid_「8番目のナビタブ」に触れないよう、ショートカットは既存ルートのみ。
- `prefer_related_applications` は付けない。

### 6.2 アイコンの絵

`public/favicon.svg` の絵（紙 + 罫線 + 赤い綴じ線 + 石積み = cairn）をそのまま使う。ただし2系統に分ける。

| ファイル | 内容 |
| --- | --- |
| `icon-192.png` / `icon-512.png` | `favicon.svg` を余白なしでラスタライズ。角丸は SVG が持っているものだけ |
| `maskable-192.png` / `maskable-512.png` | 机色（`#DAD8CE`）で全面を塗り、**絵を 80% に縮小して中央に置く**。マスク安全域（中央 80% 円）を守る |
| `apple-touch-icon-180.png` | 180×180、**透明部分なし**（iOS が黒く塗る）。背景は紙色（`#FFFCF0`）。角丸は付けない（iOS が丸める） |

### 6.3 `scripts/build-icons.ts`（手動実行）

`sharp` で `public/favicon.svg` から上記6枚 + §6.4 のスプラッシュを `public/icons/` に書き、**出力をコミットする**。ビルドでは走らせない。

- 理由: アイコンは art asset であって生成物ではない。毎ビルド `sharp`（native binary）を走らせると CI とローカルで依存が増え、dev では `/icons/*.png` が404になる（`__root.tsx` の `apple-touch-icon` リンクが壊れて見える）。
- 絵を変えたら `vp run icons` を叩き直して差分をコミットする、というルールを README ではなく本仕様に書いておく。

### 6.4 スプラッシュ（iOS）

**所有者の実機1機種分のみ**。`scripts/build-icons.ts` が机色（`#DAD8CE`）の下地に `favicon.svg` を中央 25% で置いた PNG を2枚（縦・横）生成する。既定は iPhone 15/16 系の論理サイズ（393×852 @3x = 1179×2556 / 2556×1179）。

`__root.tsx` の `links` に入れる:

```ts
{
  href: "/icons/splash-1179x2556.png",
  media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  rel: "apple-touch-startup-image",
},
{
  href: "/icons/splash-2556x1179.png",
  media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)",
  rel: "apple-touch-startup-image",
},
```

media が一致しない機種は**画像なし**に落ちる。その場合 iOS が何色の起動画面を出すかは実機確認事項（§22.2）。白が出るようなら、そのときに所有者の機種のサイズを追加するだけで済む。Android / デスクトップ Chromium は `background_color` + アイコンから自動生成するので何も足さない。

---

## 7. `src/routes/__root.tsx` の head 追加

`head()` の `links` / `meta` に追加する（既存の要素は消さない）。

```ts
links: [
  { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
  { href: "/manifest.webmanifest", rel: "manifest" },
  { href: "/icons/apple-touch-icon-180.png", rel: "apple-touch-icon", sizes: "180x180" },
  // §6.4 の apple-touch-startup-image を2件
  // 既存の fonts preconnect / stylesheet / appCss はそのまま
],
meta: [
  { charSet: "utf-8" },
  //? viewport-fit=cover でノッチ下まで机色を敷き、safe-area-inset-* を有効化する(§12.2)。
  //? maximum-scale / user-scalable は付けない(ピンチズームを塞がない)。
  { content: "width=device-width, initial-scale=1, viewport-fit=cover", name: "viewport" },
  { title: "学習ログ" },
  //* 机色。manifest の theme_color と一致させる。
  { content: "#DAD8CE", name: "theme-color" },
  { content: "yes", name: "mobile-web-app-capable" },
  //? 旧 iOS 向けの別名。両方出す。
  { content: "yes", name: "apple-mobile-web-app-capable" },
  //? ライト固定なので default(暗い文字) が正しい。black-translucent は使わない。
  { content: "default", name: "apple-mobile-web-app-status-bar-style" },
  { content: "学習ログ", name: "apple-mobile-web-app-title" },
],
```

`theme-color` の hex は `paper-tokens.ts` の値をそのまま書く（`head()` は React コンポーネントではないが、値の出所を1つにするため `import { PAPER_TOKENS } from "~/lib/paper-tokens"` して `PAPER_TOKENS.desk` を使う。§9.3）。

`RootDocument` の `<body>` 直下に2つ足す（どちらも DOM を描かない）:

```tsx
<ServiceWorkerRegistrar />
<DayRolloverGuard />
```

`Notifications` は `position="top-center"` のまま、standalone のノッチに潜らないよう `style={{ marginTop: "env(safe-area-inset-top)" }}` を付ける。

---

## 8. SW の登録と更新 UI

### 8.1 `src/components/service-worker-registrar.tsx`

```tsx
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    if (import.meta.env.DEV) {
      //* dev には SW を作らない。過去に本番を開いた端末で dev を触ったときの事故を掃除する。
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      });
      return;
    }
    void registerServiceWorker();
  }, []);

  return null;
}
```

- `null` を返すので SSR に影響しない。`useEffect` は SSR で走らない。
- `type: "module"` で登録する（`sw.js` は ES 形式で出力される。§4.4）。module SW は iOS 16.4 以降で使える = Web Push の下限と同じなので新たな制約を作らない。

### 8.2 `src/lib/register-service-worker.ts`（更新フロー）

```ts
export async function registerServiceWorker() {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    type: "module",
  });

  //* 既に待機中の版があるなら即座に案内する。
  if (registration.waiting !== null) {
    notifyUpdateReady(registration.waiting);
  }

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (installing === null) {
      return;
    }
    installing.addEventListener("statechange", () => {
      //? controller があるときの installed = 初回インストールではなく「更新が待機に入った」。
      if (installing.state === "installed" && navigator.serviceWorker.controller !== null) {
        notifyUpdateReady(installing);
      }
    });
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) {
      return;
    }
    reloading = true;
    location.reload();
  });
}
```

`notifyUpdateReady(worker)` は Mantine の `notifications.show`（`autoClose: false`、`color: "orange"`、`title: "新しい版があります"`、message に「更新する」`Button size="xs"`）。押されたら `worker.postMessage({ type: "SKIP_WAITING" })`。`controllerchange` が来たら1回だけ `location.reload()`。

`notify.ts` に `notifyUpdateReady` を足すのではなく、`register-service-worker.ts` にローカル関数として置く（`notify.ts` は文言だけを持つ薄い層のままにする）。ボタンを含む通知は `@mantine/notifications` の `message: ReactNode` で表現できる。

### 8.3 マイページの「アプリとして使う」セクション

`src/features/my-page/components/install-app-section.tsx`（新規）。CONTEXT「マイページ」の構成に**1セクション追加**する（8番目のナビタブは作らない）。

- **standalone で開いている**（`window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true)`）→ 緑の `Badge`「ホーム画面アプリとして起動中」と、オフラインでできること・できないことの2行。
- **Chromium で `beforeinstallprompt` を捕まえた** → `Button`「ホーム画面に追加」→ `prompt()`。イベントは `src/hooks/use-install-prompt.ts` が `window` の `beforeinstallprompt` を `preventDefault()` して保持する。**自動で出さない**（ナグ禁止）。
- **iOS Safari かつ非 standalone** → 静的な手順（「共有 → ホーム画面に追加」）。判定は `beforeinstallprompt` が来ないこと + `navigator.standalone === false` の組み合わせで足りる。UA 文字列でのブラウザ判定はしない。
- セットアップ checklist の完了条件（項目≥1・プリセット≥1・本番目標・週間ターゲット≥1）は**変えない**。ホーム画面追加は完了条件に足さない。

#56 は通知トグルをこのセクションに足す（§22.1）。

---

## 9. オフライン UI

### 9.1 `src/components/offline-banner.tsx`

```tsx
export function OfflineBanner() {
  const { online } = useNetwork(); //? @mantine/hooks。新規パッケージなし
  if (online) {
    return null;
  }
  return (
    <Alert color="yellow" icon={<IconWifiOff aria-hidden size={18} />} mb="md" variant="light">
      オフラインです。記録の保存はできません。電波が戻ると自動でつながります。
    </Alert>
  );
}
```

置き場所は `AppShell` の紙シート内、ヘッダー（学習ログ + accountMenu）の直下・`CatchBoundary` の直上。全画面で同じ位置に出る。

`useNetwork()` は SSR 中 `online: true` を返す（`navigator` が無い環境の既定）ので、初回描画でバナーが出ることはない。

### 9.2 `src/lib/run-mutation.ts` の変更（未保存警告）

```ts
const UNSAVED_WARNING_MS = 5_000;

export async function runMutation<T>(
  operation: () => Promise<T>,
  { errorMessage, successMessage }: RunMutationOptions = {},
): Promise<void> {
  //* navigator.onLine は嘘をつく(LAN 接続だが到達不能)。だから「5秒未解決」だけを条件にする。
  const warningId = "run-mutation-unsaved";
  const timer = setTimeout(() => {
    notifications.show({
      autoClose: false,
      color: "yellow",
      id: warningId,
      message: "まだ保存されていません。アプリを閉じると失われます。",
      title: "送信中",
    });
  }, UNSAVED_WARNING_MS);

  const result = await Result.tryPromise({ /* 既存のまま */ });

  clearTimeout(timer);
  notifications.hide(warningId);

  // 以降は既存のまま
}
```

- **mutation は止めない。** Convex は切断中の mutation をキューして再接続時に送るので、短時間の切断では成功する。ここを塞ぐと常用ケースが悪化する（§19-2 の自己反論に対する回答）。
- `id` を固定にしているので、同時に複数の mutation が詰まっても通知は1枚。最初に解決したものが消してしまうが、**「未解決が残っているのに通知が消える」ケースは 5秒後に再度出る**ので実害はない。厳密な参照カウントは持たない（AHA）。
- 既存の全 mutation（記録・目標・カタログ・スケジュール）がこの1本を通るので、呼び出し側の変更は0件。

### 9.3 `src/lib/paper-tokens.ts`（新規）と `offline.html`

`offline.html` は Mantine の外側にある静的な HTML なので、テーマ変数（`var(--cairn-ink)` など）が使えない。ハードコード hex 禁止（design-live-board.md 規則2）を守るため、**色の一次値を1ファイルに出し、`theme.ts` と生成スクリプトの両方がそこから読む**。

```ts
// src/lib/paper-tokens.ts
//* Paper Redesign の色の一次値。Mantine に依存しないので Node のビルドスクリプトからも読める。
//? theme.ts と scripts/render-offline-html.ts の両方がここを唯一の出所にする。
export const PAPER_TOKENS = {
  desk: "#DAD8CE",
  ink: "#100F0F",
  muted: "#B7B5AC",
  muted2: "#6F6E69",
  //? Mantine の orange[5]。primaryShade が 5 なので、これがアクセント。
  orangeAccent: "#BC5215",
  paper: "#FFFCF0",
  paper2: "#F2F0E5",
  rule: "#E6E4D9",
} as const;
```

`src/lib/theme.ts` の変更: ローカル定数 `INK` / `PAPER` / `PAPER_2` / `RULE` / `MUTED` / `MUTED_2` と `cssVariablesResolver` の `--cairn-desk` を `PAPER_TOKENS.*` に置き換える。色のタプル（`orange` など）は**そのまま**。

`src/lib/paper-tokens.test.ts`（新規、必須）:

```ts
test("orangeAccent は theme の orange[5] と一致する", () => {
  expect(PAPER_TOKENS.orangeAccent).toBe(theme.colors?.orange?.[5]);
});
test("desk は manifest の theme_color / background_color と一致する", () => {
  //? public/manifest.webmanifest を読んで両フィールドを突き合わせる
});
```

`scripts/render-offline-html.ts` が返す HTML（要点）:

- `<html lang="ja">`、`background: PAPER_TOKENS.desk`、中央に紙1枚（`PAPER_TOKENS.paper` + `1.5px solid ink` + スケッチ風 `border-radius: 8px 14px 9px 16px/16px 9px 14px 8px` + 紙影）。
- 見出し「オフラインです」（Yomogi は取れないので `font-family: system-ui, sans-serif` にフォールバックする。**Google Fonts をここで読まない** — オフラインで待たされるだけ）。
- 本文「電波が戻ると自動で元の画面に戻ります。オフラインでは記録できません。」
- `<button>` で `location.reload()`。
- `<script>` で `addEventListener("online", () => location.replace("/"))`。復帰したら黙って今日の日へ戻す（`document.referrer` は SW フォールバック経由では信頼できない）。
- 外部リソース参照ゼロ（`favicon.svg` すら参照しない）。

---

## 10. モバイルナビ（右小口 → 下小口）

### 10.1 決定

| | デスクトップ（`≥ sm`） | モバイル（`< sm`） |
| --- | --- | --- |
| 現行 | 右小口インデックスタブ（縦書き・7本） | 紙の**上**に横スクロールの `Button` 7本 |
| 変更後 | **無変更** | 画面**下端に固定**した下小口タブ 4本 + 「その他」Menu |

`MobileTabs`（`ScrollArea` + 7 Button）は削除する。

### 10.2 4本の選び方

CONTEXT の日常ループは「日 → 実行ボード → 履歴 → 目標」。項目・プリセットはカタログの設定、ゴミ箱は復旧であって毎日触らない。

```
日 | ボード | 履歴 | 目標 | ⋯ その他
                                 └ 項目 / プリセット / ゴミ箱
```

マイページは `accountMenu`（既存）から開くので「その他」に**入れない**（動線の二重化を避ける）。

### 10.3 構造

```tsx
// src/components/app-shell.tsx
const NAV = [ /* 既存の7本のまま。順序も変えない */ ];
//* 下小口タブに出す4本。残りは「その他」Menu(§10.2)。
const MOBILE_PRIMARY = ["/", "/board", "/history", "/goals"] as const satisfies readonly (typeof NAV)[number]["to"][];

function BottomIndexTabs({ pathname }: Record<"pathname", string>) {
  return (
    <Box className={classes.bottomBar} component="nav" aria-label="画面ナビ（下小口）" hiddenFrom="sm">
      <Group gap={6} justify="space-between" wrap="nowrap">
        {/* MOBILE_PRIMARY の4本を classes.bottomTab で */}
        <Menu position="top-end" withinPortal>
          <Menu.Target>
            <UnstyledButton aria-label="その他の画面" className={classes.bottomTab}>
              <IconDots aria-hidden size={18} stroke={1.5} />
              その他
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {/* NAV のうち MOBILE_PRIMARY に無い3本を Menu.Item component={Link} で */}
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Box>
  );
}
```

`IndexTabs` にも `component="nav" aria-label="画面ナビ（右小口）"` を付ける。理由は2つ: (1) `visibleFrom` / `hiddenFrom` は CSS クラスなので **happy-dom では両方が DOM に残る**。テストは `getByRole("navigation", { name })` で絞れないと2重にヒットする。(2) ランドマークが2つある以上、名前が必要（[accessibility]）。

### 10.4 `app-shell.module.css` の追加

```css
:root {
  --cairn-bottom-nav-h: 60px;
}

.bottomBar {
  background-color: var(--mantine-color-white);
  border-top: 1.5px solid var(--cairn-ink);
  bottom: 0;
  box-shadow: 0 -3px 0 rgb(16 15 15 / 10%);
  left: 0;
  padding: 6px var(--mantine-spacing-sm)
    calc(6px + env(safe-area-inset-bottom, 0px)) var(--mantine-spacing-sm);
  position: fixed;
  right: 0;
  z-index: 200; /* Mantine の modal(200) 未満に置かない。Drawer/Modal より下でよいので 200 で足りる */
}

/*? 右小口タブ(.tab)の質感を上下反転させたもの。回転は交互、角丸は上側だけ不揃いにする */
.bottomTab {
  --tab-rotate: 0deg;

  align-items: center;
  border: 1.5px solid var(--cairn-ink);
  border-bottom: none;
  border-radius: 10px 14px 0 0/16px 10px 0 0;
  color: var(--cairn-ink);
  display: flex;
  flex: 1;
  flex-direction: column;
  font-size: 11px;
  gap: 2px;
  justify-content: center;
  letter-spacing: 1px;
  min-height: 46px; /* タップ領域 44px 以上(§12.3) */
  text-decoration: none;
  transform: rotate(var(--tab-rotate));
  transition:
    background-color 120ms ease,
    color 120ms ease;
}

.bottomTabActive {
  background-color: var(--mantine-color-orange-6);
  color: var(--mantine-color-white);
  font-weight: 600;
}

/*? 固定バーの下に本文が隠れないぶんを、モバイルだけ足す */
@media (max-width: 47.9375em) {
  .shellBody {
    padding-bottom: calc(
      var(--cairn-bottom-nav-h) + env(safe-area-inset-bottom, 0px) + var(--mantine-spacing-md)
    );
    padding-top: env(safe-area-inset-top, 0px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bottomTab {
    transition: none;
  }
}
```

`--tab-rotate` は既存 `IndexTabs` と同じく `style={{ "--tab-rotate": ... }}` で index の偶奇から `±0.5deg` を与える。`.shellBody` は `AppShell` の外枠 `Box maw={1180}` に付ける。

### 10.5 設計規則の改訂が必要

[design-live-board.md](../../.claude/rules/web/design-live-board.md) 規則1の「右小口インデックスタブ（モバイルでは横並びの上部タブ列に畳む）」という記述を、次に置き換える。

```md
1. 全画面（Today/History/Items/Presets/Goals/Trash、新規ルートを含む）は Paper Redesign の言語に従う:
   Flexoki Light の紙背景、手書きの本文/見出しフォント + 数字は別の可読フォント、右小口の縦インデックスタブ
   ナビ（モバイルでは**画面下端に固定した下小口タブ4本 + 「その他」メニュー**に置き換わる。
   docs/specs/pwa-mobile.md §10）、スケッチ風の不揃いな border-radius と紙影は要所（カード・ボタン・タブ）だけ。
```

`docs/design/Paper Redesign.dc.html` にはモバイルの下部ナビが描かれていないため、**設計ファイルとの不一致を承知の上で規則を改訂する**判断である（§19-6、および §22.3 の再確認ポイント）。

---

## 11. 実行ボードのモバイル操作性

### 11.1 カンバンの列: 横スナップスクロール

`board-kanban.tsx` の `<div className="grid gap-3 md:grid-cols-5">` を CSS モジュールに置き換える。scroll-snap は Tailwind の任意値で書くと読みにくく、`overscroll-behavior` と併せて1箇所に置いたほうが良い。

```css
/* src/features/board/components/board-kanban.module.css */
.columns {
  display: grid;
  gap: var(--mantine-spacing-sm);
  grid-auto-columns: 86%;
  grid-auto-flow: column;
  /*? Android の横オーバースクロールで「戻る」が発火しないよう封じる */
  overscroll-behavior-x: contain;
  overflow-x: auto;
  padding-bottom: var(--mantine-spacing-xs);
  scroll-padding-inline-start: var(--mantine-spacing-xs);
  scroll-snap-type: x mandatory;
}

.column {
  min-width: 0;
  scroll-snap-align: start;
}

@media (min-width: 48em) {
  .columns {
    grid-auto-flow: row;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    overflow-x: visible;
    scroll-snap-type: none;
  }
}
```

`86%` は「次の列の背が少し見える」ことでスワイプ可能だと分かるための値（peek）。列見出しには件数の `Badge` を付ける（`未着手 3`）。スクローラには `role="group" aria-label="カンバンの列"`、各列には `aria-label="未着手 3件"`。

`md`（48em）を境にするのは既存 `md:grid-cols-5` と同じ。ナビの境（`sm`）と揃えないのは意図的 — タブレット縦は5列だと窮屈だが、ナビは右小口で足りる。

### 11.2 ドラッグ代替: カードの `⋮` Menu

`RecordCard` のアクション群を2つにする。

| コントロール | 可視条件 | 役割 |
| --- | --- | --- |
| `IconGripVertical` の `ActionIcon` | CSS で `< md` は `display: none`（**DOM からは消さない**） | ドラッグ。`dragHandleProps` は常にここに付く |
| `IconDotsVertical` の `ActionIcon` + `Menu` | 常に表示 | 移動と並べ替え |

**掴み手を DOM から消さない**のが要点。`@hello-pangea/dnd` の `Draggable` は `dragHandleProps` が実 DOM に付いていることを前提にしており、条件分岐で外すと警告が出る。`visibleFrom="md"` は CSS クラスなので DOM は残り、SSR と実 DOM もずれない。

`src/features/board/components/board-kanban-card-menu.tsx`（新規）:

```
⋮
 ── 移動 ──
 ▶  進行中にする     ← resolveKanbanStatusMove(status, "進行中") !== "noop" のときだけ
 ✓  完了にする       ← "確定"
 ⤺  未着手に戻す      ← "未着手"
 ⏭  見送りにする      ← "スキップ"
 ── 並べ替え ──
 ↑  上へ            ← shiftRowWithinColumn(...) !== null のときだけ
 ↓  下へ
```

- ラベルは `RECORD_STATUS_UI` の表示名（完了 / 見送り）に合わせ、状態名の生値（確定 / スキップ）を UI に出さない。既存カンバンの列見出しは生値のままだが、これは既存の不整合であり本仕様では触らない。
- **「完了にする」はドラッグと完全に同じ経路を通る（§11.3 の `onStatusMove`）。** すなわち「計測があれば先に `stopTimer` を await → その戻り値で `prefillMinutes` を作る → `needsKanbanConfirmEditor(row)` または計測があれば確定モーダルを開く → 無ければ `rows.confirm`」。#51（[study-timer.md](study-timer.md) §11.3）が `needsKanbanConfirmEditor` に `hasTimerState(row.timer)` を足して塞いだバグ（**目安分数のまま確定して計測結果を捨てる**）を、新設のメニュー経路で再導入しないための必須事項。`onStatusMove` に `row.minutes` を直渡しする分岐を書いてはいけない（計測が無い行だけがその経路に落ちる）。
- メニュー項目は `stopTimer` の解決を待つので、押した後は `loading` にする（study-timer.md §8.3 の「確定モーダルは `stopTimer` が解決してから開く」と同じ扱い）。
- 破壊的な操作は無い（見送りは `unskip` で戻せる）ので Confirm は出さない。ADR-0011「カンバンのドラッグによる状態変更は即実行」と揃える。

### 11.3 遷移の実行経路を1本にする

現行 `handleDragEnd` に埋まっている `if (statusMove === "confirm") ... else if ...` の連鎖を `use-board-kanban-actions.ts` に移す。**この関数がドラッグ経路とメニュー経路の唯一の合流点なので、#51 が決めた確定手順（`stopTimer` → プレフィル → モーダル → `rows.confirm`）はここに1度だけ書く。**

前提: 本チケットの着地時点で #51（[study-timer.md](study-timer.md)）は既に入っている（実装順は タイマー(#51) → PWA(#58)）。したがって `needsKanbanConfirmEditor(row)` は既に `hasTimerState(row.timer)` を含み、確定モーダルは `prefillMinutes: number | null` を受け取る。`onStopTimer` は `use-row-mutations.ts`（`rows.stopTimer`）で、加算後の `timerAccumulatedMs` を返す。

```ts
// src/features/board/hooks/use-board-kanban-actions.ts に追加
import { hasTimerState, timerMinutes } from "~domain/rowTimer";

return {
  /* 既存の onApplyOrder / onConfirm / ... はそのまま */
  //* ドラッグ経路とメニュー経路の両方がここを通る。モーダルを開く side effect は呼び出し側の state なので callback で受ける。
  onStatusMove: async (
    move: KanbanStatusMove,
    row: BoardRow,
    openConfirmEditor: (args: { prefillMinutes: number | null; row: BoardRow }) => void,
  ) => {
    switch (move) {
      case "confirm": {
        //? 先にサーバで区間を閉じる。目安分数のまま確定すると計測結果を捨てる(study-timer.md §11.3)。
        const accumulatedMs = hasTimerState(row.timer) ? await onStopTimer({ rowId: row._id }) : null;
        if (needsKanbanConfirmEditor(row) || accumulatedMs !== null) {
          openConfirmEditor({
            prefillMinutes: accumulatedMs === null ? null : timerMinutes(accumulatedMs),
            row,
          });
          return;
        }
        //? ここに来るのは「計測が無く、content と minutes が既に埋まっている行」だけ。
        return onConfirm({ content: row.content, minutes: row.minutes, rowId: row._id });
      }
      case "skip": return onSkip({ rowId: row._id });
      case "unskip": return onUnskip({ rowId: row._id });
      case "unconfirm": return onUnconfirm({ rowId: row._id });
      case "start": return onStart({ rowId: row._id });
      case "pause": return onPause({ rowId: row._id });
      case "reopen": return onReopen({ rowId: row._id });
      case "noop": return;
    }
  },
};
```

- `board-kanban.tsx` の `handleDragEnd` と `BoardKanbanCardMenu` は、どちらも `onStatusMove(move, row, setConfirmRow)` を `await` で呼ぶだけになる。**`onConfirm` を直接呼ぶ呼び出し側は残さない**（残すと確定経路が2本に戻る）。
- `openConfirmEditor` を callback で渡すのは、モーダルの開閉 state が `board-kanban.tsx` にあり、フックに持ち上げると `confirmRow` の所有者が2箇所になるため。判定（`stopTimer` を呼ぶか、モーダルが必要か）は**すべてフック側**にあるので、呼び出し側が手順を間違える余地は無い。
- `switch` を網羅させることで `KanbanStatusMove` に値が増えたときに型エラーで気づく。

### 11.4 スケジュールタブのモバイル

| 現行 | 変更後（`< md`） |
| --- | --- |
| `withEventsDragAndDrop={!pending}` | `withEventsDragAndDrop={!pending && !isCompact}` |
| `withDragSlotSelect={!pending && rows.length > 0}` | `withDragSlotSelect={!pending && rows.length > 0 && !isCompact}` |
| 作成はスロットのドラッグのみ | `Button` **「+ 予定を追加」**（ナビゲーションの隣）→ `openCreate(start, end)` |
| 移動・編集は `onEventClick` → 編集フォーム（既存） | 変更なし（これが既にドラッグ代替になっている） |

- `isCompact` は `useMediaQuery("(max-width: 47.9375em)", false, { getInitialValueInEffect: true })`（`@mantine/hooks`）。ここは**CSS では表現できない**（`@mantine/schedule` の props を切るため）ので JS 判定を使う。`getInitialValueInEffect: true` で SSR は常に `false`（= ドラッグ有効）→ 初回描画のハイドレーション不一致を避け、effect 後にモバイルなら無効化する。
- 「+ 予定を追加」が渡す既定スロットは、選択日の**次の丸め時刻から60分**。純関数 `defaultScheduleSlot(anchorDateJst, nowIso)` を `src/features/board/lib/board-schedule-events.ts` に足す（`nowIso` を引数で受けるので純関数のまま。`Date.now()` はコンポーネント側で読む）。選択日が過去なら 09:00〜10:00 固定にする。
- `slotFormValues(rows, start, end)` は `rows` が空だと `null` を返す（既存）。`rows.length > 0` のときだけボタンを出す。

---

## 12. モバイル共通の詰め

### 12.1 iOS の入力フォーカスズーム抑止

iOS Safari は `font-size < 16px` の入力にフォーカスすると自動でズームし、戻らない。Mantine の入力既定は `sm`（14px）。

`src/styles.css` に追加する（Mantine の内部セレクタを叩かない。ネイティブ要素にだけ当てる）:

```css
/*? iOS Safari は 16px 未満の入力にフォーカスすると自動ズームして戻らない。モバイルだけ底上げする */
@media (max-width: 47.9375em) {
  input:not([type="checkbox"]):not([type="radio"]),
  select,
  textarea {
    font-size: max(16px, 1em);
  }
}
```

`theme.components.TextInput.defaultProps.size = "md"` にするとデスクトップの密度も変わるので採らない。

### 12.2 safe-area

- `viewport-fit=cover`（§7）で `env(safe-area-inset-*)` が有効になる。
- 外枠 `Box`（`app-shell.tsx`）に `classes.shellBody` を付け、`< sm` で上下の inset を足す（§10.4）。
- 下小口バーは自身で `padding-bottom: env(safe-area-inset-bottom)`。
- `Notifications` は `marginTop: env(safe-area-inset-top)`（§7）。
- 横方向（landscape のノッチ）は `Box` の `px={{ base: "sm" }}` で実害が出ないので触らない。

### 12.3 タップ領域

- 下小口タブ: `min-height: 46px`（§10.4）。
- カンバンカードの `⋮`: `ActionIcon size="md"`（=34px）+ 周囲の `Group gap="xs"`。**44px には届かない**が、カード全体が押しても何も起きない領域なので誤タップの害は小さい。ここは意図的な妥協として記録する。
- `MobileTabs` にあった `size="compact-sm"` は消える。

### 12.4 日付ロールオーバー（standalone 常駐で顕在化する）

`todayJst()` はレンダー中に読まれるだけなので、常駐したまま JST の日が変わると「今日」がずれる。ブラウザタブでも起きるが、ホーム画面アプリは何日も生き続けるので実害の頻度が上がる。

`src/components/day-rollover-guard.tsx`（新規、DOM を描かない）:

```tsx
export function DayRolloverGuard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const seenRef = useRef(todayJst());

  useEffect(() => {
    function check() {
      const now = todayJst();
      if (now === seenRef.current) {
        return;
      }
      seenRef.current = now;
      void queryClient.invalidateQueries();
      void router.invalidate();
    }
    //? standalone は「再読み込み」ではなく「復帰」で戻ってくる。pageshow は iOS のページキャッシュ復帰用。
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", check);
    };
  }, [queryClient, router]);

  return null;
}
```

`visibilitychange` は非表示になったときにも走るが、`todayJst()` の比較だけなので無害。**タイマーでのポーリングはしない**（バッテリーを食い、CVX-14 の「時計で再実行しない」思想にも反する）。`useRef` を使うのは react-doctor の `no-derived-useState` を踏まないため。

---

## 13. Convex スキーマと関数サーフェス

### 13.1 変更なし（決定）

- **`convex/schema.ts` に追加する表・インデックスは無い。** よって CVX-10/11/12/13 に触れる変更は発生しない。
- **新規の query / mutation / action は無い。** よって CVX-01/02/03/04/05/20 に触れる変更も発生しない。
- 既存関数の引数・戻り値も変えない。`FunctionReturnType` から導出しているクライアント型（[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md)）に影響しない。

### 13.2 なぜバックエンドが要らないか

| 一見必要そうなもの | 判断 |
| --- | --- |
| `pushSubscriptions`（endpoint / keys / device） | **#56 の所有物**。ここで先に定義すると、通知の設計（購読の粒度、失効時の掃除、Slack/Resend との併用）が決まる前に表が固まる。CVX-16「schema.ts をデータ契約の SSoT に」の趣旨に反する |
| インストール状況・端末一覧 | 所有者1〜2人のアプリで、サーバに置く判断材料がない。`display-mode` はクライアントで即分かる |
| SW のバージョン管理表 | precache manifest のリビジョンが `sw.js` に埋まる。サーバに持つ意味がない |
| オフライン書き込みキュー | Convex クライアントが既に持つ（切断中のキュー）。自作は §19-3 で却下 |

### 13.3 CVX-14 との関係

PWA は**新しい clock 依存を作らない**。`dateJst` はこれまでどおりクライアントが `todayJst()` で計算して query 引数に渡す。§12.4 は「クライアント側の値が古くなる」問題への手当てであり、query 側の変更ではない。

---

## 14. フォーム（Valibot / Formisch）

**新規フォームは無い。** よって `src/features/*/schemas/` への追加も無い。

- インストールプロンプト、更新通知、オフラインバナー、カードの Menu はいずれも入力を取らない。
- 「+ 予定を追加」は既存の `board-schedule-event-form.tsx`（既存の Valibot スキーマ `board-schedule-event-schema.ts`）を開くだけ。スキーマは変えない。

`localStorage` に持つ状態も無い（インストールプロンプトの「あとで」を覚えない — 自動で出さないので覚える対象が無い）。

---

## 15. 純関数（新規・追記）

すべてフロント側。Convex ランタイムを import しない。

| 関数 | 場所 | 契約 |
| --- | --- | --- |
| `shiftRowWithinColumn(rows, rowId, direction)` | `src/features/board/lib/kanban-order.ts`（追記） | `direction` は `-1 \| 1`。同一列内で1つ動かした `Id<"rows">[]` を返す。端なら `null`。実体は列内の index を求めて既存 `computeOrderedRowIds` に委譲する |
| `kanbanMoveMenuItems(status)` | 同上（追記） | `{ column: KanbanColumn; move: Exclude<KanbanStatusMove, "noop"> }[]` を `KANBAN_COLUMNS` の順で返す。`resolveKanbanStatusMove(status, column)` が `"noop"` の列を落とすだけ |
| `defaultScheduleSlot(anchorDateJst, nowIso)` | `src/features/board/lib/board-schedule-events.ts`（追記） | `{ end: string; start: string }`。`anchorDateJst` が `nowIso` の JST 暦日なら「次の30分丸め」から60分、そうでなければ 09:00〜10:00。`Date.now()` を内部で呼ばない |
| `renderOfflineHtml()` | `scripts/render-offline-html.ts`（新規） | `PAPER_TOKENS` から自己完結の HTML 文字列を返す。外部リソース参照を含まない |

`isStandaloneDisplayMode()` のような環境判定は純関数にしない（`window` を触るのでフックに置く）。

---

## 16. 変更ファイル一覧

### 新規

| ファイル | 内容 |
| --- | --- |
| `sw/service-worker.ts` | §5 |
| `sw/tsconfig.json` | §5 |
| `scripts/build-sw.ts` | §4.4 |
| `scripts/render-offline-html.ts` | §9.3 |
| `scripts/build-icons.ts` | §6.3 |
| `public/manifest.webmanifest` | §6.1 |
| `public/icons/*.png` | §6.2 / §6.4（生成物をコミット） |
| `src/lib/paper-tokens.ts` + `paper-tokens.test.ts` | §9.3 |
| `src/lib/register-service-worker.ts` | §8.2 |
| `src/components/service-worker-registrar.tsx` | §8.1 |
| `src/components/day-rollover-guard.tsx` | §12.4 |
| `src/components/offline-banner.tsx` + `.test.tsx` | §9.1 |
| `src/components/app-shell.test.tsx` | §17 |
| `src/hooks/use-install-prompt.ts` | §8.3 |
| `src/features/my-page/components/install-app-section.tsx` + `.test.tsx` | §8.3 |
| `src/features/board/components/board-kanban.module.css` | §11.1 |
| `src/features/board/components/board-kanban-card-menu.tsx` + `.test.tsx` | §11.2 |

### 変更

| ファイル | 変更 |
| --- | --- |
| `package.json` | `serwist` / `@serwist/build` / `sharp` の追加、`build` / `build:sw` / `icons` スクリプト |
| `vite.config.ts` | `lint.ignorePatterns` に `sw/**` |
| `.gitignore` | `.pwa/` |
| `src/routes/__root.tsx` | head の links / meta（§7）、`ServiceWorkerRegistrar` / `DayRolloverGuard`、`Notifications` の `marginTop` |
| `src/lib/theme.ts` | 色の一次値を `PAPER_TOKENS` から取る（§9.3） |
| `src/lib/run-mutation.ts` | 5秒未保存警告（§9.2） |
| `src/styles.css` | モバイル入力の 16px 底上げ（§12.1） |
| `src/components/app-shell.tsx` | `MobileTabs` 削除、`BottomIndexTabs` 追加、両 nav に `aria-label`、`OfflineBanner` 挿入、外枠に `classes.shellBody` |
| `src/components/app-shell.module.css` | `.bottomBar` / `.bottomTab` / `.bottomTabActive` / `.shellBody`（§10.4） |
| `src/features/board/components/board-kanban.tsx` | 列を CSS モジュール化、カードに Menu、`onStatusMove(move, row, setConfirmRow)` 経由に集約（`onConfirm` の直接呼び出しを残さない） |
| `src/features/board/hooks/use-board-kanban-actions.ts` | `onStatusMove` 追加。`confirm` 分岐は #51 の手順（`stopTimer` → `timerMinutes` で `prefillMinutes` → モーダル）をそのまま持つ（§11.3） |
| `src/features/board/lib/kanban-order.ts` | `shiftRowWithinColumn` / `kanbanMoveMenuItems`（§15） |
| `src/features/board/lib/kanban-order.test.ts` | 上記のテスト |
| `src/features/board/lib/board-schedule-events.ts` | `defaultScheduleSlot`（§15） |
| `src/features/board/components/board-schedule.tsx` | `isCompact` でドラッグ無効化 + 「+ 予定を追加」（§11.4） |
| `.claude/rules/web/design-live-board.md` | 規則1のモバイル記述を改訂（§10.5） |
| `CONTEXT.md` | §20.1 |
| `docs/spec.md` | §20.3 |
| `docs/adr/0013-pwa-without-offline-writes.md` | §20.2（新規 ADR。**0012 は #56（通知）が予約済み** — §20.2 の注記を読むこと） |

---

## 17. テスト計画

`sw/service-worker.ts` と `scripts/*` は**テストしない**。SW ランタイムのモックは実物と乖離し、価値より維持費が高い（spec.md「テストしないもの」の方針に沿う）。代わりに §21.2 の受け入れ条件で実機/実ビルド確認する。

| 対象 | プロジェクト | 内容 |
| --- | --- | --- |
| `shiftRowWithinColumn` | frontend（unit） | 列の先頭で `-1` → `null`。末尾で `+1` → `null`。中間で入れ替わる。他列の順序が保たれる |
| `kanbanMoveMenuItems` | frontend（unit） | `未着手` → 進行中/確定/スキップ の3件。`確定` → 進行中(reopen)/未着手(unconfirm)/スキップ の3件。`スキップ` → 未着手(unskip)/確定/進行中 で `"noop"` が落ちること |
| `defaultScheduleSlot` | frontend（unit） | 今日 + 09:12 → 09:30〜10:30。過去日 → 09:00〜10:00。23:50 のとき翌日にまたがらないこと |
| `PAPER_TOKENS` | frontend（unit） | `orangeAccent === theme.colors.orange[5]`、`desk === manifest の theme_color / background_color` |
| `AppShell`（新規テスト） | frontend | `getByRole("navigation", { name: /下小口/ })` の中に 日/ボード/履歴/目標 の4リンクがあり 項目 は無い。「その他」を押すと `getByRole("menuitem", { hidden: true, name: "項目" })` が出る。現在ページに `aria-current="page"` |
| `BoardKanbanCardMenu` | frontend | `未着手` の行で「完了にする」を押すと `onStatusMove("confirm", row, ...)` が呼ばれる。`content` が空 or `minutes === 0` の行では確定モーダルが開く（`needsKanbanConfirmEditor` が true のケース）。「上へ」が先頭行では出ない |
| メニュー経由の確定（計測あり） | frontend | **計測がある行はメニュー経由でも `stopTimer` が先に呼ばれ、モーダルが計測値でプレフィルされる。** `hasTimerState(row.timer) === true` の行で「完了にする」を押すと、(1) `onStopTimer` が `{ rowId }` で呼ばれ、(2) その解決後に確定モーダルが開き、(3) 分数の初期値が `timerMinutes(戻り値)`（`row.minutes` ではない）、(4) `rows.confirm` は `row.minutes` では呼ばれない。#51 が塞いだ「目安分数のまま確定して計測を捨てる」バグの回帰テスト（ドラッグ経路側は study-timer.md §17 が持つ） |
| メニュー経由の確定（計測なし） | frontend | `hasTimerState(row.timer) === false` かつ `content`/`minutes` が埋まっている行では `onStopTimer` が呼ばれず、モーダルも開かず、`onConfirm({ content, minutes: row.minutes, rowId })` が直接呼ばれる |
| `OfflineBanner` | frontend | `useNetwork` を `{ online: false }` にモックしてメッセージが出る。`true` で何も描かない |
| `runMutation` | frontend | `vi.useFakeTimers()` で 5秒進めると警告通知が出る。解決後に `notifications.hide` が呼ばれる。4.9秒で解決したら出ない |
| `InstallAppSection` | frontend | `matchMedia("(display-mode: standalone)")` を true にモックすると「起動中」バッジ。`beforeinstallprompt` を発火させると「ホーム画面に追加」ボタンが出て、押すと `prompt()` が呼ばれる |

- `Menu` は Floating UI なので `getByRole(..., { hidden: true })` を使う（[testing.md](../../.claude/rules/common/testing.md)）。
- レンダリングは `renderWithMantine`。`data-testid` は使わない。
- `convex-test` の追加は無い（§13.1）。
- `vite.config.ts` の `coverage.include` は明示的な allowlist なので、新規ファイルは自動では計上されない。`src/features/board/lib/kanban-order.ts` と `src/lib/run-mutation.ts` を足すかは実装者判断（閾値80%を割らないこと）。

---

## 18. 端ケース一覧

| # | 状況 | 決定 |
| --- | --- | --- |
| E1 | デプロイ直後、開いているタブが古いチャンクを要求する | `StaleWhileRevalidate` のキャッシュに残っているので即死しない。加えて更新通知が出る（§8.2） |
| E2 | 更新通知を無視したまま使い続ける | 待機中の SW はそのまま。次にアプリを完全に閉じて開くと新版が有効になる（`skipWaiting: false` の通常挙動） |
| E3 | オフラインで記録を確定 → そのままアプリを閉じる | 失われる。5秒警告が「アプリを閉じると失われます」と明言する（§9.2）。それ以上は保証しない（ADR-0013） |
| E4 | オフラインで確定 → 30秒後に復帰 | Convex がキューを送る。楽観更新の表示はそのまま確定に落ち着く。警告通知は解決時に消える |
| E5 | 圏外でアプリを起動 | `offline.html` が出る。`online` イベントで `/` へ自動遷移（§9.3） |
| E6 | `navigator.onLine` が true だが到達不能（キャプティブポータル等） | バナーは出ない。E3/E4 と同じ5秒警告だけが働く。これが `onLine` を送信判断に使わない理由 |
| E7 | standalone で Notion OAuth ログイン | Notion のドメインは `scope` 外なので iOS はシステムブラウザに投げる可能性がある。**standalone 検出時はログイン画面でパスキー/パスワードを先に置き、Notion ボタンに「ブラウザで開きます」の注記を出す**。`login-screen.tsx` の並び替えのみで、認証フローは変えない |
| E8 | standalone でパスキー | WebAuthn の RP ID は同一オリジンなので問題なし。変更不要 |
| E9 | ホーム画面追加せず iOS Safari で1週間放置 | ITP で `localStorage` が消え再ログインになる（現状のまま）。マイページの案内でホーム画面追加を促す（§8.3）以上のことはしない |
| E10 | Android で横スワイプしたら「戻る」が発火する | `overscroll-behavior-x: contain`（§11.1）で封じる |
| E11 | モバイルでカンバン列をスワイプ中に長押しドラッグが誤発火 | 掴み手が `< md` で `display: none` なので発火しない（§11.2） |
| E12 | `< md` でも外付けキーボード/マウスの端末（iPad + Magic Keyboard 等） | `md` 以上ならドラッグが出る。それ未満では Menu だけ。Menu はキーボード操作可能なので詰まない |
| E13 | 下小口バーが Modal/Drawer に被る | `z-index: 200`。Mantine の Modal は既定 200 で後勝ちなので Modal が上に来る。Drawer も同様 |
| E14 | JST 日付が変わった後にアプリへ復帰 | §12.4 で `router.invalidate()` + クエリ無効化 |
| E15 | 通知権限を拒否された状態でホーム画面追加 | 本仕様は権限を要求しない。#56 の範囲 |
| E16 | `localStorage` が使えない環境（プライベートブラウズ等） | 本仕様は `localStorage` を新規に使わない。既存の `safe-storage.ts` の挙動は変わらない |
| E17 | SW の precache が失敗（容量不足など） | Serwist の install が失敗し SW は有効にならない。アプリは SW 無しで従来どおり動く。フォールバック UI は要らない |
| E18 | `offline.html` が古い版のまま残っている | 内容がほぼ静的（文言とトークン）なので実害なし。precache のリビジョンで更新される |
| E19 | 「その他」Menu を開いたまま画面遷移 | `Menu.Item component={Link}` なので Mantine が閉じる。追加処理不要 |
| E20 | スケジュールの「+ 予定を追加」を記録0件の日に押す | ボタン自体を出さない（`rows.length > 0` 条件。§11.4） |

---

## 19. 検討した代替案（自己グリル）

### 19-1. 「PWA は Web Push（#56）の前提なのだから、通知と一体で決めないと手戻りになる」

**回答。** SW の**生成経路**（§4）と**登録位置**（§8）は通知と独立している。#56 が触るのは `sw/service-worker.ts` にリスナーを2〜3個足すことと、`pushSubscriptions` 表を作ることだけ。むしろ土台を先に決めたほうが #56 は SW の存在を前提にできる。`PushSubscription` は `ServiceWorkerRegistration` に紐づくので、SW スクリプトの入れ替え（§8.2）で購読が失われることもない。
**譲る点。** 権限要求 UI の**置き場所**は重複する。だから本仕様はマイページに「アプリとして使う」セクションを**作るところまで**を決め、通知トグルはそのセクションに #56 が足す、と境界を明示した（§8.3 / §22.1）。

### 19-2. 「オフラインでデータを見せないなら PWA の価値は薄い。やるだけ無駄」

**回答。** §3.2 の4点、特に iOS の ITP 7日削除からの除外が実利として大きい。認証トークンが `localStorage` にあることは既に文書化された tradeoff であり、ホーム画面追加はその副作用を消す唯一の手段である。
**譲る点。** 「オフラインで記録できる」という期待を UI で作らないことが条件。だから §9 の3点（バナー・5秒警告・貼り紙の明記）は**任意ではなく必須**とした。

### 19-3. 「Convex のクエリ結果を IndexedDB にミラーすれば読み取りオフラインは作れる。やらないのは怠慢」

**回答。** 3つ理由がある。(a) 正本が二重化する — CONTEXT は「正式な記録は本アプリにある」と言っており、別時点のスナップショットを画面に出すと「本アプリの記録」がどれか曖昧になる。(b) 読めても書けないので、得られるのは「昨日何をやったか眺める」だけ。オフラインで開く動機（枕元で今日を閉じる）を満たさない。(c) DTO は Convex validator 由来の SSoT（CVX-16）で、ミラーはその複製になる。
**譲る点。** 将来やるなら条件付きで可能。TanStack Query の `persistQueryClient` を **`days.get` の今日1本だけ**に限定し、画面に「オフライン時点の写し」ラベルを常時出し、その画面では全ての書き込み UI を無効化する。別チケットとして §22.4 に残す。

### 19-4. 「HTML をキャッシュしないなら、オフライン起動でアプリの殻すら出ない。app-shell と言いながら shell が無い」

**最も強い反論。** 事実として正しい。SSR HTML には認証状態と所有者のデータが埋まるので、マルチユーザー（`ownerId` 分離）のこのアプリでは**キャッシュした HTML を出すこと自体が事故**である（別時点の他人の日が出る）。`offline.html` が shell の代わりを務める。
**譲る点。** したがって「app-shell 型 PWA」という呼称は正確でない。**「静的資産キャッシュ + オフライン貼り紙」**に呼び名を統一した（§0-1）。この名前で呼ぶ限り、実装者が「shell を precache し忘れている」と誤解することもない。

### 19-5. 「`vite-plugin-pwa` が直っていないだけで自作スクリプトを抱えるのはコスト。upstream 待ちが正解」

**回答。** 本番ビルド非互換は upstream 未解決（TanStack/router#4988）で、期限（本番日）は待ってくれない。`scripts/build-sw.ts` は §4.4 のとおり実質3ステップ・60行程度で、Vite の内部を触らない。upstream が直ったら差し替えればよく、**SW ソース（§5）はそのまま使える**（Serwist はプラグインに依存しない）。
**譲る点。** dev に SW が無いので「dev で SW の挙動を確認できない」。確認は `vp build && vp preview` に依存する（§21.2 の受け入れ条件に明記）。

### 19-6. 「ボトムナビは『右小口インデックスタブ』という Paper Redesign の identity を壊す」

**回答。** デスクトップは無変更。モバイルは**今も右小口ではない**（上部の横並び `Button` 列 = すでに identity を捨てている）。同じ紙タブの質感を下端に置く（`border-bottom: none`、上側だけ不揃いな角丸、交互の微回転）ほうが identity は保たれる。
**譲る点。** `docs/design/Paper Redesign.dc.html` にモバイル下部ナビは描かれていない。design-live-board.md は「規則とデザインファイルが食い違えばデザインファイルが勝つ」と定めているので、**これは規則の改訂であってデザインファイルの解釈ではない**。§10.5 に改訂文を書き、§22.3 の人間の再確認ポイントに上げた。

### 19-7. 「7本を 4 + その他に割るのは恣意的。ゴミ箱まで3タップかかる」

**回答。** 日常ループ（日 / ボード / 履歴 / 目標）と設定・復旧（項目 / プリセット / ゴミ箱）の線は CONTEXT の語彙定義から引ける。ゴミ箱は「消しミスを取り消せる」ための場所で、頻度は低い。
**譲る点。** 「その他」に何本入るかは所有者の使い方次第で、実際に使ってみて 項目 の頻度が高ければ 履歴 と入れ替えればよい。`MOBILE_PRIMARY` は `app-shell.tsx` の1行の配列なので、入れ替えコストはほぼゼロにしてある（§10.3）。

### 19-8. 「メニュー移動はドラッグより遅い。カンバンの本質はドラッグだ」

**回答。** モバイルでは「5列縦積み + 長押しドラッグ + ページスクロール」が三重に衝突していて、そもそも成立していない（列をまたぐには数百px スクロールしながらドラッグする必要がある）。速いドラッグが存在しないので、遅いメニューと比べる相手がいない。
**譲る点。** 横スナップにした結果、**モバイルでは列間ドラッグを明確に捨てる**ことになる（掴み手を `< md` で隠す）。これは妥協ではなく決定として §11.2 に書き、CONTEXT 実行ボードの _Avoid_ にも「モバイルでドラッグを必須にすること」を足す（§20.1）。

### 19-9. 「`navigator.onLine` は嘘をつく。それを前提にした設計は壊れる」

**回答（設計を修正した）。** 正しい。当初案では `runMutation` を offline で早期 return させる予定だったが、(a) `onLine` は LAN 接続だけ見て到達性を見ない、(b) Convex は短時間の切断を自動で吸収するので早期 return は常用ケースを壊す — の2点で撤回した。最終案は **`onLine` をバナー表示のみに使い、送信判断には「5秒未解決」という観測可能な事実だけを使う**（§9.2）。文言も「オフラインです」と断定せず「まだ保存されていません」にした。

### 19-10. 「アイコン PNG をコミットするのは生成物をコミットするのと同じで気持ち悪い」

**回答。** アイコンは art asset であって、ソースから決定的に導かれるビルド成果物とは性質が違う（絵を変える判断は人間がする）。毎ビルド `sharp`（native binary）を走らせると CI とローカルの環境差が増え、dev では `/icons/*.png` が404になる。`vp run icons` の手動再生成 + コミットが最小のコストである（§6.3）。

### 19-11. 「iOS のスプラッシュを1機種分だけ作るのは他機種で崩れる」

**回答。** `apple-touch-startup-image` は media query が完全一致したときだけ使われる。一致しない機種は「画像なし」= 現状と同じ挙動に落ちるだけで、引き伸ばしや崩れは起きない。1枚も置かないより悪くなることがないので、安全な追加である（§6.4）。

### 19-12. 「`skipWaiting: false` にすると、更新を無視した端末が古い版を使い続けて Web Push が動かない」

**回答。** `PushSubscription` は SW スクリプトのバージョンではなく `ServiceWorkerRegistration` に紐づくので、古い SW でも `push` イベントは届く。#56 がリスナーを足した版が有効になるまでのラグはあるが、それは更新通知（§8.2）とアプリの再起動で解ける。逆に `skipWaiting: true` は E1（実行中タブのチャンク不整合）を招くので、そちらのリスクが大きい。

---

## 20. CONTEXT.md / ADR / spec.md への影響

### 20.1 CONTEXT.md

2語追加する。

```md
**ホーム画面アプリ**:
ホーム画面に追加して、ブラウザの枠なしで起動する形。ログインの保持が長くなり、通知の前提にもなる。
オフラインでは記録できない — 圏外ではオフライン貼り紙が出るだけで、記録も履歴も出ない。
_Avoid_: オフラインで記録できると読める案内, 8番目のナビタブ, 自動で出るインストール催促,
オフライン時点の写しを記録として見せること

**オフライン貼り紙**:
圏外でアプリを開いたときに出る、紙1枚だけの画面。オフラインでは記録できないことを書き、
電波が戻ると自動で元の画面へ戻る。データは出さない。
_Avoid_: 前回のデータを載せること, 再ログインを要求すること, これを日の代わりにすること
```

既存2語の _Avoid_ に1項ずつ足す。

```md
**実行ボード**:
_Avoid_: …（既存）…, モバイルでドラッグを必須にすること

**記録**:
_Avoid_: …（既存）…, オフラインで保存できたように見せること
```

**既存の不整合を1つ見つけた（本仕様では直さない）。** CONTEXT「実行ボード」の _Avoid_ に「ドラッグで確定すること」があるが、CONTEXT「記録」は「カンバンではドラッグで即反映する」と言い、ADR-0011 と実装（`board-kanban.tsx`）はドラッグで確定している。**「ドラッグだけを唯一の操作にすること」への書き換えが妥当**だが、これは §22.3 の人間の再確認ポイントに上げる。

### 20.2 新規 ADR: `docs/adr/0013-pwa-without-offline-writes.md`

**番号は 0013 で固定する（0012 ではない）。** リポジトリの既存 ADR は `0011-board-day-navigation-and-skip-confirm.md` までで、次の空き番号は 0012 と 0013 の2つある。`docs/specs/notifications.md` §16 が「ADR-0012 の新設（題: 通知はアプリ内通知欄を正とし…）」を提案しており、実装順は通知(#56) → PWA(#58) なので、**0012 は #56 が取る**。本仕様が 0012 を名乗ると同じ番号のファイルが2本できる（または後着が先着を上書きする）。#56 側の実装者は notifications.md §16 に「0012 を予約」と明記した上で `docs/adr/0012-*.md` を作り、本チケットは 0013 だけを作る。実装時に `docs/adr/` を `ls` して 0012 が既に埋まっていることを確認すること。0012 が空のままだった（#56 が先に落ちていない）場合でも、**番号を繰り上げず 0013 のままにする** — 番号は連番の美しさより衝突しないことが大事で、#56 が後から 0012 を埋められる。

```md
# PWA はオフライン書き込みを持たない

ホーム画面追加と Service Worker を導入するが、オフラインで提供するのは静的資産（script / style / フォント /
アイコン）のキャッシュとオフライン貼り紙だけとする。SSR された HTML と Convex のデータはキャッシュせず、
オフラインでの書き込みも読み取りも保証しない。書き込みは止めず、5秒解決しなければ「まだ保存されていません」
と警告する。

**Considered Options:** Convex のクエリ結果を IndexedDB にミラーして読み取りオフラインを作る案、
SSR HTML をキャッシュして app-shell 型にする案、オフライン時に書き込み UI を無効化する案、
静的資産だけをキャッシュする案（採用）。

**Consequences:** 圏外ではアプリとして何もできない。得るのは iOS ITP の7日削除からの除外、
ホーム画面起動、Web Push の前提、電波が細い場所での即描画。オフラインで確定した記録は、
復帰前にアプリを閉じると失われる。この損失は UI で明示する。
```

### 20.3 `docs/spec.md`

**Out of Scope** の「ResourcesDayView、オフライン対応」を次に置き換える。

```md
- ResourcesDayView、オフラインでの記録の書き込み・読み取りキャッシュ（PWA 化そのもの — ホーム画面追加・
  静的資産キャッシュ・オフライン貼り紙 — は対象。docs/specs/pwa-mobile.md）
```

### 20.4 `.claude/rules/web/design-live-board.md`

規則1のモバイル記述を §10.5 の文に置き換える。「実装者向けの注記」に1行足す。

```md
- モバイル（`< sm`）のナビは画面下端に固定した下小口タブ4本 + 「その他」メニュー。上部の横スクロール
  タブ列は廃止した（`docs/specs/pwa-mobile.md` §10）。デスクトップの右小口レールは無変更。
```

---

## 21. 実装順序と受け入れ条件

### 21.1 順序（各段で `vp check` と `vp test` を通す）

1. **トークンの SSoT 化**: `src/lib/paper-tokens.ts` + テスト、`theme.ts` の差し替え。（他の全段の前提。単独でマージ可能）
2. **マニフェストとアイコン**: `scripts/build-icons.ts`、`public/icons/*`、`public/manifest.webmanifest`、`__root.tsx` の head。（SW 無しでも「ホーム画面追加」は動く。ここで iOS 実機確認 → §22.2）
3. **SW のビルド経路**: `sw/`、`scripts/build-sw.ts`、`scripts/render-offline-html.ts`、`package.json`、`.gitignore`、`vite.config.ts`。
4. **登録と更新 UI**: `register-service-worker.ts`、`ServiceWorkerRegistrar`。
5. **オフライン UI**: `OfflineBanner`、`run-mutation.ts` の5秒警告。
6. **モバイルナビ**: `app-shell.tsx` / `.module.css`、`app-shell.test.tsx`。設計規則の改訂。
7. **モバイル共通の詰め**: `styles.css` の16px、safe-area、`DayRolloverGuard`。
8. **カンバンのドラッグ代替**: `kanban-order.ts` の純関数 → `onStatusMove` → `board-kanban-card-menu.tsx` → `board-kanban.module.css`。
9. **スケジュールのモバイル**: `isCompact`、「+ 予定を追加」、`defaultScheduleSlot`。
10. **マイページ**: `use-install-prompt.ts`、`InstallAppSection`、`login-screen.tsx` の並び（E7）。
11. **文書**: CONTEXT.md、ADR-0013、spec.md。

### 21.2 受け入れ条件

- `vp check` / `vp test` / `vp build` が通る。`vp run fallow` に新規の未使用が出ない。
- `vp build && vp preview` で:
  - `GET /sw.js` が 200 で返り、`GET /manifest.webmanifest` が 200。
  - DevTools > Application > Service Workers に登録が出る。Manifest にアイコン5点とショートカット3点が出て警告0。
  - DevTools を offline にして**リロード** → `offline.html` が出る。online に戻すと自動で `/` に戻る。
  - DevTools を offline にして**記録を確定** → 5秒後に「まだ保存されていません」が出る。online に戻すと消え、記録が確定する。
  - Network タブで `/api/**` と `*.convex.cloud` が SW を経由していない（`Size` 列が `(ServiceWorker)` にならない）。
- Lighthouse の Installable が pass（PWA カテゴリが廃止されている場合は Chrome の「アプリをインストール」が出ることで代替）。
- 幅 375px で:
  - 下小口タブ4本 + 「その他」が親指の届く位置に出て、本文がバーに隠れない。
  - カンバンが横スナップで1画面1列。スワイプで「戻る」が発火しない。掴み手が見えない。
  - カードの `⋮` から 進行中 / 完了 / 未着手 / 見送り / 上へ / 下へ が操作できる。「完了にする」で確定モーダルが開く行と開かない行の両方を確認。**計測中の行では、モーダルの分数が目安分数ではなく計測値（`stopTimer` の戻り値）で開くことを実機で確認する**（ドラッグ経路と同じ数字になること）。
  - 入力にフォーカスしても iOS がズームしない（実機 or Responsive での font-size 確認）。
- 幅 1280px で右小口レール・5列カンバン・ドラッグが**現状のまま**であること。

---

## 22. 次チケットへの引き渡し

### 22.1 #56（通知）との境界

| #58（本仕様）が決めたこと | #56 が決めること |
| --- | --- |
| `sw/service-worker.ts` が存在し、`serwist.addEventListeners()` の前に自前リスナーを足す作法 | `push` / `notificationclick` / `pushsubscriptionchange` の中身 |
| SW の登録・スコープ（`/`）・更新フロー | 権限要求のタイミングと文言 |
| マイページの「アプリとして使う」セクションの存在 | そのセクションに置く通知トグルと、購読の作成・削除 |
| バックエンド変更なし | `pushSubscriptions` 表（validator + index）と、`internalMutation` からの送信（CVX-05） |
| iOS はホーム画面追加が Web Push の前提であること | iOS 未インストール時のフォールバック（in-app 通知欄 / Slack / Resend） |
| ADR 番号は **0013**（`0013-pwa-without-offline-writes.md`）を取る。#56 の 0012 とは衝突しない（§20.2） | ADR **0012**（notifications.md §16 の「通知はアプリ内通知欄を正とし…」）。notifications.md §16 に「0012 を予約」と明記して先に作る |

### 22.2 実機確認が必要な事項（設計判断ではなく事実確認）

1. iOS のホーム画面アプリで `apple-touch-startup-image` が無いとき、起動画面は `background_color` になるか白になるか。白なら §6.4 の2枚を所有者の実機サイズで生成する。
2. iOS のホーム画面アプリで Notion OAuth が同一 web app 内に戻るか、Safari に逃げるか（E7 の注記の強さを決める）。
3. `type: "module"` の SW が所有者の iOS バージョンで登録できるか。できなければ `scripts/build-sw.ts` の `formats` を `["iife"]`（`build.lib.name` 必須）に変え、`register` の `type` を落とす。
4. `.output/public` が実際の出力ディレクトリであること（`vp build` 後に `ls .output/public` で確認）。違えば `scripts/build-sw.ts` の `OUT` を実測値に直す。

### 22.3 人間の再確認ポイント

- design-live-board.md 規則1の改訂（右小口 → モバイルは下小口）。デザインファイルに描かれていない変更である。
- モバイル一次ナビの4本（日 / ボード / 履歴 / 目標）と「その他」の3本（項目 / プリセット / ゴミ箱）の割り方。
- CONTEXT「実行ボード」の _Avoid_「ドラッグで確定すること」の書き換え（ADR-0011 と実装との既存不整合）。
- モバイルでカンバンの列間ドラッグを捨てる決定。
- オフラインで読み取りを一切出さない決定（ADR-0013）。
- **ADR 番号の割り当て**: 0012 を #56（通知）、0013 を #58（本仕様）に固定した。`docs/specs/notifications.md` §16 には「0012 を予約」という明記が**まだ無い**（本仕様は他仕様を書き換えないため）。#56 の実装時に notifications.md 側へその1行を足すか、あるいは逆の割り当てにするかを人間が確認すること。
- アイコン PNG をコミットする運用。

### 22.4 別チケット候補（本仕様では却下したもの）

- **オフライン読み取りの限定導入**: `persistQueryClient` で `days.get` の今日1本のみ、「オフライン時点の写し」ラベル必須、その画面では書き込み UI を全無効化（§19-3 の譲歩条件）。
- **バックグラウンド同期**: `Background Sync API` によるオフライン書き込みの再送。Convex の mutation を SW から呼ぶ経路が無いので、実質「自前の書き込みキュー」を作る話になる。ADR-0013 を覆す規模。
