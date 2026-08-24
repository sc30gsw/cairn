# 学習タイマー設計（#51）

- 状態: 決定済み（2026-08-24）。実装は別セッション。
- 対象: 記録（`rows`）の**進行中**に紐づく経過時間の計測。開始・停止、分数への反映、実行ボードの「進行中」との関係、複数タブ・リロード・放置への耐性、手入力分数との併存。
- 前提となる決定: 記録の状態は 確定 / 未着手 / 進行中 / スキップ の固定4値（CONTEXT「記録」）。進行中は実行ボードで直接操作する（CONTEXT「進行中」）。学習量は**確定した記録の分数合計**のみ（CONTEXT「学習量」）。
- 守る規約: [CVX-14](../../.claude/rules/convex-rules.md)（query で `Date.now()` を呼ばない）、CVX-02/03/04/05/10/11/12/13/15/16/17/20、[design-live-board.md](../../.claude/rules/web/design-live-board.md)（Paper Redesign・ライト固定・ハードコード hex 禁止）。
- このドキュメントの担当範囲: **タイマーの状態機械・スキーマ・関数サーフェス・経過導出・UI 構造・エッジケース**。週次/月次レビューの集計、通知、PWA は範囲外（§19）。

---

## 1. 決定の要約

1. **タイマーは「進行中」の副状態**であり、新しい記録の状態を作らない。`進行中` = 取り組み中（CONTEXT のまま）で、その内側に `計測中` / `一時停止` / `計測なし` の3つを持つ（§4）。
2. **開始時刻はサーバが持ち、経過は画面が導出する。** `rows` に `timerStartedAt`（epoch ms, mutation で `Date.now()`）を保存し、query は時計を読まない（CVX-14）。表示は `Date.now() - timerStartedAt + timerAccumulatedMs` の派生値（§8）。
3. **記録された分数の正は `rows.minutes` のまま。** タイマーは学習量の別系統を作らない。計測値は**確定時の分数の初期値**として使われるだけで、確定は今までどおり `rows.confirm({ content, minutes })` を通る（§11）。
4. **確定前にサーバで区間を畳む。** 確定は `stopTimer`（サーバの `Date.now()` で区間を `timerAccumulatedMs` に加算し、加算後の ms を返す）→ プレフィルされた確定モーダル → `confirm` の順。これで**端末の時計ずれが記録値に入らない**（§8.3）。
5. **複数タブ・リロードに専用機構を入れない。** Convex の reactive query が `timerStartedAt` を全タブへ配るので、全タブが同じサーバ値から同じ経過を導く。`BroadcastChannel` も `localStorage` 同期も持たない（§9）。
6. **放置は決定的なクランプで潰す。** 1区間の上限は **240分**。上限は `timerStartedAt` だけから決まる純関数なので、掃除 cron が遅れても記録される値は変わらない。cron（15分間隔の `internalMutation`）は自動停止を書き込み、`timerAutoStoppedAt` を立てて画面に警告を出す。**自動確定はしない**（§10）。
7. **同時に計測できるのは1件。** 進行中の記録は何件あってもよいが、`timerStartedAt` を持つのは所有者につき最大1件。別の記録の計測を始めると、走っていた計測は自動で一時停止する（エラーにしない）（§4.4）。
8. **既存データの移行は不要。** 追加は3つの optional フィールドだけ。既に `進行中` の記録は「計測なし」として表示され、▶ で計測を始められる（§5.3）。

---

## 2. 現状（コードから確認した事実）

タイマーの土台はすでに揃っている。**新規に作るのは「時間を測る部分」だけ**で、状態機械の骨は既存のものを使う。

| 既存要素 | 場所 | 事実 |
| --- | --- | --- |
| 記録の状態 | `convex/lib/domain.ts` | `STATUSES = ["確定", "未着手", "進行中", "スキップ"]`。`convex/lib/validators.ts` の `statusValidator` が SSoT。 |
| 未着手→進行中 | `convex/mutations/rows/start.ts` / `convex/services/rows/start.ts` | `status !== "未着手"` を拒否して `status: "進行中"` に patch するだけ。時間は一切持たない。 |
| 進行中→未着手 | `convex/mutations/rows/pause.ts` / `services/rows/pause.ts` | 「取り消し」。関数名は `pause` だが**一時停止ではない**（§7.4 の命名注意）。 |
| 確定→進行中 | `services/rows/reopen.ts` | `withMasteryProgressDelta` で囲んで status のみ patch。 |
| 確定 | `services/rows/confirm.ts` | `content` / `minutes` / `status: "確定"` を patch。分数は**常に呼び出し側が渡した値**。 |
| カンバンの遷移解決 | `src/features/board/lib/kanban-order.ts` | `resolveKanbanStatusMove` が `start` / `pause` / `reopen` / `confirm` / `skip` / `unskip` / `unconfirm` を返す純関数。 |
| 確定モーダル | `src/features/board/components/board-kanban-confirm-modal.tsx` | `needsKanbanConfirmEditor(row)`（`content` が空 or `minutes === 0`）のときだけ開く。開かないときは**行の既存 `minutes` がそのまま確定される**。 |
| 楽観更新 | `src/hooks/use-row-mutations.ts` / `src/lib/optimistic-day-rows.ts` | `setDayRowStatus` が `days.get` のキャッシュ内の `status` だけ差し替える。 |
| 日ページの分数入力 | `src/features/today/components/row-editor.tsx` | Formisch + `RowEditorSchema`。`saveIfConfirmedDirty` は `row.status !== "確定"` なら早期 return（= 確定前の手入力はフォームのローカル状態）。Switch を入れるとフォームの `minutes` で確定する。 |
| 掃除 cron の先例 | `convex/crons.ts` + `convex/mutations/trash/purgeExpired.ts` | `internalMutation({ args: { now: v.optional(v.number()) } })` を cron から呼び、サービス側で `args.now ?? Date.now()`。`rows` の疎インデックス `by_deletedAt` に `gte(0).lte(cutoff)` の範囲を当てて `.collect()`。 |
| owner ラッパ | `convex/lib/ownerFunctions.ts` | `ownerQuery` / `ownerMutation` が `ctx.ownerId` を載せる（CVX-04 はこれで満たす）。 |

重要な**現状のバグ**を1つ確認した。実行ボードでカンバンの `進行中` カードを `確定` にドラッグしたとき、`content` が入っていて `minutes !== 0` なら確定モーダルは開かず、**プリセットの目安分数がそのまま実績になる**。タイマーを載せるとこれは「計測結果を捨てる」経路になるので、§11.3 で塞ぐ。

---

## 3. 語彙（CONTEXT.md への追記案）

タイマーは新しい概念なので CONTEXT に2語を足す。既存の「進行中」「記録」「学習量」の定義は**変えない**（タイマーはその内側に入る）。

```md
**計測**:
進行中の記録が測っている経過時間。開始時刻はサーバが持ち、経過は画面が導出する。計測した時間は確定
のときに分数の初期値になり、そこで手直しできる。分数の正は記録の分数のままで、計測は学習量の別系統
ではない。同時に計測するのは1件だけ。1区間が240分に達すると自動停止する。
_Avoid_: 計測を学習量の別系統にすること, 計測値を自動で確定すること, 画面を見ていた時間だけ数えること,
計測なしの進行中を禁止すること, 記録の状態に「計測中」を足すこと

**自動停止**:
1区間が240分を超えた計測を、進行中のまま止めること。放置の後始末であり、確定でも見送りでもない。
分数は自分で直してから確定する。
_Avoid_: 自動で確定すること, 自動で未着手に戻して計測を捨てること, 日付が変わったら止めること
```

CONTEXT「進行中」の _Avoid_ に1項追加する。

```md
_Avoid_: 日ページに進行中ボタンを置くこと, 進行中を未着手と同じ UI に潰すこと, 計測中を別の状態として数えること
```

ADR の新規作成は不要。ADR-0007（実績カウンタの非正規化）とは干渉しない — 計測フィールドは確定分数を動かさないので、`withMasteryProgressDelta` を通す必要があるのは既存の `confirm` / `reopen` / `unconfirm` / `skip` のままである（§7.4）。

---

## 4. 状態機械

### 4.1 記録の状態 × 計測の副状態

記録の状態（4値）は変えない。計測の副状態は**保存フィールドから導出する派生値**で、DB には持たない。

| 記録の状態 | 計測の副状態 | 導出条件 | 画面の見え方 |
| --- | --- | --- | --- |
| 未着手 | — | 計測フィールドなし（不変条件） | グレーのバッジのみ |
| 進行中 | 計測なし | `timer === null`（移行前の既存行） | 「進行中」+ ▶ 開始 |
| 進行中 | 計測中 | `timer.startedAt !== null` | 「進行中」+ 走る時計 + ⏸ + 確定 |
| 進行中 | 一時停止 | `timer.startedAt === null && timer.accumulatedMs > 0` | 「進行中」+ 止まった分数 + ▶ + 確定 |
| 進行中 | 自動停止 | 一時停止 かつ `timer.autoStoppedAt !== null` | 上記 + 「自動停止しました」の警告 |
| 確定 | — | 計測フィールドなし（不変条件） | 緑「完了」+ 確定分数 |
| スキップ | — | 計測フィールドなし（不変条件） | 黄「見送り」 |

導出は純関数 `timerRunState(timer)`（§6）に一本化する。UI で `startedAt !== null` を直接読まない。

### 4.2 遷移表

`now` は **mutation 内の `Date.now()`**（サーバ時計）。`elapsed` は `segmentElapsedMs(startedAt, now)`（240分でクランプ）。

| # | 操作 | 前提 | mutation | `status` | `timerStartedAt` | `timerAccumulatedMs` | `timerAutoStoppedAt` | `minutes` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | 開始（着手） | 未着手 | `rows.start` | → 進行中 | `now` | `0` | 消す | 変えない（目安のまま） |
| T2 | 計測を止める | 進行中・計測中 | `rows.stopTimer` | 進行中 | 消す | `+= elapsed` | 変えない | 変えない |
| T2' | 計測を止める（冪等） | 進行中・計測中でない | `rows.stopTimer` | 進行中 | — | — | — | — （書き込みなし。現在値を返す） |
| T3 | 計測を再開 | 進行中・計測中でない | `rows.resumeTimer` | 進行中 | `now` | 現在値（無ければ `0`） | 消す | 変えない |
| T4 | 自動停止 | 進行中・計測中・`now - startedAt >= 240分` | `rows.autoStopTimers`（cron / internal） | 進行中 | 消す | `+= 240分` | `now` | 変えない |
| T5 | 他の記録の計測開始で退避 | 進行中・計測中（別の行が T1/T3） | 同一トランザクション内 | 進行中 | 消す | `+= elapsed` | 変えない | 変えない |
| T6 | 確定 | 任意（進行中含む） | `rows.confirm` | → 確定 | 消す | 消す | 消す | **引数の値** |
| T7 | 未着手へ戻す（計測を捨てる） | 進行中 | `rows.pause` | → 未着手 | 消す | 消す | 消す | 変えない |
| T8 | 見送り | 未着手 / 進行中 | `rows.skip` | → スキップ | 消す | 消す | 消す | 変えない |
| T9 | 確定を進行中へ戻す | 確定 | `rows.reopen` | → 進行中 | `now` | `minutes × 60000` | 消す | 変えない |
| T10 | 確定を未着手へ戻す | 確定 | `rows.unconfirm` | → 未着手 | 消す（防御） | 消す | 消す | 変えない |
| T11 | 見送り取消 | スキップ | `rows.unskip` | → 未着手 | 消す（防御） | 消す | 消す | 変えない |
| T12 | ゴミ箱へ | 任意 | `rows.remove` | 変えない | 消す | 消す | 消す | 変えない |

- **T9 が「手入力分数との併存」の要点**。確定済み 30分 の記録を進行中へ戻すと、計測は 30分 から続く。目安分数（プリセット由来）は実績ではないので、T1 では `0` から始める。この非対称は意図的。
- **T7 は破壊的**（計測を捨てる）ので、UI 側で必ず Confirm を出す（§13.4）。
- T4 は `status` を変えない。**自動確定・自動見送りはしない**（学習量は所有者の判断だけで動く）。

### 4.3 不変条件（実装が守り、テストが確認する）

| 不変条件 | 根拠 |
| --- | --- |
| 計測フィールドは `status === "進行中"` のときだけ存在する | 4状態の意味を汚さない。他の状態で残ると学習量の解釈が二重になる |
| `timerStartedAt` が存在するとき `timerAccumulatedMs` も存在する | 計測中は必ず `start + accumulated` の2項で表せる |
| `timerAutoStoppedAt` が存在するとき `timerStartedAt` は存在しない | 自動停止は「止まっている」状態 |
| 所有者ごとに `timerStartedAt` を持つ行は最大1件 | 同時計測による二重計上を防ぐ |
| 削除済み（`deletedAt !== undefined`）の行は計測フィールドを持たない | T12 で消すため。cron の掃除対象にゴミ箱が混ざらない |
| `timerAccumulatedMs >= 0` | クランプ後の加算のみ |

スキーマ（optional フィールドの集合）ではこの不変条件を表現できないので、**サービス層で守り、`convex/rowTimer.test.ts` の統合テストで確認する**（§16）。

### 4.4 同時計測の一意性

`rows.start` / `rows.resumeTimer` / `rows.reopen` は、書き込みの前に共通ヘルパ `stopRunningTimer(ctx, ownerId, exceptRowId)` を呼ぶ。ヘルパは `by_owner_and_timerStartedAt` で走っている行を引き、あれば T5 を適用する。**同一 mutation トランザクション内**で行うので、二重計上の隙間はできない（CVX-15）。

エラーにしない理由: 開始はカンバンのドラッグから起きる。ドラッグの途中で「他が計測中です」と失敗させると、行は進行中に移ったのに計測は始まらない、という半端な状態をユーザーに見せることになる。自動退避のうえでトースト（`notifySuccess`）で「〈項目名〉の計測を止めました」と伝える方が、実際の操作の意図に合う。

---

## 5. スキーマ変更（CVX-10/11/12/13/16）

### 5.1 `convex/lib/validators.ts`

```ts
//* 進行中の記録が測っている経過。開始時刻はサーバが持ち(mutation の Date.now())、経過は画面が導出する(CVX-14)。
//? DTO は null 正規化して全キーを必ず出す。dayDtoValidator の condition / memo と同じ規則。
export const rowTimerDtoValidator = v.object({
  accumulatedMs: v.number(),
  autoStoppedAt: v.union(v.number(), v.null()),
  startedAt: v.union(v.number(), v.null()),
});

export type RowTimerDto = Infer<typeof rowTimerDtoValidator>;

export const rowDtoValidator = v.object({
  _id: v.id("rows"),
  category: v.string(),
  categorySortOrder: v.number(),
  content: v.string(),
  itemId: v.id("items"),
  itemName: v.string(),
  minutes: v.number(),
  sortOrder: v.number(),
  status: statusValidator,
  //? 計測が無い行は null。進行中でないなら常に null(§4.3 の不変条件)。
  timer: v.union(rowTimerDtoValidator, v.null()),
});
```

**入れ子の DTO 1つにする理由**: 行 DTO は `days.get` で毎行返る。3つの nullable フィールドを平らに並べると、`row.timer === null` という「計測が無い」の判定が3項の合成になり、UI 側で条件が散る。入れ子なら判定は1つで済み、`RowTimerDto` を props 型としてそのまま渡せる。

`breakdownRowValidator` / `monthEventValidator` / `trashedRowValidator` / `shareRowValidator` は**変えない**。履歴・共有文・ゴミ箱に計測は出ない（確定分数だけが実績、CONTEXT「学習量」）。

### 5.2 `convex/schema.ts`

```ts
  rows: defineTable({
    content: v.string(),
    dateJst: v.string(),
    dayId: v.id("days"),
    deletedAt: v.optional(v.number()),
    itemId: v.id("items"),
    minutes: v.number(),
    ownerId: v.string(),
    sortOrder: v.number(),
    status: statusValidator,
    //* 計測(#51)。進行中のときだけ存在する(docs/specs/study-timer.md §4.3)。
    //? 自動停止の目印。一時停止と区別して「分数を直してから確定して」と促すためだけに持つ。
    timerAutoStoppedAt: v.optional(v.number()),
    timerAccumulatedMs: v.optional(v.number()),
    //? 走っている区間の開始時刻(サーバの epoch ms)。undefined = 計測していない。
    timerStartedAt: v.optional(v.number()),
  })
    .index("by_day", ["dayId"])
    .index("by_item", ["itemId"])
    .index("by_owner_and_date", ["ownerId", "dateJst"])
    .index("by_owner_and_deletedAt", ["ownerId", "deletedAt"])
    .index("by_deletedAt", ["deletedAt"])
    //? 所有者の「いま計測中の1件」を引く(runningTimer / stopRunningTimer)。
    .index("by_owner_and_timerStartedAt", ["ownerId", "timerStartedAt"])
    //? cron の全所有者掃除。by_deletedAt / by_owner_and_deletedAt と同じ「全体用+所有者用」の対。
    //? 先頭列が違うので CVX-12 のプレフィックス重複ではない。
    .index("by_timerStartedAt", ["timerStartedAt"]),
```

インデックスの正当化（CVX-12）:

- `by_owner_and_timerStartedAt` — 所有者の計測中1件を引く。`q.eq("ownerId", ownerId).gte("timerStartedAt", 0)` + `.take(1)`。
- `by_timerStartedAt` — cron は全所有者を横断するので所有者付きインデックスでは引けない。`q.gte("timerStartedAt", 0).lte("timerStartedAt", cutoff)` で**期限切れだけ**に絞るので `.collect()` の件数は数件（CVX-11）。同じ表の `by_deletedAt` / `by_owner_and_deletedAt` がまったく同じ理由で共存しているので、前例に従う。
- どちらも `.filter()` を使わない（CVX-10）。`deletedAt` の除外は取得後の TypeScript 側で行う（不変条件により本来0件だが防御する）。

### 5.3 移行（マイグレーション不要）

3つとも `v.optional` の追加なので、既存ドキュメントはそのまま通る。`@convex-dev/migrations` は入れない。バックフィルもしない。

- 既存の `進行中` 行 → `timer: null`（「計測なし」）。▶ を押せば T3 で計測が始まる。
- 既存の `確定` / `未着手` / `スキップ` 行 → `timer: null`。不変条件を最初から満たしている。
- ロールバック: 実装をひとつ前に戻すと `timerStartedAt` を持つ行が残るが、`statusValidator` も `minutes` も無傷なので**学習量・履歴・共有文はいっさい壊れない**。放置された計測フィールドは次の実装で自然に消える。破壊的なロールバック手順は不要。

---

## 6. 純関数（`convex/lib/rowTimer.ts`）

サーバ（サービス・cron）とクライアント（表示）が**同じ関数**を使う。クライアントからは `~domain/rowTimer` で読む（`~domain/*` → `convex/lib/*`、`tsconfig.json`）。Convex ランタイムを import しない（spec.md「ドメインの不変条件は Convex ランタイムを import しない純関数に置く」）。

```ts
import type { RowTimerDto } from "./validators";

//* 1区間の上限。これを超えた計測は放置と見なして自動停止する(§10)。
//? 「4時間続けて1件の記録に取り組む」は現実の上限で、それ以上は寝落ち・閉じ忘れの側が確率的に高い。
export const TIMER_MAX_SEGMENT_MS = 4 * 60 * 60 * 1000;

export const TIMER_AUTO_STOP_MINUTES = TIMER_MAX_SEGMENT_MS / 60_000; // 240

export type TimerRunState = "一時停止" | "計測なし" | "計測中";

export function timerRunState(timer: RowTimerDto | null): TimerRunState {
  if (timer === null) {
    return "計測なし";
  }
  if (timer.startedAt !== null) {
    return "計測中";
  }
  return timer.accumulatedMs > 0 ? "一時停止" : "計測なし";
}

//* 走っている区間の経過。負(時計のずれ)は0に、上限超過は上限に丸める。
export function segmentElapsedMs(startedAt: number, nowMs: number): number {
  const raw = nowMs - startedAt;
  if (raw <= 0) {
    return 0;
  }
  return Math.min(raw, TIMER_MAX_SEGMENT_MS);
}

export function isSegmentExpired(startedAt: number, nowMs: number): boolean {
  return nowMs - startedAt >= TIMER_MAX_SEGMENT_MS;
}

//* 表示・プレフィルに使う「いままでの計測合計」。
export function measuredMs(timer: RowTimerDto | null, nowMs: number): number {
  if (timer === null) {
    return 0;
  }
  if (timer.startedAt === null) {
    return timer.accumulatedMs;
  }
  return timer.accumulatedMs + segmentElapsedMs(timer.startedAt, nowMs);
}

//* 計測 ms → 記録の分数。学習量は整数分の合計なので、ここで整数に落とす。
//? 30秒でも「やった」を0分にしない。1ms でも測ったら最低1分。
export function timerMinutes(ms: number): number {
  if (ms <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(ms / 60_000));
}

export function hasTimerState(timer: RowTimerDto | null): boolean {
  return timer !== null && (timer.startedAt !== null || timer.accumulatedMs > 0);
}
```

時計の表示整形（`0:12:34` / `12:34`）は UI 専用なので `src/features/board/lib/timer-clock.ts` に置く（`convex/lib` に UI 文字列を入れない）。

```ts
export function formatTimerClock(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours === 0 ? mmss : `${String(hours)}:${mmss}`;
}
```

---

## 7. 関数サーフェス（CVX-01/02/03/04/05/20）

### 7.1 新規 mutation（1関数1ファイル）

| ファイル | export | 種別 | args | returns | 委譲先 |
| --- | --- | --- | --- | --- | --- |
| `convex/mutations/rows/stopTimer.ts` | `stopTimer` | `ownerMutation` | `{ rowId: v.id("rows") }` | `v.number()`（加算後の `timerAccumulatedMs`） | `services/rows/stopTimer.ts` |
| `convex/mutations/rows/resumeTimer.ts` | `resumeTimer` | `ownerMutation` | `{ rowId: v.id("rows") }` | `v.null()` | `services/rows/resumeTimer.ts` |
| `convex/mutations/rows/autoStopTimers.ts` | `autoStopTimers` | `internalMutation` | `{ now: v.optional(v.number()) }` | `v.null()` | `services/rows/autoStopTimers.ts` |

```ts
// convex/mutations/rows/stopTimer.ts — API 層は薄く保つ(CVX-02)
import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { stopTimer as stopRowTimer } from "../../services/rows/stopTimer";

export const stopTimer = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => stopRowTimer(ctx, ctx.ownerId, args),
  //? 確定モーダルのプレフィルに使うので、加算後の値を返す(クライアント時計を使わせない)。
  returns: v.number(),
});
```

`autoStopTimers` は `internalMutation`（`convex/_generated/server` から import）。`ownerMutation` は使えない（cron に identity は無い）。`purgeExpired` とまったく同じ形にする。

### 7.2 新規 query

| ファイル | export | args | returns |
| --- | --- | --- | --- |
| `convex/queries/rows/runningTimer.ts` | `runningTimer` | `{}` | `v.union(runningTimerDtoValidator, v.null())` |

```ts
//* いま計測中の1件。どの画面にいても「計測中」を見せるため(§13.2)。
//? args は空。Date.now() も dateJst も要らない — 走っているかどうかは保存フィールドだけで決まる(CVX-14)。
export const runningTimerDtoValidator = v.object({
  _id: v.id("rows"),
  dateJst: v.string(),
  itemName: v.string(),
  timer: rowTimerDtoValidator,
});
```

サービス `convex/services/rows/loadRunningTimer.ts`:

```ts
const running = await ctx.db
  .query("rows")
  .withIndex("by_owner_and_timerStartedAt", (q) =>
    q.eq("ownerId", ownerId).gte("timerStartedAt", 0),
  )
  .take(1);
```

`.filter()` なし（CVX-10）、`.take(1)`（CVX-11）。取得後に `deletedAt !== undefined` を TypeScript 側で弾く（不変条件により0件だが防御）。項目名は既存の `loadCatalog` で引く。

### 7.3 crons

```ts
// convex/crons.ts に追加
crons.interval(
  "auto stop stale row timers",
  { minutes: 15 },
  internal.mutations.rows.autoStopTimers.autoStopTimers,
  {},
);
```

`internal.*` のみを指す（CVX-05）。`crons.interval` が使えない場合は `crons.cron("auto stop stale row timers", "*/15 * * * *", ...)` に置き換える（意味は同じ。既存の `crons.daily` / `crons.hourly` と同じ `cronJobs()` の API）。**15分という粗さが値を変えないこと**が設計の要点: 加算値は `TIMER_MAX_SEGMENT_MS` 固定（`now` に依らない）で、`timerAutoStoppedAt` は目印にしか使わない。cron が30分遅れても記録される分数は 240分 のままである。

### 7.4 既存関数の改修

| ファイル | 変更 |
| --- | --- |
| `services/rows/start.ts` | `stopRunningTimer(ctx, ownerId, args.rowId)` を呼んだうえで `{ status: "進行中", timerAccumulatedMs: 0, timerAutoStoppedAt: undefined, timerStartedAt: Date.now() }` に patch（T1） |
| `services/rows/reopen.ts` | `withMasteryProgressDelta` の中で `stopRunningTimer` → `{ status: "進行中", timerAccumulatedMs: row.minutes * 60_000, timerAutoStoppedAt: undefined, timerStartedAt: Date.now() }`（T9） |
| `services/rows/confirm.ts` | patch に `timerAccumulatedMs: undefined, timerAutoStoppedAt: undefined, timerStartedAt: undefined` を追加（T6）。**分数はいままでどおり引数の値**。サーバで測り直さない（§11.2） |
| `services/rows/pause.ts` | patch に計測3フィールドの `undefined` を追加（T7）。関数名は変えない（§7.5） |
| `services/rows/skip.ts` / `unskip.ts` / `unconfirm.ts` / `remove.ts` | 同じ3フィールドを `undefined` に（T8/T10/T11/T12）。共通ヘルパ `clearTimerFields()` が返すオブジェクトを patch に展開する |
| `services/days/toRowDtos.ts` | `timer: toRowTimerDto(row)` を追加（`startedAt === undefined && accumulatedMs === undefined` なら `null`） |
| `services/rows/switchPreset.ts` | 変更なし。差し替えるのは未着手行だけなので、進行中の計測は残る（CONTEXT「プリセット」のまま） |

新規サービスヘルパ（1関数1ファイル、CVX-20）:

- `convex/services/rows/stopRunningTimer.ts` — 所有者の計測中1件を畳む（T5）。`exceptRowId` を受ける。
- `convex/services/rows/clearTimerFields.ts` — 3フィールドを `undefined` にした patch 断片を返す純関数。
- `convex/services/rows/toRowTimerDto.ts` — `Doc<"rows">` → `RowTimerDto | null`。

`ctx.db.patch("rows", id, { timerStartedAt: undefined })` はフィールドを**削除する**（Convex の patch セマンティクス）。すべての `ctx.db.*` はテーブル名を第1引数に取る（CVX-13）。すべての patch / query を `await` する（CVX-17）。

### 7.5 命名の注意（実装者向け）

`rows.pause` は**一時停止ではなく「進行中の取り消し（未着手へ戻す）」**である（既にデプロイ済みの名前）。タイマーの一時停止は `rows.stopTimer` である。改名（`pause` → `unstart`）は `kanban-order.ts` の `KanbanStatusMove`、`use-row-mutations.ts`、既存テストに波及するので**今回は行わない**。代わりに次を必須とする。

- `services/rows/pause.ts` の先頭に `//? 一時停止ではない。進行中の取り消し(未着手へ戻す)。計測の一時停止は stopTimer。` を書く。
- UI の文言は関数名から離す。カンバンの `進行中 → 未着手` ドラッグの Confirm タイトルは「計測を捨てて未着手に戻しますか？」。

---

## 8. サーバ時刻基準の経過導出（CVX-14）

### 8.1 なぜ query が時計を読めないか

Convex の query は依存データが変わったときだけ再実行される。`Date.now()` を読む query は、時間が経っても再実行されないので**古い値を返し続け、しかもキャッシュを汚す**。したがって「いま何分経ったか」を query の返り値にすることはできない。

この設計の答えは CVX-14 の「1. 状態フラグ方式」と「2. 引数方式」の**併用**である。

- 保存するのは**時刻**（`timerStartedAt`）だけ。query はそれをそのまま返す（時計を読まない）。
- 「いま」は**画面が持ち込む**。1秒ごとに更新される `nowMs` を React の state に持ち、`measuredMs(timer, nowMs)` で導出する。query の引数に `nowMs` を渡すことは**しない**（1秒ごとに別のキャッシュキーができ、購読が毎秒張り替わる）。
- 期限切れ（自動停止）は「状態フラグ方式」で cron が書き込む（§7.3）。

### 8.2 画面側の刻み（`src/features/board/hooks/use-timer-tick.ts`）

```ts
//* 計測中の行があるときだけ1秒刻みで再描画する。止まっているときは interval を張らない。
export function useTimerTick(active: boolean) {
  const [nowMs, setNowMs] = useState(() => serverNowMs());
  useEffect(() => {
    if (!active) {
      return;
    }
    const sync = () => setNowMs(serverNowMs());
    sync();
    const id = window.setInterval(sync, 1000);
    //? 背面タブの interval は最低1分に間引かれる。復帰時に即座に合わせ直す。
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, [active]);
  return nowMs;
}
```

- **毎ティックで `Date.now()` を読み直す**（前回値に 1000 を足さない）。間引きやスリープでずれが累積しない。
- 背面タブに落ちている間の時間も**そのまま学習時間に数える**。勉強中に画面を見ていないのは正常だから、Page Visibility でフォアグラウンド時間を測る一般的な作法（`performance.getEntriesByType("visibility-state")`）は採らない（§17-6）。`visibilitychange` は**復帰時に表示を合わせ直すためだけ**に使う。
- React Compiler が入っているので手動メモ化はしない（react-conventions §react-compiler）。

### 8.3 端末の時計ずれ

**記録される分数はクライアントの時計に依存しない。** 確定の直前に `stopTimer` を呼び、サーバの `Date.now()` で区間を畳んでから、その戻り値（サーバ真値）をモーダルの初期値にする。したがってずれるのは「走っている間の表示」だけである。

表示のずれも実用上は消す。`serverNowMs()` は保存済みオフセットで補正する。

```ts
// src/lib/server-clock.ts
export const SERVER_CLOCK_OFFSET_KEY = "cairn:timer:clock-offset-ms";

//* サーバ時刻 − 端末時刻。タイマー系 mutation の戻りから測って localStorage に置く。
export function serverNowMs(): number {
  return Date.now() + readOffsetMs();
}

export function recordServerInstant(serverMs: number, localBeforeMs: number): void {
  //? 往復のぶんだけサーバ側が「未来」に見えるので、片道は無視して下限だけ補正する。
  tryLocalStorageSet(SERVER_CLOCK_OFFSET_KEY, String(serverMs - localBeforeMs));
}
```

- オフセットは `stopTimer` の戻り（および `runningTimer` から得た `startedAt` が未来だった場合の補正）で更新する。専用の「時刻を返す関数」は**作らない**（時計を読むだけの mutation を公開サーフェスに増やしたくない）。
- 未測定（初回ロードで別端末が始めた計測を見ている）ならオフセットは `0`。`segmentElapsedMs` が負を `0` に丸めるので、表示が過去に走ることはない。
- `localStorage` が使えない環境（プライベートウィンドウ等）は `safe-storage.ts` の `try*` が `null` を返し、オフセット `0` に落ちる。

---

## 9. 複数タブ・リロード・オフライン

| 状況 | 挙動 | 仕組み |
| --- | --- | --- |
| タブA で開始、タブB を見ている | タブB の時計も即座に走り出す | `days.get` / `runningTimer` の reactive subscription が `timerStartedAt` を push。両タブが同じサーバ値から導出するので、表示は自動で一致する |
| タブA で一時停止、タブB は計測中を表示中 | タブB も止まる | 同上。`timerStartedAt` が消えた行が push される |
| タブB が古い状態で確定を押した | `stopTimer` は冪等（T2'）なので現在の accumulated が返り、モーダルはその値で開く。エラーにしない | §7.1 |
| タブB が古い状態で再開を押した（行は既に確定済み） | `resumeTimer` が `ValidationFailedError`（「進行中の記録だけ計測を再開できます」）→ 既存の `notifyError` でトースト。直後に reactive query が確定状態へ更新する | `presentError` 経由（生の message は出さない） |
| リロード / 別端末 / スマホ | 計測は続いている。`timerStartedAt` は DB にあるので、再読込後そのまま走る | 専用の永続化は持たない。`localStorage` に置くのは時計オフセットだけ |
| オフライン | 表示は最後に受け取った `timerStartedAt` から走り続ける。押した mutation は Convex クライアントが再送する | 確定モーダルは `stopTimer` が**解決してから**開く（ボタンは `loading`）。復帰後にサーバが決めた accumulated がそのままプレフィルになるので、表示と記録が食い違わない |
| 2つのタブが同時に開始 | Convex の mutation は直列化される。後勝ちで1件だけが計測中になり、もう一方は T5 で畳まれる | `stopRunningTimer` が同一トランザクションで走る（§4.4） |

**`BroadcastChannel` / `storage` イベント / `SharedWorker` は使わない。** サーバが単一の真値を持ち、Convex がそれを全タブへ配るので、タブ間同期のレイヤは要らない（§17-1）。

---

## 10. 放置と自動停止

3段構えで、どの段が落ちても記録される値が変わらないようにする。

1. **表示のクランプ（純関数）** — `segmentElapsedMs` が 240分 で止まる。閉じ忘れて8時間経っても画面は `4:00:00` で止まり、8時間が実績候補になることはない。
2. **cron の書き込み（15分間隔）** — `timerStartedAt` を消し、`timerAccumulatedMs += 240分`、`timerAutoStoppedAt = now`。カードは「一時停止・240分・自動停止しました」になる。
3. **確定は必ず人が押す** — 自動確定しない。240分 はほぼ間違いなので、警告文で「実際の学習時間に直してから確定してください」と促し、分数フィールドを編集可能なまま開く。

`services/rows/autoStopTimers.ts`:

```ts
export async function autoStopTimers(ctx: MutationCtx, args: { now?: number } = {}) {
  const now = args.now ?? Date.now();
  const cutoff = now - TIMER_MAX_SEGMENT_MS;
  //? 期限切れだけに絞るので件数は数件。purgeExpired と同じ範囲クエリの形(CVX-11)。
  const stale = await ctx.db
    .query("rows")
    .withIndex("by_timerStartedAt", (q) =>
      q.gte("timerStartedAt", 0).lte("timerStartedAt", cutoff),
    )
    .collect();
  for (const row of stale) {
    if (row.deletedAt !== undefined || row.status !== "進行中") {
      continue; //? 不変条件により来ないが、来たら黙って直す
    }
    await ctx.db.patch("rows", row._id, {
      timerAccumulatedMs: (row.timerAccumulatedMs ?? 0) + TIMER_MAX_SEGMENT_MS,
      timerAutoStoppedAt: now,
      timerStartedAt: undefined,
    });
  }
  return null;
}
```

**日付が変わっても止めない。** 記録は `row.dateJst` の日に属する（CONTEXT「日」）ので、23:40 に始めて 00:30 に確定した 50分 は**開始した日の学習量**に入る。JST 0時での自動停止は、深夜学習を毎回2件に割る実害があるので採らない（§17-4）。240分 の上限が「昨日の行がいつまでも走る」ケースを塞ぐので、日境界の規則は不要である。

---

## 11. 手入力分数との併存

### 11.1 3つの分数を混ぜない

| 呼び名 | どこ | 意味 |
| --- | --- | --- |
| 目安分数 | `presets.lines[].minutes` → 新規行の `rows.minutes` | 計画。実績ではない |
| 記録の分数 | `rows.minutes` | **正**。確定した行のこれだけが学習量（CONTEXT「学習量」） |
| 計測値 | `measuredMs(timer, now)` から導出 | 確定するときの**分数の初期値**。保存された実績ではない |

計測は `rows.minutes` を**直接書き換えない**。書き換えるのは `rows.confirm` だけで、その引数は常に人が見た数字である。

### 11.2 サーバで測り直さない理由

`confirm` に `minutes` を渡さず「サーバが accumulated から計算する」設計は採らない。モーダルを開いている間も時間は流れるので、サーバが確定時に測り直すと**ユーザーが見て承諾した数字と保存される数字が違う**。「見た数字が保存される」を守るため、確定の直前に `stopTimer` で区間をサーバ側で閉じ（ここでサーバ時計が使われる）、閉じた値を人に見せ、人が押した値を保存する。

### 11.3 確定モーダルは計測がある行では必ず開く（現状バグの修正）

```ts
// src/features/board/components/board-kanban-confirm-modal.tsx
import { hasTimerState } from "~domain/rowTimer";

export function needsKanbanConfirmEditor(row: BoardRow): boolean {
  //? 計測があるのにモーダルを開かないと、目安分数のまま確定して計測結果を捨てる(§2 の現状バグ)。
  return row.content.trim() === "" || row.minutes === 0 || hasTimerState(row.timer);
}
```

モーダルには `prefillMinutes: number | null` を props で足す。`board-kanban.tsx` の確定分岐:

```ts
if (statusMove === "confirm") {
  //? 先にサーバで区間を閉じる。モーダルに出す分数はサーバ真値(§8.3)。
  const accumulatedMs = hasTimerState(row.timer) ? await onStopTimer({ rowId: row._id }) : null;
  if (needsKanbanConfirmEditor(row) || accumulatedMs !== null) {
    setConfirmRow({ prefillMinutes: accumulatedMs === null ? null : timerMinutes(accumulatedMs), row });
    return;
  }
  await onConfirm({ content: row.content, minutes: row.minutes, rowId: row._id });
}
```

モーダルの `initialInput.minutes` は `prefillMinutes ?? row.minutes`。`content` はいままでどおり `row.content`。**ユーザーは常に上書きできる**（「計測より短く申告する」を許す）。モーダルをキャンセルしたら行は進行中・一時停止のまま残り、計測値は失われない。

### 11.4 日ページ（`row-editor.tsx`）

CONTEXT「進行中」は「日ページでは明示しない」と決めているので、日ページに開始・停止のボタンは置かない。ただし**分数だけは食い違わせない**。

- 計測中 / 一時停止の行では、分数フィールドの右に `Input.Description` で「計測中（実行ボードで操作）」/「計測 42分」を出す（読み取り専用の注記。ボタンではない）。
- Switch で確定したとき、その行に計測があれば `stopTimer` → 戻り値の `timerMinutes(...)` で `confirm` する（フォームの目安分数では確定しない）。確定後にトースト「計測した42分で確定しました」。確定済み行の分数はいままでどおり blur で上書き保存できるので、直したいときはその場で直せる。
- 計測中の行の分数フィールドは**1秒刻みでは動かさない**（日ページに時計を持ち込まない）。表示は目安分数のまま、確定した瞬間に計測値へ入れ替わる。

---

## 12. 実行ボードの「進行中」との関係

CONTEXT「進行中」＝「記録が取り組み中である状態。実行ボード（カンバン）で直接操作する」。この定義を**そのまま計測の入れ物にする**。

| 実行ボードの操作 | 既存の遷移 | 計測への意味 |
| --- | --- | --- |
| 未着手 → 進行中（ドラッグ / ▶） | `rows.start` | **計測開始**（0分から） |
| 進行中 → 確定（ドラッグ / 確定ボタン） | `stopTimer` → `rows.confirm` | 計測終了。計測値が分数の初期値 |
| 進行中 → 未着手（ドラッグ） | `rows.pause` | **計測を捨てる**（Confirm 必須） |
| 進行中 → スキップ（ドラッグ） | `rows.skip` | 計測を捨てる（Confirm 必須。既存の見送り Confirm に「計測 n分 を捨てます」を追記） |
| 確定 → 進行中（ドラッグ） | `rows.reopen` | 確定分数から**計測を再開** |
| カード内の ⏸ / ▶ | `stopTimer` / `resumeTimer` | 進行中のまま計測を止める / 続ける |

- 「進行中」カラムに**複数の行**が並ぶのは許す（既存の自由度を壊さない）。ただし時計が走っているのはそのうち1件だけで、他は「一時停止」で並ぶ（§4.4）。
- 実行ボードは過去日も選べる（`use-board-view.ts`）。過去日の行でも計測は開始できる（過去の日は編集できる、CONTEXT「日」）。240分 の上限だけがかかる。
- 未来日は日を作らないので行が無く、計測もない。
- 「進行中」の意味は変わらない。**計測は記録の状態ではない**ので、`STATUSES` に値を足さない（CONTEXT の _Avoid_ に追記、§3）。

---

## 13. UI 構造（Mantine 優先 / Paper Redesign）

トークンは `src/lib/theme.ts` から。`theme.components.Card` が既にスケッチ輪郭（`SKETCH_RADIUS`）と紙の影（`PAPER_SHADOW`）を持つので、**`Card` を使えばハードコード hex ゼロで意匠が付く**。時計の数字は `NUMERAL_FONT`。色は `orange`（計測中 = primary）/ `yellow`（自動停止の警告、`RECORD_STATUS_UI.スキップ` と同系）/ `green`（確定）。ライト固定でダーク分岐は書かない。

### 13.1 進行中カードの時計（`src/features/board/components/row-timer-chip.tsx`）

```
┌──────────────────────────────────┐
│ ⠿  金フレ                         │   ← 既存 RecordCard の中身
│    TOEIC対策 · Chapter 3          │
│    ［進行中］                      │
│  ┌────────────────────────────┐  │
│  │ ● 0:12:34        ⏸   ✓確定 │  │   ← RowTimerChip（NUMERAL_FONT の時計）
│  └────────────────────────────┘  │
└──────────────────────────────────┘

一時停止:      ⏸ 42分            ▶   ✓確定
自動停止:      ⚠ 240分（自動停止）  ▶   ✓確定
                 実際の学習時間に直してから確定してください
計測なし:      ▶ 計測をはじめる
```

- 外枠は `Card` の中の `Group` + `Paper`（`bg="var(--cairn-paper-2)"`, `withBorder`）。区切りは `var(--cairn-rule)`。
- 時計は `<Text ff={NUMERAL_FONT} fw={700} size="lg">`。計測中は先頭に `Indicator`（`color="orange"` / `processing`）。`processing` のアニメーションは `@media (prefers-reduced-motion: reduce)` で止める（CSS Module 1行）。
- ボタンは `ActionIcon`（`IconPlayerPauseFilled` / `IconPlayerPlayFilled`）と `Button size="xs"`（`IconCheck`、確定）。すべて `aria-label` 付き（`data-testid` は禁止）。
- 自動停止は `Alert color="yellow" variant="light"` を1行で。
- **アクセシビリティ**: 1秒ごとに読み上げが走らないよう、時計要素は `aria-hidden`。代わりに `<Text role="status" className="sr-only">` で「計測中 12分」を**分単位でだけ**更新する。

### 13.2 どこにいても見える計測中インジケータ（`src/components/running-timer-indicator.tsx`）

放置を防ぐ最も効く手当ては「ボードから離れても計測中が見えていること」。`AppShell` のヘッダに置く。

```
┌ header ────────────────────────────────────────────────┐
│ 学習ログ            ● 0:12:34 金フレ  [⏸] [ボードへ]  👤 │
└────────────────────────────────────────────────────────┘
```

- `queries.rows.runningTimer` を `useSuspenseQuery(convexQuery(...))` で読む（`convex-tanstack.md`）。`Suspense` の fallback は構造モックの `<Shimmer loading>`（`shimmer-from-structure.md` のパターン2）。計測が無いときは `null` を返して何も描かない。
- 置ける操作は **⏸（`stopTimer`）と「ボードへ」（`/board?date=<dateJst>` へのリンク）だけ**。確定はボードで行う。`src/components/` は feature を import できない（`project-structure.md`「Feature inter-dependencies forbidden」）ので、確定モーダルをここに持ち込めない。この制約が結果的に「確定は必ずボードで、項目名と分数を見ながら」という良い導線になる。
- 呼ぶ mutation フックは共有の `src/hooks/use-row-mutations.ts` に置く（`board-mutations.ts` は既存の慣習どおり再 export するだけ）。

### 13.3 実行ボードの「進行中」カラム見出し

計測中の合計だけを見出しに添える（`進行中 · 計測 0:12:34`）。専用の大きな固定バーは置かない（§17-2）。

### 13.4 破壊的操作の Confirm（Mantine `modals`）

`row-editor.tsx` の `requestSkip` と同じ `modals.openConfirmModal` を使う。

| 操作 | タイトル | 本文 | confirm ラベル |
| --- | --- | --- | --- |
| 進行中 → 未着手（計測あり） | 計測を捨てて未着手に戻しますか？ | 計測した42分は残りません。 | 捨てて戻す（`color="red"`） |
| 進行中 → スキップ（計測あり） | 見送りにしますか？ | 学習量からは外れます。計測した42分も残りません。 | 見送りにする（`color="yellow"`、既存のまま） |

計測が無い（`hasTimerState(row.timer) === false`）ときの文言と挙動は既存のまま変えない。

### 13.5 触るファイル一覧（実装チェックリスト）

新規:

- `convex/lib/rowTimer.ts` / `convex/lib/rowTimer.test.ts`
- `convex/mutations/rows/{stopTimer,resumeTimer,autoStopTimers}.ts`
- `convex/queries/rows/runningTimer.ts`
- `convex/services/rows/{stopTimer,resumeTimer,autoStopTimers,stopRunningTimer,clearTimerFields,toRowTimerDto,loadRunningTimer}.ts`
- `convex/rowTimer.test.ts`（統合）
- `src/features/board/components/row-timer-chip.tsx` / `row-timer-chip.module.css`
- `src/features/board/hooks/use-timer-tick.ts`
- `src/features/board/lib/timer-clock.ts` / `timer-clock.test.ts`
- `src/components/running-timer-indicator.tsx`（+ `RunningTimerIndicatorFallback`）
- `src/lib/server-clock.ts` / `server-clock.test.ts`

改修:

- `convex/schema.ts`、`convex/lib/validators.ts`、`convex/crons.ts`
- `convex/services/rows/{start,reopen,confirm,pause,skip,unskip,unconfirm,remove}.ts`、`convex/services/days/toRowDtos.ts`
- `src/features/board/components/{board-kanban,board-kanban-confirm-modal}.tsx`、`src/features/board/lib/kanban-order.ts`（`start` の意味に計測開始が加わるコメントのみ）
- `src/features/today/components/row-editor.tsx`、`src/features/today/hooks/use-day-board-actions.ts`
- `src/hooks/use-row-mutations.ts`、`src/features/board/hooks/board-mutations.ts`、`src/lib/optimistic-day-rows.ts`（`setDayRowStatus` に `timer` を渡せるようにする）
- `src/components/app-shell.tsx`（ヘッダにインジケータ）
- 行 DTO を手で組み立てているフィクスチャに `timer: null` を足す: `src/features/board/lib/board-shimmer-template.ts`、`src/features/today/components/day-board.test-fixtures.ts`、その他 `rows: [...]` を作るテスト

---

## 14. フォーム（Valibot / Formisch）

**新しいフォームスキーマは作らない。** タイマーが人から受け取る入力は「確定する分数」だけで、それは既存の `src/lib/validation/row-editor-schema.ts` がすでに持っている。

```ts
export const RowEditorSchema = v.object({
  content: v.pipe(v.string(), v.trim()),
  minutes: v.pipe(v.number(), v.minValue(0, MINUTES_MIN_MESSAGE)),
});
```

- 確定モーダルは `initialInput: { content, minutes: prefillMinutes ?? row.minutes }` で `reset(form, ...)` する（既存の `useEffect` の形をそのまま使う）。
- 上限バリデーションは足さない。計測値は 240分 でクランプされているし、手入力の上限は現状も無い（一貫させる）。
- `timerMinutes` は Valibot ではなく `convex/lib/rowTimer.ts` の純関数（フォームの検証ではなく初期値の計算だから）。

---

## 15. エッジケース

| # | ケース | 決定 |
| --- | --- | --- |
| 1 | 計測中の行をゴミ箱へ | `rows.remove` が計測を消す。復元しても計測は戻らない（分数は残る） |
| 2 | 計測中の日をゴミ箱へ（`trash.removeDay`） | 行の計測は残るが `rowDayLiveness !== "live"` になり、`stopTimer` / `resumeTimer` は `NotFoundError`（既存の日生存判定に相乗り）。cron が 240分 後に自動停止する |
| 3 | 進行中の行があるままプリセット切替 | 差し替わるのは未着手だけ（既存仕様）。計測は残る |
| 4 | 確定→進行中→未着手（`reopen` → `pause`） | `pause` は計測を消すが `minutes` は残す。確定していた30分は分数に残り、reopen 後に測った12分は捨てる。Confirm 文で「計測した12分」と明示する |
| 5 | 目安分数30分の行を計測して5分で確定 | 分数は 5分。目安は上書きされる（実績が正） |
| 6 | 20秒で確定 | `timerMinutes` により 1分。0分にはしない |
| 7 | 計測中に別の記録の計測を始める | 前者は自動で一時停止（T5）。トーストで知らせる |
| 8 | 端末の時計が5分進んでいる | 表示は `serverNowMs()` のオフセットで補正。記録値は `stopTimer` のサーバ時計なので影響なし。オフセット未測定でも `segmentElapsedMs` が負を0に丸める |
| 9 | 23:40 開始 → 00:30 確定 | 50分。開始した日（`row.dateJst`）の学習量に入る。日境界での分割はしない |
| 10 | 8時間放置 | 表示は 4:00:00 で止まり、cron が 240分・自動停止で確定。警告が出る。学習量には自動で入らない |
| 11 | 移行前から進行中の行 | `timer === null` = 計測なし。▶ で 0分 から始まる |
| 12 | 未来日 | 日も行も無いので該当なし |
| 13 | オフラインで ⏸ | 表示は楽観更新で止まる。復帰後にサーバの accumulated が真値になる。確定モーダルは `stopTimer` 解決後に開くので、食い違った数字を確定できない |
| 14 | 共有文・履歴・週間ターゲット・習得の実績 | いっさい変わらない。すべて確定分数のみを読む（`formatShareMarkdown` / `confirmedVolumeMinutes` / `withMasteryProgressDelta`） |
| 15 | 実行ボードの時間ブロック（`boardScheduleEvents`） | 変わらない。ブロックは**計画**で計測ログではない。計測から自動生成しない（§17-5） |

---

## 16. テスト計画（CVX-19）

`vite.config.ts` の project 分割に従って置き場所を決める。

**`convex/lib/rowTimer.test.ts`（node / 純関数）**

- `timerRunState`: `null` / 計測中 / 一時停止 / `accumulatedMs === 0` の一時停止 → 計測なし
- `segmentElapsedMs`: 通常 / 負（`0`）/ 上限超過（`TIMER_MAX_SEGMENT_MS`）/ ちょうど上限
- `measuredMs`: 一時停止（accumulated のみ）/ 計測中（accumulated + 区間）/ `null`
- `timerMinutes`: `0 → 0`、`1ms → 1`、`29_999 → 1`、`30_000 → 1`、`89_999 → 1`、`90_000 → 2`（`Math.round` の丸め境界）、`TIMER_MAX_SEGMENT_MS → 240`
- `isSegmentExpired` の境界

**`src/features/board/lib/timer-clock.test.ts`（happy-dom）**: `0 → "00:00"`、`754_000 → "12:34"`、`TIMER_MAX_SEGMENT_MS → "4:00:00"`

**`convex/rowTimer.test.ts`（edge-runtime / `convexTest(schema)` + `withIdentity`）**

- T1: `start` で `timerStartedAt` が入り `timerAccumulatedMs === 0`
- T2 → T3 → T2: 2区間の合計が accumulated に積まれる（`vi.useFakeTimers` でサーバ時刻を進める）
- T2' の冪等性: 計測していない進行中行に `stopTimer` → throw せず現在値を返す
- T4: `autoStopTimers({ now })` で 240分 加算 + `timerAutoStoppedAt` + `timerStartedAt` 消滅。**`status` は進行中のまま**
- T4 の遅延不変性: `now` を +30分 ずらして呼んでも accumulated は同じ 240分
- T5: 2行を順に `start` → 先の行の計測が畳まれ、`timerStartedAt` を持つ行が1件だけ
- T6: `confirm` 後に計測3フィールドがすべて消え、`minutes` は引数の値
- T9: 確定30分の行を `reopen` → `timerAccumulatedMs === 1_800_000`
- T7/T8/T10/T11/T12: それぞれの後に計測フィールドが消えている（不変条件）
- `runningTimer`: 計測が無ければ `null` / 1件なら項目名と `dateJst` を返す / **他所有者の計測は返さない**（IDOR）
- 未認証で `stopTimer` / `resumeTimer` / `runningTimer` が throw（既存 `ownerIsolation.test.ts` の型に合わせる）
- 日をゴミ箱に入れた行の `stopTimer` が `NotFoundError`

**`src/features/board/components/row-timer-chip.test.tsx`（happy-dom）**

- `renderWithMantine` + `vi.useFakeTimers`。計測中は1秒後に表示が進む / 一時停止は進まない
- `getByRole("button", { name: "計測を止める" })` を押すと `stopTimer` が `rowId` で呼ばれる
- 自動停止の警告文が出る

**`src/features/board/components/board-kanban.test.tsx`（既存に追加）**

- 計測がある行を確定へドラッグ → `stopTimer` が先に呼ばれ、確定モーダルが**計測値でプレフィルされて**開く
- 計測が無く `content` と `minutes` が埋まった行はいままでどおりモーダルなしで確定する（既存の振る舞いの回帰）

テストしないもの: Mantine の描画、`setInterval` の間引き挙動、`localStorage` が壊れている環境の分岐（`safe-storage` の既存テストが担う）。

---

## 17. 検討した代替案（自己反論と回答）

**1. 「タブ間同期に `BroadcastChannel` が必要ではないか。Convex の push には遅延がある」**
反論としては弱い。この遅延（数十ms〜数百ms）は1秒刻みの表示では見えない。そして `BroadcastChannel` を入れると、真値がサーバとチャネルの2箇所になり「タブAは走っている / タブBは止まっている」という**サーバと矛盾する状態**を作りうる。譲る点: オフライン中はタブ間で状態が分岐しうる。ただしオフライン中は mutation 自体が飛んでいないので、真値はまだ動いていない。復帰時にサーバが両方を揃える。**却下。**

**2. 「実行ボードの上に大きな固定タイマーバーを置くべきではないか」**
一度採る方向で書いたが、`AppShell` ヘッダのインジケータ（§13.2）と役割が完全に重複する。ボード上に2箇所、進行中カード内に1箇所で計3箇所に同じ時計が出るのは、Paper Redesign の「スケッチ意匠は要所だけ」という原則に反する（design-live-board.md ルール1）。ヘッダは全ページで効く（放置対策として上位互換）。**却下。カード内チップ + ヘッダの2箇所に絞る。**

**3. 「計測区間を別テーブル（`timerRuns`）に追記型で持てば、あとで『何時に勉強したか』が分析できる」**
魅力的だが、いま必要のない集計のためにテーブルを1つ増やす。しかも累積分数が「区間の合計」になるため、カンバンの全行について区間を引く（`by_row` で N クエリ）か、`dateJst` を非正規化して1クエリにするかを選ばされる。さらに致命的なのは**孤児**で、行はゴミ箱・復元・完全削除を通るので、`deleteRowsByIds` / `removeRow` / `restore` / `purgeExpired` の4経路すべてに区間の後始末を足す必要がある。行に載せれば削除はドキュメントごと消えて終わる。ADR-0007（実績カウンタの非正規化）も同じ判断をしている。譲る点: 時刻帯の分析はできなくなる。必要になったら実行ボードの時間ブロック（`boardScheduleEvents`）が既にその器である。**却下。**

**4. 「JST 0時で自動停止すべきではないか。記録は暦日に属するのだから」**
筋は通る。しかし 23:40 開始・00:30 終了の学習は日常的で、これを毎回2件に割ると「1件の学習 = 1件の記録」（CONTEXT「記録」）が壊れ、共有文も汚れる。そして「昨日の行が延々走る」問題は 240分 上限がすでに塞いでいる。譲る点: 深夜またぎの学習は開始日に寄る（実際には翌日の学習が前日に計上される）。これは睡眠を起床日に寄せた ADR-0002 と同じ「1つの出来事は1つの日に寄せる」判断であり、一貫している。**却下。**

**5. 「計測を止めたら実行ボードの時間ブロックを自動で作れば、いつ何をしたかが埋まる」**
安い実装で見返りが大きそうに見える。しかし時間ブロックは**計画**（自分で置く予定）であり、計測ログが混ざると「置いた予定」と「事後の実測」が同じ器に並ぶ。実行ボードの週ビューが実測で埋まり、計画のための余白が消える。ADR-0011 が扱っているボードの性格にも反する。**却下（将来やるなら実測レーンを別に持つ設計から始める）。**

**6. 「`performance.getEntriesByType("visibility-state")` でフォアグラウンド時間を測るのが web の作法ではないか」**
それは「ページを見ていた時間」を測る作法で、ここで測りたいのは「勉強していた時間」である。参考書を開いている間ブラウザは背面にある。フォアグラウンド時間で測ると学習時間が体系的に短く出る。加えてこの API は Chrome/Edge 115+ のみで Firefox / Safari は未対応（iPhone は Safari エンジン固定なので、このアプリの主要な入力端末で常に fallback に落ちる）。**却下。`visibilitychange` は復帰時の再計算にだけ使う。**

**7. 「`Date.now()` を返すだけの mutation（`timers.now`）を置いて時計を合わせた方が正確ではないか」**
正確さは上がる。しかし公開サーフェスに「認証は要るが何も書かない mutation」が1つ増え、CVX-01（関数の責務）とレビューの見通しを悪くする。そして**記録される値はすでにサーバ時計で決まっている**（§8.3）ので、この関数が改善するのは走っている間の表示だけである。既存 mutation の戻りからオフセットを拾えば同じ効果が得られる。譲る点: 一度も mutation を呼んでいない初回ロードではオフセットが `0` になる。その場合の誤差は「端末の時計のずれ」そのものであり、その端末では時刻表示全部がずれている。**却下。**

**8. 「一時停止は要らない。止めたいなら未着手に戻せばよい（状態が減る）」**
状態は減るが意味が壊れる。未着手は「まだ決めていない」（`statusTooltip`）であり、40分やったあとの中断はそこではない。カンバンの「進行中」カラムが中断のたびに空になるのは、実行ボードが答えるべき「いま何に取り組んでいるか」を答えられなくなる。譲る点: 「進行中・一時停止」という副状態を1つ覚える必要がある。ただしこれは DB に持たない導出値である（§4.1）。**却下。**

**9. 「進行中は1件だけに制限すべき（同時に2つは取り組めない）」**
現状のカンバンは複数の進行中を許しており、そこを狭めるのは既存の使い方を壊す変更である。二重計上という実害は「計測中は1件」で完全に防げるので、状態のほうを狭める必要はない。**却下（計測の一意性だけを課す）。**

**10. 「自動停止したら自動で確定してしまえば、学習量が漏れない」**
学習量は所有者の判断でしか動かない、が CONTEXT 全体の背骨である（「学習量に入るのは確定だけ」「自動達成判定をしない」）。しかも自動停止した 240分 は**ほぼ確実に間違った値**なので、それを実績に入れるのは漏れを埋めるどころか汚染である。**却下。**

**11. 「`rows.pause` の名前が一時停止と衝突している。今すぐ改名すべき」**
実装者の混乱コストは実在する。しかし改名は `KanbanStatusMove` の union、楽観更新フック、既存テストに広がり、タイマー本体と無関係な差分でレビューを膨らませる。UI 文言は関数名から独立しているので、利用者の混乱にはならない。譲る点: コード上の混乱が残る。§7.5 のコメント必須で緩和し、改名は別チケットに委ねる。**保留（今回はやらない）。**

**12. 「計測値をサーバで再計算して `confirm` の `minutes` を optional にすれば、クライアントを信じなくて済む」**
`minutes` はもともとクライアントが決める値（手入力・上書き確定）なので、ここだけサーバ権威にしても信頼境界は動かない。むしろ「見た数字と保存される数字が違う」（§11.2）を作る。`v.optional` にすると validator が「何を渡せば何が起きるか」を語らなくなり、CVX-03/16 の意図から遠ざかる。**却下。**

**13. 「計測をリセットする操作（進行中のまま 0 に戻す）が要る」**
あると便利ではあるが、`未着手へ戻す → 開始` の2手で同じ結果になる。mutation を1本増やす価値はない。**却下。**

---

## 18. 実装順序と受け入れ条件

1. `convex/lib/rowTimer.ts` + 純関数テスト（依存ゼロ、ここから赤→緑にできる）
2. `validators.ts` / `schema.ts` / `toRowDtos.ts`（DTO に `timer: null` が乗るだけの状態。UI は無変更で通る）
3. `services/rows/*` の改修 + `stopTimer` / `resumeTimer` + 統合テスト（不変条件の表がそのままテスト名になる）
4. `autoStopTimers` + `crons.ts`
5. `queries/rows/runningTimer.ts`
6. `use-row-mutations.ts` の楽観更新フック（`setDayRowStatus` に `timer` を渡す）
7. `row-timer-chip.tsx` + `use-timer-tick.ts` + `timer-clock.ts` → カンバンへ組み込み
8. 確定モーダルのプレフィル（§11.3。**現状バグの修正を含むので回帰テストを先に書く**）
9. `running-timer-indicator.tsx` → `app-shell.tsx`
10. `row-editor.tsx` の注記と Switch 確定（§11.4）

受け入れ条件:

- `vp check` / `vp test` / `vp build` がすべて緑（`vp run fallow` は export を増やすので併せて実行）
- `convex:convex-reviewer` を `convex/` の差分に通す（CVX-18）
- 手動確認: 2タブで開始→片方で一時停止→両方止まる / リロードで走り続ける / `autoStopTimers` を `now` 指定のテストで 240分 に落とせる / 目安分数30分の行を5分計測して確定したら学習量が5分増える
- ハードコード hex がゼロ（`rg '#[0-9a-fA-F]{6}' src/features/board src/components/running-timer-indicator.tsx` が空）

---

## 19. 境界（このドキュメントが持たないもの）

| 話題 | 持ち主 |
| --- | --- |
| 週次レビュー / 月次レビューの集計 | #52 / #54。**計測は新しい集計軸を作らない** — レビューが読むのは確定分数のままなので、タイマー導入でレビュー側の仕様は変わらない |
| 通知（計測しっぱなしを push で知らせる等） | #55 系。自動停止を通知の種にするかはそちらの判断。本設計は `timerAutoStoppedAt` という起点だけを用意する |
| PWA・モバイル最適化（バックグラウンドでの継続、画面スリープ） | #57 系。本設計は**端末で何も走らせない**（サーバの `startedAt` からの導出のみ）ので、Service Worker やバックグラウンド実行に依存しない。Screen Wake Lock は PWA 側の判断に委ねる |
| 目標×記録の紐付け | #53。計測フィールドは紐付けに関与しない |
| 目標階層 / チェックポイント | #48 / #49 |
| `rows.pause` の改名 | 別チケット（§17-11） |

## 20. CONTEXT.md / ADR への影響

- **CONTEXT.md**: §3 のとおり「計測」「自動停止」を追加し、「進行中」の _Avoid_ に1項追加する。「記録」「学習量」「実行ボード」の定義は**変更なし**。
- **ADR**: 新規 ADR は不要。ADR-0002（1つの出来事は1つの日に寄せる）と ADR-0007（実績カウンタの非正規化）の判断に従っており、覆す ADR はない。
- **docs/spec.md**: v1 の範囲外だった機能なので、追記は不要（本ドキュメントが仕様の所在）。
