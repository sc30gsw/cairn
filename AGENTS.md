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

This is a TanStack Start (SSR) + Convex app. The web UI (`src/routes/index.tsx`) renders the Convex `tasks.get` query, and `src/router.tsx` **throws if `VITE_CONVEX_URL` is unset** — so the Convex backend must be running before/alongside the web dev server.

- **Node / PATH:** The base image ships `/exec-daemon/node` (v22) earlier in `PATH`, but this repo requires Node `>=24.17.0`. `~/.bashrc` prepends the nvm-installed Node 24.17.0 and `/workspace/node_modules/.bin` (so `vp` is on `PATH`). Interactive/login shells get Node 24 and `vp` automatically; a bare non-interactive `bash -c` may still see the v22 shim.
- **Convex backend (headless):** No Convex login is available in cloud VMs. Run the backend in anonymous local mode: `CONVEX_AGENT_MODE=anonymous vp exec convex -- dev` (keep it running, e.g. in tmux). First run prompts "Set up Convex AI files?" — answer `n` (don't modify the repo). It provisions a local backend at `http://127.0.0.1:3210` and writes `.env.local` (`VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `VITE_CONVEX_SITE_URL`); `.env.local` is git-ignored.
- **Seed data:** `CONVEX_AGENT_MODE=anonymous convex import --table tasks --replace sampleData.jsonl -y` loads the 3 sample tasks. Verify with `convex run tasks:get`.
- **Web dev server:** `vp dev` serves at `http://localhost:3000/`.
- **What works:** `vp test` (passes) and `vp build` (Rolldown, passes).
- **Pre-existing breakage — not a regression:** `vp check` / `vp lint` fail to *start* because `vite.config.ts` references the lint rule `react-doctor/no-nested-components`, which the pinned `oxlint-plugin-react-doctor@0.9.12` no longer defines (it has `no-nested-component-definition`). `vp check`'s formatter also flags ~275 already-committed docs (mostly under `.agents/` and `.claude/`). Running `tsc` directly (TS 7) rejects `tsconfig.json`'s `baseUrl`; type-checking is intended to run via `vp`, and Vite resolves the `~/*` alias at runtime. Do not "fix" these as part of unrelated work.
