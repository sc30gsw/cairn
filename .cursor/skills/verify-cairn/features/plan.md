# Plan

計画 is the date-parented 予定 surface at `/plan`. The page heading is `計画`. Tabs are `プラン` and `スケジュール`. The default tab is `スケジュール`. The default schedule view is day.

## Sub-features

- `plan-open` opens `/plan` from the `計画` nav link.
- `plan-tab` chooses `プラン`. The left column is an inline DatePicker (`aria-label` `日付を選択`, not a textbox), `今日`, and Clock (`aria-label` `一日の時計`). The right column has `予定を追加` and that day's event cards.
- `plan-holiday` shows Japanese holidays on that DatePicker (example `23 9月 2026` with `title` `秋分の日`).
- `plan-pick-date` clicks a calendar day such as `25 9月 2026`. Lead copy becomes `{date} の計画。記録は日のままです。` Today uses `今日の計画。記録は日のままです。`
- `plan-create` opens `予定を追加`, saves a titled event, reloads, and still sees Clock plus that card on `プラン`.
- `schedule-open` uses the default `スケジュール` tab (or chooses it). View controls are `日表示に切り替え`, `週表示に切り替え`, `月表示に切り替え`, and `年表示に切り替え`.
- `schedule-create` creates a timed plan from a day empty slot such as `Time slot 10:00:00 - 10:15:00`. After reload, wait for heading `計画`.
- `schedule-quarter-hour` exposes 15-minute empty-slot names on day view. Week empty slots remain one-hour buttons that include the date.
- `schedule-no-clock` the schedule tab does not show `一日の時計`.

## How to get to it (user POV)

- Choose the `計画` nav link (desktop right rail; `計画` stays a primary tab at 390).
- Open `/plan` directly.
- `/board?tab=schedule` redirects to `/plan`.

## Driving it with playwright-cli

Preconditions:

- Signed in (see `account-auth.md`). A catalog item is optional for title-only create; use `検証項目` when the form should name an item.
- `control-cairn doctor` is OK. Session is on desktop width so `計画` is a visible nav link.

- **Open plan.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '計画', exact: true })"` or `goto http://localhost:3000/plan`. Wait for heading `計画`. The `スケジュール` tab is selected. There is no `一日の時計`. Do not wait for `週を選択`; the landing view is day, so look for `日表示に切り替え`.
- **Open プラン.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('tab', { name: 'プラン', exact: true })"`. Assert `getByLabel('日付を選択')`, no textbox named `日付を選択`, `getByLabel('一日の時計')` under the calendar, and `getByRole('button', { name: '予定を追加' })` on the right.
- **Holiday.** `getByLabel('23 9月 2026')` has `title` `秋分の日` when that month is showing. Change month only if the visible grid is not September 2026.
- **Pick a date.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByLabel('25 9月 2026')"`. Lead copy includes `2026-09-25 の計画`. Clock remains visible.
- **Create on プラン.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '予定を追加' })"`. Dialog title is `予定を追加`. Fill `タイトル` with `検証プラン` and save. Wait until that dialog is hidden, then assert the list card `検証プラン` (the title field also reads `検証プラン` while the overlay is open). Reload. Wait for heading `計画`, choose `プラン` if the default tab returned, then assert Clock and `検証プラン`.
- **Schedule has no Clock.** Choose `スケジュール`. Assert `日表示に切り替え` and `queryByLabel('一日の時計')` is empty. A `検証プラン` event may appear on the day timeline when the selected date matches.
- **Create from a slot.** On day view, click an empty button such as `Time slot 10:00:00 - 10:15:00`. Week view is not this locator. Save from `予定を追加`. Reload, wait for heading `計画` (not `ボード`), and confirm the event remains. Select it to inspect `予定を編集`.
- **Quarter-hour intervals.** Day view exposes four empty slot buttons per hour, named `Time slot HH:MM:SS - HH:MM:SS`. Week view still uses one-hour names that include the date. Prove 15-minute slots on day view.
- **Year entry.** Choose `年表示に切り替え`. Click a day button (names look like `9月 23, 2026`). That opens a popover `{date}の予定`; it does not switch to day view by itself.
- **Proof.** Capture プラン with Clock and the saved card, and スケジュール without Clock. Example: `$ART/plan-tab.aria.yml` / `.png` and `$ART/schedule-tab.aria.yml` / `.png`. Write `proof.txt` with feature IDs `plan-tab` and `schedule-no-clock`.

## Gotchas

- Default tab is `スケジュール`. Clock lives only on `プラン`.
- Default schedule view is day. `週を選択` is week navigation, not the landing control.
- The プラン date control is an inline DatePicker, not `DatePickerInput`. `getByRole('textbox', { name: '日付を選択' })` must stay null. On `スケジュール`, `日付を選択` is a different DatePickerInput button; scope the inline calendar with `getByLabel('日付を選択')` inside tabpanel `プラン`.
- After save, wait for dialog `予定を追加` to hide. `getByText('検証プラン')` matches the title field while the overlay is still open.
- After reload, wait for heading `計画`. A snapshot that only shows `読み込み中` is not proof. The URL may drop back to the default `スケジュール` tab; choose `プラン` again before asserting Clock.
- The create form title field is `タイトル`. Item is optional (`なし（記録は作らない）`). Title is required.
- Use `exact: true` on `計画`, `プラン`, and `日`.
- `/board` is kanban only. Do not look for `スケジュール` there. See `board.md`.
