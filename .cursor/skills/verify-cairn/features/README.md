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
- [Day log](./day-log.md) covers opening today, adding an ad-hoc record, confirming it, checking learning volume, and seeing 障害プラン.
- [Presets](./presets.md) covers 計画プリセット on `/plan` (default プラン), the `/presets` redirect to `/plan`, `この日の予定` occupancy beside `計画プリセットを追加`, create/edit/delete (name row `{name}を編集`, row `削除` with confirm), shared event field order (項目 → タイトル → 開始・終了 → 優先度), and the forgotten-template switch.
- [Plan](./plan.md) covers `/plan` with no `?tab=` (プラン, the same 日 `学習日` chrome plus Clock last as `何に時間を使ったか`; no month grid), modal event forms with `TimeInput` start/end, timed 予定 on chosen `スケジュール` without Clock (including year popover `予定を追加`), leftover `/board?tab=schedule` and `/presets` both to `/plan`, 計画プリセット occupancy entry, and the read-only 目標 card.
- [Execution board](./board.md) covers opening the kanban-only board, holding a card to drag at 390 and 768, and confirming a record from the board.
- [Methods catalog](./methods.md) covers opening `/methods`, adding a lane and a method, and reading a truncated title.

## Automated baseline

Run `rtk proxy .cursor/skills/verify-cairn/bin/prove-catalog` after launch → doctor → browser. It proves signup/passkey skip, desktop catalog navigation, category/item creation, empty add fields after create, persistence after reload, and availability in the day selector. Proof lives in `$CAIRN_VERIFY_DIR/artifacts/catalog-items/`; cleanup preserves it. Other mapped recipes remain manual; listing a recipe does not mean it was executed.

## Coverage boundaries

Not mapped yet (do not claim verified): 履歴 (`/history`), レビュー (`/review`), 目標 editor (`/goals` write path), ゴミ箱 restore/purge, マイページ profile/passkey/notifications, Notion OAuth, PWA install, offline poster, Google Calendar OAuth, 方法 `いま見る`. Weekday catalog presets are unmounted; do not claim them verified via `/presets`.


## Source anchors

Selectors and preconditions were checked against `src/features/auth/components/login-screen.tsx` (title `学習ログ`), `src/features/auth/components/account-auth-form.tsx`, `src/lib/app-nav.ts` (`計画` → `/plan`; `MOBILE_PRIMARY` `日` / `ボード` / `計画` / `目標`), `src/routes/presets.tsx` (redirect search `{ tab: "plan" }`, location `/plan` after strip), `src/routes/board.tsx` (`tab=schedule` → `/plan`), `src/features/board/components/board-page.tsx` (kanban only), `src/components/learning-date-navigation.tsx` (`学習日` / `前の日` / `次の日` / `今日へ戻る`), `src/features/plan/components/plan-page.tsx` / `plan-tabs.tsx` / `plan-clock.tsx` (`PLAN_CLOCK_HEADING` `何に時間を使ったか`), `src/features/plan/components/plan-list-tab.tsx` (`LearningDateNavigation`, event cards open modal `予定を編集`, no `予定を追加`, Clock last peer Card), `src/features/plan/components/plan-templates-card.tsx` (header `PlanDayScheduleHeaderButton` `この日の予定`, `PlanTemplateAddButton`, name-row `{name}を編集`, visible `削除` with `{name}を削除` confirm, preset rows 項目 → タイトル → 開始・終了 → 優先度), `src/features/plan/components/plan-day-schedule-list.tsx` (`PlanDayScheduleCollapsePanel` `DataList` `withDivider`, empty `この日の予定はまだありません。`), `src/features/plan/components/board-schedule-event-form.tsx` (modal field order, `TimeInput` 開始/終了, title hidden when item set), `src/features/plan/components/board-schedule-year-day-popover.tsx` (`{date}の予定` / `予定を追加`), `src/components/plan-goals-read-card.tsx`, `src/components/obstacle-section.tsx` (日 and 計画), `src/features/today/components/day-board-tab.tsx` (`presets: []`), `src/features/onboarding/lib/setup-steps.ts` (`計画プリセットを登録する`; stepper href `/plan?tab=plan` then strip), `src/features/catalog/components/item-list.tsx` (`AddCategoryForm`), `src/features/today/components/adhoc-row-form.tsx` (initial `minutes: 20`), `src/features/methods/components/method-catalog-board.tsx` (heading `方法カタログ`), `src/features/board/components/board-kanban.tsx` (card-body `aria-label` `{item} の順序を変更`), `src/components/overflow-tooltip.tsx` (`EVENTS.touch`), and `src/features/today/hooks/use-day-page-date-jst.ts`. Consult graft before changing recipes when these controls change.
