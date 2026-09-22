# Header search

The header `検索` button opens the command palette. It lists screen links and, once the query is at least two characters, searches the signed-in owner's ひとこと, メモ, 予定, 項目, 計画, 目標, 方法, and 障害プラン. There is no separate search page.

## Sub-features

- `search-open` opens the palette from button `検索`.
- `search-nav` filters the `移動` group to matching screen names.
- `search-item` finds a catalog item and opens `/items`.
- `search-dated` finds a ひとこと or メモ and opens that day, and finds a 予定 and opens `/plan` for that date.

## How to get to it (user POV)

- While signed in, click the header button `検索` (tooltip `検索（⌘K）`).
- The palette placeholder is `アプリ内を検索、または画面へ移動`.

## Driving it with playwright-cli

Preconditions:

- Signed in. An item named `検証項目` exists (see `catalog-items.md`). A 予定 titled `検証プラン` on the open plan day makes the dated hit reachable (see `plan.md`).
- `control-cairn doctor` is OK. Desktop width.

- **Open.** Click `getByRole('button', { name: '検索', exact: true })`. The dialog shows a **textbox** named `アプリ内を検索、または画面へ移動` (the placeholder; it is not role `searchbox`) and group `移動`.
- **Navigate.** Fill `getByRole('textbox', { name: 'アプリ内を検索、または画面へ移動' })` with `項目`. Group `移動` still offers link-like action `項目`. Activating it goes to `/items` with heading `項目`.
- **Find an item.** Open `検索` again. Fill that same textbox with `検証項目`. Wait for the button whose accessible name joins the badge, title, and category (example `項目 検証項目 検証カテゴリ`). The group label `検索結果` follows the debounced query; wait on that button. Activate it. Location is `/items` and textbox `検証項目の名前` holds `検証項目`.
- **Find a plan event.** Open `検索`. Fill the same textbox with `検証プラン`. Under `検索結果`, badge `予定` and title `検証プラン` appear. Activate it. Location is `/plan` and dialog or the day still contains `検証プラン` after opening `この日の予定を開きます`.
- **Proof.** Capture the open palette with `検証項目` visible. Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/search.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/search.png"`. Write `proof.txt` with feature ID `search-item` and entry `検索`.

## Gotchas

- The palette query field is `getByRole('textbox', { name: 'アプリ内を検索、または画面へ移動' })`. `getByRole('searchbox')` does not match.
- Queries shorter than two characters show the hint `2文字以上で、記録・予定・項目・計画・目標・方法を検索します` instead of `検索結果`.
- Empty matches say `見つかりませんでした`. The palette does not sort by relevance and does not open a search page.
- A date filter is not a control in this palette. Dated hits (ひとこと, メモ, 予定) carry their own date; catalog hits (項目, 計画, 目標, 方法, 障害プラン) have none.
- Do not treat a `移動` row as a content hit. Content hits sit under `検索結果`.
