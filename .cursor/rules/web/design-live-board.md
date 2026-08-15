---
description: UI must follow the Live Board design (claude_design) — dark theme, JetBrains Mono, token-based colors only
globs: ["src/**/*.tsx", "src/**/*.css", "src/lib/theme.ts"]
alwaysApply: true
---

# Design Adherence — Live Board

You must use the prompt when you create UI.

```
Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login) to import this project:
https://claude.ai/design/p/9bc66e31-1c1d-4e0b-8082-c955660c6963?file=Live+Board.dc.html

Implement: Live Board.dc.html
```

## Source of truth

- Canonical design: claude_design project `9bc66e31-1c1d-4e0b-8082-c955660c6963`, file `Live Board.dc.html`
- Repo summary + implementation mapping: `docs/design/live-board.md` — read it before any UI work
- If this rule, the summary doc, and the design file disagree: **the design file wins**

## Rules

1. All screens (including `/login`, `/signup`, and any new route) use the Live Board design language: dark theme, JetBrains Mono, uppercase letter-spaced labels, card UI with inset panels, status chips, toasts.
2. Colors come from the design tokens (`--bg` `--tx` `--dim` `--faint` `--panel2` `--inset` `--bd2` `--cardsh` `--coral` `--good` `--amber` `--violet` `--blue` `--flash`) mapped once into `src/lib/theme.ts` / Tailwind. Never hardcode hex values in components.
3. Do NOT port the mock JS inside the design file — it is a demo-only local state machine. Real state comes from Convex subscriptions (`docs/spec.md` §5/§6).
4. Do not invent new palettes or fonts for individual pages. Extend by reusing existing tokens.

## Related

- `.claude/rules/web/mantine-tailwind.md` — how tokens flow through Mantine/Tailwind
- `docs/design/live-board.md` — layout structure and token list
