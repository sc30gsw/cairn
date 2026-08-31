# Day log

The day log is today's (or a past day's) paper: ad-hoc records, confirm/skip, learning volume, condition/memo, and a link to the kanban. Writing happens here. The home route `/` is always "today" in JST.

## Sub-features

- `day-open-today` opens `/` and shows the day heading, volume, and 記録 card.
- `day-add-adhoc` adds a one-off record from `記録を足す`.
- `day-confirm` marks that record 確定 via `記録を確定` and increases 学習量.
- `day-volume` shows the confirmed minutes on the volume title.

## How to get to it (user POV)

- Choose the `日` nav link, or open `/`.
- Open a past day from 履歴 or by changing `学習日` / `前の日`. Future calendar days are `未記録` and cannot be written.
- From a day, `YYYY-MM-DD の記録をカンバンで見る` goes to the board for that date.

## Driving it with playwright-cli

Preconditions:

- Signed in. At least one item exists (create `検証項目` via `catalog-items.md` if the ad-hoc item select is empty / `記録を足す` is disabled).
- Today is writable (not a future `未記録` day).
- `control-cairn doctor` is OK. Session is on desktop width.

- **Open today.** Run `playwright-cli -s="$SESSION" goto http://localhost:3000/` or `playwright-cli -s="$SESSION" click "getByRole('link', { name: '日', exact: true })"`. The 記録 card is visible. Empty today shows `この日の記録はありません` (or preset rows if a weekday preset already applied). `あとで設定` dismisses one setup step only; repeat or ignore. Scroll `検証項目の記録` into view before a screenshot — the stepper can push the row below the fold.
- **Choose item.** On `その日限りの項目`, select `検証項目` (the combobox option whose name is the item). The field value is `検証項目`.
- **Enter note and minutes.** Run `playwright-cli -s="$SESSION" fill "getByRole('textbox', { name: 'その日限りのひとこと' })" "検証のひとこと"` and `playwright-cli -s="$SESSION" fill "getByRole('textbox', { name: '分数' })" "25"`. `分数` is a textbox.
- **Add record.** Run `playwright-cli -s="$SESSION" click "getByRole('button', { name: '記録を足す' })"`. A form named `検証項目の記録` appears. Volume is still `0分` until confirm. Badge on the row reads `未着手`.
- **Confirm.** Snapshot the form `検証項目の記録`. Click the visible track immediately after switch `記録を確定` (the `[cursor=pointer]` sibling). `getByRole('switch')` hits a hidden input whose track label intercepts the click. After Convex updates: the switch is `[checked]`, the badge reads `完了`, the volume heading is `25分`, toast `記録を確定しました`, and 共有文 contains `検証項目`.
- **Second view.** Reload `/`. The same `検証項目の記録` form remains, badge `完了`, volume `25分`.
- **Proof.** Capture the confirmed day. Run `playwright-cli -s="$SESSION" --raw snapshot > "$ART/day-confirmed.aria.yml"` and `playwright-cli -s="$SESSION" screenshot --filename="$ART/day-confirmed.png"`. Artifacts show 学習量 `25分` and `検証項目`. Write `proof.txt` with feature ID `day-confirm` and entry `/`.

## Gotchas

- `記録を足す` is disabled when the catalog has no items. That is an unmet catalog precondition, not a day-log bug.
- Confirming is a switch, not a button labelled 確定. The accessible name is `記録を確定`. Turning it off on a 確定 row opens `見送りにしますか？`.
- ひとこと may be empty. Minutes `0` can still confirm. Use `25` so volume proof is obvious.
- JST "today" follows the server/client JST date. Do not invent a future `/days/20xx-…` URL to write records.
- Day page does not start or stop the timer. Timer controls live on ボード.
- `昨日の確定をコピー` needs yesterday confirmed rows. Skip it unless that precondition is seeded.
- `この日をゴミ箱へ` deletes the day document. Do not use it unless you are proving trash.
