import { convexQuery } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { convexTest } from "convex-test";
import type { OptimisticLocalStore } from "convex/browser";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { PropsWithChildren } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { api } from "~/../convex/_generated/api";
import schema from "~/../convex/schema";
import {
  dayBoardTestDay,
  dayBoardTestRow,
  dayBoardTestItems,
} from "~/features/today/components/day-board.test-fixtures";
import { useAddRow, useSwitchPreset } from "~/hooks/use-row-mutations";
import { convexModules } from "~/test-utils/convex-modules";

afterEach(() => vi.restoreAllMocks());

function setupMutation() {
  const cache = new QueryClient();
  const client = new ConvexReactClient("https://example.convex.cloud");
  const localStore: OptimisticLocalStore = {
    getQuery: (query, args) => cache.getQueryData(convexQuery(query, args).queryKey),
    setQuery: (query, args, value) => {
      cache.setQueryData(convexQuery(query, args).queryKey, value);
    },
    getAllQueries: () => [],
  };
  vi.spyOn(client, "mutation").mockImplementation(async (...callArgs) => {
    const [, args, options] = callArgs;
    options?.optimisticUpdate?.(localStore, args ?? {});
    return null;
  });
  function Wrapper({ children }: PropsWithChildren) {
    return <ConvexProvider client={client}>{children}</ConvexProvider>;
  }
  const scope = { dateJst: dayBoardTestDay.dateJst, todayJst: dayBoardTestDay.dateJst };
  const dayQuery = convexQuery(api.queries.days.get.get, scope);
  cache.setQueryData(convexQuery(api.queries.items.list.list, {}).queryKey, dayBoardTestItems);
  cache.setQueryData(convexQuery(api.queries.categories.list.list, {}).queryKey, [
    { _id: dayBoardTestItems[0]?.categoryId, name: "多聴", sortOrder: 1 },
  ]);
  return { cache, client, dayQuery, scope, Wrapper };
}

test("adding a pending row does not increase confirmed learning time", async () => {
  const { cache, client, dayQuery, scope, Wrapper } = setupMutation();
  cache.setQueryData(dayQuery.queryKey, dayBoardTestDay);
  const { result, unmount } = renderHook(() => useAddRow(scope.dateJst, scope.todayJst), {
    wrapper: Wrapper,
  });
  await result.current({ ...scope, content: "追加", itemId: dayBoardTestRow.itemId, minutes: 60 });
  const day = cache.getQueryData<FunctionReturnType<typeof api.queries.days.get.get>>(
    dayQuery.queryKey,
  );
  expect(day?.rows).toHaveLength(2);
  expect(day?.volumeMinutes).toBe(0);
  expect(day?.shareMarkdown).toBe("");
  unmount();
  cache.clear();
  await client.close();
});

test("switching presets preserves started rows and confirmed summaries", async () => {
  const { cache, client, dayQuery, scope, Wrapper } = setupMutation();
  const t = convexTest(schema, convexModules);
  const presetId = await t.run((ctx) =>
    ctx.db.insert("presets", { ownerId: "owner", name: "切替", lines: [] }),
  );
  const rows = [
    { ...dayBoardTestRow, status: "確定", sortOrder: 3 },
    { ...dayBoardTestRow, status: "進行中", sortOrder: 4 },
    { ...dayBoardTestRow, status: "スキップ", sortOrder: 5 },
    { ...dayBoardTestRow, status: "未着手", sortOrder: 6 },
  ] satisfies FunctionReturnType<typeof api.queries.days.get.get>["rows"];
  cache.setQueryData(dayQuery.queryKey, { ...dayBoardTestDay, rows, volumeMinutes: 30 });
  cache.setQueryData(convexQuery(api.queries.presets.list.list, {}).queryKey, [
    {
      _id: presetId,
      name: "切替",
      weekdays: [],
      weekday: undefined,
      lines: [
        {
          itemId: dayBoardTestRow.itemId,
          itemName: dayBoardTestRow.itemName,
          content: "次の課題",
          minutes: 60,
        },
      ],
    },
  ] satisfies FunctionReturnType<typeof api.queries.presets.list.list>);
  const { result, unmount } = renderHook(() => useSwitchPreset(scope.dateJst, scope.todayJst), {
    wrapper: Wrapper,
  });
  await result.current({ ...scope, presetId });
  const day = cache.getQueryData<FunctionReturnType<typeof api.queries.days.get.get>>(
    dayQuery.queryKey,
  );
  expect(day?.rows.slice(0, 3)).toEqual(rows.slice(0, 3));
  expect(day?.rows[3]).toMatchObject({ content: "次の課題", sortOrder: 6, status: "未着手" });
  expect(day?.volumeMinutes).toBe(30);
  expect(day?.shareMarkdown).toContain("30分");
  unmount();
  cache.clear();
  await client.close();
});
