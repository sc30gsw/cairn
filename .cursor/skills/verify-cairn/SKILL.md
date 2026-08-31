---
name: verify-cairn
description: Drive 学習ログ (cairn) in the browser the way a user does — signup, day records, catalog, presets, and the execution board. Use when proving a UI change works, reproducing a user-facing bug, or checking a mapped feature live.
---

# Verify 学習ログ (cairn)

This skill is for agents. It drives the real TanStack Start + Convex web app, not Vitest or `convex-test`. Those suites are unit/integration only and do not prove the user path.

Primary surface: browser UI titled `学習ログ` at `http://localhost:3000`. Secondary surfaces (do not treat as proof): Convex HTTP at `127.0.0.1:3210`, `vp exec convex -- run …`. There is no first-party Playwright/Cypress suite and no CLI product. Open the app as `localhost`, not `127.0.0.1` — Better Auth `SITE_URL` is `http://localhost:3000`, and a mismatched origin returns `リクエスト元が不正です`.

Read `features/README.md`, then the matching feature file, before driving.

## Isolate

One Convex anonymous backend and one `vp dev` share ports `3210` and `3000` per checkout. **Do not start a second pair.** Two live drives on the same ports corrupt the same deployment.

Isolate by:

- A unique account per run: username `vfy_<runid>`, email `vfy-<runid>@example.test`, password `Verify1!cairn` (8+ chars; username is `[A-Za-z0-9_]{3,}`).
- A dedicated Playwright session: `playwright-cli -s=cairn-verify-$CAIRN_VERIFY_RUN_ID …`.
- Never attach to a browser tab the user or another agent already opened.

If `control-cairn doctor` fails, stop. Do not drive a shared unhealthy instance.

## Launch

Repo root. Node `>=24.17.0` (cloud VMs: interactive/login shells pick nvm 24; a bare `bash -c` may still see Node 22). `vp` must be on `PATH`.

```bash
export CAIRN_VERIFY_RUN_ID="${CAIRN_VERIFY_RUN_ID:-default}"
export CAIRN_VERIFY_DIR="/tmp/cairn-verify-${CAIRN_VERIFY_RUN_ID}"
.cursor/skills/verify-cairn/bin/control-cairn launch
```

Ready when:

- `http://127.0.0.1:3210/version` (or the Convex HTTP root) answers 2xx.
- `http://localhost:3000/` answers 2xx and the document title is `学習ログ`.
- `.env.local` exists and contains `VITE_CONVEX_URL` (written by anonymous `convex dev`; gitignored).

What launch does, if you must do it by hand:

1. `CONVEX_AGENT_MODE=anonymous vp exec convex -- dev` in tmux session `cairn-convex`. First run asks `Set up Convex AI files?` — answer `n`.
2. After `.env.local` exists: `vp exec convex -- env set BETTER_AUTH_SECRET <32-byte-hex>`, `vp exec convex -- env set SITE_URL http://localhost:3000`, and `vp exec convex -- env set BETTER_AUTH_TRUSTED_ORIGINS "http://localhost:3000,http://127.0.0.1:3000"`. Append `VITE_SITE_URL=http://localhost:3000` to `.env.local` if missing.
3. `vp dev --host 127.0.0.1 --port 3000` in tmux session `cairn-web`.

New users have an empty catalog. Do **not** call `mutations.catalog.ensure` to prove a user path. Add items through `/items` (see `features/catalog-items.md`). `catalog.ensure` is a fixture shortcut for backend tests only.

Teardown is `control-cairn cleanup`. It stops only sessions this run started and **keeps** `$CAIRN_VERIFY_DIR/artifacts`.

## Doctor

Run before the first drive, after any failed drive, and whenever the instance looks off.

```bash
.cursor/skills/verify-cairn/bin/control-cairn doctor
```

Doctor is read-only. It must print `control-cairn: doctor OK` and confirm:

- Node `>=24`.
- Web `200`/`3xx` at `http://localhost:3000/`.
- Convex answering at `http://127.0.0.1:3210`.
- `.env.local` has `VITE_CONVEX_URL`.
- `playwright-cli` (or `playwright`) is on `PATH`. If missing, install `@playwright/cli` on the machine (not via `vp add`) and re-run doctor.

Exit `1` means do not drive.

## Drive

Harness: `playwright-cli` against a named session. Prefer accessible names from this repo over CSS, coordinates, or tab order.

```bash
SESSION="cairn-verify-${CAIRN_VERIFY_RUN_ID:-default}"
playwright-cli -s="$SESSION" open http://localhost:3000/
playwright-cli -s="$SESSION" resize 1280 800
playwright-cli -s="$SESSION" snapshot
```

Desktop width matters: the right-rail nav (`aria-label="画面ナビ（右小口）"`) is `visibleFrom="sm"`. Below that, only 日 / ボード / 履歴 / 目標 plus an その他 menu are in the bottom bar.

Stable handles (literal):

| What | Handle |
| --- | --- |
| App title on login | heading `学習ログ` |
| Sign-up / sign-in toggle | visible labels `ログイン` and `新規登録` (Mantine hides the radio input; click the label text, not `getByRole('radio')`) |
| Sign-up fields | textboxes `ユーザー名`, `表示名`, `メールアドレス`; `パスワード` |
| Create account | button `アカウントを作成` |
| Sign-in fields | `ユーザー名またはメールアドレス`, `パスワード` |
| Sign in | button `ログイン` |
| Passkey prompt after signup | dialog `パスキーを登録しますか？` → button `あとで` |
| Home setup alert | `はじめのセットアップ` → button `あとで設定` if it blocks the day form |
| Nav | links `日`, `ボード`, `履歴`, `項目`, `プリセット`, `目標`, `ゴミ箱` |
| Account menu | labelled generic `アカウントメニュー` (avatar, not a button) → menuitems `アカウント設定` / `ログアウト` |
| Add category | textbox `新しいカテゴリー`, button `カテゴリーを追加` |
| Add item in a category | textbox `{category}に学習内容を追加`, button with the same name |
| Ad-hoc day row | combobox `その日限りの項目`, textbox `その日限りのひとこと`, textbox `分数`, button `記録を足す` |
| Confirm a row | form `{itemName}の記録` → visible track beside switch `記録を確定` (click the snapshot ref, not the input) |
| Skip / trash a row | buttons `見送りにする`, `ゴミ箱へ` |
| Date nav | `学習日`, `前の日`, `次の日`, `今日へ戻る` |
| Board tabs | `カンバン`, `スケジュール` |
| Preset create | `プリセット名`, `曜日`, button `プリセットを追加` |

Recipe: snapshot → act with a role/name (or the ref the snapshot just gave you) → snapshot again. Wait for Convex reactivity (the next snapshot showing the new text), not a fixed sleep. If a dialog or the setup stepper is open, dismiss it with the named button before asserting the page behind it.

Mantine gotchas that bite every drive:

- Prefer `exact: true` on short names. `あとで` also matches `あとで設定`. `項目` also matches `項目を登録する`. `日` is unique enough with `exact: true`.
- SegmentedControl and Switch expose a hidden input. Click the visible label / track from the snapshot (the sibling with `[cursor=pointer]`), not `getByRole('radio')` / `getByRole('switch')`.
- `getByLabel('検証カテゴリに学習内容を追加')` hits both the textbox and the submit button. Use `getByRole('textbox', { name: '…' })`.
- `分数` is a `textbox`, not a spinbutton.
- `アカウントメニュー` is a labelled generic (the avatar), not a `button`.
- Passkey dialog overlay intercepts clicks until `あとで` (`exact: true`) is pressed.
- `あとで設定` dismisses only the current setup step. The alert stays until every remaining step is dismissed.

Do not prove behavior by calling Convex mutations from the terminal, by writing the database, or by flipping React state. Drive the same controls a user uses.

## Evidence

Put every artifact under `$CAIRN_VERIFY_DIR/artifacts/<feature-id>/` (default `/tmp/cairn-verify-default/artifacts/...`). Cleanup must not delete this tree.

```bash
ART="$CAIRN_VERIFY_DIR/artifacts/<feature-id>"
mkdir -p "$ART"
playwright-cli -s="$SESSION" --raw snapshot > "$ART/after.aria.yml"
playwright-cli -s="$SESSION" screenshot --filename="$ART/after.png"
# --filename must be an absolute path. A relative path is resolved from playwright-cli's cwd, not $ART.
```

Proof standards:

- Exercise the real user path (login screen → nav → form → visible result).
- Capture the action **and** the resulting state (ARIA snapshot + screenshot with `学習ログ` or the page heading visible). A final screenshot alone is not enough.
- Verify side effects from a second user-facing view: reopen `/`, reload, or open 履歴 / ゴミ箱 — not only the toast or switch that just flipped.
- Record the feature ID and entry point in a `proof.txt` next to the files.
- Mocks are not used here. Notion OAuth and passkey registration are out of scope for default proof; skip those dialogs. Do not set `NOTION_CLIENT_*` just to verify password signup.

`vp test` passing is supporting signal, not a substitute for the artifacts above.

## Cleanup

```bash
.cursor/skills/verify-cairn/bin/control-cairn cleanup
```

Kills only tmux sessions this run started (`cairn-web` / `cairn-convex` when `CAIRN_STARTED_*` is `1`) and closes `playwright-cli -s=cairn-verify-$RUN_ID`. Never `pkill -f vp` / `pkill -f convex`. After cleanup, confirm `$CAIRN_VERIFY_DIR/artifacts` still exists.

Leave reused backends running if launch did not start them.

## Helpers

`bin/control-cairn` is executable. From the repo root:

```bash
.cursor/skills/verify-cairn/bin/control-cairn launch
.cursor/skills/verify-cairn/bin/control-cairn doctor
.cursor/skills/verify-cairn/bin/control-cairn cleanup
```

Do not reverse-engineer flags. The only subcommands are `launch`, `doctor`, and `cleanup`.
