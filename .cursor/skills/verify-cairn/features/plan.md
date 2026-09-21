# Plan (計画)

計画 is the date-parented 予定 surface at `/plan`. Timed plans live here, not on ボード. Recording still belongs on 日. The page heading is `計画`. Tabs are `プラン` and `スケジュール`. With no `?tab=` search, `プラン` is selected. Clock is visible on that landing as the last peer card. スケジュール has no Clock. プラン date chrome reuses `LearningDateNavigation` (`学習日` compact date plus Tooltip `前の日の計画へ` / `次の日の計画へ` / `今日の計画へ`) but its picker and `次の日の計画へ` allow JST today through today+7 inclusive. 日 `学習日` and スケジュール `日付を選択` stay capped at today. Future plan dates store 予定 only; no `days` / rows materialize until that calendar day opens on 日. There is no visible month grid on プラン.

## Sub-features

- `plan-open` opens `/plan` from the `計画` nav link (desktop rail and mobile primary).
- `plan-tab` is that landing: no `?tab=`. One stack, not two columns: `LearningDateNavigation` (`aria-label` `学習日`, not `日付を選択`) with `前の日の計画へ` / `次の日の計画へ` (and `今日の計画へ` when the selected day is not today), then `予定一覧` (`この日の予定を開きます`) with header `予定を追加` (`この日に予定を 1 件足します`), then 計画プリセット, a read-only 目標 card, 障害プラン, and Clock last (`heading` and `aria-label` `何に時間を使ったか`). No complementary landmark, no heading `一日の時計`, and no inline DatePicker month grid.
- `plan-holiday` opens the `学習日` picker (same popover as 日) and shows Japanese holidays (example `23 9月 2026` with `title` `秋分の日`). Those day cells are not on the page until the picker opens.
- `plan-pick-date` uses `前の日` / `次の日` or the `学習日` picker. Lead copy becomes `{date} の計画。記録は日のままです。` Today uses `今日の計画。記録は日のままです。` On プラン, future days through today+7 are selectable (`次の日` disabled only on today+7, picker `maxDate` today+7). 日 still blocks future days at today.
- `plan-week-ahead` opens a future day within the window (example today `2026-08-17`, pick `2026-08-20`). `次の日` works from today. Saved 予定 persist after reload but do not create 日 rows or 記録 until that calendar day opens. Item-tied 予定 stay plan-only on the future date.
- `plan-month` shows the compact `学習日` value of the selected `?date=` (example `2026/08/20`), not a month header such as `2026年10月`. `今日の計画へ` returns to today. `?date=` beyond today+7 clamps to the max plan date (example today `2026-08-17`, `?date=2026-09-25` shows `2026-08-24`). Month paging chevrons and a labelled `今日` button are gone.
- `plan-create` clicks `予定を追加` on プラン (`aria-label` `この日に予定を 1 件足します`) to open modal `予定を追加` (same form as card `予定を編集`). Empty days may also get 予定 from `この日に適用` on a saved 計画プリセット card without opening the editor (`{YYYY/MM/DD} にこの計画を使用します`). One-off timed create on スケジュール is `schedule-create`.
- `plan-event-form` in modal `予定を追加` / `予定を編集` (`予定を追加`, card click, or スケジュール slot), fields are 項目 → タイトル → 開始・終了 → 優先度. Start/end are Mantine `TimeInput` on the selected plan date. Title hides when an item is selected and saves empty; title is required when item is unset.
- `plan-list-presets` shows 計画プリセット on the プラン landing with `この日の予定` beside `計画プリセットを追加` (create and occupancy proofs live in [presets.md](./presets.md)).
- `plan-from-board-schedule` follows a leftover `/board?tab=schedule` URL to `/plan` without `tab` (プラン landing).
- `schedule-open` chooses `スケジュール`. View controls are tabs `日表示に切り替え`, `週表示に切り替え`, `月表示に切り替え`, and `年表示に切り替え`.
- `schedule-create` creates a timed plan from a day empty slot such as `Time slot 10:00:00 - 10:15:00`, or from year-view popover `{date}の予定` button `予定を追加`. After reload, wait for heading `計画`.
- `schedule-quarter-hour` exposes 15-minute empty-slot names on day view. Week empty slots remain one-hour buttons that include the date.
- `schedule-no-clock` the schedule tab does not show heading or label `何に時間を使ったか`, and does not reuse the 日 `学習日` chrome. Its own `日付を選択` DatePickerInput stays on スケジュール only.

## How to get to it (user POV)

- Choose the `計画` nav link (`IconClock`). Mobile primary tabs are `日` / `ボード` / `計画` / `目標`.
- Open `/plan` directly with no `?tab=`, or `/plan?date=YYYY-MM-DD` for a specific day.
- Home stepper `計画プリセットを登録する` has href `/plan?tab=plan`; after navigation the location is `/plan` with プラン selected.
- `/presets` replace-redirects to `/plan` with no `tab` (see [presets.md](./presets.md)).
- `/board?tab=schedule` replace-redirects here without `tab` (kanban stays on `/board`).
- Header button `Google カレンダー連携` is on this page, not ボード.

## Driving it with playwright-cli

Preconditions:

- Signed in (see `account-auth.md`). Clock and empty schedule do not need a catalog item. A catalog item is optional for title-only create (`なし（記録は作らない）`). Use `検証項目` when the form should name an item. A 計画プリセット event may also use item `なし（記録は作らない）`.
- `control-cairn doctor` is OK. Desktop width so `計画` is a visible nav link, unless the step says otherwise.

- **Open plan.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '計画', exact: true })"` or `goto http://localhost:3000/plan`. Do not append `?tab=`. Wait for heading `計画`. Lead copy for today is `今日の計画。記録は日のままです。`. Tab `プラン` is selected. Assert `getByLabel('学習日')`, `getByRole('button', { name: '前の日の計画へ' })`, `getByRole('button', { name: '次の日の計画へ' })` (enabled on today), `getByRole('button', { name: 'この日に予定を 1 件足します' })`, `getByRole('button', { name: 'この日の予定を開きます' })`, no `今日の計画へ` on today, no `getByLabel('日付を選択')`, and no month button such as `2026年9月`. Day cells such as `25 9月 2026` are absent until the picker opens. `queryByRole('complementary')` is empty. Wait for heading `何に時間を使ったか` (also `getByLabel('何に時間を使ったか')`). `queryByRole('heading', { name: '一日の時計' })` is empty. Section `計画プリセット` is visible. A new account shows `計画プリセットはまだありません`. Heading `目標` with link `目標ページで編集` (`/goals`) is read-only here. Heading `障害プラン` (same `もし` / `なら` / `障害プランを追加` as 日) lists plans already created on 日. Document order after date chrome is 予定一覧 → 計画プリセット → 目標 → 障害プラン → Clock last. Do not wait for `週を選択` or `日表示に切り替え` on this landing.
- **Clock face.** The labelled card is a 24h occupancy wall-clock (`svg` `aria-hidden`): numerals `0` / `6` / `12` / `18`, today's needle, legend Color + `高` / `中` / `低` (no `高（Banana）` / `中（Sage）` / `低（Blueberry）`), and `予定に載らない確定 N分`. Sectors are filled pie paths. They appear only for a 確定 event that names an item. Title-only `検証プラン` does not paint. `低（Graphite）` is not on this face.
- **Holiday.** Click `学習日` so the picker popover opens. `getByLabel('23 9月 2026')` has `title` `秋分の日` when that month is showing. Change month only inside that popover. A closed picker with no day cells is the landing, not a failed holiday.
- **Pick a date.** From today, run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '前の日の計画へ' })"`. Lead copy includes the previous JST date and `の計画`. `今日の計画へ` appears. Clock remains visible. Alternatively open `学習日` and choose a past day. For `plan-week-ahead`, click `次の日の計画へ` up to three times (or pick a future cell within today+7 from the picker). Lead copy uses that future JST date. `今日の計画へ` appears. `次の日の計画へ` stays enabled until today+7.
- **Other-date URL.** Run `rtk proxy playwright-cli -s="$SESSION" goto "http://localhost:3000/plan?date=2026-08-20"` when today is `2026-08-17`. Wait for heading `計画` and heading `何に時間を使ったか`. Assert tab `プラン`, compact `学習日` text `2026/08/20`, lead copy `2026-08-20 の計画`, `今日の計画へ`, and `queryByRole('button', { name: '2026年10月' })` is empty. If heading `ログインが必要です` appears, click `ログインし直す` and wait for `計画` again — that recovery is not plan-month proof (see Gotchas).
- **URL clamp.** With the same today, `goto http://localhost:3000/plan?date=2026-09-25`. Compact `学習日` shows `2026/08/24` (today+7), not `2026/09/25`. Lead copy is `2026-08-24 の計画`.
- **今日へ戻る.** From that future URL, click `今日の計画へ`. Wait for `今日の計画` and compact `学習日` of today (example `2026/08/17`). There is no labelled `今日` button and no month header to restore. If heading `ログインが必要です` appears after `今日の計画へ` or a `計画` nav click, click `ログインし直す` and wait for heading `何に時間を使ったか` — that recovery is not date-chrome proof.
- **Create on プラン.** Click `予定を追加` (`この日に予定を 1 件足します`). Modal `予定を追加` opens. With no item, fill textbox `タイトル` (example `検証プラン`). Default `開始` / `終了` are `09:00` / `10:00` on the selected plan date. Click `保存`. Wait for the event in `予定一覧` (open `この日の予定を開きます`). Reload. Wait for heading `何に時間を使ったか`. Still on `プラン` with Clock last and that card. Open `予定一覧` and click the row to open modal `予定を編集` (same field order). Selecting an item hides `タイトル`. A title-only event does not paint a Clock sector. On a future date within the window, the card persists after reload but 日 has no new 記録 row. Template apply: create a 計画プリセット (see [presets.md](./presets.md)), then `この日に適用` on the card without opening the editor.
- **Schedule has no Clock.** Choose tab `スケジュール`. Assert tab `日表示に切り替え` (it is not a button) and `queryByRole('heading', { name: '何に時間を使ったか' })` is empty. `queryByLabel('学習日')` is empty. A `検証プラン` event may appear on the day timeline when the selected date matches. スケジュール keeps its own `日付を選択` control.
- **Create from a slot.** On day view, click an empty button such as `Time slot 10:00:00 - 10:15:00`. Week view is not this locator. In modal `予定を追加`, combobox `項目` is first. With no item, fill textbox `タイトル` (example `スロット検証`). `開始` / `終了` are `TimeInput` values matching the slot (example `10:00` / `10:15`), not full datetimes. Click `保存`. Reload, wait for heading `計画` (not `ボード`), and confirm the event remains. Select it to inspect modal `予定を編集`.
- **Quarter-hour intervals.** Day view exposes four empty slot buttons per hour, named `Time slot HH:MM:SS - HH:MM:SS` (example `Time slot 10:00:00 - 10:15:00`). Week view still uses one-hour names that include the date. Prove 15-minute slots on day view.
- **Board leftover URL.** `goto http://localhost:3000/board?tab=schedule` must land on `/plan` with heading `計画`, selected `プラン`, compact `学習日`, and heading `何に時間を使ったか`. A click that only changes the board URL is not this sub-feature. Choose `スケジュール` only when proving the timeline.
- **Year entry.** On スケジュール, choose `年表示に切り替え`. Click a day button (names look like `9月 21, 2026`). That opens a popover `{date}の予定` (example `2026-09-21の予定`); it does not switch to day view by itself. The popover button `予定を追加` opens dialog `予定を追加` (same form as a slot). That is a スケジュール create path. プラン also has list button `予定を追加` above the cards.
- **Proof.** Capture the `/plan` landing (プラン with `予定一覧` / `予定を追加`, Clock last, compact `学習日`, no month grid, and the saved card) and スケジュール without Clock. For `plan-month` / `plan-week-ahead`, capture a future URL within the window and `今日の計画へ`; for clamp, capture `?date=` beyond +7 showing today+7. Example: `$ART/plan-tab.aria.yml` / `.png` and `$ART/schedule-tab.aria.yml` / `.png`. Write `proof.txt` with feature IDs `plan-tab`, `plan-create`, `plan-week-ahead`, `plan-month`, and `schedule-no-clock`. Artifacts show heading `計画` and either `何に時間を使ったか` or `計画プリセット`.

## Gotchas

- Default tab is `プラン`. Clock is the last peer card on that landing, after 障害プラン. To see the timeline with no Clock, choose `スケジュール`. Template and 目標/障害プラン proofs stay on landing.
- Default schedule view is day. `週を選択` is week navigation, not a landing control. Proving スケジュール on week view does not prove Clock.
- プラン reuses `LearningDateNavigation` from 日 (`src/components/learning-date-navigation.tsx`) with `maxDateJst` today+7. Compact `学習日` is a `DatePickerInput`, not an inline `DatePicker` grid. `getByLabel('日付を選択')` on プラン must stay null. On `スケジュール`, `日付を選択` is a different DatePickerInput (`planDatePickerProps`, unchanged max); do not confuse it with プラン. 日 `学習日` keeps default `maxDateJst` today.
- On プラン, `次の日の計画へ` is disabled only when the selected date is today+7. `今日の計画へ` is absent on today. There is no always-visible `今日` text button and no `[data-direction="next"]` month chevron on プラン. `usePlanView` clamps `?date=` beyond today+7 to the max plan date.
- Future 予定 on プラン do not open a 日 or create 記録 rows until that JST calendar day is today and `days.open` runs. Proving a future card on `/plan` does not prove 日 write access.
- After save on スケジュール, wait for dialog `予定を追加` to hide. `getByText('検証プラン')` matches the title field while the overlay is still open. On プラン, list button `予定を追加` opens the same modal. Year-view popover `{date}の予定` also has `予定を追加`; that locator is スケジュール-only.
- After reload on プラン, wait for heading `何に時間を使ったか`. A snapshot that only shows `読み込み中` is not proof. On プラン the URL omits `tab`. That is still プラン; do not re-choose the tab expecting a drop to スケジュール.
- Slot button names are JST wall times. Modal `開始` / `終了` are `TimeInput` strings on the selected plan date (example `10:00` / `10:15`), not `DateTimePicker` datetimes tied to the host timezone.
- With no item selected, textbox `タイトル` is required. With an item selected, `タイトル` is hidden and saves empty; display uses the item name.
- Use `exact: true` on `計画`, `プラン`, and `日`.
- ボード has no `カンバン` / `スケジュール` tabs. Do not wait for heading `ボード` after a schedule URL. See `board.md`.
- TanStack Router Devtools at the page bottom can intercept `保存`. Force-click the dialog button, or hide the overlay, then wait for the dialog to close. Closing Devtools is not a product assertion.
- Google Calendar OAuth is not this map. The header button is only an entry; do not treat a click as a completed sync.
- Creating a 計画プリセット is [presets.md](./presets.md).
- Narrow viewports keep `計画` as a primary tab. `項目` / `方法` / `ゴミ箱` stay behind `その他`.
- Direct `goto /plan?...` can render CatchBoundary `ログインが必要です` from `RunningTimerIndicator` while cookies remain. Click `ログインし直す` and continue. That is a product gap, not a failed plan recipe. Prefer the `計画` nav link after a signed-in snapshot when you only need the default tab.
