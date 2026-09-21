# Presets (計画プリセット)

A 計画プリセット is a timed-plan template. One template can be marked `計画し忘れたときに使う`; opening today with no plan events can expand that template. Weekday catalog templates and a dedicated `/presets` page are not on a live route. `/presets` replace-redirects to `/plan` with プラン selected; default `tab=plan` is omitted from the location.

## Sub-features

- `preset-open` opens 計画プリセット on the `/plan` プラン landing (nav `計画`, stepper, or `/presets` redirect).
- `preset-day-schedule` toggles `この日の予定` beside `計画プリセットを追加`. Collapse starts closed. Open shows a `DataList` (`withDivider`) of that day's 予定 and 外部予定 in start-time order (`HH:mm–HH:mm`, name, priority dot). No 空き rows. Occupancy empty copy is `この日の予定はまだありません。` (that same sentence is also the プラン list empty paragraph, visible even while occupancy is collapsed). Narrow viewports keep both header buttons icon-only with Tooltip labels.
- `preset-create` adds a named template with at least one timed event. Event rows use field order 項目 → タイトル → 開始・終了 → 優先度. Start/end are Mantine `TimeInput`. Title is hidden and saved empty when an item is selected; title is required when item is `なし（記録は作らない）`.
- `preset-details` opens and closes the editor with the name row `{name}を編集` **or** the chevron immediately to its right (`{name}の詳細を開く` / `{name}の詳細を閉じる`). Both toggle the same details pane. Visible title text is the name, not `編集`.
- `preset-edit` opens details, changes the name or a timed event, `保存`, and keeps the change after reload.
- `preset-apply` clicks `この日に適用` on an empty day after the saved template is selected (name row or details chevron). Item-bearing 予定 become 日 記録 rows without waiting for `days.open`. Item-less 予定 stay on 計画 only and must not appear as 記録.
- `preset-unapply` clicks `適用を解除` (shown once the day has 予定). That day's 予定 are removed and their linked 記録 are deleted. Independent 日 記録 stay. The template card remains.
- `preset-delete` clicks the row button whose visible text is `削除` (`aria-label` `検証計画プリセットを削除`), confirms `「検証計画プリセット」を削除しますか？`, and the card is gone after reload. Cancel leaves it.
- `preset-empty-state` shows `計画プリセットはまだありません` when the account has none (only on a fresh account).
- `preset-forgotten` saves the `計画し忘れたときに使う` switch and preserves it after reload.
- `preset-setup-completion` changes the home setup step to `計画プリセットを登録する: 完了` after creation.
- `preset-legacy-url` follows `/presets` to `/plan` (no `?tab=`; プラン selected).

## How to get to it (user POV)

- Choose the `計画` nav link (lands on プラン; no tab click).
- The home stepper `計画プリセットを登録する` has href `/plan?tab=plan`; after navigation the location is `/plan` with プラン selected.
- Open `/presets` while signed in; the URL becomes `/plan` (no `?tab=`).
- There is no `プリセット` nav item. Day page has no `プリセット切替` / `この日の雛形`.

## Driving it with playwright-cli

Preconditions:

- Signed in. Creating events that skip a catalog item is allowed (`なし（記録は作らない）` is the default).
- `control-cairn doctor` is OK.

- **Open via nav.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '計画', exact: true })"`. Tab `プラン` is selected and heading `何に時間を使ったか` is visible at the bottom of the card stack. Heading `計画` and section `計画プリセット` are visible. Beside the section title, assert `getByRole('button', { name: 'この日の予定' })` with `aria-expanded="false"` and `getByRole('button', { name: '計画プリセットを追加' })`. With no 予定 yet, paragraph `この日の予定はまだありません。` is visible in the プラン list (sibling of `予定を追加`), not inside occupancy. `queryByRole('button', { name: '予定一覧' })` is empty. A new account also shows `計画プリセットはまだありません`. `この日に適用` is disabled until a saved template is selected. Do not wait for heading `プリセット` or `一日の時計`. Do not click `プラン` to recover from a missing `?tab=`.
- **Open via leftover URL.** `goto http://localhost:3000/presets`. The location is `/plan` with selected tab `プラン` and the same `計画プリセット` section. Do not require `?tab=plan` in the URL. A heading `プリセット` is a failure (orphaned UI), not success.
- **Day schedule toggle.** Click `この日の予定`. Wait for `aria-expanded="true"`. Occupancy Collapse (`keepMounted={false}`) then shows empty copy `この日の予定はまだありません。` **inside the panel** (a second copy of the プラン list paragraph). After applying a template or saving a plan event, reopen the toggle and assert a row label such as `09:00–10:00` with the event name. External calendar rows may appear dimmed. There is no row labelled `空き`. Click again to collapse; occupancy rows disappear, while the プラン `予定一覧` remains a separate control.
- **Name and event.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '計画プリセットを追加' })"`. Fill textbox `新しい計画プリセットの名前` with `検証計画プリセット`. Click `予定を足す`. The first event row shows combobox `項目`, then textbox `新しい計画プリセットの予定1のタイトル`, then spinbutton/textbox `開始` / `終了` (`TimeInput`; default `09:00` / `10:00`), then combobox `優先度`. Leave item `なし（記録は作らない）` and fill the title with `検証予定`. For apply proof, `予定を足す` again: set 予定2 `開始`/`終了` to `10:00`/`11:00` and combobox `新しい計画プリセットの予定2の項目` to `検証項目` (title hidden). Click `保存`. The name row is `getByRole('button', { name: '検証計画プリセットを編集' })` (`aria-label`; visible text is `検証計画プリセット`, not `編集`) with summary such as `09:00–10:00 検証予定、10:00–11:00 検証項目`. Immediate sibling chevron is `検証計画プリセットの詳細を開く`. The sibling `削除` button has `aria-label` `検証計画プリセットを削除`. Empty-state title is gone. `queryByRole('button', { name: '編集', exact: true })` is empty. `queryByRole('button', { name: '24:00に設定' })` is empty.
- **Details toggle.** Click `検証計画プリセットの詳細を開く`. Wait for `検証計画プリセットの詳細を閉じる` and the editor fields. Click the chevron again (or the name row) to close. Both controls share `aria-expanded`.
- **Item hides title.** Reopen details via the name row or chevron. On an event whose item is `なし（記録は作らない）`, set combobox `項目` to a catalog item (example `検証項目`). That event's title textbox disappears. `保存`, reload `/plan`, and the summary uses the item name instead of a free title.
- **Edit.** Click the name row `検証計画プリセットを編集` (or the chevron). Change textbox `検証計画プリセットの名前` to `検証計画プリセット改`. Click `保存`. The editor closes. Name row `検証計画プリセット改を編集` is visible. Reload `/plan`. Wait for heading `計画`. The renamed card remains.
- **Apply.** With today's 予定 empty, select the saved template (name row or chevron) so `この日に適用` enables. Click it. Do not wait for `days.open`. Button `適用を解除` appears and `この日に適用` disables. `予定一覧` appears with `aria-expanded="false"`; `検証予定` / item cards are not in the snapshot until that toggle. Open `予定一覧` and assert both 予定. Choose `日`: only the item-bearing 予定 is a 記録 (`検証項目の記録`); `検証予定` is absent. Occupancy `この日の予定` stays collapsed unless you open it.
- **Unapply.** Return to `計画`. Click `適用を解除`. Wait for paragraph `この日の予定はまだありません。`. `適用を解除` and `予定一覧` are gone. The template card remains. On `日`, the linked 記録 is gone; an independent 記録 created earlier (example confirmed `検証のひとこと`) remains.
- **Delete.** Click the row `削除` (`検証計画プリセット改を削除`, or `検証計画プリセットを削除` if you skipped edit). Dialog title is `「検証計画プリセット改」を削除しますか？`. Body is `雛形だけを消します。すでに展開した予定は残ります。`. Click `キャンセル` first and assert the card remains. Open delete again and click `削除`. The named card is gone. Reload. Wait for heading `計画`. The name is still gone. If it was the only template, `計画プリセットはまだありません` returns. Applied 予定 cards stay on プラン.
- **Forgotten switch.** Press `Space` on `getByRole('switch', { name: '計画し忘れたときに使う' })` until it is checked. Reload `/plan`. Wait for heading `計画`. The named template remains and the switch stays checked.
- **Setup completion.** Return through the `日` link while setup is still visible. Progress reads `計画プリセットを登録する: 完了`. The progress button is a status indicator; the separate stepper link is the navigation entry.
- **Onboarding entry.** On a fresh account click stepper link `計画プリセットを登録する` from the snapshot; the href may be `/plan?tab=plan`, then require location `/plan` with selected `プラン`. Use the same create/persistence steps. Mark this entry skipped if setup was already dismissed.
- **Proof.** Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/presets.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/presets.png"`. Both show heading `計画`, `計画プリセット`, and `検証計画プリセット`.

## Gotchas

- `この日の予定` and `計画プリセットを追加` are header buttons with icons. Below `(max-width: 47.9375em)` the visible label may hide; rely on `aria-label` and Tooltip text, not icon-only ambiguity.
- The occupancy list is read-only. It does not paint 空き gaps; only real 予定 and 外部予定 rows appear. Editing a preset while its editor is open can highlight draft rows in the list; that is optional proof, not required for create/delete.
- プラン list empty copy `この日の予定はまだありません。` sits next to `予定を追加` whenever the day has no events. That text is **not** proof that occupancy is open. Occupancy empty copy is inside `この日の予定` Collapse only.
- After apply or `予定を追加`, プラン cards live behind `予定一覧` (starts closed). See [plan.md](./plan.md). Occupancy `この日の予定` is a separate Collapse and does not open on apply.
- Preset event end `24:00` may display in a plain textbox when native `TimeInput` cannot hold `24:00`. There is no `24:00に設定` setter. Default proof can stay on `10:00`.
- There is no weekday MultiSelect, holiday-as-Sunday switch, or accordion titled only `プリセット` on this route. Those belong to unmounted weekday preset UI; do not open them for default proof.
- `この日に適用` stays disabled until a saved template is selected (name row `検証計画プリセットを編集` or chevron `検証計画プリセットの詳細を開く`). After save the editor may close, which deselects apply until you click again. Empty-day auto-apply of the forgotten template is a later `days.open` path; creating a template does not by itself fill today's schedule. Item-less 予定 never become 日 記録.
- After `保存`, the editor closes. A leftover dirty-form warning is not expected on reload. Wait for heading `計画` (and `何に時間を使ったか` on プラン) before treating the snapshot as proof.
- Delete confirmation uses Mantine `openConfirmModal`. Confirm label is `削除`, not the provider default `見送りにする`. Cancel must not call remove.
- Automatic application needs today with no existing plan events and a forgotten template. Record that prerequisite separately from the always-reachable create/reload proof.
- Clock, 15-minute slots, year-view `予定を追加`, and `/board?tab=schedule` are [plan.md](./plan.md), not this file.
- Leftover `/presets` and the stepper href `/plan?tab=plan` both land `/plan` with プラン selected. Asserting `location.search` contains `tab=plan` fails on a correct redirect.
