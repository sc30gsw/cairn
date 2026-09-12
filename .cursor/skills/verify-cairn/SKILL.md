---
name: verify-cairn
description: Drive Cairn (学習ログ) through its real browser UI to prove authentication, catalog items, day records, presets, and board changes. Use for live feature verification or reproducing user-visible bugs with retained evidence.
---

# Verify Cairn (学習ログ)

Primary surface: TanStack Start browser UI, `http://localhost:3000/`, title `学習ログ`.
The app currently uses Better Auth with Convex; the old bootstrap “auth not wired” note is stale.
Convex HTTP and `vp test` are supporting diagnostics, not product entry points. There is no first-party Playwright/Cypress E2E suite; use the installed `playwright-cli` harness.

Read [features/README.md](features/README.md), then every relevant feature recipe before driving. Report exactly which sub-features and entry points were exercised.

## Launch

From the repository root, with `python3`, `git`, `lsof`, `tmux`, `vp`, and `playwright-cli` on PATH. `vp exec node --version` must be >=24.17.0; plain `node` can select an older runtime. Run `rtk proxy vp install` if dependencies are absent or stale. Do not install dependencies with npm/pnpm/yarn.

```bash
export CAIRN_VERIFY_RUN_ID="$(date +%Y%m%d_%H%M%S)_$$"
export CAIRN_VERIFY_DIR="/tmp/cairn-verify-$CAIRN_VERIFY_RUN_ID"
export SESSION="cairn-verify-$CAIRN_VERIFY_RUN_ID"
export ART="$CAIRN_VERIFY_DIR/artifacts/catalog-items"
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn launch
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn doctor
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn browser
```

The ID must contain only ASCII letters, digits, underscores, at most 32 characters. Each launch requires a **new** ID; do not reuse a directory containing proof. The helper derives its location from the ID, not from an arbitrary directory override.

Launch creates a private, mode-0700 run directory and copies tracked + nonignored untracked source files, including local edits, to `$CAIRN_VERIFY_DIR/app`. Deleted files, `.env*`, `.agents`, `.claude`, `.cursor`, and graft caches are excluded. Dependencies are copied with APFS clones on macOS (`cp -cR`) or reflinks where available on Linux (`cp -a --reflink=auto`). Avoid a node_modules symlink: Vite/Nitro can reject dependency modules outside the scratch root. Allow roughly 1 GB disk space if copies cannot share blocks.

Commands run **only in that scratch app**, under a private tmux socket:

1. `CONVEX_AGENT_MODE=anonymous vp exec convex dev --typecheck disable`
2. Wait for an anonymous/local `.env.local`, owned port 3210 and `/version` HTTP 200.
3. `vp exec convex env set --from-file` installs a randomly generated `BETTER_AUTH_SECRET`, `SITE_URL=http://localhost:3000`, and the same trusted origin on that **local** deployment. The temporary secret file is removed.
4. Append local `VITE_SITE_URL` and `SITE_URL`, and wait for `Convex functions ready` in `logs/convex.log`.
5. `vp dev --host 127.0.0.1 --port 3000 --strictPort`; wait for HTTP 200 and run doctor.

The extra `--` between `convex` and `dev` used in older notes breaks flag forwarding with this installed vp CLI; the commands above were exercised. Local backend typechecking is disabled for startup; repository validation remains `vp check` and `vp test`.

A first Convex run may download a binary and install generated AI files **inside the disposable copy**. No cloud deployment, original `.env.local`, or global auth secret is configured by this helper. It strips inherited deployment/auth/integration environment variables. Backend binary/tool caches may survive outside the scratch app; they are not fixture data.

A sandbox may need normal tool escalation to bind localhost ports, start tmux/browser processes or download a backend. Do not interpret a permission error as application failure.

**Isolation:** ports 3000/3210/3211 are fixed, so two runs cannot coexist on one host. Launch refuses occupied ports; never stop their owner or reuse a shared backend. Each run has its own source, database, tmux socket, and browser session. Later code edits require cleanup and a new launch because this is a source snapshot. Teardown: `control-cairn cleanup` below, including failed browser iterations.

## Doctor

```bash
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn doctor
```

Read-only: checks run ownership against this repository, local deployment URL, each listening PID's descent from this run's tmux pane, Cairn document identity, Convex version endpoint, and `/api/auth/get-session` returning HTTP 200 / `null` without cookies. Reports the recorded source revision, Node version, and SHA-256 source manifest. It creates no files.

Require `control-cairn: doctor OK` before driving and whenever something looks off. Its anonymous HTTP probe proves auth service availability, **not the browser's signed-in state**: inspect the browser snapshot for `アカウントメニュー` after login. Nonzero exit means stop and inspect `$CAIRN_VERIFY_DIR/logs/`.

## Drive

The `browser` helper opens a dedicated nonpersistent Playwright session at 1280×900 and records ownership for cleanup. Never attach to a human tab. The desktop nav is `画面ナビ（右小口）`; narrow viewports expose additional destinations through `その他`.

For a repeatable first proof on a fresh run:

```bash
rtk proxy .cursor/skills/verify-cairn/bin/prove-catalog
```

This executable drives signup → skip optional passkey → `項目` nav → add category → add item → reload → confirm the item is selectable from `日`. It stores steps, snapshots, screenshots, and an explicit success file. It fails if browser assertions fail, even if playwright-cli itself exits zero. See [catalog-items](features/catalog-items.md) for its mapped scope. It does not clean up automatically so failures can be diagnosed; always run cleanup after diagnosis.

For other mapped paths:

```bash
rtk proxy playwright-cli -s="$SESSION" snapshot
rtk proxy playwright-cli -s="$SESSION" click "getByRole('link', { name: '項目', exact: true })"
rtk proxy playwright-cli -s="$SESSION" snapshot
```

Use each feature's literal roles/names. Snapshot → act → wait for the expected visible state → capture. `run-code` may use Playwright locator `waitFor` for reactive updates. Do not use fixed sleeps as proof.

Mantine specifics:

- Use `exact: true` on short labels (`日`, `項目`, `あとで`).
- SegmentedControl inputs are hidden: click visible `新規登録` text. For Switch use its visible label/track from the current snapshot. After `reload`, wait for a real heading (`項目`, `プリセット`, `ボード`, or volume `N分`) before snapshotting.
- An item-add textbox and button have the same accessible name: select by role.
- Select inputs use role `combobox`; their hidden listbox can share the label, making `getByLabel` ambiguous.
- `分数` is a textbox. `アカウントメニュー` is a labelled avatar, not a button.
- Dismiss the `パスキーを登録しますか？` dialog with exact button `あとで`. Optional onboarding can place controls below the fold.
- Default fixture username is `vfy_` plus the run ID; example.test email and a throwaway password are used only on the disposable backend. No catalog seed mutation is needed.

## Evidence

Keep proof in `$CAIRN_VERIFY_DIR/artifacts/`. The default proof uses `catalog-items/`:

- `actions.json`: timestamped user actions and outcomes; no passwords, cookies, or tokens.
- `before.aria.yml` / `.png`, `category-added.*`, `item-added.*`, `reloaded.*`, `day-select.*`: observable action/result and independent reads.
- `proof.json`: feature IDs, tested entry points, persisted values and final outcome; written only after all assertions pass.
- Run root: `source-manifest.json`, `run.json` and server logs provide build provenance.

For a manual feature proof, use a concrete feature directory, for example:

```bash
export ART="$CAIRN_VERIFY_DIR/artifacts/day-log"
rtk proxy mkdir -p "$ART"
rtk proxy playwright-cli -s="$SESSION" --raw snapshot > "$ART/after.aria.yml"
rtk proxy playwright-cli -s="$SESSION" screenshot --filename="$ART/after.png"
```

Proof must capture the real user action **and** resulting state. A final screenshot, successful HTTP response, toast, or unit test alone does not prove a mutation. Reload/reopen and inspect a second user-facing view to verify persistence/side effects. For actual external/file operations, also observe the resulting remote state/files; do not infer delivery from a button click.

Do not call internal Convex mutations, seed endpoints, storage setters or React state setters to prove product behavior. No mocks are used. Password signup here sends no mail; Google OAuth, calendar sync, Notion, passkeys, notifications, and PWA are not covered by the default proof. This is **not** a dry run: real local rows/accounts are written and the browser uses real HTTP/WebSocket connections. Capture which boundaries were exercised; do not infer “no network” from test-mode naming. Never save auth state in evidence.

## Cleanup

```bash
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn cleanup
rtk proxy test -s "$CAIRN_VERIFY_DIR/artifacts/catalog-items/proof.json"
rtk proxy test -s "$CAIRN_VERIFY_DIR/artifacts/catalog-items/reloaded.png"
```

Cleanup closes only the browser this run opened and the sessions under this run's **private tmux socket**, removes the disposable app/database and temporary auth file, and writes `cleaned.txt`. No process-name kill, user-browser closure, deployment reset, or evidence deletion. Run it after every failed iteration as well. Automatic launch rollback applies once run state is created. If launch was refused before that, there are no owned resources to clean.

After cleanup, confirm the artifacts still exist; preserve failed-attempt logs too. Retained `.playwright-cli` snapshots stay private in the run directory. Use `artifacts/` for shareable evidence. Do not commit raw session dumps or logs.

## Helpers

Both files are executable, with no package dependency added:

```bash
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn launch
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn doctor
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn browser
rtk proxy .cursor/skills/verify-cairn/bin/prove-catalog
rtk proxy .cursor/skills/verify-cairn/bin/control-cairn cleanup
```

Use `/maintain-verification-skill` when app routes, controls, launch requirements or side effects change.
