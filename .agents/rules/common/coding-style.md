---
description: Core coding style — naming, comments, import order, file size, immutability
globs: ["**/*.{ts,tsx,js,jsx}"]
alwaysApply: true
---

# Coding Style

Full conventions are in [CODING_GUIDELINES.md](/CODING_GUIDELINES.md) §Code Style and §React/TypeScript Conventions. The rules below highlight the most critical points and those enforced by hooks.

## Immutability

ALWAYS return new values; NEVER mutate in place:

```typescript
// CORRECT: return new copy
const updated = { ...user, name: "new name" };

// WRONG: mutates original
user.name = "new name";
```

## File size

- 200–400 lines typical
- 800 lines maximum — extract utilities when approaching this limit
- One primary responsibility per file

## Naming

| Target         | Convention       | Example                      |
| -------------- | ---------------- | ---------------------------- |
| Variables / fn | lowerCamelCase   | `userName`, `getProducts`    |
| Components     | UpperCamelCase   | `ProductList`, `LoginForm`   |
| Types          | UpperCamelCase   | `Product`, `CreateUserInput` |
| Constants      | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`            |
| Files          | kebab-case       | `product-list.tsx`           |

## Hook-backed bans

The following are also caught by PostToolUse hooks in `.claude/settings.json`:

> Also enforced by PostToolUse hook in `.claude/settings.json`

- **No `console.log`** in committed code
- **No `interface`** — use `type` everywhere
- **No relative imports** — always use the `~/` alias, even for files in the same directory or adjacent directories

```typescript
// WRONG: relative paths, even when the file is right next to you
import { tenantsFixture } from "./tenants-fixture";
import { helper } from "../utils/helper";

// CORRECT: always ~
import { tenantsFixture } from "~/features/tenants/mocks/tenants-fixture";
import { helper } from "~/features/tenants/utils/helper";
```

- **No `export default`** outside `src/routes/**` and `*.config.ts`

## Type SSoT (CVX-16)

Domain enums and shared constraints live in [`convex/lib/domain.ts`](/convex/lib/domain.ts) as `as const` tuples. Derive types from a single source:

| Layer | Source | Derivation |
| ----- | ------ | ---------- |
| Domain values | `convex/lib/domain.ts` | `(typeof STATUSES)[number]` etc. |
| Convex DTOs | `convex/lib/validators.ts` | `Infer<typeof validator>` |
| Client API shapes | `src/features/*/types/*.ts` | `FunctionReturnType<typeof api.x.y>` |
| Form input | `src/features/*/schemas/*.ts` | `v.InferOutput<typeof Schema>` |
| UI labels/colors | `src/lib/record-status-ui.ts` etc. | `as const satisfies Record<Status, …>` |

Rules:

- Do **not** hand-write `"確定" | "未着手" | "スキップ"` unions — import `Status` or `StatusDto`.
- Array/object constants: `as const satisfies T` when a target type exists.
- Import domain from `~domain/*` (maps to `convex/lib/*`); never import Convex server modules at runtime from `src/`.
- Run `vp run type-ssot-check` in CI or before merge to catch regressions.
