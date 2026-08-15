---
description: convex-test is the primary testing approach — convexTest(schema), auth mocking, minimum CVX-19 coverage; Testing Library + happy-dom for UI component tests
globs: ["**/*.{test,spec}.{ts,tsx}"]
alwaysApply: true
---

# Testing

Full guidance is in [CODING_GUIDELINES.md](../CODING_GUIDELINES.md) §Coding with Testing in Mind.

## Philosophy

Write tests from the user's perspective. Assert on what the user sees and can interact with, not implementation details.

## Vitest setup

Import test utilities from `vite-plus/test`, not from `vitest` directly:

```typescript
// CORRECT
import { expect, test, vi } from "vite-plus/test";

// WRONG: direct vitest import
import { expect, test } from "vitest";
```

Run tests with `vp test`, not `vp run vitest`.

## convex-test (primary testing approach)

This project's test suite is built on `convex-test`, per [convex-rules.md](../convex-rules.md) CVX-19. Convex functions are tested directly against a real, schema-backed in-memory instance — there is no MSW here, since data comes from reactive Convex queries rather than a mockable REST layer.

### Setup: `convexTest(schema)`

Build the test environment from the project's `schema.ts` so every test runs against the real table/index shape:

```typescript
// convex/sessions.test.ts — same directory as schema.ts and _generated/
import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";
import { api } from "./_generated/api";
import schema from "./schema";

test("start creates a session", async () => {
  const t = convexTest(schema);

  await t.mutation(api.sessions.start, {
    category: "focus",
    dateJst: "2026-07-06",
  });
});
```

### Mocking auth: `t.withIdentity({ subject })`

Every public function requires an authenticated caller (CVX-04). Use `t.withIdentity(...)` to act as a given user instead of stubbing `ctx.auth`:

```typescript
test("rejects a second concurrent session for the same user", async () => {
  const t = convexTest(schema);
  const asUser = t.withIdentity({ subject: "user_123" });

  await asUser.mutation(api.sessions.start, { category: "focus", dateJst: "2026-07-06" });

  await expect(
    asUser.mutation(api.sessions.start, { category: "focus", dateJst: "2026-07-06" }),
  ).rejects.toThrow();
});
```

### Minimum required test targets (CVX-19)

At minimum, cover:

- **State machine transition guards**
  - Double-start rejection on `sessions` — starting a session while one is already active must be rejected.
  - Double-start rejection on `fasting` — same guard for the fasting state machine.
  - `advancePhase` ignored after `ended` — calling it again once a fasting session has ended must be a no-op, not a state change.
- **Pure functions in `convex/model/`** — no `convexTest` harness needed; call these directly with plain inputs/outputs:
  - `elapsed(session, now)` — elapsed-time derivation.
  - `suggestRescheduleSlots(blocks, nowHm)` — reschedule-slot suggestion.
  - `pearson(xs, ys)` — Pearson correlation coefficient.
  - `nextDemoMetric(prev, rand)` — demo random-walk generator.

```typescript
// convex/model/sessions.test.ts — sibling to convex/model/sessions.ts
import { expect, test } from "vite-plus/test";
import { elapsed } from "./sessions";

test("elapsed derives minutes from session start to now", () => {
  expect(elapsed({ startedAt: 0 }, 60_000)).toBe(1);
});
```

## UI component testing

`@testing-library/react` + `@testing-library/user-event` + `happy-dom` are installed. `@testing-library/jest-dom` is **not** installed (its entry point imports `vitest` directly, which conflicts with this project's `vite-plus/test`-only rule) — assert with `toBeDefined()` / `toHaveBeenCalledWith(...)` / plain DOM properties instead of `toBeInTheDocument()` etc.

### Environment: per-file docblock

The project's default Vitest environment is Node (convex-test needs it). Opt a component test file into a DOM environment with a docblock at the top of the file — do not change the global `test.environment`:

```typescript
// @vitest-environment happy-dom
```

### Rendering: `renderWithMantine`

Use `renderWithMantine` from `~/test-utils` instead of Testing Library's `render` directly — it wraps the tree in the project's `MantineProvider`/theme, which most components require. Importing `~/test-utils` also registers a shared `afterEach(cleanup)` (this project disables Vitest's `globals`, so `@testing-library/react`'s automatic cleanup never fires on its own):

```typescript
// @vitest-environment happy-dom
import { expect, test } from "vite-plus/test";

import { UserMenu } from "~/features/auth/components/user-menu";
import { renderWithMantine } from "~/test-utils";

test("shows the viewer's display name", () => {
  const { getByText } = renderWithMantine(<UserMenu />);
  expect(getByText("テスト太郎")).toBeDefined();
});
```

### Query priority

1. **`getByRole`** — most accessible, matches semantic HTML
2. **`getByText`** — for visible text content
3. **`getByLabelText`** / **`getByPlaceholderText`** — for form fields
4. **`getByAltText`** — for images

```typescript
// CORRECT: role-based query
const button = getByRole("button", { name: "送信" });

// WRONG: testId or DOM selectors
const button = getByTestId("submit-button");
const heading = document.querySelector(".heading-text");
```

**`data-testid` is forbidden.** If an element has no accessible role or text, add an `aria-label` instead.

### Mantine label text: required-field asterisk

Mantine appends a visually-hidden `*` to a field's `<label>` when `required` is set, so the label's full text content is `"メールアドレス *"`, not `"メールアドレス"`. `getByLabelText("メールアドレス")` (exact match) will not find it — use a regex instead: `getByLabelText(/メールアドレス/)`. When two labels share a prefix (e.g. `"パスワード"` vs `"パスワード(確認)"`), anchor and disambiguate: `getByLabelText(/^パスワード(\s|$)/)` and `getByLabelText(/パスワード\(確認\)/)` (escape literal parens — unescaped `(...)` in a regex is a capture group, not literal text).

### Mocking: `vi.mock` + `vi.hoisted`

Mock the auth/router/data hooks a component depends on, not the framework internals:

```typescript
const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: signInMock, signOut: vi.fn() }),
}));
```

### Floating UI popovers/menus/selects: `{ hidden: true }`

Mantine's `Menu`, `Select`, and other Popover-based components position their dropdown via Floating UI, which cannot measure real layout in `happy-dom` and leaves the dropdown at `display: none` even after it opens. Testing Library's `getByRole` excludes elements it considers hidden by default — pass `{ hidden: true }` to reach options/menu items anyway:

```typescript
await user.click(getByRole("combobox", { name: /ロール/ }));
await user.click(getByRole("option", { hidden: true, name: "本人" }));
```

A `Select`'s target input has `role="combobox"`, not `"textbox"`.

## Related skills

- `webapp-testing` — testing patterns and helpers for this project
  </content>
