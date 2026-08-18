---
description: UI must follow the Paper Redesign (claude_design) — Flexoki Light paper + handwriting, right-edge index tabs, token-based colors only
globs: ["src/**/*.tsx", "src/**/*.css", "src/lib/theme.ts"]
alwaysApply: true
---

# Design Adherence — Paper Redesign

You must use the prompt when you create UI.

```
Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login) to import this project's
"Grill-me UI改善デザイン" and implement: Paper Redesign.dc.html
```

## Source of truth

- Canonical design: `docs/design/Paper Redesign.dc.html` (vendored from the Claude Design handoff bundle), decided via the `/grill-me` transcript in `docs/design/paper-redesign-chat.md` and summarized in `docs/design/paper-redesign-notes.md`.
- If this rule and the design file disagree: **the design file wins**.
- This replaces an earlier, never-implemented "Live Board" dark-theme design rule that predated this direction and was scaffolding only.

## Rules

1. All screens (Today/History/Items/Presets/Goals/Trash, plus any new route) use the Paper Redesign language: Flexoki Light paper background, a handwritten body/heading font with numerals in a separate readable font, a right-edge vertical "index tab" nav (collapses to a horizontal top row on mobile), and sketch-style irregular border-radii + paper drop-shadows reserved for prominent elements (cards, buttons, tabs) — not every element.
2. Colors come from `src/lib/theme.ts`'s Flexoki-derived Mantine color tuples (`orange` primary, `green` = success/complete, `red` = delete/danger, `blue`/`red` reserved for calendar Saturday/Sunday) plus the `--cairn-*` CSS variables (`--cairn-ink`, `--cairn-muted`, `--cairn-muted-2`, `--cairn-rule`, `--cairn-desk`, `--cairn-paper-2`). Never hardcode hex values in components — use theme colors, `var(--mantine-color-*)`, or the `--cairn-*` tokens.
3. Fonts: `BODY_FONT`/`DISPLAY_FONT` (handwritten, both point at the same stack) for headings and body text; `NUMERAL_FONT` for numeric displays (dates, minutes, counts, percentages). All three are exported from `src/lib/theme.ts` — import them, don't redeclare font stacks locally.
4. Light-only. Do not add dark-mode handling — the paper/handwriting concept is light-only by design decision (`project/design-notes.md`).
5. Do not invent new palettes or fonts for individual pages. Extend by reusing the existing tokens — the shared `SKETCH_RADIUS`/`PILL_RADIUS`/`PAPER_SHADOW` shape constants live in `src/lib/theme.ts`; export one only once a second file genuinely needs it (AHA, see `CODING_GUIDELINES.md`).
6. Do NOT port any mock JS from the `.dc.html` file — it is a demo-only local state machine. Real state comes from Convex subscriptions, same as the rest of this app.

## Notes for implementers

- The `851手書き雑フォント` ("Tegaki851") named in the original design chat could not be self-hosted in past implementation sessions because its distribution host was outside the network egress allowlist — Yomogi (Google Fonts, the design's own documented fallback) is the actual `BODY_FONT`/`DISPLAY_FONT` today. If Tegaki851 becomes reachable, swap it in as the primary face with Yomogi kept as the fallback, matching the original design file's `@font-face` stack (see `docs/design/Paper Redesign.dc.html`).
- The shared `PageTitle` component (`src/components/page-title.tsx`) renders the wavy-underline page heading used by History/Items/Presets/Goals/Trash — reuse it for any new top-level page heading instead of a bare `<Title order={1}>`.

## Related

- `.claude/rules/web/mantine-tailwind.md` — how tokens flow through Mantine/Tailwind
- `docs/design/paper-redesign-notes.md`, `docs/design/paper-redesign-chat.md` — the confirmed design decisions and rationale
