# Execution board

The board shows today's (or a selected day's) records as kanban columns 未着手 / 進行中 / 確定 / スキップ. Status changes here apply immediately. Writing still belongs on 日; the board is for state and the timer.

## Sub-features

- `board-open` opens `/board` on the カンバン tab.
- `board-see-row` shows an existing unconfirmed row in 未着手.
- `board-confirm` confirms a row from its card menu and moves it to the 確定 column.
- `schedule-open` opens the day / week / month / year schedule views.
- `schedule-create` creates a timed plan from a day or week slot.
- `schedule-quarter-hour` exposes 15-minute empty-slot names on day view. Week empty slots remain one-hour buttons.

## How to get to it (user POV)

- Choose the `ボード` nav link.
- From a day, follow `YYYY-MM-DD の記録をカンバンで見る`.
- Tabs on the page: `カンバン` (default) and `スケジュール`.

## Driving it with playwright-cli

Preconditions:

- Signed in. Today has at least one 未着手 row (add it on 日 first via `day-log.md` `day-add-adhoc`, and do not confirm it yet).
- `control-cairn doctor` is OK. Desktop width.

- **Open board.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: 'ボード', exact: true })"` or `goto http://localhost:3000/board`. Wait for heading `ボード`. A click that only changes the URL while the snapshot still shows 日 is not proof. The カンバン tab is selected. Lead copy mentions `今日の記録の状態` when viewing today.
- **See the row.** The region `カンバンの列` contains a labelled group `未着手 1件` and the card for `検証項目` (or the item you added). Scope with `getByLabel('未着手 1件')`. `getByRole('generic', { name: /^未着手/ })` does not match this group.
- **Confirm from the board.** On that card, open the button named `{item} の操作` (a space before `の操作`), then choose the menu item `完了にする`. The card leaves 未着手 (`未着手 0件`) and appears under `確定`. A sibling button `{item} の順序を変更` is reorder, not this sub-feature. The board applies this status change directly; it does not open the day-log confirmation form.
- **Second view.** Open `日`. Volume includes the confirmed minutes and the row badge is `完了`.
- **Day shortcut entry.** Return to 日 and click the link whose accessible name is the displayed date followed by ` の記録をカンバンで見る`. Use the fresh snapshot to keep the actual date literal. Verify that the board date matches before repeating the card steps.
- **Open the schedule.** Choose the `スケジュール` tab. The view tabs have accessible names `日表示に切り替え`, `週表示に切り替え`, `月表示に切り替え`, and `年表示に切り替え`.
- **Create a timed plan.** Select the day view (`日表示に切り替え`) and click an empty button such as `Time slot 10:00:00 - 10:15:00`. Week view is not this locator. In `予定を追加`, choose an item, set start and end times, and save. Reload the day schedule, wait for heading `ボード`, then verify a `検証項目` event button remains. Select it to inspect the saved interval in `予定を編集`. The create form may show wall times in the browser timezone while slot names stay on the calendar clock.
- **Quarter-hour intervals.** Day view exposes four empty slot buttons per hour, named `Time slot HH:MM:SS - HH:MM:SS` (example `Time slot 10:00:00 - 10:15:00`). Week view still uses one-hour names that include the date, for example `Time slot 2026-09-12 10:00:00 - 11:00:00`. Prove 15-minute slots on day view. Do not claim week empty slots are 15 minutes from day-view names. Desktop pointer drag and resize on day view also snap to 15 minutes.
- **Year entry.** Choose `年表示に切り替え`. Select an enabled day and verify the schedule navigates to that date. Future days may be disabled by the app's write rules.
- **Proof.** Capture the board after the move. Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/board.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/board.png"`. Artifacts show heading `ボード` and the item under 確定.

## Gotchas

- An empty day has no cards. Add a row on 日 first; do not treat an empty kanban as a board failure.
- Drag-and-drop works on desktop. Prefer the card menu and timer buttons for status verification because they have stable accessible names. Pointer drag is only required when explicitly proving drag or resize.
- Several records can share the same item label. Scope the `{item} の操作` button to its card or choose the intended occurrence from a fresh snapshot.
- A schedule item label can also appear as all-day records and as a timed plan. Open the intended occurrence from a fresh snapshot and verify its edit dialog interval.
- Timer buttons `計測をはじめる`, `計測を止める`, `計測を続ける` live on the board only. They are not proven by `day-log.md`.
- Narrow viewports hide `項目` / `プリセット` / `ゴミ箱` behind その他. `ボード` stays a primary tab.
- Confirming a zero-minute row prompts for minutes. Have a number ready.
