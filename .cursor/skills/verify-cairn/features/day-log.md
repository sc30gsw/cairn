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

- **Open today.** Run `rtk proxy playwright-cli -s="$SESSION" goto http://localhost:3000/` or `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '日', exact: true })"`. The 記録 card is visible. Empty today shows `この日の記録はありません` (or preset rows if a weekday preset already applied). `あとで設定` dismisses one setup step only; repeat or ignore. Scroll `検証項目の記録` into view before a screenshot — the stepper can push the row below the fold.
- **Choose item.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('combobox', { name: 'その日限りの項目', exact: true })"`, then `rtk proxy playwright-cli -s="$SESSION" click "getByRole('option', { name: '検証項目', exact: true })"`. The field value is `検証項目`.
- **Enter note and minutes.** Run `rtk proxy playwright-cli -s="$SESSION" fill "getByRole('textbox', { name: 'その日限りのひとこと' })" "検証のひとこと"` and `rtk proxy playwright-cli -s="$SESSION" fill "getByRole('textbox', { name: '分数' })" "25"`. `分数` is a textbox.
- **Add record.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '記録を足す' })"`. A form named `検証項目の記録` appears. Volume is still `0分` until confirm. Badge on the row reads `未着手`.
- **Confirm.** Snapshot the form `検証項目の記録`. Run `run-code` with `async page => { await page.getByRole('form', { name: '検証項目の記録', exact: true }).getByRole('switch', { name: '記録を確定', exact: true }).press('Space'); }`. This uses the switch's keyboard interaction without relying on Mantine's sibling elements. After Convex updates: the switch is checked, the badge reads `完了`, the volume heading is `25分`, and 共有文 contains `検証項目`.
- **Second view.** Reload `/`. The same `検証項目の記録` form remains, badge `完了`, volume `25分`.
- **Other dates.** From `履歴` choose a dated link from the current snapshot; alternatively use `前の日` or the `学習日` field from 日. Record the resulting `/days/YYYY-MM-DD` URL and repeat the row steps only for a writable date. Proving `/` alone does not cover these entries.
- **Proof.** Capture the confirmed day. Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/day-confirmed.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/day-confirmed.png"`. Artifacts show 学習量 `25分` and `検証項目`. Write `proof.txt` with feature ID `day-confirm` and entry `/`.

## Gotchas

- `記録を足す` is disabled when the catalog has no items. That is an unmet catalog precondition, not a day-log bug.
- Confirming is a switch, not a button labelled 確定. The accessible name is `記録を確定`. Turning it off on a 確定 row opens `見送りにしますか？`.
- When other records already exist, scope the add fields to `page.locator('form').filter({ has: page.getByRole('button', { name: '記録を足す', exact: true }) })`; `分数` also appears in existing record forms. Use a fresh item or scope the intended record when several rows share an item name.
- ひとこと may be empty. Minutes `0` can still confirm. Use `25` so volume proof is obvious.
- JST "today" follows the server/client JST date. Do not invent a future `/days/20xx-…` URL to write records.
- Day page does not start or stop the timer. Timer controls live on ボード.
- `昨日の確定をコピー` needs yesterday confirmed rows. Skip it unless that precondition is seeded.
- `この日をゴミ箱へ` deletes the day document. Do not use it unless you are proving trash.
