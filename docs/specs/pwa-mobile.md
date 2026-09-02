# PWA・モバイル最適化設計（#58）

- 状態: 決定済み（2026-08-24 改訂）。実装は別セッション。この文書に書いていない判断は実装セッションで発生しない。
- 対象: ホーム画面追加（マニフェスト・アイコン・スプラッシュ）、Service Worker の生成経路とキャッシュ範囲、オフラインで何を出して何を出さないか、実行ボードのモバイル操作性（ドラッグ代替）、右小口インデックスタブのモバイル挙動の見直し。
- 兄弟仕様: [goal-hierarchy-layout.md](goal-hierarchy-layout.md)（#48）/ [checkpoint-parent-backfill.md](checkpoint-parent-backfill.md)（#49）/ [study-timer.md](study-timer.md)（#51）/ [goal-record-linking.md](goal-record-linking.md)（#52）/ [monthly-review.md](monthly-review.md)（#54）/ [notifications.md](notifications.md)（#56）。
- 前提となる調査: #57（PWA）。ブランチ `research/pwa-support` は本セッション時点でリモートに存在しない（`git ls-remote --heads origin` に無い）ため、**マップ #47 の "Decisions already locked" に転記済みの #57 結論**を一次情報として扱う（全文相当は §2.3）。原文が復活した場合に突き合わせるのは §2.3 の**事実記述**だけで、§3〜§12 の判断は原文の細部が増えても変わらない構造（Convex にオフライン同期が無い / `vite-plugin-pwa` が本番ビルド非互換 / iOS はホーム画面追加が ITP 除外と Web Push の前提）に依っている。
- 守る規約: [convex-rules.md](../../.claude/rules/convex-rules.md)（CVX-01〜20。ただし本仕様はバックエンド変更を持たない — §13）、[design-live-board.md](../../.claude/rules/web/design-live-board.md)（Paper Redesign・ライト固定・ハードコード hex 禁止）、[mantine-tailwind.md](../../.claude/rules/web/mantine-tailwind.md)、[react-conventions.md](../../.claude/rules/typescript/react-conventions.md)、[testing.md](../../.claude/rules/common/testing.md)、[development-workflow.md](../../.claude/rules/common/development-workflow.md)（`vp` 以外のパッケージマネージャ禁止）。
- 担当範囲: **PWA の土台とモバイル操作性**。Web Push 一式（購読表・配信 action・SW の `push` 系リスナー・権限要求 UI）は **#58 完了後の後続チケット**が所有する（#56 でも #58 でもない。§22.1 が唯一の割り当て表で、[notifications.md](notifications.md) §18.1 と同一内容）。

---

## 0. 決定サマリ

1. **オフラインは「殻」だけ。データは1バイトも出さない。** Convex は公式にオフライン同期を提供しない（#57）。SW は**静的資産（script / style / フォント / アイコン）だけ**をキャッシュし、**SSR された HTML と Convex のデータは絶対にキャッシュしない**。圏外での起動は `offline.html`（precache 済みの紙1枚）を出す。呼称も「app-shell 型 PWA」ではなく **「静的資産キャッシュ + オフライン貼り紙」**に統一する（§3、§19-4）。
2. **`vite-plugin-pwa` は使わない。Serwist + ビルド後段スクリプト。** TanStack Start 本番ビルド非互換（upstream 未解決）を Vite プラグインで回避すると Nitro の出力配線に踏み込む。代わりに `vp build` の**後**に `node scripts/build-sw.ts` を走らせ、`.output/public` を**実測**して precache manifest を作り、同じディレクトリへ `sw.js` を書く。Vite プラグインは1つも足さない（§4）。
3. **書き込みは止めない。5秒未解決なら警告する。** Convex クライアントは短時間の切断中の mutation をキューして再接続時に送る。ここを潰すと「地下鉄で10秒切れる」常用ケースが悪化する。`runMutation` に「5秒経っても未解決なら『まだ保存されていません』の永続通知」を足すだけにする。`navigator.onLine` はバナー表示のみに使い、送信判断には使わない（嘘をつくため。§9.2、§19-9）。
4. **SW の更新は自動で奪わない。** `skipWaiting: false` / `clientsClaim: false`。新版を検知したら Mantine の通知に「更新する」ボタンを出し、押されたら `SKIP_WAITING` を postMessage → `controllerchange` → `location.reload()`（§8.2）。
5. **モバイルナビは上部の横スクロール列を捨て、画面下端の下小口タブにする。** standalone 起動ではブラウザ枠が無く、画面最上部はノッチ側で親指から最も遠い。**日 / ボード / 履歴 / 目標** の4本 + 「その他」Menu（項目 / プリセット / ゴミ箱）を下端固定にする。デスクトップの右小口レールは**無変更**（§10）。
6. **実行ボードのモバイルはドラッグを捨て、カード上の Menu で動かす。** 「5列縦積み + 長押しドラッグ + ページスクロール」は三重に衝突していて成立していない。列は**横スナップスクロール**（1画面1列）にし、各カードの `⋮` Menu から「移動」（状態遷移）と「上へ / 下へ」（並べ替え）を出す。**確定はドラッグ経路と1本に統合し、#51 が決めた「計測があれば `stopTimer` → その値でそのまま確定」／「計測なし・分数0だけ確定エディタ」の順を必ず通す**（§11）。
7. **スケジュールタブは「ドラッグを切るだけ」。作成用の新 UI は作らない。** コード確認の結果、`onTimeSlotClick` と `onDayClick`（月/年ビューは `onAdd`）で**タップからの作成経路が既に存在する**（`board-schedule.tsx` L117-141 / L196-202）。したがってモバイルでは `withEventsDragAndDrop` と `withDragSlotSelect` を落とすだけでよく、新しい純関数もボタンも要らない（§11.4。これは前版の設計から**削った**部分。§19-13）。
8. **スプラッシュは所有者の実機1機種分だけ生成する。** iOS は Manifest 標準ではなく Apple 独自の `apple-touch-startup-image`。media query が一致しない機種は「画像なし」に落ちるだけで崩れないので、iPhone 1サイズ（縦・横）だけ用意する（§6.4、§19-11）。
9. **Convex のスキーマ・関数は一切変えない。** PWA はクライアント側の話。`pushSubscriptions` 表も `deliverWebPush` も **#58 完了後の後続チケット**の所有物で、ここでも #56 でも作らない（§13、§22.1）。

---

## 1. 本仕様の範囲

| 含む | 含まない |
| --- | --- |
| `manifest.webmanifest` / アイコン / iOS メタ / スプラッシュ | 通知の購読・配信・権限 UI（#56 と、その後続チケット） |
| Service Worker のソース・生成経路・キャッシュ戦略・更新フロー | Convex のオフライン書き込みキュー自作 |
| オフライン時の UI（バナー・未保存警告・`offline.html`） | オフライン読み取りキャッシュ（§19-3 で却下） |
| SW に「`serwist.addEventListeners()` の前へ自前リスナーを足す」作法を用意すること | SW の `push` / `notificationclick` / `pushsubscriptionchange` リスナー本体（**#58 完了後の後続チケット**。§22.1） |
| マイページの「アプリとして使う」セクションの新設 | そのセクションに置く通知トグル（#56） |
| モバイルナビ（下小口タブ）への差し替え | デスクトップの右小口レールの見た目変更 |
| 実行ボード カンバンのドラッグ代替・横スナップ列 | カンバンの列定義・状態機械そのもの（不変） |
| 実行ボード スケジュールタブのモバイルでのドラッグ無効化 | `@mantine/schedule` のモバイル向け作り替え、新しい作成 UI（§0-7） |
| 入力ズーム抑止 / safe-area / タップ領域 / 日付ロールオーバー | オンボーディングツアーのモバイル調整 |

---

## 2. 現状（コードから確認した事実）

### 2.1 PWA 資産は何も無い

| 事実 | 場所 |
| --- | --- |
| `public/` には `favicon.svg` の1枚だけ。manifest・アイコン PNG・SW は無い | `public/` |
| `favicon.svg` の絵は「紙（角丸の矩形 + 罫線1本）の上に石を3つ積んだ cairn」。石はグレー2つ + オレンジ1つで、頂点に紙色の小円 | `public/favicon.svg` |
| `head()` の `meta` は `charSet` / `viewport`（`width=device-width, initial-scale=1`）/ `title` の3つだけ。`theme-color`・apple 系メタ・`rel="manifest"` は無い | `src/routes/__root.tsx` L57-73 |
| Vite プラグインは tailwind / tanstackStart / react / nitro / babel の5つ。PWA 系は無い | `vite.config.ts` L194-207 |
| クライアント専用エントリファイルは無い（TanStack Start の既定に任せている）。したがって SW 登録は `__root.tsx` 配下のコンポーネントから行うしかない | `src/router.tsx` / `src/routes/__root.tsx` |
| 起動は今日の日（`/`）。CONTEXT「履歴」の「アプリの起動は今日の日」と一致 → `start_url: "/"` で整合する | `src/routes/index.tsx` |
| 色の一次値（`INK` / `PAPER` / `PAPER_2` / `RULE` / `MUTED` / `MUTED_2`、`--cairn-desk`）は `theme.ts` のローカル定数。**`SKETCH_RADIUS` / `PILL_RADIUS` / `PAPER_SHADOW` は未 export**（design-live-board.md 規則5 の「2つ目の利用者が出るまで export しない」に従っている） | `src/lib/theme.ts` |

### 2.2 モバイルの現状

| 事実 | 場所 |
| --- | --- |
| 右小口インデックスタブ（`IndexTabs`）は `visibleFrom="sm"`。`writing-mode: vertical-rl` + 交互回転（`±0.6deg`）+ 左辺なしのスケッチ枠 + 紙影 | `src/components/app-shell.tsx` L77-102 / `app-shell.module.css` |
| モバイルは `MobileTabs` = `ScrollArea hiddenFrom="sm"` の中に7本の `Button size="compact-sm"`。紙シートの**外側・上**に置かれている | `app-shell.tsx` L104-123 |
| ページ外枠は `Box maw={1180} px={{base:"sm",sm:"xl"}} py={{base:"md",sm:"xl"}}`。safe-area の考慮は無い | `app-shell.tsx` L131 |
| `html` / `body` の背景は `--cairn-desk`（机）。中身が `.cairn-paper-sheet`（紙 + 罫線 + 赤い綴じ線） | `src/styles.css` |
| カンバンは `<div className="grid gap-3 md:grid-cols-5">`。列は 未着手 / 進行中 / 確定 / スキップ + チェックポイントの5つ。`< md` では**縦に5段積み** | `board-kanban.tsx` L190 |
| ドラッグは `@hello-pangea/dnd`（`useDnd()` の動的 import）。掴む所は `ActionIcon size="sm"`（≒26px）の `IconGripVertical` のみ | `board-kanban.tsx` L46-57 / `src/hooks/use-dnd.ts` |
| ドラッグ完了時の分岐は純関数に寄っている（`resolveKanbanStatusMove` / `computeOrderedRowIds` / `hasRowOrderChanged`）。`確定` へ落とすとき `needsKanbanConfirmEditor(row)` なら確定モーダルを開く | `board-kanban.tsx` L115-173 / `kanban-order.ts` |
| 状態遷移の実行は `if (statusMove === "confirm") ... else if ...` の連鎖として **`board-kanban.tsx` のコンポーネント内に埋まっている** | `board-kanban.tsx` L145-167 |
| スケジュールタブは**タップ経路が既にある**。編集は `onEventClick` → `ui.handleEventClick`、作成は `onTimeSlotClick` → `ui.openCreate(slotStart, slotEnd)`、月/年ビューは `onDayClick` / `renderDay` の `onAdd` → `openCreate(day 09:00〜10:00)` | `board-schedule.tsx` L117-141 / L179 / L196-202 |
| 既定スロット定数は `DEFAULT_DAY_BLOCK_START = "09:00:00"` / `DEFAULT_DAY_BLOCK_END = "10:00:00"` | `board-schedule-layout.ts` L12-13 |
| 全 mutation は `runMutation`（better-result + Mantine 通知）を1本通る。オフライン分岐は無い | `src/lib/run-mutation.ts` |
| `todayJst()` はレンダー中に呼ばれる。時計では再レンダーしないので、常駐したまま JST 日付が変わると古い「今日」を掴み続ける | `use-board-view.ts` 他 |
| `localStorage` は `safe-storage.ts` 経由で try/catch 済み | `src/lib/safe-storage.ts` |
| `node_modules` は本セッションで未インストール。よって `@mantine/hooks` の個別 hook の**存在確認はできていない**（§9.1 で逃げ道を用意する） | — |

### 2.3 #57 調査の要点（本仕様の前提。再調査しない）

1. `vite-plugin-pwa` は TanStack Start の本番ビルドと非互換（upstream 未解決）。**Serwist + 自作 Vite プラグインでの回避は確認済みだが、Nitro の出力ディレクトリ配線が別途必要**。`vite-plus` 自体は任意の Vite プラグインを許容する。
2. Convex は公式に「完全なオフライン同期は提供していない」と明言。短時間の再接続は自動で吸収されるが、長時間オフラインでの書き込み配送とオフライン読み取りキャッシュの永続化は**保証されない**。
3. iOS Safari は**ホーム画面追加によって ITP の7日間ストレージ削除ポリシーから除外**される（SW 登録・`localStorage` を含む）。スプラッシュは Manifest 標準ではなく Apple 独自の `apple-touch-startup-image`。
4. SW 登録は Web Push の**必要条件**（iOS は 16.4 以降**かつ**ホーム画面追加が前提）。PWA 化は Web Push の必要条件だが十分条件ではない。

---

## 3. オフラインの範囲（決定と根拠）

### 3.1 決定

| 種類 | 扱い | 理由 |
| --- | --- | --- |
| ナビゲーション（HTML ドキュメント） | **`NetworkOnly` + フォールバックで `/offline.html`**。キャッシュしない | SSR HTML に認証状態と所有者のデータが埋まる。マルチユーザー（`ownerId` 分離）なので、別時点・別所有者の HTML を焼き付けるのは事故 |
| 同一オリジンの script / style | `StaleWhileRevalidate`（`cairn-assets`） | ハッシュ付き（= 実質不変）だが、ハッシュ形式に依存した正規表現を書かずに安全側へ倒せる。即描画も得られる |
| Google Fonts の CSS（`fonts.googleapis.com`） | `StaleWhileRevalidate`（`cairn-font-css`） | 手書きフォント（Yomogi）はこのデザインの本体。CSS だけ先に返れば FOUT が短い |
| Google Fonts のフォントファイル（`fonts.gstatic.com`） | `CacheFirst`（1年 / 最大12件） | 内容が URL に固定されている |
| `manifest.webmanifest` / `favicon.svg` / `icons/*.png` / `offline.html` | **precache** | 小さく、決定的で、オフライン起動に必須 |
| `/api/**`（Better Auth プロキシを含む） | **どのルートにも一致させない**（SW は素通し） | 認証応答をキャッシュすると別セッションのトークンを返しうる |
| Convex（WebSocket / `*.convex.cloud`） | 素通し | WebSocket は SW が介入しない。HTTP アクションも横取りしない |
| Convex のクエリ結果 | **キャッシュしない** | §19-3 |

### 3.2 「オフラインでデータが見えない PWA」に意味があるのか

得るものは4つ。どれもオフライン読み取りとは独立している。

1. **iOS の ITP 7日削除からの除外**（#57-3）。認証トークンは `localStorage` にある（[convex-tanstack.md](../../.claude/rules/web/convex-tanstack.md) が明記した tradeoff）。ホーム画面追加をしないと1週間空けるたびに再ログインになる。このアプリは「毎日ではないが続ける」使い方なので、実利としてはここが一番大きい。
2. **ホーム画面から1タップ、ブラウザ枠なしで起動**。「枕元で今日を閉じる」動線が短くなる。
3. **Web Push の必要条件**（iOS は特にホーム画面追加が前提）。土台がここで揃う。
4. **電波が細い場所での即描画**。フォントと JS がローカルに居るので、Convex の初回応答待ちの間も紙の画面が出る。

### 3.3 オフラインで「書けそう」に見せない

これが 3.1 の対価。UI 側で3つ**必ず**やる（§9。任意ではない）。

- オフライン検知中は紙シートの先頭に黄色い `Alert`（「オフラインです。記録の保存はできません。」）。
- 5秒経っても解決しない mutation には「まだ保存されていません。アプリを閉じると失われます。」の永続通知。
- `offline.html` に「オフラインでは記録できません」と明記し、復帰時に自動で元の画面へ戻る。

---

## 4. ビルド経路（Serwist + ビルド後段スクリプト）

### 4.1 なぜ Vite プラグインを作らないか

#57 が確認した回避策（Serwist + 自作 Vite プラグイン）は、**Nitro の出力ディレクトリを推測する**という一番壊れやすい部分を残す。`vp build` が終わった時点で `.output/public` は確定しているので、そこを**実測**して SW を書けば推測が消える。副作用として dev には SW が存在しなくなるが、これは利点である（dev の SW キャッシュは事故の温床）。

### 4.2 パッケージ追加

```bash
vp add serwist            # SW ランタイム
vp add -D @serwist/build  # precache manifest の注入(injectManifest)
vp add -D sharp           # アイコン PNG の生成(ビルドでは走らせない。§6.3)
```

- `@serwist/build` は zod に依存する。**devDependency の推移依存であり、アプリのコードに zod は入らない**（spec.md「Zod は使わない」はアプリコードの規約）。
- `sharp` は native binary。ネットワーク許可リストやプラットフォームの都合で入らない場合の**逃げ道**: アイコンは `public/icons/*.png` としてコミットされる成果物なので、`sharp` が使えない環境では**任意の手段で1度作ってコミットすれば良い**（`scripts/build-icons.ts` は再生成の便宜であって、ビルドの依存ではない。§6.3）。その場合 `sharp` の追加自体を省いてよい。
- `vp run fallow` が `sharp` / `@serwist/build` を「未使用」と誤検知する可能性がある。`.fallowrc.json` に除外を足すのは**実装時に実測してから**（先に足すと本当の未使用を隠す）。

### 4.3 ファイルとスクリプト

```
sw/
├── service-worker.ts      # SW 本体(§5)
└── tsconfig.json          # lib: WebWorker。メイン tsconfig の include には入らない
scripts/
├── build-sw.ts            # vp build の後段。バンドル → manifest 注入 → .output/public へ
├── render-offline-html.ts # offline.html の生成(§9.3)
└── build-icons.ts         # 手動実行。favicon.svg → public/icons/*.png(§6.3)
public/
├── favicon.svg            # 既存
├── manifest.webmanifest   # 新規(静的。§6.1)
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

`node scripts/build-sw.ts` は Node の型ストリップに乗る（`engines.node >= 24.17.0`）。既存の `scripts/type-ssot-check.mjs` が `.mjs` である前例に反するが、`src/lib/paper-tokens.ts`（§9.3）を直接 import できる利点が大きい。**実行環境の Node が TS を読めなかった場合の逃げ道**: `scripts/build-sw.mjs` に改名し、トークンは `paper-tokens.ts` から生成した JSON を経由させる。

`.gitignore` に `.pwa/` を追加する（SW の中間バンドル出力）。`vite.config.ts` の `lint.ignorePatterns` に `sw/**` を追加する（`self` / `ServiceWorkerGlobalScope` 前提の宣言が oxlint の env と噛み合わず、かつ §5 の `interface` が必要なため）。`fmt.ignorePatterns` には**追加しない**（整形はかける）。

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
    lib: {
      entry: resolve(ROOT, "sw/service-worker.ts"),
      fileName: () => "service-worker.js",
      formats: ["es"],
    },
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

決定と逃げ道:

- `injectManifest` は**バンドルしない**（型定義に明記されている）ので、1) と 3) の2段が必須。`injectionPoint` の既定値は `"self.__SW_MANIFEST"` なので指定しない。
- **`vite-plus` が `build` を named export していなかった場合の逃げ道**（実装時に1行で確認できる）: `vite.sw.config.ts` を作って上と同じ `build.lib` 設定を `defineConfig` で書き、`package.json` を `"build": "vp build && vp build --config vite.sw.config.ts && node scripts/build-sw.ts"` にして `scripts/build-sw.ts` から 1) を削る。どちらの形でも `vite` からの直接 import はしない。
- `renderOfflineHtml` は `scripts/render-offline-html.ts` に置き、`src/lib/paper-tokens.ts` を**相対パスで** import する（`scripts/` は tsconfig の `include` 外で `~` alias が効かない。相対 import 禁止は `src/**` を対象にした PostToolUse hook のルールなので、`scripts/` では相対で良い）。
- `/sw.js` に長期キャッシュヘッダが付く環境では更新検知が最大24時間遅れる（SW スクリプト取得は HTTP キャッシュを 24h でバイパスする仕様）。実害は「更新通知が翌日出る」だけなので**ヘッダの設定は必須にしない**。気になるなら Nitro の route rule で `/sw.js` に `cache-control: no-cache` を付ける（§22.2 の確認事項）。

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

//? リポジトリは type を使い interface を禁じている(coding-style.md)が、
//? ここは declaration merging が必要な Serwist の規定パターンで type では書けない。
//? 唯一の例外として sw/** を lint.ignorePatterns に入れている(§4.3)。
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;

const serwist = new Serwist({
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
      //? /api/** は一致させない(認証応答をキャッシュしない)。sw.js 自身も除く。
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
    entries: [
      { matcher: ({ request }) => request.destination === "document", url: "/offline.html" },
    ],
  },
});

//* 画面から「更新する」を押されたときだけ待機中の SW を昇格させる(§8.2)。
//? 自前リスナーは addEventListeners() より前に足すのが Serwist の作法。
//? Web Push の push / notificationclick / pushsubscriptionchange も、後続チケットがここへ足す(§22.1)。
self.addEventListener("message", (event) => {
  if (event.data !== null && typeof event.data === "object" && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

serwist.addEventListeners();
```

決定の理由:

- `navigationPreload` は**有効にしない**。ナビゲーションは `NetworkOnly` なので得がなく、preload レスポンスの取り回しで壊れる余地だけが残る。
- `fallbacks` は `runtimeCaching` を変異させ、各エントリに fallback プラグインを足す仕様。だから `NetworkOnly` のナビゲーションルートを**明示的に置く必要がある**（ルートに一致しないリクエストは SW を素通りしてフォールバックが効かない）。
- `cacheId` は指定しない（オプション名の版差を踏まないため）。区別が必要なキャッシュには `cacheName` を明示している。
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

**このファイルに `push` 系リスナーを足すのは #58 でも #56 でもなく、#58 完了後の後続チケットである**（§22.1）。SW スクリプトが差し替わっても `PushSubscription` は `ServiceWorkerRegistration` に紐づくので、更新で購読が失われることはない（§19-12）。

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

- `background_color` / `theme_color` はどちらも `--cairn-desk`（`#DAD8CE` = 机）。紙は画面の**中身**であり、その外側 = OS の枠は机であるべき。起動画面もステータスバーも机色に沈む。**この2つの hex は `src/lib/paper-tokens.ts` の値と一致していなければならない**（§9.3 のテストで縛る）。
- `orientation` は**指定しない**。タブレット横置きを禁じる理由がない。
- `shortcuts` にアイコンは付けない（省略可。Android の長押しメニューでラベルだけ出る）。ショートカットは既存ルートのみで、CONTEXT「マイページ」の _Avoid_「8番目のナビタブ」に触れない。
- `prefer_related_applications` は付けない。

### 6.2 アイコンの絵（Paper Redesign）

`public/favicon.svg` の絵（紙 + 罫線 + 石3つの cairn。オレンジの石が primary アクセント）をそのまま使う。ただし3系統に分ける。

| ファイル | 内容 |
| --- | --- |
| `icon-192.png` / `icon-512.png` | `favicon.svg` を余白なしでラスタライズ。角丸は SVG が持っているものだけ |
| `maskable-192.png` / `maskable-512.png` | 机色（`#DAD8CE`）で全面を塗り、**絵を 80% に縮小して中央に置く**（マスク安全域 = 中央80%円を守る） |
| `apple-touch-icon-180.png` | 180×180、**透明部分なし**（iOS が黒く塗る）。背景は紙色（`#FFFCF0`）。角丸は付けない（iOS が丸める） |

### 6.3 `scripts/build-icons.ts`（手動実行）

`sharp` で `public/favicon.svg` から上記5枚 + `apple-touch-icon-180.png` + §6.4 のスプラッシュ2枚を `public/icons/` に書き、**出力をコミットする**。ビルドでは走らせない。

- 理由: アイコンは art asset であって、ソースから決定的に導かれるビルド成果物とは性質が違う（絵を変える判断は人間がする）。毎ビルド `sharp`（native binary）を走らせると CI とローカルで環境差が増え、dev では `/icons/*.png` が404になって `__root.tsx` の `apple-touch-icon` が壊れて見える。
- 運用ルール（README ではなくここに書く）: 絵を変えたら `vp run icons` を叩き直して差分をコミットする。

### 6.4 スプラッシュ（iOS）

**所有者の実機1機種分のみ**。机色（`#DAD8CE`）の下地に `favicon.svg` を中央 25% で置いた PNG を縦・横2枚。既定は iPhone 15/16 系の論理サイズ（393×852 @3x = 1179×2556 / 2556×1179）。

`__root.tsx` の `links` に入れる:

```ts
{
  href: "/icons/splash-1179x2556.png",
  media:
    "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
  rel: "apple-touch-startup-image",
},
{
  href: "/icons/splash-2556x1179.png",
  media:
    "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)",
  rel: "apple-touch-startup-image",
},
```

media が一致しない機種は**画像なし**に落ちる（引き伸ばしや崩れは起きない）。その場合 iOS が何色の起動画面を出すかは実機確認事項（§22.2-1）。Android / デスクトップ Chromium は `background_color` + アイコンから自動生成するので何も足さない。

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
  //* 机色。manifest の theme_color と一致させる(値は PAPER_TOKENS.desk から取る)。
  { content: PAPER_TOKENS.desk, name: "theme-color" },
  { content: "yes", name: "mobile-web-app-capable" },
  //? 旧 iOS 向けの別名。両方出す。
  { content: "yes", name: "apple-mobile-web-app-capable" },
  //? ライト固定なので default(暗い文字・コンテンツはステータスバーの下から始まる) が正しい。
  //? black-translucent は使わない(コンテンツがノッチ下に潜り safe-area 依存が増える)。
  { content: "default", name: "apple-mobile-web-app-status-bar-style" },
  { content: "学習ログ", name: "apple-mobile-web-app-title" },
],
```

`head()` は React コンポーネントではないが、値の出所を1つにするため `import { PAPER_TOKENS } from "~/lib/paper-tokens"` して `PAPER_TOKENS.desk` を使う（§9.3）。

`RootDocument` の `<body>` 直下に2つ足す（どちらも DOM を描かない）:

```tsx
<ServiceWorkerRegistrar />
<DayRolloverGuard />
```

`Notifications` は `position="top-center"` のまま `style={{ marginTop: "env(safe-area-inset-top)" }}` を付ける。**`apple-mobile-web-app-status-bar-style: default` では iOS の `safe-area-inset-top` は 0 になる**ので実質 Android/将来用の保険だが、0 のときは何も起きないので害がない。

---

## 8. SW の登録・更新 UI・インストール導線

### 8.1 `src/components/service-worker-registrar.tsx`

```tsx
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    if (import.meta.env.DEV) {
      //* dev には SW を作らない。過去に本番を開いた端末で dev を触ったときの残骸も掃除する。
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

- `null` を返すので SSR に影響しない（`useEffect` は SSR で走らない）。
- `type: "module"` で登録する（`sw.js` は ES 形式。§4.4）。module SW は iOS 16.4 以降 = Web Push の下限と同じなので新たな制約を作らない。**登録に失敗する iOS が出たら** §22.2-3 の逃げ道（`formats: ["iife"]` + `type` を落とす）に切り替える。

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

`notifyUpdateReady(worker)` は同ファイル内のローカル関数（`notify.ts` は文言だけを持つ薄い層のままにする）。`notifications.show({ autoClose: false, color: "orange", id: "sw-update", title: "新しい版があります", message: <更新するボタン> })`。押されたら `worker.postMessage({ type: "SKIP_WAITING" })`。`controllerchange` が来たら1回だけ `location.reload()`。

### 8.3 マイページの「アプリとして使う」セクション

`src/features/my-page/components/install-app-section.tsx`（新規）。CONTEXT「マイページ」の構成に**1セクション追加**する（8番目のナビタブは作らない）。

| 状態 | 判定 | 出すもの |
| --- | --- | --- |
| standalone で起動中 | `window.matchMedia("(display-mode: standalone)").matches \|\| ("standalone" in navigator && navigator.standalone === true)` | 緑の `Badge`「ホーム画面アプリとして起動中」+ オフラインでできること/できないことの2行 |
| Chromium で `beforeinstallprompt` を捕まえた | `src/hooks/use-install-prompt.ts` が `window` の `beforeinstallprompt` を `preventDefault()` して保持 | `Button`「ホーム画面に追加」→ `prompt()`。**自動では出さない**（ナグ禁止） |
| iOS Safari かつ非 standalone | `beforeinstallprompt` が来ない + `navigator.standalone === false` | 静的な手順（「共有 → ホーム画面に追加」）。**UA 文字列でのブラウザ判定はしない** |

セットアップ checklist の完了条件（項目≥1・プリセット≥1・本番目標・週間ターゲット≥1）は**変えない**。ホーム画面追加を完了条件に足さない（CONTEXT「セットアップ」を書き換えない）。

**#56 はこのセクションに通知トグルを足す。** セクションの存在は #58 が作る（§22.1）。

---

## 9. オフライン UI

### 9.1 `src/components/offline-banner.tsx`

```tsx
export function OfflineBanner() {
  const online = useOnlineStatus();
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

`useOnlineStatus` の実体は **`@mantine/hooks` の `useNetwork()` の `online` をそのまま返す薄いラッパー**（`src/hooks/use-online-status.ts`）。ラッパーを1枚挟む理由は2つ:

1. 本セッションでは `node_modules` が未インストールで `@mantine/hooks` の当該 hook の存在を確認できていない（§2.2 末尾）。**無かった場合の実装は確定させておく** — `useSyncExternalStore` で `window` の `online` / `offline` を購読し、`getSnapshot: () => navigator.onLine`、`getServerSnapshot: () => true` を返す 15行のフック。既存 `use-setup-status.ts` が `useSyncExternalStore` を使っている前例に倣う。
2. SSR とハイドレーションの初回値を `true` に固定できる（初回描画でバナーが出ない）。

置き場所は `AppShell` の紙シート内、ヘッダー（学習ログ + `accountMenu`）の直下・`CatchBoundary` の直上。全画面で同じ位置に出る。

### 9.2 `src/lib/run-mutation.ts` の変更（未保存警告）

```ts
const UNSAVED_WARNING_MS = 5_000;
const UNSAVED_NOTIFICATION_ID = "run-mutation-unsaved";
//* 同時に複数の mutation が詰まっても通知は1枚、かつ「最後の1本が解決するまで消えない」。
const pending = new Set<symbol>();

export async function runMutation<T>(
  operation: () => Promise<T>,
  { errorMessage, successMessage }: RunMutationOptions = {},
): Promise<void> {
  //? navigator.onLine は嘘をつく(LAN 接続だが到達不能)。だから「5秒未解決」という観測事実だけを条件にする。
  const token = Symbol("run-mutation");
  pending.add(token);
  const timer = setTimeout(() => {
    notifications.show({
      autoClose: false,
      color: "yellow",
      id: UNSAVED_NOTIFICATION_ID,
      message: "まだ保存されていません。アプリを閉じると失われます。",
      title: "送信中",
    });
  }, UNSAVED_WARNING_MS);

  const result = await Result.tryPromise({
    /* 既存のまま */
  });

  clearTimeout(timer);
  pending.delete(token);
  if (pending.size === 0) {
    notifications.hide(UNSAVED_NOTIFICATION_ID);
  }

  // 以降(Result.isError → notifyError / successMessage → notifySuccess)は既存のまま
}
```

- **mutation は止めない。** Convex は切断中の mutation をキューして再接続時に送るので、短時間の切断では成功する。ここを塞ぐと常用ケースが悪化する（§19-9）。
- `pending` の Set は「1枚の通知」と「最後の1本まで消えない」の両方を満たす最小の実装。id 固定だけで参照カウントを持たないと、先に解決した mutation が未解決分の警告を消してしまう。
- 既存の全 mutation（記録・目標・カタログ・スケジュール）がこの1本を通るので、**呼び出し側の変更は0件**。

### 9.3 `src/lib/paper-tokens.ts`（新規）と `offline.html`

`offline.html` は Mantine の外側にある静的な HTML なので、テーマ変数（`var(--cairn-ink)` など）が使えない。ハードコード hex 禁止（design-live-board.md 規則2）を守るため、**色の一次値を1ファイルに出し、`theme.ts` と生成スクリプトの両方がそこから読む**。

```ts
// src/lib/paper-tokens.ts
//* Paper Redesign の色の一次値。Mantine に依存しないので Node のビルドスクリプトからも読める。
//? theme.ts / __root.tsx の theme-color / scripts/render-offline-html.ts が、ここを唯一の出所にする。
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

`src/lib/theme.ts` の変更: ローカル定数 `INK` / `PAPER` / `PAPER_2` / `RULE` / `MUTED` / `MUTED_2` と `cssVariablesResolver` の `--cairn-desk` を `PAPER_TOKENS.*` に置き換える。**色のタプル（`orange` / `red` / `green` / `blue` / `yellow`）はそのまま**（Flexoki の階調は Mantine の資産で、トークンに写すと二重管理になる）。

`src/lib/paper-tokens.test.ts`（新規、必須）:

```ts
test("orangeAccent は theme の orange[5] と一致する", () => {
  expect(PAPER_TOKENS.orangeAccent).toBe(theme.colors?.orange?.[5]);
});
test("desk は manifest の theme_color / background_color と一致する", () => {
  //? public/manifest.webmanifest を読み(resolveJsonModule は有効)、両フィールドを突き合わせる
});
```

`scripts/render-offline-html.ts` が返す HTML（要点。実装の自由度はここに書いた範囲だけ）:

- `<html lang="ja">`、`background: PAPER_TOKENS.desk`、中央に紙1枚（`PAPER_TOKENS.paper` + `1.5px solid ink` + スケッチ風 `border-radius: 8px 14px 9px 16px/16px 9px 14px 8px` + `box-shadow: 2px 3px 0 rgba(16,15,15,.12)`）。
- 見出し「オフラインです」。**Google Fonts をここで読まない**（オフラインで待たされるだけ）ので `font-family: system-ui, sans-serif` に落とす。手書きフォントが出ないのは承知の上の妥協。
- 本文「電波が戻ると自動で元の画面に戻ります。オフラインでは記録できません。」
- `<button>` で `location.reload()`。
- `<script>` で `addEventListener("online", () => location.replace("/"))`。復帰したら黙って今日の日へ戻す（`document.referrer` は SW フォールバック経由では信頼できない）。
- **外部リソース参照ゼロ**（`favicon.svg` すら参照しない）。

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

### 10.3 構造（`src/components/app-shell.tsx`）

`NAV` の型を先に締める。現行は `to: string` なので、一次ナビの配列を `satisfies` で縛っても型検査が効かない（`"/bord"` の綴り間違いを拾えない）。

```tsx
const NAV_ROUTES = ["/", "/board", "/history", "/items", "/presets", "/goals", "/trash"] as const;
type NavRoute = (typeof NAV_ROUTES)[number];

const NAV: {
  Icon: NavIcon;
  label: string;
  match: (path: string) => boolean;
  to: NavRoute;
}[] = [ /* 既存の7本。順序も文言もアイコンも変えない */ ];

//* 下小口タブに出す4本。残りは「その他」Menu(§10.2)。並べ替えはこの1行で済む。
const MOBILE_PRIMARY = ["/", "/board", "/history", "/goals"] as const satisfies readonly NavRoute[];

function BottomIndexTabs({ pathname }: Record<"pathname", string>) {
  return (
    <Box
      aria-label="画面ナビ（下小口）"
      className={classes.bottomBar}
      component="nav"
      hiddenFrom="sm"
    >
      <Group gap={6} justify="space-between" wrap="nowrap">
        {/* MOBILE_PRIMARY の4本を classes.bottomTab / bottomTabActive で。component={Link} */}
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

`IndexTabs` にも `component="nav" aria-label="画面ナビ（右小口）"` を付ける。理由は2つ: (1) `visibleFrom` / `hiddenFrom` は CSS クラスなので **happy-dom では両方が DOM に残る**。テストが `getByRole("navigation", { name })` で絞れないと2重にヒットする。(2) ランドマークが2つある以上、名前が必要。

現在ページの表現は既存の右小口と同じく `aria-current="page"`。

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
  /*? Mantine の Modal / Drawer(既定 200)より必ず下、本文より上。同値にして DOM 順に賭けない */
  z-index: 100;
}

/*? 右小口タブ(.tab)の質感を上下反転させたもの。回転は交互、不揃いな角丸は上側だけ */
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
  min-height: 46px; /* タップ領域(§12.3) */
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

- `--tab-rotate` は既存 `IndexTabs` と同じく `style={{ "--tab-rotate": ... }}` で index の偶奇から `±0.5deg` を与える（右小口は `±0.6deg`。下小口は横並びなので浅くする）。
- `.shellBody` は `AppShell` の外枠 `Box maw={1180}` に付ける。
- 色は全て既存トークン（`--mantine-color-white` = 紙、`--cairn-ink`、`--mantine-color-orange-6`）。**ハードコード hex はゼロ**。

### 10.5 設計規則の改訂が必要

[design-live-board.md](../../.claude/rules/web/design-live-board.md) 規則1 の「右小口インデックスタブ（モバイルでは横並びの上部タブ列に畳む）」を次に置き換える。

```md
1. 全画面（Today/History/Items/Presets/Goals/Trash、新規ルートを含む）は Paper Redesign の言語に従う:
   Flexoki Light の紙背景、手書きの本文/見出しフォント + 数字は別の可読フォント、右小口の縦インデックスタブ
   ナビ（モバイルでは**画面下端に固定した下小口タブ4本 + 「その他」メニュー**に置き換わる。
   docs/specs/pwa-mobile.md §10）、スケッチ風の不揃いな border-radius と紙影は要所（カード・ボタン・タブ）だけ。
```

`docs/design/Paper Redesign.dc.html` にモバイルの下部ナビは描かれていない。design-live-board.md は「規則とデザインファイルが食い違えばデザインファイルが勝つ」と定めているので、**これはデザインファイルの解釈ではなく規則の改訂**である（§19-6、§22.3）。

---

## 11. 実行ボードのモバイル操作性

### 11.1 カンバンの列: 横スナップスクロール

`board-kanban.tsx` の `<div className="grid gap-3 md:grid-cols-5">` を CSS モジュールに置き換える（scroll-snap を Tailwind の任意値で書くと読みにくく、`overscroll-behavior` と併せて1箇所にまとめたい）。

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

- `86%` は「次の列の背が少し見える」ことでスワイプ可能だと分かるための値（peek）。
- 列見出しには件数の `Badge` を付ける（`未着手 3`）。スクローラに `role="group" aria-label="カンバンの列"`、各列に `aria-label="未着手 3件"`。
- 境を `md`（48em）にするのは既存 `md:grid-cols-5` と同じ。ナビの境（`sm`）と揃えないのは意図的 — タブレット縦は5列だと窮屈だが、ナビは右小口で足りる。

### 11.2 ドラッグ代替: カードの `⋮` Menu

`RecordCard` のアクション群を2つにする。

| コントロール | 可視条件 | 役割 |
| --- | --- | --- |
| `IconGripVertical` の `ActionIcon` | CSS で `< md` は非表示（**DOM からは消さない**） | ドラッグ。`dragHandleProps` は常にここに付く |
| `IconDotsVertical` の `ActionIcon` + `Menu` | 常に表示 | 移動と並べ替え |

**掴み手を DOM から消さない**のが要点。`@hello-pangea/dnd` の `Draggable` は `dragHandleProps` が実 DOM に付いていることを前提にしており、条件分岐で外すと警告が出る。`visibleFrom="md"`（= CSS クラス）なら DOM は残り、SSR と実 DOM もずれない。

`src/features/board/components/board-kanban-card-menu.tsx`（新規）の項目:

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

- ラベルは `RECORD_STATUS_UI` の表示名（完了 / 見送り）に合わせ、状態名の生値（確定 / スキップ）を UI に出さない。既存カンバンの列見出しは生値のままだが、それは既存の不整合であり本仕様では触らない。
- **「完了にする」はドラッグと完全に同じ経路を通る（§11.3 の `onStatusMove`）。** すなわち「計測があれば先に `stopTimer` を await → その値でそのまま `rows.confirm` → Toast『学習時間 n分を記録しました』／計測が無く `needsKanbanConfirmEditor(row)` なら確定エディタ／どちらでもなければ既存 `minutes` で `rows.confirm`」。#51（[study-timer.md](study-timer.md) §11.3 / §14）が `needsKanbanConfirmEditor` に足した「計測なし かつ `minutes === 0`」の条件を、新設のメニュー経路で崩さないための必須事項。`onStatusMove` に `row.minutes` を直渡しする分岐を**書いてはいけない**。
- メニュー項目は `stopTimer` の解決を待つので、押した後は `loading` にする（study-timer.md §8.3 の「確定は `stopTimer` が解決してから行う」と同じ扱い）。
- **ボードは確認モーダルを出さない**（ADR-0014）。ドラッグ・メニューのどちらの経路でも即実行する。「未着手に戻す」が `確定 → 未着手`（`unconfirm`）のときは実行後に Toast「確定を取り消しました」、`進行中 → 未着手`（`pause`）で計測があるときは Toast「計測 n分を捨てました」（Undo は無い）。「見送りにする」も計測があれば同じ「計測 n分を捨てました」。ADR-0011「カンバンのドラッグによる状態変更は即実行」と、メニュー経路もここで揃える。

### 11.3 遷移の実行経路を1本にする

現行 `handleDragEnd` に埋まっている `if (statusMove === "confirm") ... else if ...` の連鎖（`board-kanban.tsx` L145-167）を `use-board-kanban-actions.ts` に移す。**この関数がドラッグ経路とメニュー経路の唯一の合流点なので、#51 が決めた確定手順はここに1度だけ書く。**

前提: 本チケットの着地時点で #51 は既に入っている（実装順は タイマー(#51) → PWA(#58)）。したがって `needsKanbanConfirmEditor(row)` は既に「計測なし かつ `minutes === 0`」の条件を持ち、`rows.stopTimer` は加算後の `timerAccumulatedMs`（`v.number()`）を返す。ボードの確認モーダルは ADR-0014 で全廃済みなので、この関数が開くのは確定エディタ（分数0・計測なしのときだけ）に限られる。破壊的な移動（計測を捨てる `pause` / `skip`、確定を取り消す `unconfirm`）は Confirm を挟まず即実行し、結果を Toast だけで知らせる（study-timer.md §13.4）。

```ts
// src/features/board/hooks/use-board-kanban-actions.ts に追加
import { hasTimerState, timerMinutes } from "~domain/rowTimer";

return {
  /* 既存の onApplyOrder / onConfirm / ... はそのまま */
  //* ドラッグ経路とメニュー経路の両方がここを通る。確定エディタを開く side effect は呼び出し側の state なので callback で受ける。
  onStatusMove: async (
    move: KanbanStatusMove,
    row: BoardRow,
    openConfirmEditor: (args: { prefillMinutes: number | null; row: BoardRow }) => void,
  ) => {
    switch (move) {
      case "confirm": {
        //? 計測がある行は確認エディタを挟まない。stopTimer が返すサーバ真値の分数でそのまま確定する。
        //? stopTimer 失敗(null)時だけ安全側でエディタを開く。
        if (hasTimerState(row.timer)) {
          const accumulatedMs = await onStopTimer(row._id);
          if (accumulatedMs === null) {
            openConfirmEditor({ prefillMinutes: null, row });
            return;
          }
          return await onConfirm({
            content: row.content,
            minutes: timerMinutes(accumulatedMs),
            rowId: row._id,
          });
        }
        //? 計測が無く minutes === 0 の行だけエディタを開く(「ひとこと」は確定ゲートにしない)。
        if (needsKanbanConfirmEditor(row)) {
          openConfirmEditor({ prefillMinutes: null, row });
          return;
        }
        return await onConfirm({ content: row.content, minutes: row.minutes, rowId: row._id });
      }
      case "skip":
        return await onSkip({ rowId: row._id }); //? 呼び出し側(handleDragEnd)が計測ありのときだけ successMessage を渡す
      case "unskip":
        return await onUnskip({ rowId: row._id });
      case "unconfirm":
        return await onUnconfirm({ rowId: row._id }); //? 常に Toast「確定を取り消しました」
      case "start":
        return await onStart({ rowId: row._id });
      case "pause":
        return await onPause({ rowId: row._id }); //? 呼び出し側が計測ありのときだけ successMessage を渡す
      case "reopen":
        return await onReopen({ rowId: row._id }); //? silent（Toast なし）
      case "noop":
        return;
    }
  },
};
```

`onConfirm` は `runMutation` に `successMessage: \`学習時間 ${input.minutes}分を記録しました\`` を渡し、計測あり/なしどちらの経路でも同じ文言で Toast を出す（CVX-16 により `rows.confirm` の戻り値は `v.null()` なので、分数はこの呼び出し時点の入力値から組み立てる）。`onPause` / `onSkip` は `successMessage` を第2引数に取り、`board-kanban.tsx` の `handleDragEnd` 側が `hasTimerState(row.timer)` のときだけ「計測 n分を捨てました」を渡す（計測が無ければ未指定 = silent）。

- `board-kanban.tsx` の `handleDragEnd` と `BoardKanbanCardMenu` は、どちらも `onStatusMove(move, row, setConfirmRow)` を `await` で呼ぶだけになる。**`onConfirm` を直接呼ぶ呼び出し側は残さない**（残すと確定経路が2本に戻る）。
- 並べ替え（`onApplyOrder`）の扱いは現行のまま。ドラッグは「状態遷移 + 並べ替え」が同時に起きうるが、メニューは「移動」と「上へ / 下へ」が別項目なので同時には起きない。`pendingOrderRef` の仕組みはドラッグ経路専用のまま残す。
- `openConfirmEditor` を callback で渡すのは、確定エディタの開閉 state が `board-kanban.tsx` にあるため（フックへ持ち上げると `confirmRow` の所有者が2箇所になる）。判定（`stopTimer` を呼ぶか、確定エディタが要るか）は**すべてフック側**にあるので、呼び出し側が手順を間違える余地は無い。
- `switch` を網羅させることで `KanbanStatusMove` に値が増えたときに型エラーで気づく。
- Confirm は一切出さない。エラー Toast も出さない — mutation が失敗すれば reactive query が元の状態へ巻き戻すので、その巻き戻りだけがフィードバックになる（ADR-0014）。

### 11.4 スケジュールタブのモバイル: ドラッグを切るだけ

**新しい作成 UI は作らない。** コードを読んだ結果、タップからの作成経路が既に3つある（§2.2）。

| 操作 | 既存の配線 | モバイルでの扱い |
| --- | --- | --- |
| 予定を編集 | `onEventClick` → `ui.handleEventClick` / `ui.openEditFromEvent` | **そのまま**（これが既にドラッグ代替） |
| 予定を作成（日/週ビュー） | `onTimeSlotClick` → `ui.openCreate(slotStart, slotEnd)` | **そのまま** |
| 予定を作成（月/年ビュー） | `onDayClick` → `handleDayClick` / `renderDay` の `onAdd` → `openCreate(day 09:00〜10:00)` | **そのまま** |
| 予定を移動 | `onEventDrop`（`withEventsDragAndDrop`） | `< md` で**無効化** |
| 範囲ドラッグで作成 | `onSlotDragEnd`（`withDragSlotSelect`） | `< md` で**無効化** |

```tsx
withDragSlotSelect={!pending && rows.length > 0 && !isCompact}
withEventsDragAndDrop={!pending && !isCompact}
```

- `isCompact` は `useMediaQuery("(max-width: 47.9375em)", false, { getInitialValueInEffect: true })`（`@mantine/hooks`）。ここは**CSS では表現できない**（`@mantine/schedule` の props を切るため）ので JS 判定を使う。`getInitialValueInEffect: true` で SSR は常に `false`（= ドラッグ有効）→ ハイドレーション不一致を避け、effect 後にモバイルなら無効化する。
- **`withDragSlotSelect={false}` にしても `onTimeSlotClick` が生き続けることが前提**。これは `@mantine/schedule` の実装に依存するので、§21.2 の受け入れ条件に「幅 375px でスロットをタップすると作成フォームが開く」を入れて実測で確かめる。
  **万一タップ作成まで死ぬ場合の逃げ道（これも確定させておく）**: `withDragSlotSelect` はモバイルでも `true` のままにし、代わりに `board-schedule.tsx` のナビゲーション横に `Button`「+ 予定を追加」（`rows.length > 0` のときだけ）を置いて `ui.openCreate(\`${anchorDateJst} ${DEFAULT_DAY_BLOCK_START}\`, \`${anchorDateJst} ${DEFAULT_DAY_BLOCK_END}\`)` を呼ぶ。**既存の `handleDayClick` と同じ定数を使うので新しい純関数は要らない。**
- 前版の設計にあった `defaultScheduleSlot(anchorDateJst, nowIso)` は**削除した**（既存のタップ経路と `DEFAULT_DAY_BLOCK_*` で足りるため。§19-13）。

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

`theme.components.TextInput.defaultProps.size = "md"` はデスクトップの密度まで変わるので採らない。

### 12.2 safe-area

- `viewport-fit=cover`（§7）で `env(safe-area-inset-*)` が有効になる。
- 外枠 `Box`（`app-shell.tsx`）に `classes.shellBody` を付け、`< sm` で上下の inset を足す（§10.4）。
- 下小口バーは自身で `padding-bottom: env(safe-area-inset-bottom)`。
- `Notifications` は `marginTop: env(safe-area-inset-top)`（§7。iOS の `default` ステータスバーでは 0 になるので実質保険）。
- 横方向（landscape のノッチ）は `Box` の `px={{ base: "sm" }}` で実害が出ないので触らない。

### 12.3 タップ領域

- 下小口タブ: `min-height: 46px`（§10.4）。
- カンバンカードの `⋮`: `ActionIcon size="md"`（≒34px）+ 周囲の `Group gap="xs"`。**44px には届かない**が、周囲は押しても何も起きない余白なので誤タップの害は小さい。**意図的な妥協として記録する。**
- `MobileTabs` の `size="compact-sm"`（44px 未満）は消える。

### 12.4 日付ロールオーバー（standalone 常駐で顕在化する）

`todayJst()` はレンダー中に読まれるだけなので、常駐したまま JST の日が変わると「今日」がずれる。ブラウザタブでも起きるが、ホーム画面アプリは何日も生き続けるので頻度が上がる。

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

- **`convex/schema.ts` に追加する表・インデックスは無い。** よって CVX-10（`.filter` 禁止）/ CVX-11（`.collect` の範囲）/ CVX-12（prefix 重複インデックス）/ CVX-13（テーブル名の第1引数）/ CVX-16（データ契約 SSoT）に触れる変更は発生しない。
- **新規の query / mutation / action は無い。** よって CVX-01 / 02 / 03（args validator）/ 04（`requireUser`）/ 05（scheduler は `internal.*`）/ 20（1関数1ファイル）に触れる変更も発生しない。
- 既存関数の引数・戻り値も変えない。`FunctionReturnType` から導出しているクライアント型に影響しない。
- `convex-test` の追加も無い（CVX-19 の対象になる新しい状態機械が無い）。

### 13.2 なぜバックエンドが要らないか

| 一見必要そうなもの | 判断 |
| --- | --- |
| `pushSubscriptions`（endpoint / keys / device） | **#58 完了後の後続チケットの所有物**（§22.1）。ここで先に定義すると、購読の粒度・失効時の掃除・Slack との併用が決まる前に表が固まる。CVX-16 の趣旨に反する |
| インストール状況・端末一覧 | 所有者1〜2人のアプリで、サーバに置く判断材料がない。`display-mode` はクライアントで即分かる |
| SW のバージョン管理表 | precache manifest のリビジョンが `sw.js` に埋まる。サーバに持つ意味がない |
| オフライン書き込みキュー | Convex クライアントが既に持つ（切断中のキュー）。自作は §19-3 で却下 |

### 13.3 CVX-14 との関係

PWA は**新しい clock 依存を作らない**。`dateJst` はこれまでどおりクライアントが `todayJst()` で計算して query 引数に渡す。§12.4 は「クライアント側の値が古くなる」問題への手当てであり、query 側の変更ではない。

---

## 14. フォーム（Valibot / Formisch）

**新規フォームは無い。** よって `src/features/*/schemas/` への追加も無い。

- インストールプロンプト、更新通知、オフラインバナー、カードの Menu、下小口タブはいずれも入力を取らない。
- スケジュールの作成・編集は既存の `board-schedule-event-form.tsx` と既存の Valibot スキーマ `board-schedule-event-schema.ts` をそのまま開く。**スキーマは1行も変えない**（§11.4 でドラッグを切っても、作成に渡る値は既存の `slotFormValues` / `DEFAULT_DAY_BLOCK_*` のまま）。
- 確定エディタのスキーマ（`row-editor-schema.ts` / `validate-confirm-row.ts`）も変えない。`prefillMinutes` は #51 が既に足した props。
- `localStorage` に持つ新しい状態も無い（インストールプロンプトの「あとで」を覚えない — 自動で出さないので覚える対象が無い）。

---

## 15. 純関数（新規・追記）

すべてフロント側。Convex ランタイムを import しない。

| 関数 | 場所 | 契約 |
| --- | --- | --- |
| `shiftRowWithinColumn(rows, rowId, direction)` | `src/features/board/lib/kanban-order.ts`（追記） | `direction` は `-1 \| 1`。同一列内で1つ動かした `Id<"rows">[]` を返す。端なら `null`。実体は列内 index を求めて既存 `computeOrderedRowIds` に委譲する |
| `kanbanMoveMenuItems(status)` | 同上（追記） | `{ column: KanbanColumn; move: Exclude<KanbanStatusMove, "noop"> }[]` を `KANBAN_COLUMNS` の順で返す。`resolveKanbanStatusMove(status, column)` が `"noop"` の列を落とすだけ |
| `renderOfflineHtml()` | `scripts/render-offline-html.ts`（新規） | `PAPER_TOKENS` から自己完結の HTML 文字列を返す。外部リソース参照を含まない |

`isStandaloneDisplayMode()` のような環境判定は純関数にしない（`window` を触るのでフックに置く）。`defaultScheduleSlot` は §11.4 の決定により**不要**。

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
| `src/hooks/use-online-status.ts` | §9.1 |
| `src/hooks/use-install-prompt.ts` | §8.3 |
| `src/components/app-shell.test.tsx` | §17 |
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
| `src/lib/theme.ts` | 色の一次値を `PAPER_TOKENS` から取る（§9.3。色タプルは不変） |
| `src/lib/run-mutation.ts` | 5秒未保存警告 + pending 参照カウント（§9.2） |
| `src/styles.css` | モバイル入力の 16px 底上げ（§12.1） |
| `src/components/app-shell.tsx` | `NAV` の `to` を `NavRoute` 型に、`MobileTabs` 削除、`BottomIndexTabs` 追加、両 nav に `component="nav"` + `aria-label`、`OfflineBanner` 挿入、外枠に `classes.shellBody` |
| `src/components/app-shell.module.css` | `.bottomBar` / `.bottomTab` / `.bottomTabActive` / `.shellBody`（§10.4） |
| `src/features/board/components/board-kanban.tsx` | 列を CSS モジュール化、カードに Menu、`onStatusMove(move, row, setConfirmRow)` へ集約（`onConfirm` の直接呼び出しを残さない） |
| `src/features/board/hooks/use-board-kanban-actions.ts` | `onStatusMove` 追加。`confirm` 分岐は #51 の手順をそのまま持つ（§11.3） |
| `src/features/board/lib/kanban-order.ts` | `shiftRowWithinColumn` / `kanbanMoveMenuItems`（§15） |
| `src/features/board/lib/kanban-order.test.ts` | 上記のテスト |
| `src/features/board/components/board-schedule.tsx` | `isCompact` で `withEventsDragAndDrop` / `withDragSlotSelect` を無効化（§11.4） |
| `src/features/auth/components/login-screen.tsx` | standalone 時の並び替えと Notion ボタンの注記（E7） |
| `src/features/my-page/components/my-page.tsx` | `InstallAppSection` の差し込み |
| `.claude/rules/web/design-live-board.md` | 規則1 のモバイル記述を改訂（§10.5） |
| `CONTEXT.md` | §20.1 |
| `docs/spec.md` | §20.3 |
| `docs/adr/0013-pwa-without-offline-writes.md` | §20.2（新規 ADR。**0012 は #56 の提案が先に立っている** — §20.2 の注記を読むこと） |

---

## 17. テスト計画

`sw/service-worker.ts` と `scripts/*` は**テストしない**。SW ランタイムのモックは実物と乖離し、価値より維持費が高い。代わりに §21.2 の受け入れ条件で実ビルド/実機確認する。

| 対象 | プロジェクト | 内容 |
| --- | --- | --- |
| `shiftRowWithinColumn` | frontend（unit） | 列の先頭で `-1` → `null`。末尾で `+1` → `null`。中間で入れ替わる。他列の順序が保たれる |
| `kanbanMoveMenuItems` | frontend（unit） | `未着手` → 進行中 / 確定 / スキップ の3件。`確定` → 進行中(reopen) / 未着手(unconfirm) / スキップ の3件。`スキップ` → 未着手(unskip) / 確定 / 進行中 で `"noop"` が落ちること |
| `PAPER_TOKENS` | frontend（unit） | `orangeAccent === theme.colors.orange[5]`。`desk === manifest の theme_color / background_color` |
| `AppShell`（新規テスト） | frontend | `getByRole("navigation", { name: /下小口/ })` の中に 日 / ボード / 履歴 / 目標 の4リンクがあり 項目 は無い。「その他」を押すと `getByRole("menuitem", { hidden: true, name: "項目" })` が出る。現在ページに `aria-current="page"` |
| `BoardKanbanCardMenu` | frontend | `未着手` の行で「完了にする」を押すと `onStatusMove("confirm", row, ...)` が呼ばれる。`minutes === 0` かつ計測なしの行では確定エディタが開く。「上へ」が先頭行では出ない |
| **メニュー経由の確定（計測あり）** | frontend | `hasTimerState(row.timer) === true` の行で「完了にする」を押すと、(1) `onStopTimer` が `{ rowId }` で呼ばれ、(2) その解決**後**に確定エディタを開かず `rows.confirm` がそのまま呼ばれる、(3) 分数は `timerMinutes(戻り値)`（`row.minutes` ではない）、(4) Toast「学習時間 n分を記録しました」が出る。#51 が塞いだ「目安分数のまま確定して計測を捨てる」バグの回帰テスト（ドラッグ経路側は study-timer.md §17 が持つ） |
| メニュー経由の確定（計測なし） | frontend | `hasTimerState(row.timer) === false` かつ `minutes` が埋まっている行では `onStopTimer` が呼ばれず、エディタも開かず、`onConfirm({ content, minutes: row.minutes, rowId })` が直接呼ばれる |
| `OfflineBanner` | frontend | `useOnlineStatus` を `false` にモックしてメッセージが出る。`true` で何も描かない |
| `runMutation` | frontend | `vi.useFakeTimers()` で5秒進めると警告通知が出る。解決後に `notifications.hide` が呼ばれる。4.9秒で解決したら出ない。**2本を並行させ、先に1本解決しても通知が消えず、2本目の解決で消えること**（§9.2 の参照カウント） |
| `InstallAppSection` | frontend | `matchMedia("(display-mode: standalone)")` を true にモックすると「起動中」バッジ。`beforeinstallprompt` を発火させると「ホーム画面に追加」ボタンが出て、押すと `prompt()` が呼ばれる |

- `Menu` は Floating UI なので `getByRole(..., { hidden: true })` を使う（[testing.md](../../.claude/rules/common/testing.md)）。
- レンダリングは `renderWithMantine`。`data-testid` は使わない。
- `vite.config.ts` の `coverage.include` は明示的な allowlist なので新規ファイルは自動では計上されない。`src/features/board/lib/kanban-order.ts` と `src/lib/run-mutation.ts` を足すかは実装者判断（閾値80%を割らないこと）。

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
| E11 | モバイルでカンバン列をスワイプ中に長押しドラッグが誤発火 | 掴み手が `< md` で非表示なので発火しない（§11.2） |
| E12 | `< md` でも外付けキーボード/マウスの端末（iPad + Magic Keyboard 等） | `md` 以上ならドラッグが出る。それ未満では Menu だけ。Menu はキーボード操作可能なので詰まない |
| E13 | 下小口バーが Modal / Drawer に被る | バーは `z-index: 100`、Mantine の Modal / Drawer は既定 200。DOM 順に賭けずに必ず Modal が上に来る（§10.4） |
| E14 | JST 日付が変わった後にアプリへ復帰 | §12.4 で `router.invalidate()` + クエリ無効化 |
| E15 | 通知権限を拒否された状態でホーム画面追加 | 本仕様は権限を要求しない（#56 とその後続の範囲） |
| E16 | `localStorage` が使えない環境（プライベートブラウズ等） | 本仕様は `localStorage` を新規に使わない。既存 `safe-storage.ts` の挙動は変わらない |
| E17 | SW の precache が失敗（容量不足など） | Serwist の install が失敗し SW は有効にならない。アプリは SW 無しで従来どおり動く。専用のフォールバック UI は要らない |
| E18 | `offline.html` が古い版のまま残っている | 内容がほぼ静的（文言とトークン）なので実害なし。precache のリビジョンで更新される |
| E19 | 「その他」Menu を開いたまま画面遷移 | `Menu.Item component={Link}` なので Mantine が閉じる。追加処理不要 |
| E20 | 記録0件の日にスケジュールのスロットをタップ | 既存挙動のまま（`slotFormValues` が `null` を返すので開かない / `handleDayClick` は `rows.length === 0` で早期 return）。本仕様は変えない |
| E21 | モバイルでカンバンの列を横スクロールしたまま画面を離れて戻る | スクロール位置は復元しなくてよい（列は左端 = 未着手 から始まるのが既定で、そこが最も見たい列） |
| E22 | 下小口タブの「その他」に居るページ（例: 項目）を開いているとき | 「その他」ボタン自体を active 表示にする（`MOBILE_PRIMARY` に無いルートに居るときは `bottomTabActive` を「その他」に付ける）。どこに居るか分からなくなるのを防ぐ |

---

## 19. 検討した代替案（自己グリル）

### 19-1. 「PWA は Web Push の前提なのだから、通知と一体で決めないと手戻りになる」

**回答。** SW の**生成経路**（§4）と**登録位置**（§8）は通知と独立している。Web Push が触るのは `sw/service-worker.ts` にリスナーを3個足すことと `pushSubscriptions` 表を作ることだけで、どちらも土台の上に載る差分である。`PushSubscription` は `ServiceWorkerRegistration` に紐づくので、SW スクリプトの入れ替え（§8.2）で購読が失われることもない。
**譲る点。** 権限要求 UI の**置き場所**は重複する。だから本仕様はマイページに「アプリとして使う」セクションを**作るところまで**を決め、その中身（通知トグル）は #56 が、Web Push 一式は #58 完了後の後続チケットが足す、と3者の境界を明示した（§8.3 / §22.1）。**なお前版の本仕様は「`pushSubscriptions` は #56 の所有物」と書いていたが、[notifications.md](notifications.md) §2.4 / §18.1 が「#56 も作らない」と確定させたので、所有者を「#58 完了後の後続チケット」に**修正した**（押し合いを解く唯一の方法は所有者を1つに決めることで、それは #56 側の文書が既に決めている）。

### 19-2. 「オフラインでデータを見せないなら PWA の価値は薄い。やるだけ無駄」

**回答。** §3.2 の4点、特に iOS の ITP 7日削除からの除外が実利として大きい。認証トークンが `localStorage` にあることは既に文書化された tradeoff であり、ホーム画面追加はその副作用を消す唯一の手段である。
**譲る点。** 「オフラインで記録できる」という期待を UI で作らないことが条件。だから §9 の3点（バナー・5秒警告・貼り紙の明記）は**任意ではなく必須**とした。

### 19-3. 「Convex のクエリ結果を IndexedDB にミラーすれば読み取りオフラインは作れる。やらないのは怠慢」

**回答。** 3つ理由がある。(a) 正本が二重化する — CONTEXT は「正式な記録は本アプリにある」と言っており、別時点のスナップショットを画面に出すと「本アプリの記録」がどれか曖昧になる。(b) 読めても書けないので、得られるのは「昨日何をやったか眺める」だけ。オフラインで開く動機（枕元で今日を閉じる）を満たさない。(c) DTO は Convex validator 由来の SSoT（CVX-16）で、ミラーはその複製になる。
**譲る点。** 将来やるなら条件付きで可能。TanStack Query の永続化を **`days.get` の今日1本だけ**に限定し、画面に「オフライン時点の写し」ラベルを常時出し、その画面では全ての書き込み UI を無効化する。別チケット候補として §22.4 に残す。

### 19-4. 「HTML をキャッシュしないなら、オフライン起動でアプリの殻すら出ない。app-shell と言いながら shell が無い」

**最も強い反論。事実として正しい。** SSR HTML には認証状態と所有者のデータが埋まるので、マルチユーザー（`ownerId` 分離）のこのアプリでは**キャッシュした HTML を出すこと自体が事故**である（別時点・別所有者の日が出る）。`offline.html` が shell の代わりを務める。
**譲る点。** したがって「app-shell 型 PWA」という呼称は正確でない。**「静的資産キャッシュ + オフライン貼り紙」**に呼び名を統一した（§0-1）。この名前で呼ぶ限り、実装者が「shell を precache し忘れている」と誤解することもない。

### 19-5. 「`vite-plugin-pwa` が直っていないだけで自作スクリプトを抱えるのはコスト。upstream 待ちが正解」

**回答。** 本番ビルド非互換は upstream 未解決で、本番日は待ってくれない。`scripts/build-sw.ts` は §4.4 のとおり実質3ステップ・60行程度で、Vite の内部を触らない。upstream が直ったら差し替えればよく、**SW ソース（§5）はそのまま使える**（Serwist はプラグインに依存しない）。
**譲る点。** dev に SW が無いので「dev で SW の挙動を確認できない」。確認は `vp build && vp preview` に依存する（§21.2 に明記）。

### 19-6. 「ボトムナビは『右小口インデックスタブ』という Paper Redesign の identity を壊す」

**回答。** デスクトップは無変更。モバイルは**今も右小口ではない**（上部の横並び `Button` 列 = すでに identity を捨てている）。同じ紙タブの質感を下端に置く（`border-bottom: none`、上側だけ不揃いな角丸、交互の微回転、既存の `--mantine-color-orange-6` で active）ほうが identity は保たれる。
**譲る点。** `docs/design/Paper Redesign.dc.html` にモバイル下部ナビは描かれていない。design-live-board.md は「規則とデザインファイルが食い違えばデザインファイルが勝つ」と定めているので、**これは規則の改訂であってデザインファイルの解釈ではない**。§10.5 に改訂文を書き、§22.3 の人間の再確認ポイントに上げた。

### 19-7. 「7本を 4 + その他に割るのは恣意的。ゴミ箱まで3タップかかる」

**回答。** 日常ループ（日 / ボード / 履歴 / 目標）と設定・復旧（項目 / プリセット / ゴミ箱）の線は CONTEXT の語彙定義から引ける。ゴミ箱は「消しミスを取り消せる」場所で、頻度は低い。
**譲る点。** 「その他」に何本入るかは所有者の使い方次第。`MOBILE_PRIMARY` は `app-shell.tsx` の1行の配列で、しかも `NavRoute` 型で綴りが検査される（§10.3）ので、入れ替えコストはほぼゼロにしてある。加えて E22 で「その他」側に居るときも active が分かるようにした。

### 19-8. 「メニュー移動はドラッグより遅い。カンバンの本質はドラッグだ」

**回答。** モバイルでは「5列縦積み + 長押しドラッグ + ページスクロール」が三重に衝突していて、そもそも成立していない（列をまたぐには数百 px スクロールしながらドラッグする必要がある）。速いドラッグが存在しないので、遅いメニューと比べる相手がいない。
**譲る点。** 横スナップにした結果、**モバイルでは列間ドラッグを明確に捨てる**ことになる（掴み手を `< md` で隠す）。これは妥協ではなく決定として §11.2 に書き、CONTEXT 実行ボードの _Avoid_ にも「モバイルでドラッグを必須にすること」を足す（§20.1）。

### 19-9. 「`navigator.onLine` は嘘をつく。それを前提にした設計は壊れる」

**回答（設計を修正した）。** 正しい。初期案では `runMutation` を offline で早期 return させる予定だったが、(a) `onLine` は LAN 接続だけ見て到達性を見ない、(b) Convex は短時間の切断を自動で吸収するので早期 return は常用ケースを壊す — の2点で撤回した。最終案は **`onLine` をバナー表示のみに使い、送信判断には「5秒未解決」という観測可能な事実だけを使う**（§9.2）。文言も「オフラインです」と断定せず「まだ保存されていません」にした。

### 19-10. 「アイコン PNG をコミットするのは生成物をコミットするのと同じで気持ち悪い」

**回答。** アイコンは art asset であって、ソースから決定的に導かれるビルド成果物とは性質が違う（絵を変える判断は人間がする）。毎ビルド `sharp`（native binary）を走らせると CI とローカルの環境差が増え、dev では `/icons/*.png` が404になる。`vp run icons` の手動再生成 + コミットが最小コスト（§6.3）。
**譲る点。** `sharp` が入らない環境では `scripts/build-icons.ts` 自体を省いてよい（§4.2 の逃げ道）。**コミットされた PNG が正で、スクリプトは便宜**という位置づけを明示した。

### 19-11. 「iOS のスプラッシュを1機種分だけ作るのは他機種で崩れる」

**回答。** `apple-touch-startup-image` は media query が完全一致したときだけ使われる。一致しない機種は「画像なし」= 現状と同じ挙動に落ちるだけで、引き伸ばしや崩れは起きない。1枚も置かないより悪くなることがないので、安全な追加である（§6.4）。

### 19-12. 「`skipWaiting: false` にすると、更新を無視した端末が古い版を使い続けて Web Push が動かない」

**回答。** `PushSubscription` は SW スクリプトのバージョンではなく `ServiceWorkerRegistration` に紐づくので、古い SW でも `push` イベントは届く。リスナーを足した版が有効になるまでのラグはあるが、それは更新通知（§8.2）とアプリの再起動で解ける。逆に `skipWaiting: true` は E1（実行中タブのチャンク不整合）を招くので、そちらのリスクが大きい。

### 19-13. 「スケジュールに『+ 予定を追加』ボタンを置かないのは手抜きだ。ドラッグを切ったら作成できなくなる」

**回答（前版の設計を削った）。** コードを読んだら、作成のタップ経路が既に3本あった（`onTimeSlotClick` / `onDayClick` / 年ビューの `onAdd`。§2.2 / §11.4）。前版が新設しようとしていたボタンと純関数 `defaultScheduleSlot(anchorDateJst, nowIso)` は**既存機能の再実装**で、AHA（`CODING_GUIDELINES.md`）に反する。
**譲る点。** 「`withDragSlotSelect={false}` にしてもスロットのタップが生きる」は `@mantine/schedule` の実装に依存する未確認事項なので、受け入れ条件に実測を入れ（§21.2）、死んでいた場合の逃げ道（既存の `DEFAULT_DAY_BLOCK_*` を使うボタン）まで §11.4 に書いた。**実装者が判断する余地は残していない。**

### 19-14. 「`interface` 禁止のリポジトリで SW だけ例外にするのは規約の穴になる」

**回答。** Serwist の `SerwistGlobalConfig` 拡張は declaration merging が必須で `type` では書けない。`sw/**` を `lint.ignorePatterns` に入れるのは「別ランタイム（WebWorker）で別 tsconfig を持つディレクトリ」だからで、`src/**` の規約は1文字も緩めない。ファイル冒頭に理由コメントを置く（§5）。
**譲る点。** PostToolUse hook（`.claude/settings.json`）は `sw/service-worker.ts` の `interface` に反応する可能性がある。その場合は global augmentation だけを `sw/serwist-global.d.ts` に切り出す。**どちらでも動くので実装者判断で良い唯一の箇所**として明示する。

### 19-15. 「5秒の未保存警告は全 mutation に噛むので、重いクエリの再検証で誤爆する」

**回答。** `runMutation` は mutation 専用で、`useSuspenseQuery` の再検証は通らない。5秒はユーザーが「押したのに何も起きない」と感じ始める境界より少し後ろで、Convex の通常のラウンドトリップ（数十〜数百 ms）とは2桁違う。
**譲る点。** 通知の文言を「送信中」/「まだ保存されていません。アプリを閉じると失われます。」にして、**失敗の断定を避けた**（実際には成功する途中かもしれない）。オンラインでサーバが遅いだけのときも同じ文言が出るが、その場合も事実として正しい。

### 19-16. 「下小口タブを `position: fixed` にすると、iOS の URL バー可変高やキーボード表示でバーが浮く」

**回答。** standalone では URL バーが無いので主症状は出ない。ブラウザで開いたときのアドレスバー伸縮は `position: fixed` + `env(safe-area-inset-bottom)` で実用上問題ない範囲に収まる（`dvh` を使うレイアウトを持たないため）。
**譲る点。** ソフトキーボード表示中はバーが入力欄に被りうる。`interactive-widget=resizes-content` を viewport に足す案は、Mantine のモーダル内スクロールとの相互作用が読めないので**採らない**。代わりに「キーボードが出る画面（記録の編集・目標フォーム）は Modal / Drawer 内にあり、Modal は `z-index: 200` でバーの上に出る」ので実害が小さいと判断した。実機で問題が出たら `.bottomBar` に `@media (max-height: 26em) { display: none }` を足すのが最小の対処（§22.2-5）。

---

## 20. CONTEXT.md / ADR / spec.md / 設計規則への影響

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

**既存の不整合を1つ見つけた（本仕様では直さない）。** CONTEXT「実行ボード」の _Avoid_ に「ドラッグで確定すること」があるが、CONTEXT「記録」は「カンバンではドラッグで即反映する」と言い、ADR-0011 は「カンバンのドラッグによる状態変更は即実行」と言い、実装（`board-kanban.tsx`）もドラッグで確定している。**「ドラッグだけを確定の唯一の入口にすること」への書き換えが妥当**（本仕様がメニュー経路を足すことで、この _Avoid_ は文字どおりの意味でも満たされる）だが、語彙の変更は §22.3 の人間の再確認ポイントに上げる。

### 20.2 新規 ADR: `docs/adr/0013-pwa-without-offline-writes.md`

**番号は 0013 で固定する（0012 ではない）。** 既存 ADR は `0011-board-day-navigation-and-skip-confirm.md` までで、空き番号は 0012 と 0013。`docs/specs/notifications.md` §16 が「ADR-0012 の新設を提案する」と書いており、実装順は通知(#56) → PWA(#58) なので **0012 は #56 が取る**。本仕様が 0012 を名乗ると同じ番号のファイルが2本できる。実装時に `ls docs/adr/` して 0012 の状況を確認すること。**0012 が空のままでも番号を繰り上げず 0013 のままにする** — 連番の美しさより衝突しないことが大事で、#56 が後から 0012 を埋められる。

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

規則1 のモバイル記述を §10.5 の文に置き換える。「実装者向けの注記」に1行足す。

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
5. **オフライン UI**: `use-online-status.ts`、`OfflineBanner`、`run-mutation.ts` の5秒警告。
6. **モバイルナビ**: `app-shell.tsx` / `.module.css`、`app-shell.test.tsx`。設計規則の改訂。
7. **モバイル共通の詰め**: `styles.css` の16px、safe-area、`DayRolloverGuard`。
8. **カンバンのドラッグ代替**: `kanban-order.ts` の純関数 → `onStatusMove` → `board-kanban-card-menu.tsx` → `board-kanban.module.css`。
9. **スケジュールのモバイル**: `isCompact` でドラッグ無効化 → **タップ作成が生きているか実測** → 死んでいたら §11.4 の逃げ道。
10. **マイページとログイン**: `use-install-prompt.ts`、`InstallAppSection`、`login-screen.tsx` の並び（E7）。
11. **文書**: CONTEXT.md、ADR-0013、spec.md、design-live-board.md。

### 21.2 受け入れ条件

- `vp check` / `vp test` / `vp build` が通る。`vp run fallow` に新規の未使用が出ない。
- `vp build && vp preview` で:
  - `GET /sw.js` が 200、`GET /manifest.webmanifest` が 200（Content-Type が `application/manifest+json` か `application/json`）。
  - DevTools > Application > Service Workers に登録が出る。Manifest にアイコン5点とショートカット3点が出て警告0。
  - DevTools を offline にして**リロード** → `offline.html` が出る。online に戻すと自動で `/` に戻る。
  - DevTools を offline にして**記録を確定** → 5秒後に「まだ保存されていません」が出る。online に戻すと消え、記録が確定する。
  - Network タブで `/api/**` と `*.convex.cloud` が SW を経由していない（`Size` 列が `(ServiceWorker)` にならない）。
- Chrome の「アプリをインストール」が出る（Lighthouse に PWA カテゴリが無い版では、これで代替する）。
- 幅 375px で:
  - 下小口タブ4本 + 「その他」が親指の届く位置に出て、本文がバーに隠れない。「その他」側のページ（項目など）に居るとき「その他」が active に見える（E22）。
  - カンバンが横スナップで1画面1列。スワイプで「戻る」が発火しない。掴み手が見えない。
  - カードの `⋮` から 進行中 / 完了 / 未着手 / 見送り / 上へ / 下へ が操作できる。「完了にする」で確定エディタが開く行（分数0・計測なし）と開かない行の両方を確認。**計測中の行では、エディタを開かず計測値（`stopTimer` の戻り値）でそのまま確定し、Toast「学習時間 n分を記録しました」が出ることを実機で確認する**（ドラッグ経路と同じ数字になること）。
  - **スケジュールのスロットをタップすると作成フォームが開く**（§11.4 の前提の実測）。予定をタップすると編集フォームが開く。ドラッグでは何も起きない。
  - 入力にフォーカスしても iOS がズームしない。
- 幅 1280px で右小口レール・5列カンバン・ドラッグが**現状のまま**であること。

---

## 22. 次チケットへの引き渡し

### 22.1 Web Push の所有者表（[notifications.md](notifications.md) §18.1 と同一内容）

**Web Push 一式の所有者は #58 完了後の後続チケットである。** #58 は SW の土台までしか作らず、#56 は設計だけを置く。この表が唯一の割り当てで、片方の文書が「相手の仕事」と書いて誰も実装しない状態を作らないためにある。

| 項目 | #58（本仕様・PWA の土台） | #56（通知） | #58 完了後の後続チケット |
| --- | --- | --- | --- |
| `sw/service-worker.ts` の存在と「`serwist.addEventListeners()` の前に自前リスナーを足す」作法 | **作る**（§5） | — | その作法に従ってリスナーを足す |
| SW の `push` / `notificationclick` / `pushsubscriptionchange` リスナー | 作らない | 作らない | **作る** |
| `pushSubscriptions` 表（validator + index） | 作らない | 作らない | **作る**（notifications.md §5 のスキーマ規約に従う） |
| `deliverWebPush` internalAction + `emitNotification` の schedule 行 | — | 作らない（設計のみ） | **作る** |
| SW の登録・スコープ（`/`）・更新フロー | **作る**（§8） | — | 触らない |
| マイページの「アプリとして使う」セクションの**存在** | **作る**（§8.3） | そこに通知トグルを足す | そこに Web Push の権限要求を足す |
| 権限要求のタイミングと文言 | — | 決める | 実装する |
| iOS はホーム画面追加が Web Push の前提であること | **明示する**（§2.3-4 / §3.2-3） | 前提として使う | 前提として使う |
| ADR 番号 | **0013**（`0013-pwa-without-offline-writes.md`。§20.2） | **0012**（notifications.md §16 の提案） | 必要なら 0014 以降 |

### 22.2 実機・実ビルドで確認が必要な事項（設計判断ではなく事実確認）

1. iOS のホーム画面アプリで `apple-touch-startup-image` が無いとき、起動画面は `background_color` になるか白になるか。白なら §6.4 の2枚を所有者の実機サイズで生成する。
2. iOS のホーム画面アプリで Notion OAuth が同一 web app 内に戻るか、Safari に逃げるか（E7 の注記の強さを決める）。
3. `type: "module"` の SW が所有者の iOS バージョンで登録できるか。できなければ `scripts/build-sw.ts` の `formats` を `["iife"]`（`build.lib.name` 必須）に変え、`register` の `type` を落とす。
4. `.output/public` が実際の出力ディレクトリであること（`vp build` 後に `ls .output/public`）。違えば `scripts/build-sw.ts` の `OUT` を実測値に直す。あわせて `/sw.js` に付くキャッシュヘッダを確認する（§4.4 末尾）。
5. モバイルでソフトキーボードが出たとき下小口バーが入力欄に被らないか（§19-16。被るなら `@media (max-height: 26em) { display: none }`）。
6. `@mantine/hooks` に `useNetwork` / `useMediaQuery` が存在すること（本セッションでは `node_modules` 未インストールで未確認。無ければ §9.1 の `useSyncExternalStore` 実装に落とす）。

### 22.3 人間の再確認ポイント

- design-live-board.md 規則1 の改訂（右小口 → モバイルは下小口）。デザインファイルに描かれていない変更である。
- モバイル一次ナビの4本（日 / ボード / 履歴 / 目標）と「その他」の3本（項目 / プリセット / ゴミ箱）の割り方。
- モバイルでカンバンの列間ドラッグを捨てる決定。
- オフラインで読み取りを一切出さない決定（ADR-0013）。
- CONTEXT「実行ボード」の _Avoid_「ドラッグで確定すること」の書き換え（ADR-0011 と実装との既存不整合。§20.1）。
- **ADR 番号の割り当て**: 0012 を #56（通知）、0013 を #58（本仕様）に固定した。`docs/specs/notifications.md` §16 には「0012 を予約」という明記が**まだ無い**（本仕様は他仕様を書き換えない）。#56 の実装時にその1行を足すか、逆の割り当てにするかを確認すること。
- アイコン PNG をコミットする運用（§19-10）。
- `sw/**` を lint 対象外にして `interface` を1箇所だけ許すこと（§19-14）。

### 22.4 別チケット候補（本仕様では却下したもの）

- **オフライン読み取りの限定導入**: TanStack Query の永続化で `days.get` の今日1本のみ、「オフライン時点の写し」ラベル必須、その画面では書き込み UI を全無効化（§19-3 の譲歩条件）。
- **バックグラウンド同期**: Background Sync API によるオフライン書き込みの再送。Convex の mutation を SW から呼ぶ経路が無いので、実質「自前の書き込みキュー」を作る話になる。ADR-0013 を覆す規模。
- **カンバン列見出しの表示名統一**: 列見出しが状態の生値（確定 / スキップ）、カードの Menu とバッジが表示名（完了 / 見送り）という既存の不整合（§11.2）。表示名に寄せるのが妥当だが、`KANBAN_COLUMNS` が `droppableId` を兼ねているので分離が必要。

---

## 改訂（2026-09-02）: ナビ9本とレビューの置き場（#77）

§10.1〜§10.3 は右小口7本を前提に書いたが、その後 `/methods`（方法カタログ）が8本目、`/review`（レビュー）が9本目として加わった。決定は次のとおり。

- `NAV_ROUTES` は `["/", "/board", "/history", "/review", "/items", "/presets", "/goals", "/methods", "/trash"]`。レビューは履歴の直後。
- `MOBILE_PRIMARY` は4本のまま。「その他」メニューは レビュー / 項目 / プリセット / 方法 / ゴミ箱 の5本。
- §17 のテスト期待値: 下小口は4本で `/review` を含まない、「その他」にレビューが出る、右小口では `/review` が `/history` の直後に並ぶ（`src/components/app-shell.test.tsx`）。
- `CONTEXT.md`「ホーム画面アプリ」の _Avoid_「8番目のナビタブ」は「ホーム画面アプリをナビタブにすること」に書き換えた（本数の上限ではなく、インストール導線をタブにしないという意図）。
