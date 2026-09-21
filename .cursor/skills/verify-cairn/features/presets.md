# Presets (計画プリセット)

A 計画プリセット is a timed-plan template. One template can be marked `計画し忘れたときに使う`; opening today with no plan events can expand that template. Weekday catalog templates and a dedicated `/presets` page are not on a live route. `/presets` replace-redirects to `/plan?tab=plan`.

## Sub-features

- `preset-open` opens 計画プリセット on the `/plan` プラン landing (nav `計画`, stepper, or `/presets` redirect).
- `preset-create` adds a named template with at least one timed event.
- `preset-empty-state` shows `計画プリセットはまだありません` when the account has none (only on a fresh account).
- `preset-forgotten` saves the `計画し忘れたときに使う` switch and preserves it after reload.
- `preset-setup-completion` changes the home setup step to `計画プリセットを登録する: 完了` after creation.
- `preset-legacy-url` follows `/presets` to `/plan?tab=plan`.

## How to get to it (user POV)

- Choose the `計画` nav link (lands on プラン; no tab click).
- The home stepper `計画プリセットを登録する` goes to `/plan?tab=plan`.
- Open `/presets` while signed in; the URL becomes `/plan?tab=plan`.
- There is no `プリセット` nav item. Day page has no `プリセット切替` / `この日の雛形`.

## Driving it with playwright-cli

Preconditions:

- Signed in. Creating events that skip a catalog item is allowed (`なし（記録は作らない）` is the default).
- `control-cairn doctor` is OK.

- **Open via nav.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '計画', exact: true })"`. Tab `プラン` is selected and heading `何に時間を使ったか` is visible at the bottom of the card stack. Heading `計画` and section `計画プリセット` are visible. A new account also shows `計画プリセットはまだありません`. Do not wait for heading `プリセット` or `一日の時計`. Do not click `プラン` to recover from a missing `?tab=`.
- **Open via leftover URL.** `goto http://localhost:3000/presets`. The location is `/plan?tab=plan` with the same `計画プリセット` section (the live URL may then strip `?tab=` while プラン stays selected). A heading `プリセット` is a failure (orphaned UI), not success.
- **Name and event.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '計画プリセットを追加' })"`. Fill textbox `新しい計画プリセットの名前` with `検証計画プリセット`. Click `予定を足す`. Default start/end are `09:00` / `10:00`. Fill `新しい計画プリセットの予定1のタイトル` with `検証予定`. Click `保存`. Button `検証計画プリセットを編集` appears with summary `09:00–10:00 検証予定`. Empty-state title is gone.
- **Forgotten switch.** Press `Space` on `getByRole('switch', { name: '計画し忘れたときに使う' })` until it is checked. Reload `/plan?tab=plan`. Wait for heading `計画`. The named template remains and the switch stays checked.
- **Setup completion.** Return through the `日` link while setup is still visible. Progress reads `計画プリセットを登録する: 完了`. The progress button is a status indicator; the separate stepper link is the navigation entry.
- **Onboarding entry.** On a fresh account click stepper link `計画プリセットを登録する` from the snapshot; require `/plan?tab=plan`, then use the same create/persistence steps. Mark this entry skipped if setup was already dismissed.
- **Proof.** Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/presets.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/presets.png"`. Both show heading `計画`, `計画プリセット`, and `検証計画プリセット`.

## Gotchas

- There is no weekday MultiSelect, holiday-as-Sunday switch, or accordion titled only `プリセット` on this route. Those belong to unmounted weekday preset UI; do not open them for default proof.
- `この日に適用` stays disabled until a saved template is selected for edit (`検証計画プリセットを編集`). Empty-day auto-apply of the forgotten template is a later `days.open` path; creating a template does not by itself fill today's schedule.
- After `保存`, a dirty editor can raise a `beforeunload` dialog on reload. Dismiss it and wait for heading `計画` (and `何に時間を使ったか` on プラン) before treating the snapshot as proof.
- Automatic application needs today with no existing plan events and a forgotten template. Record that prerequisite separately from the always-reachable create/reload proof.
- Clock, 15-minute slots, and `/board?tab=schedule` are [plan.md](./plan.md), not this file.
