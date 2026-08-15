# Shimmer From Structure (skeleton loaders)

Structure-aware skeleton loading. `<Shimmer>` measures its children's rendered DOM and paints a shimmering skeleton in that exact shape — no hand-authored skeleton components that drift from the real UI. Use it for every loading state (auth resolution, Suspense queries, async panels).

## Package: `@shimmer-from-structure/react` only

Install and import from the **dedicated React package**, never the multi-framework meta-package `shimmer-from-structure`.

```bash
vp add @shimmer-from-structure/react
```

The meta-package `shimmer-from-structure@2.4.7` declares a broken transitive dependency (`@shimmer-from-structure/solid@2.4.6`, which was never published) and fails to install. The React package has no such problem and exports everything this project needs.

```typescript
// CORRECT
import { Shimmer, ShimmerProvider, useShimmerConfig } from "@shimmer-from-structure/react";

// WRONG: meta-package — install fails on the unpublished solid dependency
import { Shimmer } from "shimmer-from-structure";
```

Exports: `Shimmer` (`ShimmerProps`), `ShimmerProvider` (`{ config?: ShimmerConfig }`), `useShimmerConfig`. `ShimmerProps` = `{ children, loading?, shimmerColor?, backgroundColor?, duration?, fallbackBorderRadius?, templateProps? }`.

## Global config lives in one `ShimmerProvider` at the router root

Colors are set once, from the Live Board design tokens, on a single `ShimmerProvider` inside `src/routes/__root.tsx` (inside `MantineProvider`). Every `<Shimmer>` inherits them, so components never repeat color props and never hardcode hex — this is what keeps the skeletons on-theme and light/dark-aware (see [design-live-board.md](design-live-board.md)).

```tsx
// CORRECT: src/routes/__root.tsx — one provider, token-driven, theme-aware
<MantineProvider defaultColorScheme="dark" theme={theme}>
  <ShimmerProvider
    config={{
      backgroundColor: "var(--inset)",
      shimmerColor: "var(--bd2)",
      duration: 2,
      fallbackBorderRadius: 8,
    }}
  >
    {children}
  </ShimmerProvider>
</MantineProvider>

// WRONG: hardcoded hex bypasses the design tokens and breaks the light theme
<Shimmer loading shimmerColor="#38bdf8" backgroundColor="#0e1016">...</Shimmer>
```

Colors resolve through CSS variables (`var(--inset)`, `var(--bd2)`), so a single provider automatically follows the `[data-theme="light"]` switch. Only override `shimmerColor`/`backgroundColor` on an individual `<Shimmer>` for a deliberate exception.

## Usage patterns

### 1. Wrap the real content (`loading={isLoading}`) — default

When the actual UI is renderable during loading (a form, a card), wrap it directly. Shimmer measures the real children, so there is nothing to keep in sync.

```tsx
// CORRECT: src/routes/login.tsx — auth resolving → the real card shimmers
const { isAuthenticated, isLoading } = useConvexAuth();
if (isAuthenticated) return <Navigate to="/" />;

return (
  <Center>
    <Shimmer loading={isLoading}>
      <Paper>{/* the real LoginForm */}</Paper>
    </Shimmer>
  </Center>
);
```

### 2. Suspense fallback (`loading` always true) — for suspending reads

For a component that suspends (a `useSuspenseQuery` read — see [convex-tanstack.md](convex-tanstack.md)), give it a Suspense boundary whose fallback is a `<Shimmer loading>`.

The fallback **must not render the suspending component itself** — that would suspend again inside the fallback. Render a small static structural mock that mirrors its layout instead.

```tsx
// CORRECT: fallback is a structural mock, not the suspending component
<Suspense fallback={<UserMenuFallback />}>
  <UserMenu />
</Suspense>;

// UserMenuFallback mirrors UserMenu's shape WITHOUT calling useViewer()
export function UserMenuFallback() {
  return (
    <Shimmer loading>
      <Group gap="xs">
        <Avatar radius="xl" size="sm" />
        <div>
          <Text fw={600} size="sm">
            ユーザー名
          </Text>
          <Text c="dimmed" size="xs" tt="uppercase">
            role
          </Text>
        </div>
        <IconChevronDown size={16} />
      </Group>
    </Shimmer>
  );
}

// WRONG: the suspending component inside its own fallback → re-suspends, boundary never resolves
<Suspense
  fallback={
    <Shimmer loading>
      <UserMenu />
    </Shimmer>
  }
>
  <UserMenu />
</Suspense>;
```

### 3. `templateProps` — for prop-driven components with no data yet

When a component renders from props and the data is still `null`, pass `templateProps` so the skeleton renders at the real structure. Match the template's array length and field shape to real data to avoid layout shift.

```tsx
<Shimmer loading={loading} templateProps={{ user: userTemplate }}>
  <UserCard user={user ?? userTemplate} />
</Shimmer>
```

## Best practices

- **Match the template structure.** Same array length and field shape as real data — 5 real rows → 5 template rows. Prevents layout shift on load.
- **One `<Shimmer>` per independent section.** Wrap Sidebar, Feed, Header separately so each reveals as its own data arrives, instead of one page-wide skeleton gated on the slowest fetch.
- **Give async/zero-size content explicit dimensions.** A chart, lazy image, or empty placeholder block needs a container with a set width/height so Shimmer has a layout to measure immediately.
- **Element-level control via HTML attributes:**
  - `data-shimmer-ignore` — keep an element visible during loading (a `LIVE` badge, a static label). It and its children are excluded from measurement.
  - `data-shimmer-no-children` — treat a nested structure as a single shimmer block instead of many child blocks (a compact metric row).

```tsx
<Paper>
  <span data-shimmer-ignore>● LIVE</span> {/* stays visible while loading */}
  <div data-shimmer-no-children>
    {value} {trend}
  </div>{" "}
  {/* one block, not three */}
</Paper>
```

## Project conventions

- **Do not `React.memo` the fallback.** The library docs suggest memoizing Suspense fallbacks, but this project runs the React Compiler — it handles that automatically. Do not hand-memoize (see [../typescript/react-conventions.md](../typescript/react-conventions.md) §react-compiler).
- **Named exports, `function` declarations** for fallback/skeleton components, same as every component (react-conventions §Named exports only).
- **Skeleton components co-locate with their component** — `UserMenuFallback` lives beside `UserMenu` in the same feature folder.
- **Mantine-first, then Shimmer wraps it.** Build the real UI with Mantine components; `<Shimmer>` measures their rendered DOM. Do not fight Mantine internals to fake a skeleton (see [mantine-tailwind.md](mantine-tailwind.md)).

## Related

- [design-live-board.md](design-live-board.md) — the design tokens the shimmer colors map to
- [convex-tanstack.md](convex-tanstack.md) — `useSuspenseQuery` reads that make a Suspense + Shimmer boundary meaningful
- [mantine-tailwind.md](mantine-tailwind.md) — Mantine components are what Shimmer measures
- [../typescript/react-conventions.md](../typescript/react-conventions.md) — react-compiler (no manual memo), named exports, function declarations
