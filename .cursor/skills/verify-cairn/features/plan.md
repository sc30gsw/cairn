# Plan (計画)

計画 is the date-parented 予定 surface at `/plan`. Timed plans live here, not on ボード. Recording still belongs on 日. The page heading is `計画`. Tabs are `プラン` and `スケジュール`. With no `?tab=` search, `プラン` is selected. Day view is the default on `スケジュール`. Clock is a complementary section on `プラン`, not fused with the DatePicker, and it is absent from `スケジュール`.

## Sub-features

- `plan-open` opens `/plan` from the `計画` nav link (desktop rail and mobile primary).
- `plan-tab` lands on `プラン` (or chooses it). Complementary landmark `一日の時計` (`getByRole('complementary', { name: '一日の時計' })`) holds heading `一日の時計` and SVG `aria-label` `一日の時計`. The DatePicker (`aria-label` `日付を選択`, not a textbox), `今日`, `予定を追加`, that day's event cards, 計画プリセット, a read-only 目標 card, and 障害プラン sit in a separate stack. They are not one calendar-with-clock column.
- `plan-holiday` shows Japanese holidays on that DatePicker (example `23 9月 2026` with `title` `秋分の日`).
- `plan-pick-date` clicks a calendar day such as `25 9月 2026`. Lead copy becomes `{date} の計画。記録は日のままです。` Today uses `今日の計画。記録は日のままです。`
- `plan-month` shows the DatePicker month of the selected `?date=`, not today's month. `今日` returns the grid to today even if you only paged months.
- `plan-create` opens `予定を追加`, saves a titled event, reloads, and still sees the Clock section plus that card on `プラン`.
- `plan-list-presets` opens `?tab=plan` and shows 計画プリセット (create proof lives in [presets.md](./presets.md)).
- `plan-from-board-schedule` follows a leftover `/board?tab=schedule` URL to `/plan`.
- `schedule-open` chooses `スケジュール`. View controls are `日表示に切り替え`, `週表示に切り替え`, `月表示に切り替え`, and `年表示に切り替え`.
- `schedule-create` creates a timed plan from a day empty slot such as `Time slot 10:00:00 - 10:15:00`. After reload, wait for heading `計画`.
- `schedule-quarter-hour` exposes 15-minute empty-slot names on day view. Week empty slots remain one-hour buttons that include the date.
- `schedule-no-clock` the schedule tab does not show `一日の時計` (no complementary, no SVG label).

## How to get to it (user POV)

- Choose the `計画` nav link (`IconClock`). Mobile primary tabs are `日` / `ボード` / `計画` / `目標`.
- Open `/plan` directly with no `?tab=`, or `/plan?date=YYYY-MM-DD` for a specific day.
- Home stepper `計画プリセットを登録する` goes to `/plan?tab=plan`.
- `/presets` replace-redirects to `/plan?tab=plan` (see [presets.md](./presets.md)).
- `/board?tab=schedule` replace-redirects here without `tab` (kanban stays on `/board`).
- Header button `Google カレンダー連携` is on this page, not ボード.

## Driving it with playwright-cli

Preconditions:

- Signed in (see `account-auth.md`). Clock and empty schedule do not need a catalog item. A catalog item is optional for title-only create (`なし（記録は作らない）`). Use `検証項目` when the form should name an item. A 計画プリセット event may also use item `なし（記録は作らない）`.
- `control-cairn doctor` is OK. Desktop width so `計画` is a visible nav link, unless the step says otherwise.

- **Open plan.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '計画', exact: true })"` or `goto http://localhost:3000/plan`. Wait for heading `計画`. Lead copy for today is `今日の計画。記録は日のままです。`. Tab `プラン` is selected when search has no `tab`. Assert `getByRole('complementary', { name: '一日の時計' })`, heading `一日の時計`, and `getByLabel('一日の時計')` inside that complementary. `getByLabel('日付を選択')` is outside it. Do not wait for `週を選択`.
- **Open プラン.** Already selected on a default `/plan`. Otherwise run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('tab', { name: 'プラン', exact: true })"` or `goto http://localhost:3000/plan?tab=plan`. Assert no textbox named `日付を選択`, `getByRole('button', { name: '予定を追加' })` in the list stack, not inside complementary. Section `計画プリセット` is visible. A new account shows `計画プリセットはまだありません`. Heading `目標` with link `目標ページで編集` (`/goals`) is read-only here. Heading `障害プラン` (same `もし` / `なら` / `障害プランを追加` as 日) lists plans already created on 日.
- **Holiday.** `getByLabel('23 9月 2026')` has `title` `秋分の日` when that month is showing. Change month only if the visible grid is not September 2026.
- **Pick a date.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByLabel('25 9月 2026')"`. Lead copy includes `2026-09-25 の計画`. The Clock section remains visible.
- **Other-month URL.** Run `rtk proxy playwright-cli -s="$SESSION" goto "http://localhost:3000/plan?tab=plan&date=2026-10-15"`. Wait for heading `計画`. Assert `getByRole('button', { name: '2026年10月' })`, lead copy `2026-10-15 の計画`, and `queryByRole('button', { name: '2026年9月' })` is empty. If heading `ログインが必要です` appears, click `ログインし直す` and wait for `計画` again. That recovery is not plan-month proof (see Gotchas).
- **今日 resets the grid.** From that October URL, click `今日`. Assert `今日の計画` and month button `2026年9月` when today is 2026-09-21. Then click `[data-direction="next"]` inside `getByLabel('日付を選択')` (the chevrons have no accessible name). Lead copy stays `今日の計画` while the month button becomes `2026年10月`. Click `今日` again and assert `2026年9月`.
- **Create on プラン.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '予定を追加' })"`. Dialog title is `予定を追加`. Fill `タイトル` with `検証プラン` and save. Wait until that dialog is hidden, then assert the list card `検証プラン` (the title field also reads `検証プラン` while the overlay is still open). Reload. Wait for heading `計画`. Default tab is `プラン`, so assert the Clock section and `検証プラン` without switching tabs.
- **Schedule has no Clock.** Choose `スケジュール`. Assert `日表示に切り替え` and `queryByLabel('一日の時計')` is empty. `queryByRole('complementary', { name: '一日の時計' })` is empty. A `検証プラン` event may appear on the day timeline when the selected date matches.
- **Create from a slot.** On day view, click an empty button such as `Time slot 10:00:00 - 10:15:00`. Week view is not this locator. In `予定を追加`, fill textbox `タイトル` (example `スロット検証`). Default start/end follow that slot. Click `保存`. Reload, wait for heading `計画` (not `ボード`), choose `スケジュール` if the default `プラン` tab returned, and confirm the event remains. Select it to inspect `予定を編集`.
- **Quarter-hour intervals.** Day view exposes four empty slot buttons per hour, named `Time slot HH:MM:SS - HH:MM:SS` (example `Time slot 10:00:00 - 10:15:00`). Week view still uses one-hour names that include the date. Prove 15-minute slots on day view.
- **Board leftover URL.** `goto http://localhost:3000/board?tab=schedule` must land on `/plan` with heading `計画` and selected `プラン` (`一日の時計` visible). A click that only changes the board URL is not this sub-feature. Choose `スケジュール` only when proving the timeline.
- **Year entry.** On スケジュール, choose `年表示に切り替え`. Click a day button (names look like `9月 23, 2026`). That opens a popover `{date}の予定`; it does not switch to day view by itself.
- **Proof.** Capture プラン with the complementary Clock section and the saved card, and スケジュール without Clock. For `plan-month`, also capture the October URL (`2026年10月`) and `今日` after paging (`2026年9月`). Example: `$ART/plan-tab.aria.yml` / `.png` and `$ART/schedule-tab.aria.yml` / `.png`. Write `proof.txt` with feature IDs `plan-tab`, `plan-month`, and `schedule-no-clock`. Artifacts show heading `計画` and complementary `一日の時計` on プラン only.

## Gotchas

- Default tab is `プラン`. Clock is a complementary section on that tab, not glued under or beside the DatePicker. スケジュール never shows `一日の時計`.
- Default schedule view is day. `週を選択` is week navigation, not the landing control. Proving `/plan` on week view does not prove Clock.
- The プラン date control is an inline DatePicker, not `DatePickerInput`. `getByRole('textbox', { name: '日付を選択' })` must stay null. On `スケジュール`, `日付を選択` is a different DatePickerInput button. Scope the inline calendar with `getByLabel('日付を選択')` inside tabpanel `プラン`, and confirm it is not inside complementary.
- Displayed month is `date` / `onDateChange`, not `value`. A `?date=` in another month must show that month button. Next/previous chevrons have no accessible name; use `[data-direction="next"]` inside the labeled picker. `今日` must restore today's month even when today is already selected.
- After save, wait for dialog `予定を追加` to hide. `getByText('検証プラン')` matches the title field while the overlay is still open.
- After reload, wait for heading `計画`. A snapshot that only shows `読み込み中` is not proof. Landing stays on `プラン`, so Clock should still be there. Choose `スケジュール` before asserting `schedule-no-clock`.
- Slot button names are JST wall times. Mantine `開始` / `終了` may show the host timezone (example slot `10:00` → `2026/09/21 01:00` on a UTC host). That is not a failed create.
- The create form title field is `タイトル`. Item is optional (`なし（記録は作らない）`). Title is required.
- Use `exact: true` on `計画`, `プラン`, and `日`.
- ボード has no `カンバン` / `スケジュール` tabs. Do not wait for heading `ボード` after a schedule URL. See `board.md`.
- TanStack Router Devtools at the page bottom can intercept `保存`. Force-click the dialog button, or hide the overlay, then wait for the dialog to close. Closing Devtools is not a product assertion.
- Google Calendar OAuth is not this map. The header button is only an entry; do not treat a click as a completed sync.
- Creating a 計画プリセット is [presets.md](./presets.md).
- Narrow viewports keep `計画` as a primary tab. `項目` / `方法` / `ゴミ箱` stay behind `その他`.
- Direct `goto /plan?...` can render CatchBoundary `ログインが必要です` from `RunningTimerIndicator` while cookies remain. Click `ログインし直す` and continue. That is a product gap, not a failed plan recipe. Prefer the `計画` nav link after a signed-in snapshot when you only need the default tab.
