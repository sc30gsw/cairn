---
description: ConvexQueryClient + TanStack Query wiring — convexQuery reads, useConvexMutation, ConvexAuthProvider, CVX-14 dateJst args
globs: ["src/**/*.ts", "src/**/*.tsx"]
alwaysApply: true
---

# Convex + TanStack Start/Query

> This rule extends [convex-rules.md](../convex-rules.md).

## Wiring: `ConvexQueryClient` inside `src/router.tsx`

Follow Convex's official TanStack Start pattern: create one `ConvexQueryClient`, feed its `hashFn`/`queryFn` into the TanStack `QueryClient`, then `connect()` it and wrap the router in a `ConvexProvider` (or `ConvexAuthProvider`, see below) via `Wrap`.

```typescript
// CORRECT: src/router.tsx
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "~/routeTree.gen";

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
  if (!CONVEX_URL) throw new Error("VITE_CONVEX_URL is required");

  const convexQueryClient = new ConvexQueryClient(CONVEX_URL);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = createRouter({
    context: { queryClient },
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true,
    Wrap: ({ children }) => (
      <ConvexAuthProvider client={convexQueryClient.convexClient}>{children}</ConvexAuthProvider>
    ),
  });

  setupRouterSsrQueryIntegration({ queryClient, router });

  return router;
}
```

`src/routes/__root.tsx` declares the matching router context:

```typescript
// CORRECT
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({ ... });
```

## Reads: `useSuspenseQuery(convexQuery(...))`

Use `convexQuery` from `@convex-dev/react-query` with TanStack Query's `useSuspenseQuery` for component-level reads. This renders the initial result during SSR, then upgrades to a live Convex subscription in the browser automatically — no manual refetch or polling.

```typescript
// CORRECT
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";

export function useTodaySessions({ dateJst }: Record<"dateJst", string>) {
  return useSuspenseQuery(convexQuery(api.sessions.listForDate, { dateJst }));
}

// WRONG: plain Convex React useQuery loses SSR + TanStack Query cache integration
import { useQuery } from "convex/react";
const sessions = useQuery(api.sessions.listForDate, { dateJst });
```

## Route loaders: do not prefetch Convex queries with `ensureQueryData`

Do not call `queryClient.ensureQueryData(convexQuery(...))` or `queryClient.ensureQueryData(featureQueryFactory(...))` from TanStack Start route loaders. In this project that pattern can fail at runtime because authenticated Convex reads depend on the client-side `ConvexAuthProvider` token state. Keep Convex reads at component/hook level with `useSuspenseQuery(...)`.

Feature-local query option factories (for example `dashboardLiveQuery(dateJst)`) remain the SSoT for component-level reads and tests. Use them from hooks/components, not route loaders.

```typescript
// WRONG: do not do this in TanStack Start route loaders
export const Route = createFileRoute("/dashboard")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(dashboardLiveQuery(todayJst())),
  component: DashboardPage,
});
```

## Mutations: project `useConvexMutation` helper

Use the project helper from `~/lib/use-convex-mutation`. It is the single source of truth for pairing the Convex React mutation hook with TanStack Query's `useMutation`. Feature hooks should only pass the generated Convex function reference.

```typescript
// CORRECT
import { useConvexMutation } from "~/lib/use-convex-mutation";

import { api } from "~/../convex/_generated/api";

export function useStartSession() {
  return useConvexMutation(api.sessions.start);
}
```

## Client-side types: derive with `FunctionReturnType`

Never hand-write a type that duplicates a Convex function's return shape. Derive it from the function reference with `FunctionReturnType` (from `convex/server`).

```typescript
// CORRECT
import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

type DashboardData = FunctionReturnType<typeof api.dashboard.live>;

// WRONG: manually duplicated shape drifts from the backend
type DashboardData = {
  studyMinutesToday: number;
  fastingPhase: string;
};
```

## Auth: `ConvexAuthProvider` at the app root — no SSR-authenticated first paint

This project uses the plain client-side `ConvexAuthProvider` from `@convex-dev/auth/react` (not a framework-specific SSR auth adapter). It replaces `ConvexProvider` in the `Wrap` shown above, wrapping the entire router tree at the root:

```typescript
// CORRECT
import { ConvexAuthProvider } from "@convex-dev/auth/react";

<ConvexAuthProvider client={convexQueryClient.convexClient}>{children}</ConvexAuthProvider>;
```

Accepted tradeoff: auth tokens live in `localStorage` and are only known on the client, so **the first server-rendered paint is always unauthenticated** — there is no SSR-authenticated first paint. Do not build UI that assumes `ctx.auth` is resolved during SSR; gate authenticated content behind client-side auth state (e.g. `useConvexAuth()`/`<Authenticated>`) instead. This is an accepted limitation for this 2-user personal app, not a bug to fix.

## CVX-14: queries never call `Date.now()` — pass "now" as an argument

A Convex `query` re-runs only when its reactive dependencies change, not on the wall clock, so `Date.now()` inside a `query` handler produces stale, uncached-looking results. Any date- or "now"-dependent value (e.g. `dateJst`) must be computed on the client and passed in as a query argument.

```typescript
// CORRECT: client computes dateJst, passes it as an argument
const { data } = useSuspenseQuery(convexQuery(api.dashboard.live, { dateJst: todayJst() }));

// WRONG: query reads the clock itself — see CVX-14 in convex-rules.md
export const live = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10); // forbidden in a query
    return ctx.db
      .query("sessions")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();
  },
});
```

`mutation` and `action` handlers may call `Date.now()` freely — this restriction is query-only.

## Related skills

- [convex-rules.md](../convex-rules.md) — full Convex implementation rulebook (CVX-01 through CVX-20)
- [mantine-tailwind.md](mantine-tailwind.md) — Mantine/Tailwind coexistence for the components that render this data
