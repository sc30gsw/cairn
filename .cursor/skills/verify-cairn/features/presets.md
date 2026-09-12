# Presets

A preset is a weekday template applied when today opens with no existing live records. Past days do not receive templates automatically. The optional holiday setting uses Sunday's template on Japanese holidays. Each weekday belongs to at most one preset. One preset can cover several unused weekdays at create time. Lines can be empty at creation; items are attached afterwards.

## Sub-features

- `preset-open` opens `/presets` from the nav.
- `preset-create` adds a named preset for one or more unused weekdays.
- `preset-empty-state` shows `プリセットはまだありません` when the account has none (only on a fresh account).
- `preset-holiday-setting` saves the holiday-as-Sunday preference and preserves it after reload.
- `preset-setup-completion` changes the home setup step to `プリセットを登録する: 完了` after creation.

## How to get to it (user POV)

- Choose the `プリセット` nav link.
- The home stepper `プリセットを登録する` goes to `/presets`.
- A day page `この日の雛形` field is combobox `プリセット切替`. It switches among existing presets; it does not create them.

## Driving it with playwright-cli

Preconditions:

- Signed in. At least one item exists if you will add lines; create-only does not require an item.
- At least one weekday has no preset yet.
- `control-cairn doctor` is OK.

- **Open presets.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: 'プリセット', exact: true })"`. Without `exact: true`, the home stepper link `プリセットを登録する` also matches. Heading `プリセット` is visible. A new account also shows `プリセットはまだありません`.
- **Name and weekdays.** Run `rtk proxy playwright-cli -s="$SESSION" fill "getByLabel('プリセット名', { exact: true })" "検証プリセット"`, then `rtk proxy playwright-cli -s="$SESSION" click "getByRole('combobox', { name: '曜日', exact: true })"`. The field is a MultiSelect. From the new snapshot, click one or more free weekday options. Taken weekdays remain listed as disabled options such as `月曜日（使用中）`; they are not omitted. Press Escape if the list stays open.
- **Create.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: 'プリセットを追加' })"`. An accordion control appears whose visible title is `検証プリセット` and whose summary lists the chosen weekdays, for example `月曜日・水曜日 · 記録なし`. After create the control may have no accessible name; after reload it is a region named `検証プリセット 月曜日・水曜日 · 記録なし`. Prefer `getByText('検証プリセット')` plus that summary. The empty-state title is gone.
- **Confirm persistence.** Reload `/presets`. Wait for heading `プリセット` before reading. A snapshot taken during `読み込み中` is not proof. `検証プリセット` is still listed.
- **Holiday setting.** Read the checked state of `getByRole('switch', { name: /^祝日は日曜のプリセットを使う/ })`. Its accessible name includes the description, so do not use an exact short-name match. Press `Space` on that locator, wait for `祝日は日曜のプリセットを使います` or `祝日も曜日のプリセットを使います`, and reload. Verify the checked state persisted, then restore the initial state with `Space`. This proves preference storage, not actual holiday template application.
- **Setup completion.** Return through the `日` link while setup is still visible. The progress button reads `プリセットを登録する: 完了`; capture the updated stepper. The progress button is a status indicator; the separate link is the navigation entry.
- **Onboarding entry.** Return to a fresh account’s home setup and click its `プリセットを登録する` link from the snapshot; require `/presets`, then use the same create/persistence steps. Mark this entry skipped if setup was already dismissed.
- **Proof.** Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/presets.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/presets.png"`. Both show heading `プリセット` and `検証プリセット`.

## Gotchas

- When every weekday already has a preset, the create form is replaced by `すべての曜日にプリセットがあります。` Report that instead of failing the click.
- Automatic application requires opening today with no existing live records. Creating a preset does not replace existing records or automatically populate past days. Explicit `プリセット切替` is a separate day operation.
- Actual holiday application needs today to be a Japanese holiday, the preference enabled, a Sunday preset with lines, and no existing live records. Record that prerequisite separately from the always-reachable setting save/reload proof.
- A broad `/検証プリセット/` locator also matches save (`検証プリセットを保存`) and delete (`検証プリセットを削除`). Do not treat those as the accordion title.
- Accordion editors expose `{preset}の新しい名前`, weekday, and per-line item/ひとこと/分数. Those edits are out of this first map unless you name them in `proof.txt`.
