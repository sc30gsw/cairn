# Presets

A preset is the weekday template that fills today's rows when the matching weekday opens. Each weekday may have at most one preset. Lines can be empty at creation; items are attached afterwards.

## Sub-features

- `preset-open` opens `/presets` from the nav.
- `preset-create` adds a named preset for a free weekday.
- `preset-empty-state` shows `プリセットはまだありません` when the account has none (only on a fresh account).

## How to get to it (user POV)

- Choose the `プリセット` nav link.
- The home stepper `プリセットを登録する` goes to `/presets`.
- A day page `この日の雛形` select switches among existing presets; it does not create them.

## Driving it with playwright-cli

Preconditions:

- Signed in. At least one item exists if you will add lines; create-only does not require an item.
- At least one weekday has no preset yet.
- `control-cairn doctor` is OK.

- **Open presets.** Run `playwright-cli -s="$SESSION" click "getByRole('link', { name: 'プリセット' })"`. Heading `プリセット` is visible. A new account also shows `プリセットはまだありません`.
- **Name and weekday.** Fill `プリセット名` with `検証プリセット`. On `曜日`, choose a weekday that is still free (options are only unused weekdays).
- **Create.** Run `playwright-cli -s="$SESSION" click "getByRole('button', { name: 'プリセットを追加' })"`. An accordion row titled `検証プリセット` appears. The empty-state title is gone.
- **Confirm persistence.** Reload `/presets`. `検証プリセット` is still listed.
- **Proof.** Run `playwright-cli -s="$SESSION" --raw snapshot > "$ART/presets.aria.yml"` and `playwright-cli -s="$SESSION" screenshot --filename="$ART/presets.png"`. Both show heading `プリセット` and `検証プリセット`.

## Gotchas

- When every weekday already has a preset, the create form is replaced by `すべての曜日にプリセットがあります。` Report that instead of failing the click.
- Creating a preset does not by itself add today's rows until that weekday is opened (or the day select `プリセット切替` is used). Day-row application is `day-log`, not this file.
- Accordion editors expose `{preset}の新しい名前`, weekday, and per-line item/ひとこと/分数. Those edits are out of this first map unless you name them in `proof.txt`.
