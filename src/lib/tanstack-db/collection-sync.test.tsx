import { convexQuery, ConvexQueryClient } from "@convex-dev/react-query";
import { DbProvider } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { convexTest } from "convex-test";
import { ConvexReactClient } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { PropsWithChildren } from "react";
import { expect, test } from "vite-plus/test";

import { api } from "~/../convex/_generated/api";
import schema from "~/../convex/schema";
import { useOptionalPresetsLiveQuery } from "~/lib/tanstack-db/core-collections";
import { createTanStackDbClient } from "~/lib/tanstack-db/runtime";
import { convexModules } from "~/test-utils/convex-modules";

test("live collections retain server ordering through optimistic changes and rollback", async () => {
  const t = convexTest(schema, convexModules);
  const [first, second] = await t.run(async (ctx) =>
    Promise.all([
      ctx.db.insert("presets", { ownerId: "owner", name: "金曜", weekday: 5, lines: [] }),
      ctx.db.insert("presets", { ownerId: "owner", name: "土曜", weekday: 6, lines: [] }),
    ]),
  );
  const initial = [
    { _id: first, name: "金曜", weekday: 5, weekdays: [5], lines: [] },
    { _id: second, name: "土曜", weekday: 6, weekdays: [6], lines: [] },
  ] satisfies FunctionReturnType<typeof api.queries.presets.list.list>;
  const convexClient = new ConvexReactClient("https://example.convex.cloud");
  const convexQueryClient = new ConvexQueryClient(convexClient);
  const queryClient = new QueryClient();
  const dbClient = createTanStackDbClient({ convexQueryClient, queryClient });
  const query = convexQuery(api.queries.presets.list.list, {});
  queryClient.setQueryData(query.queryKey, initial);
  function Wrapper({ children }: PropsWithChildren) {
    return <DbProvider client={dbClient}>{children}</DbProvider>;
  }
  const { result, unmount } = renderHook(useOptionalPresetsLiveQuery, { wrapper: Wrapper });
  await waitFor(() =>
    expect(result.current.data?.map((item) => item._id)).toEqual([first, second]),
  );
  act(() =>
    queryClient.setQueryData(query.queryKey, [
      { ...initial[1], _id: second, weekday: 1 },
      initial[0],
    ]),
  );
  await waitFor(() =>
    expect(result.current.data?.map((item) => item._id)).toEqual([second, first]),
  );
  act(() => queryClient.setQueryData(query.queryKey, initial));
  await waitFor(() => expect(result.current.data).toEqual(initial));
  act(() => queryClient.setQueryData(query.queryKey, []));
  await waitFor(() => expect(result.current.data).toEqual([]));
  unmount();
  await dbClient.cleanup();
  queryClient.clear();
  await convexClient.close();
});
