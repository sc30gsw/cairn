# Methods catalog

方法 is a reference-only catalog of study methods. Signed-in users add lanes and methods, open a card to edit, and reorder with drag grips or the 移動 menu. It does not create day rows or presets.

## Sub-features

- `methods-open` opens `/methods` and shows heading `方法カタログ`.
- `methods-add-lane` creates a lane column from `新しいレーン`.
- `methods-add-method` adds a method under that lane.
- `methods-open-card` opens a method via `{name}を開く` and shows the modal titled with that name.
- `methods-truncated-title` on a narrow viewport shows a clamped method title; full text is available via 開く, and via OverflowTooltip tap when touch events are on.

## How to get to it (user POV)

- Desktop: choose the `方法` nav link on the right rail.
- Narrow viewport: open `その他` (`aria-label="その他の画面"`), then choose `方法`.
- Direct URL: `/methods`.
- The page heading is `方法カタログ` (h2). There is no page-level h1 `方法`.

## Driving it with playwright-cli

Preconditions:

- Signed in (see `account-auth.md`).
- `control-cairn doctor` is OK.
- Desktop width (≥1280) so `方法` is a visible right-rail link, unless the step says otherwise.
- Lane name `検証レーン` and method name `検証方法_とても長いタイトルで省略表示を確かめる` are not already on this account.

- **Open methods.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '方法', exact: true })"` or `goto http://localhost:3000/methods`. Wait for heading `方法カタログ`. Empty catalog copy includes `まだ空のカタログです`. Do not wait for heading `方法` (that string is the nav label only).
- **Add lane.** Run `rtk proxy playwright-cli -s="$SESSION" fill "getByRole('textbox', { name: '新しいレーン', exact: true })" "検証レーン"`. Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: 'レーンを追加' })"`. A column appears with textbox `検証レーンの名前` and toast `レーンを追加しました`. Assert textbox `新しいレーン` is empty after success.
- **Add method.** Run `rtk proxy playwright-cli -s="$SESSION" fill "getByRole('textbox', { name: '検証レーンに方法を追加' })" "検証方法_とても長いタイトルで省略表示を確かめる"` then run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '検証レーンに方法を追加', exact: true })"`. Textbox and button share that accessible name — do not use `getByLabel`. Toast `方法を追加しました`. Card button `検証方法_とても長いタイトルで省略表示を確かめるを開く` appears. Assert textbox `検証レーンに方法を追加` is empty after success.
- **Open card.** Run `rtk proxy playwright-cli -s="$SESSION" click "getByRole('button', { name: '検証方法_とても長いタイトルで省略表示を確かめるを開く' })"`. Dialog title matches the method name; textbox `タイトル` holds the full name. Close with `閉じる` or save with `{name}を保存`.
- **Truncated title at 390.** Resize to 390×844. Method title text remains visible (clamped). Prove the full string via `…を開く`. Then tap the truncated title (a short tap, not a 120ms hold) and assert `getByRole('tooltip')` equals the full method name.
- **Narrow nav entry.** At 390×844, open button `その他の画面`, then menuitem `方法`. Capture this path separately from desktop rail.
- **Proof.** Run `rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/methods.aria.yml"` and `rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/methods.png"`. Artifacts show heading `方法カタログ`, `検証レーン`, and the method (or its 開く control).

## Gotchas

- 方法 is behind その他 on narrow viewports (`MOBILE_PRIMARY` excludes `/methods`). Desktop proof does not cover that entry.
- Page heading is `方法カタログ`, not `方法`.
- Lane names are editable `TextInput`s (`{lane}の名前`), not OverflowTooltip / TruncatedText.
- Add-method textbox and button share `aria-label="{lane}に方法を追加"` — scope by role.
- Lane and method add forms reset on a successful save. Assert empty add fields. Lane rename and modal editors keep values by design.
- Drag grips (`{name}をドラッグ`) reorder; 移動 is cross-lane only when another lane exists. Do not claim card-body hold-drag: that touch-lift exists only on the ボード kanban, not on 方法.
- Catalog is reference-only; creating methods does not seed 日 or 項目.
