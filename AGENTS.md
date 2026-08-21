# Using Vite+ (`vp`)

**Vite+** is one CLI for dev, build, tests, lint, format, and package management—it wraps Vite and related bundled tooling. `vp dev` and `vp build` invoke Vite. Explore with `vp help`, `vp <command> --help`, and `vp --version`.

**Common commands:** `vp install`, `vp dev`, `vp check`, `vp lint`, `vp test`, `vp build`, `vp preview`, `vp run <script>`, `vp add` / `vp remove` / `vp update`.

**Workflow:** After pulling, run `vp install` when dependencies or lockfiles may have changed. Before calling work done, run `vp check` and `vp test` — CI runs `vp check` → `vp test` → `vp build`.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ commands take precedence over `package.json` scripts. If there is a `test` script defined in `scripts` that conflicts with the built-in `vp test` command, run it using `vp run test`.
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## Project facts

- **`vp check` fails on warnings too** — `lint.options` sets `denyWarnings`, `typeAware`, and `typeCheck`.
- **`src/routeTree.gen.ts` is generated.** It is excluded from fmt and lint; never edit it by hand.
- **Class names are merged with `cn` from `cnfast`** (drop-in for `clsx` + `tailwind-merge`). Oxfmt's Tailwind class sorting is configured for `cn` only.
- **Only `.test.ts` / `.test.tsx` files under `src/` are collected** (`test.include` in `vite.config.ts`). Import test utilities from `vite-plus/test`.
- **`~/*` maps to `src/*`** — declared once in `tsconfig.json` (`compilerOptions.paths`) and consumed by Vite through `resolve.tsconfigPaths: true`. Relative imports are forbidden; see `.claude/rules/typescript/project-structure.md`.
- **Committing runs `.vite-hooks/pre-commit` → `vp staged`**, which applies `vp check --fix` to staged `js,jsx,ts,tsx,json,css` files.
- **New dependency versions must be 24h old.** `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`, so `vp add` / `vp update` on a freshly published version fails with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`. Wait it out or pick an older version — do not bypass the policy. `trustPolicy: no-downgrade` is also on.
- **Edits trigger react-doctor automatically** via the `PostToolBatch` hook in `.claude/settings.json` (`--scope changed --blocking warning`). Fix what it reports before calling work done.

## Coding conventions

Human-readable source of truth: [CODING_GUIDELINES.md](./CODING_GUIDELINES.md). `.claude/rules/` holds short English excerpts for agents. Do not add conventions only in one place.

## Stack direction

Installed packages are the source of truth (`package.json`). Do not write code against libraries that are not installed.

- **Installed:** TanStack Start + React 19, Convex (`convex` + `@convex-dev/react-query`), TanStack Query (Convex SSR adapter only, via `@tanstack/react-query` + `@tanstack/react-router-ssr-query`), Mantine 9 (with `@mantine/dates` + `dayjs`) and `tailwind-preset-mantine` on Tailwind 4, Valibot, Formisch, better-result, `cnfast`.
- **Tooling:** Vite+ (`vp`). Convex CLI via `vp run convex:dev` / `vp exec convex …`.
- **Auth:** not wired yet. Do not add Better Auth, Clerk, or WorkOS in this bootstrap.
- **Rejected:** Better Auth, Jotai, ky, MSW, TanStack Form, generated API clients (`src/lib/api/generated/`), `clsx` / `tailwind-merge` (`cnfast` covers this), Elysia / Drizzle / `pg`. TanStack Query is only for `convexQuery(...)` — do not use it as a generic REST client.

UI defaults to Mantine components; Tailwind handles layout on the wrappers around them. See [CODING_GUIDELINES.md](./CODING_GUIDELINES.md) §UI and `.claude/rules/typescript/mantine-tailwind.md`. `src/styles.css` imports `tailwind-preset-mantine`, which pulls in Tailwind and `@mantine/core/styles.layer.css` in the right layer order — do not add a bare `@import "tailwindcss"`. Rationale in `docs/adr/0003-mantine-with-tailwind-preset.md`.

## Supplementary project tools

Not part of `vp check`. Use `vp run` so installs stay routed through Vite+.

- **Fallow** (`vp run fallow`) — unused files, dependencies, and exports. Use when trimming deps or refactoring entry points (`.fallowrc.json` configures the project).
- **react-doctor** (`vp run doctor`) — React-focused health checks. The script uses `--no-lint`; keep ordinary linting on `vp lint`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `sc30gsw/cairn`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles are used verbatim as label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Cursor Cloud specific instructions

This is a TanStack Start (SSR) + Convex app. The web UI (`src/routes/index.tsx`) renders `OwnerGate` and `DayPage` (Convex `days.open` / `days.get`). `src/router.tsx` **throws if `VITE_CONVEX_URL` is unset** — so the Convex backend must be running before/alongside the web dev server.

- **Node / PATH:** The base image ships `/exec-daemon/node` (v22) earlier in `PATH`, but this repo requires Node `>=24.17.0`. `~/.bashrc` prepends the nvm-installed Node 24.17.0 and `/workspace/node_modules/.bin` (so `vp` is on `PATH`). Interactive/login shells get Node 24 and `vp` automatically; a bare non-interactive `bash -c` may still see the v22 shim.
- **Convex backend (headless):** No Convex login is available in cloud VMs. Run the backend in anonymous local mode: `CONVEX_AGENT_MODE=anonymous vp exec convex -- dev` (keep it running, e.g. in tmux). First run prompts "Set up Convex AI files?" — answer `n` (don't modify the repo). It provisions a local backend at `http://127.0.0.1:3210` and writes `.env.local` (`VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `VITE_CONVEX_SITE_URL`); `.env.local` is git-ignored.
- **Seed data:** New users start with an empty catalog (no auto-seed on `days.open`). Call `mutations.catalog.ensure` to load the Notion-derived default catalog, or add items/presets manually. Verify with `convex run days:get '{"dateJst":"2026-08-17","todayJst":"2026-08-17"}'` after signing in, or via `vp test`.
- **Auth (Cloud Agent / PR testing):** Set `BETTER_AUTH_SECRET` and `SITE_URL=http://localhost:3000` on the Convex deployment; `VITE_SITE_URL=http://localhost:3000` in `.env.local`. Sign up with username + email + password on the login screen, or use Notion OAuth when `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` are set.
- **Web dev server:** `vp dev` serves at `http://localhost:3000/`.
- **What works:** `vp test` (passes) and `vp build` (Rolldown, passes).
- **Pre-existing breakage — not a regression:** This branch already overrides `react-doctor/no-nested-component-definition`. Running `tsc` directly (TS 7) rejects `tsconfig.json`'s `baseUrl`; type-checking is intended to run via `vp`, and Vite resolves the `~/*` alias at runtime. Do not "fix" these as part of unrelated work.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
