# Execution board

The board shows today's (or a selected day's) records as kanban columns 未着手 / 進行中 / 確定 / スキップ. Status changes here apply immediately. Writing still belongs on 日; the board is for state and the timer.

## Sub-features

- `board-open` opens `/board` on the カンバン tab.
- `board-see-row` shows an existing unconfirmed row in 未着手.
- `board-confirm` confirms a row from the card control `確定する` and moves it to the 確定 column.

## How to get to it (user POV)

- Choose the `ボード` nav link.
- From a day, follow `YYYY-MM-DD の記録をカンバンで見る`.
- Tabs on the page: `カンバン` (default) and `スケジュール`.

## Driving it with playwright-cli

Preconditions:

- Signed in. Today has at least one 未着手 row (add it on 日 first via `day-log.md` `day-add-adhoc`, and do not confirm it yet).
- `control-cairn doctor` is OK. Desktop width.

- **Open board.** Run `playwright-cli -s="$SESSION" click "getByRole('link', { name: 'ボード' })"`. Heading `ボード` is visible. The カンバン tab is selected. Lead copy mentions `今日の記録の状態` when viewing today.
- **See the row.** The region `カンバンの列` contains a column whose accessible name starts with `未着手` and the card for `検証項目` (or the item you added).
- **Confirm from the board.** On that card, run `playwright-cli -s="$SESSION" click "getByRole('button', { name: '確定する' })"`. If minutes are missing the board asks for them in place — enter `25` and confirm. The card leaves 未着手 and appears under `確定`.
- **Second view.** Open `日`. Volume includes the confirmed minutes and the row badge is `完了`.
- **Proof.** Capture the board after the move. Run `playwright-cli -s="$SESSION" --raw snapshot > "$ART/board.aria.yml"` and `playwright-cli -s="$SESSION" screenshot --filename="$ART/board.png"`. Artifacts show heading `ボード` and the item under 確定.

## Gotchas

- An empty day has no cards. Add a row on 日 first; do not treat an empty kanban as a board failure.
- Drag-and-drop works on desktop. Prefer the card menu / `確定する` / `計測をはじめる` buttons — they have accessible names. Pointer drag is not required for this map.
- Timer buttons `計測をはじめる`, `計測を止める`, `計測を続ける` live on the board only. They are not proven by `day-log.md`.
- Narrow viewports hide `項目` / `プリセット` / `ゴミ箱` behind その他. `ボード` stays a primary tab.
- Confirming a zero-minute row prompts for minutes. Have a number ready.
