# Plan (計画)

計画 is the Clock and schedule page plus today's plan list. Timed plans live here, not on ボード. Recording still belongs on 日. The page title is `計画`. Tabs are `プラン` and `スケジュール`. With no `?tab=` search, the schedule tab is selected and day view is the default.

## Sub-features

- `plan-open` opens `/plan` from the `計画` nav link (desktop rail and mobile primary).
- `plan-clock` shows SVG `一日の時計` on schedule **day** view.
- `plan-schedule-quarter-hour` exposes 15-minute empty-slot names on day view.
- `plan-schedule-create` creates a timed plan from a day slot.
- `plan-list-tab` opens `?tab=plan` with 計画プリセット, a read-only 目標 card, and 障害プラン.
- `plan-from-board-schedule` follows a leftover `/board?tab=schedule` URL to `/plan`.

## How to get to it (user POV)

- Choose the `計画` nav link (`IconClock`). Mobile primary tabs are `日` / `ボード` / `計画` / `目標`.
- Home stepper `計画プリセットを登録する` goes to `/plan?tab=plan`.
- `/presets` replace-redirects to `/plan?tab=plan` (see [presets.md](./presets.md)).
- `/board?tab=schedule` replace-redirects here (kanban stays on `/board`).
- Header button `Google カレンダー連携` is on this page, not ボード.

## Driving it with playwright-cli

Preconditions:

- Signed in (see `account-auth.md`). Clock and empty schedule do not need a catalog item. Creating a timed plan that points at a record needs a 日 row; a 計画プリセット event may use item `なし（記録は作らない）`.
- `control-cairn doctor` is OK. Desktop width so `計画` is a visible nav link, unless the step says otherwise.

- **Open plan.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '計画', exact: true })"` or `goto http://localhost:3000/plan`. Wait for heading `計画`. Lead copy for today is `今日の計画。記録は日のままです。`. Tab `スケジュール` is selected when search has no `tab`.
- **See the clock.** Day view (`日表示に切り替え`) includes `getByLabel('一日の時計')`. Copy such as `予定に載らない確定 N分` may appear when confirmed day minutes are not on the clock. Switching to 週 / 月 / 年 hides the clock; returning to 日 shows it again.
- **Quarter-hour intervals.** Day view exposes empty slot buttons named `Time slot HH:MM:SS - HH:MM:SS` (example `Time slot 10:00:00 - 10:15:00`). Prove 15-minute slots on day view. Do not claim week empty slots are 15 minutes from day-view names.
- **Create a timed plan.** Click an empty day slot (example `Time slot 10:00:00 - 10:15:00`). In `予定を追加`, fill textbox `タイトル` (example `スロット検証`), open combobox `項目`, and choose a same-day record option (example `検証項目`). Default start/end follow that slot. Click `保存`. The dialog closes and button `スロット検証` appears on day view. Reload `/plan`, wait for heading `計画`, then verify the event remains. Week view is not this locator.
- **Open the plan list.** Choose tab `プラン` or `goto http://localhost:3000/plan?tab=plan`. Section `計画プリセット` is visible. A new account shows `計画プリセットはまだありません`. Heading `目標` with link `目標ページで編集` (`/goals`) is read-only here. Heading `障害プラン` (same `もし` / `なら` / `障害プランを追加` as 日) lists plans already created on 日.
- **Board leftover URL.** `goto http://localhost:3000/board?tab=schedule` must land on `/plan` with heading `計画`. A click that only changes the board URL is not this sub-feature.
- **Year entry.** On スケジュール, choose `年表示に切り替え`. Click a day button (names look like `9月 23, 2026`). That opens a popover `{date}の予定`; it does not switch to day view by itself.
- **Proof.** Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/plan.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/plan.png"`. Artifacts show heading `計画` and either `一日の時計` or `計画プリセット`.

## Gotchas

- ボード has no `カンバン` / `スケジュール` tabs. Do not wait for heading `ボード` after a schedule URL.
- Default `/plan` is schedule, not プラン. Template and 目標/障害プラン proofs must select `プラン` or use `?tab=plan`.
- Clock is day-view only. Proving `/plan` on week view does not prove `plan-clock`.
- Slot button names are JST wall times. Mantine `開始` / `終了` may show the host timezone (example slot `10:00` → `2026/09/21 01:00` on a UTC host). That is not a failed create.
- TanStack Router Devtools at the page bottom can intercept `保存`. Force-click the dialog button, or hide the overlay, then wait for the dialog to close. Closing Devtools is not a product assertion.
- Google Calendar OAuth is not this map. The header button is only an entry; do not treat a click as a completed sync.
- Creating a 計画プリセット is [presets.md](./presets.md). This file proves the page, clock, schedule slots, leftover redirects, and the read-only 目標 / shared 障害プラン on `?tab=plan`.
- Narrow viewports keep `計画` as a primary tab. `項目` / `方法` / `ゴミ箱` stay behind `その他`.
