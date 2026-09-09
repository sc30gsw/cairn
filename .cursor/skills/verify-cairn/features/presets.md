# Presets

A preset is a weekday template applied when today opens with no existing live records. Past days do not receive templates automatically. The optional holiday setting uses Sunday's template on Japanese holidays. Each weekday may have at most one preset. Lines can be empty at creation; items are attached afterwards.

## Sub-features

- `preset-open` opens `/presets` from the nav.
- `preset-create` adds a named preset for a free weekday.
- `preset-empty-state` shows `プリセットはまだありません` when the account has none (only on a fresh account).
- `preset-holiday-setting` saves the holiday-as-Sunday preference and preserves it after reload.
- `preset-setup-completion` changes the home setup step to `プリセットを登録する: 完了` after creation.

## How to get to it (user POV)

- Choose the `プリセット` nav link.
- The home stepper `プリセットを登録する` goes to `/presets`.
- A day page `この日の雛形` select switches among existing presets; it does not create them.

## Driving it with playwright-cli

Preconditions:

- Signed in. At least one item exists if you will add lines; create-only does not require an item.
- At least one weekday has no preset yet.
- `control-cairn doctor` is OK.

- **Open presets.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: 'プリセット' })"`. Heading `プリセット` is visible. A new account also shows `プリセットはまだありません`.
- **Name and weekday.** Run `rtk proxy playwright-cli -s="$SESSION" fill "getByLabel('プリセット名', { exact: true })" "検証プリセット"`, then `rtk proxy playwright-cli -s="$SESSION" click "getByRole('combobox', { name: '曜日', exact: true })"`. Click a free weekday option from the new snapshot (options contain only unused weekdays).
- **Create.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: 'プリセットを追加' })"`. An accordion row titled `検証プリセット` appears. Locate it with `getByRole('button', { name: /^検証プリセット / })`; its accessible name also includes the weekday and record count. The empty-state title is gone.
- **Confirm persistence.** Reload `/presets`. `検証プリセット` is still listed.
- **Holiday setting.** Read the checked state of `getByRole('switch', { name: /^祝日は日曜のプリセットを使う/ })`. Its accessible name includes the description, so do not use an exact short-name match. Press `Space` on that locator, wait for `祝日は日曜のプリセットを使います` or `祝日も曜日のプリセットを使います`, and reload. Verify the checked state persisted, then restore the initial state with `Space`. This proves preference storage, not actual holiday template application.
- **Setup completion.** Return through the `日` link while setup is still visible. The progress button reads `プリセットを登録する: 完了`; capture the updated stepper. The progress button is a status indicator; the separate link is the navigation entry.
- **Onboarding entry.** Return to a fresh account’s home setup and click its `プリセットを登録する` link from the snapshot; require `/presets`, then use the same create/persistence steps. Mark this entry skipped if setup was already dismissed.
- **Proof.** Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/presets.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/presets.png"`. Both show heading `プリセット` and `検証プリセット`.

## Gotchas

- When every weekday already has a preset, the create form is replaced by `すべての曜日にプリセットがあります。` Report that instead of failing the click.
- Automatic application requires opening today with no existing live records. Creating a preset does not replace existing records or automatically populate past days. Explicit `プリセット切替` is a separate day operation.
- Actual holiday application needs today to be a Japanese holiday, the preference enabled, a Sunday preset with lines, and no existing live records. Record that prerequisite separately from the always-reachable setting save/reload proof.
- A broad `/検証プリセット/` button locator also matches save and delete controls. Anchor the accordion locator with a trailing space as shown above.
- Accordion editors expose `{preset}の新しい名前`, weekday, and per-line item/ひとこと/分数. Those edits are out of this first map unless you name them in `proof.txt`.
