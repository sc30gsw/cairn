# 学習ログ verification map

This directory is the maintained source for verifying user-facing behavior of 学習ログ (cairn). Read this index before driving, then use the matching feature file as the recipe.

## Baseline preconditions

- Export the unique run ID, session and artifact variables using [SKILL.md](../SKILL.md); the helper requires them.
- Launch with `.cursor/skills/verify-cairn/bin/control-cairn launch` and require `control-cairn doctor` OK.
- App URL is `http://localhost:3000/` (not `127.0.0.1`). Document title is `学習ログ`.
- Use a disposable account (`vfy_${CAIRN_VERIFY_RUN_ID}` / `vfy-${CAIRN_VERIFY_RUN_ID}@example.test` / `Verify1!cairn`). Do not reuse a human owner's session.
- New accounts start with an empty catalog. Features that need an item say so in Preconditions.
- Playwright session is `cairn-verify-$CAIRN_VERIFY_RUN_ID`. Resize to at least 1280×800 so the right-rail nav is visible.
- Never drive an instance `doctor` rejected.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names listed in the feature file. Use `exact: true` on short Japanese labels. For Mantine SegmentedControl / Switch, click the visible sibling from the snapshot.
- Treat every command as literal. Keep Japanese labels unchanged.
- Browser actions go through `rtk proxy playwright-cli -s=cairn-verify-$CAIRN_VERIFY_RUN_ID`.
- After a mutation, wait for the next snapshot to show the new text. Convex updates are reactive; a fixed sleep is not proof.
- Fixture accounts and rows live only in the disposable local database. Cleanup removes that database; retain proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the app identity (`学習ログ` or the page `h1`) visible.
- Mutation proof includes a second user-facing read (reload, 日 again, 履歴, or ゴミ箱).
- Record the feature ID and entry point in `proof.txt` beside the artifacts.
- Report an unreachable path with the command you ran and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 and one paragraph. It then uses exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with playwright-cli`, `Gotchas`.

## Features

- [Account sign-up and sign-in](./account-auth.md) covers creating an account, skipping the passkey prompt, signing out, and signing back in.
- [Catalog items](./catalog-items.md) covers adding a category and a learning item so a day can record work.
- [Day log](./day-log.md) covers opening today, adding an ad-hoc record, confirming it, and checking learning volume.
- [Presets](./presets.md) covers creating a weekday preset after at least one item exists.
- [Execution board](./board.md) covers opening the kanban for today and confirming a record from the board.

## Automated baseline

Run `rtk proxy .cursor/skills/verify-cairn/bin/prove-catalog` after launch → doctor → browser. It proves signup/passkey skip, desktop catalog navigation, category/item creation, persistence after reload, and availability in the day selector. Proof lives in `$CAIRN_VERIFY_DIR/artifacts/catalog-items/`; cleanup preserves it. Other mapped recipes remain manual; listing a recipe does not mean it was executed.

## Coverage boundaries

Not mapped yet (do not claim verified): 履歴 (`/history`, `/review`), 目標 (`/goals`), ゴミ箱 restore/purge, マイページ profile/passkey/notifications, Notion OAuth, PWA install, offline poster.


## Source anchors

Selectors and preconditions were checked against `src/features/auth/components/login-screen.tsx:11`, `src/features/auth/components/account-auth-form.tsx:19`, `src/features/catalog/components/item-list.tsx:134`, `src/features/catalog/components/preset-list.tsx:187`, `src/features/today/components/adhoc-row-form.tsx:17`, and `src/features/today/hooks/use-day-page-date-jst.ts:6`. Consult graft before changing recipes when these controls change.
