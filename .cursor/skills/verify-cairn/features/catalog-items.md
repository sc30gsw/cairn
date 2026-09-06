# Catalog items

Catalog items lets a signed-in user add a category and a learning item. Items are the kinds a day record can point at. A brand-new account has none.

## Sub-features

- `items-open` opens the items board from the signed-in nav.
- `items-add-category` creates a category column.
- `items-add-item` adds a learning item under that category.

## How to get to it (user POV)

- Choose the `項目` nav link (right rail on desktop, or その他 on a narrow viewport).
- On a new account the home stepper `項目を登録する` also goes to `/items`.
- The page heading is `項目`. A card at the top has `新しいカテゴリー`.

## Driving it with playwright-cli

Preconditions:

- Signed in (see `account-auth.md`).
- `control-cairn doctor` is OK.
- Desktop width so `項目` is a visible nav link.
- Category name `検証カテゴリ` and item name `検証項目` are not already on this account.

- **Open items.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '項目', exact: true })"`. From a new account the stepper link `項目を登録する` is also valid. The heading `項目` is visible and the URL is `/items`.
- **Add category.** Run `rtk proxy playwright-cli -s="$SESSION" fill "getByRole('textbox', { name: '新しいカテゴリー', exact: true })" "検証カテゴリ"`. Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: 'カテゴリーを追加' })"`. A column titled `検証カテゴリ` appears with a textbox named `検証カテゴリに学習内容を追加`.
- **Add item.** Run `rtk proxy playwright-cli -s="$SESSION" fill "getByRole('textbox', { name: '検証カテゴリに学習内容を追加' })" "検証項目"` then run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '検証カテゴリに学習内容を追加', exact: true })"`. `getByLabel` is ambiguous here. The column exposes textbox `検証項目の名前` with value `検証項目` (toast `項目を追加しました`). Use the textbox/value, not `getByText`: the item is an editable input, not static text.
- **Confirm persistence.** Reload. Run `rtk proxy playwright-cli -s="$SESSION" reload`. Textbox `検証カテゴリの名前` still contains `検証カテゴリ` and textbox `検証項目の名前` still contains `検証項目`.
- **Independent read.** Choose `日`, then open `getByRole('combobox', { name: 'その日限りの項目', exact: true })`. The listbox shares this accessible name, so `getByLabel` is ambiguous. The option `検証項目` must be available; choose it and check the input value. This establishes that the catalog data can be consumed outside its editor.
- **Automated recipe.** After launch/doctor/browser on a fresh run, `rtk proxy .cursor/skills/verify-cairn/bin/prove-catalog` performs the desktop recipe including signup, reload and independent day read. Read `proof.json` for exact sub-feature scope. It does not create a day record.
- **Other entry points.** On a fresh account click the visible onboarding `項目を登録する` link from the snapshot; verify `/items` before reusing the create steps. For mobile resize to 390×844, open `その他`, then choose `項目` from the fresh snapshot. Capture each path separately; desktop navigation does not prove these paths.
- **Proof.** Capture the items board. Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/items.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/items.png"`. Both show heading `項目`, `検証カテゴリ`, and `検証項目`.

## Gotchas

- Empty catalog is the default. Day-page `記録を足す` stays disabled until at least one item exists.
- Do not call `api.mutations.catalog.ensure.ensure` to seed Notion defaults for this feature. That is not a user path.
- Drag-and-drop reorder and the per-card `移動` menu are not this file. Report them untested if you only added a category and item.
- Category and item names are unique enough per account for verification; reuse on a later run of the same account will collide — use a fresh account or a suffix.
