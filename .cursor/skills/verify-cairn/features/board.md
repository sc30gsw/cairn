# Execution board

The board shows today's (or a selected day's) records as kanban columns 未着手 / 進行中 / 確定 / スキップ. Status changes here apply immediately. Writing still belongs on 日; the board is for state and the timer. Timed 予定 and Clock live on [plan.md](./plan.md), not here.

## Sub-features

- `board-open` opens `/board` as a kanban-only page (no tab bar).
- `board-see-row` shows an existing unconfirmed row in 未着手.
- `board-hold-drag` long-presses the card body (`{item} の順序を変更`) at 390×844 and 768×1024 and drops it on another column.
- `board-confirm` confirms a row from its card menu and moves it to the 確定 column.
- `board-truncated-title` taps a clamped item name so the tooltip shows the full string.
- `board-distinction` shows an orange caption (`data-plan-caption`) of `HH:MM〜HH:MM` for every 予定 tied to that record. It is heavier than the dimmed category line. When the same item appears more than once, badge `N件目` sits beside the status badge. There is no count badge. The ordinal is not the caption. A single untied card has neither caption nor badge. The record itself does not store start or end.

## How to get to it (user POV)

- Choose the `ボード` nav link.
- From a day, follow `YYYY-MM-DD の記録をカンバンで見る`.
- There are no page tabs `カンバン` / `スケジュール`. A leftover `/board?tab=schedule` URL redirects to `/plan` with no `tab` (プラン landing; prove that on [plan.md](./plan.md)).

## Driving it with playwright-cli

Preconditions:

- Signed in. Today has at least one 未着手 row (add it on 日 first via `day-log.md` `day-add-adhoc`, and do not confirm it yet). Hold-drag needs a second 未着手 row, or reload between viewport passes, so a drop has a remaining card to observe.
- `control-cairn doctor` is OK.
- Default session is 1280×900. Hold-drag and truncated-title steps name their viewports; resize before those steps. `ボード` stays a primary tab at 390×844.

- **Open board.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: 'ボード', exact: true })"` or `goto http://localhost:3000/board`. Wait for heading `ボード`. A click that only changes the URL while the snapshot still shows 日 is not proof. Lead copy mentions `今日の記録の状態` when viewing today. There is no selected `カンバン` tab and no `スケジュール` tab.
- **See the row.** The region `カンバンの列` contains a labelled group `未着手 1件` (or `N件`) and the card for `検証項目` (or the item you added). Scope with `getByLabel('未着手 1件')`. `getByRole('generic', { name: /^未着手/ })` does not match this group.
- **Hold-drag at 768×1024.** Resize to 768×1024. In the 未着手 group, the card-body control is `getByLabel('{item} の順序を変更')` (it contains the title; it is not a hidden grip). Use `run-code` with a pointer hold of **at least 180ms** on that handle, then move to an on-screen `進行中` group and release. Library lift is 120ms; a `touchmove` before lift is swallowed so column snap-scroll cannot cancel it. Pass when counts move (example `未着手 2件` → `未着手 1件` / `進行中 1件`). A toast `計測を開始しました` may appear. Reload, wait for heading `ボード`, and confirm the card is still under 進行中.
- **Hold-drag at 390×844.** Resize to 390×844. Columns snap-scroll and a 未着手 handle can sit at a negative `x` until you `scrollLeft = 0` on region `カンバンの列`. Keep the handle on-screen, hold ≥180ms, then move right toward `進行中` (do not scroll the drop column into view first if that hides the handle). Pass when 未着手 count drops and the card sits under 進行中. This is required; pointer drag is not desktop-only. Mobile chrome is `画面ナビ（下小口）` with `日` / `ボード` / `計画` / `目標` / `その他`.
- **Hold-drag at 1280×900.** Restore desktop width. The same card-body handle still drags with a pointer. Pass when the existing desktop path is unchanged.
- **Confirm from the board.** Keep `{item} の操作` as the status fallback. On that card, open the button named `{item} の操作` (a space before `の操作`), then choose the menu item `完了にする` or `進行中にする`. After `完了にする` the card leaves 未着手 or 進行中 and appears under `確定`. Dismiss an open menu with Escape before clicking timer `確定する`; the menu portal intercepts clicks. `{item} の順序を変更` is the card-body drag handle, not this sub-feature. The board applies this status change directly; it does not open the day-log confirmation form.
- **Truncated title at 390.** Resize to 390×844. Use a **short tap** on a clamped item name (not a ≥120ms hold). Assert `getByRole('tooltip')` equals the full item name. Keyboard focus still opens it (`tabindex` 0).
- **Second view.** Open `日`. Volume includes the confirmed minutes and the row badge is `完了`.
- **Day shortcut entry.** Return to 日 and click the link whose accessible name is the displayed date followed by ` の記録をカンバンで見る`. Use the fresh snapshot to keep the actual date literal. Verify that the board date matches before repeating the card steps.
- **Proof.** Capture the board after the move. Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/board.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/board.png"`. Artifacts show heading `ボード` and the item under 確定.

## Gotchas

- An empty day has no cards. Add a row on 日 first; do not treat an empty kanban as a board failure.
- Hold the card body (`{item} の順序を変更`) to drag on every width, including 390×844 and 768×1024. The library lifts after about 120ms. Any `touchmove` before lift is swallowed so column snap-scroll cannot cancel it. Keep `{item} の操作` as the fallback for status and 上へ / 下へ. Prefer the card menu and timer buttons for status verification because they have stable accessible names. Pointer drag is required when proving hold-to-drag on phone or tablet. Do not treat a decorative `IconGripVertical` as the handle; it is `aria-hidden`.
- Several records can share the same item label. Scope the `{item} の操作` button to its card or choose the intended occurrence from a fresh snapshot. Duplicate cards show badge `1件目` or `2件目` beside the status badge. There is no count badge. 日 grouping (`day-log.md` `day-group-same-item`) does not merge these cards. Every tied plan window adds an orange `data-plan-caption` of `HH:MM〜HH:MM`, heavier than the dimmed category line. A lone card of an item has neither badge nor caption.
- Timer buttons `計測をはじめる`, `計測を止める`, `計測を続ける` live on the board only. They are not proven by `day-log.md`.
- Narrow viewports hide `項目` / `方法` / `ゴミ箱` behind その他. `ボード` and `計画` stay primary tabs. There is no `プリセット` overflow item.
- Confirming a zero-minute row prompts for minutes in modal `記録を確定`. Have a number ready.
- Skip from the card menu is `見送りにする`, not a label that says スキップ. Timer chip `確定する` also appears on 進行中 cards.
- Do not look for schedule slots, `何に時間を使ったか`, or `予定を追加` on `/board`. Timed plans are `plan.md`. A leftover `/board?tab=schedule` URL is not a board failure; it should land on `/plan` プラン.
