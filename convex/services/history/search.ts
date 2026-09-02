import type { QueryCtx } from "../../_generated/server";
import { loadCatalog } from "../../lib/catalogLoader";
import { categoryFields } from "../../lib/categoryFields";
import { requireDateJst } from "../../lib/dateArgs";
import { SEARCH_RESULT_LIMIT } from "../../lib/domain";
import { compareDateJst } from "../../lib/jst";
import { matchesSearchText, requireSearchQuery } from "../../lib/searchText";
import type { HistorySearchDto, HistorySearchHitDto } from "../../lib/validators";
import { liveDayDatesFrom, liveRows } from "./liveRows";

export type SearchArgs = {
  //? 省略なら全期間。既定（直近12か月）はクライアントが計算して渡す（CVX-14）
  fromJst?: string;
  query: string;
};

type RankedHit = HistorySearchHitDto & Record<"sortOrder", number>;

const KIND_ORDER = { hitokoto: 1, memo: 0 } as const satisfies Record<
  HistorySearchHitDto["kind"],
  number
>;

function byDateDescThenOrder(left: RankedHit, right: RankedHit): number {
  return (
    compareDateJst(right.dateJst, left.dateJst) ||
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    left.sortOrder - right.sortOrder
  );
}

//? 所有者の対象文書をインデックスで読み、TypeScript 側で部分一致を判定する（案 c）
export async function search(
  ctx: QueryCtx,
  ownerId: string,
  args: SearchArgs,
): Promise<HistorySearchDto> {
  const normalizedQuery = requireSearchQuery(args.query);
  const fromJst = args.fromJst === undefined ? undefined : requireDateJst(args.fromJst);
  const [days, rows, catalog] = await Promise.all([
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        fromJst === undefined
          ? q.eq("ownerId", ownerId)
          : q.eq("ownerId", ownerId).gte("dateJst", fromJst),
      )
      .collect(),
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) =>
        fromJst === undefined
          ? q.eq("ownerId", ownerId)
          : q.eq("ownerId", ownerId).gte("dateJst", fromJst),
      )
      .collect(),
    loadCatalog(ctx, ownerId),
  ]);
  const liveDates = liveDayDatesFrom(days);
  const hits: RankedHit[] = [];
  for (const day of days) {
    if (day.deletedAt !== undefined || day.memo === undefined) {
      continue;
    }
    if (matchesSearchText(day.memo, normalizedQuery)) {
      hits.push({
        dateJst: day.dateJst,
        kind: "memo",
        sortOrder: 0,
        text: day.memo,
        title: "メモ",
      });
    }
  }
  for (const row of liveRows(rows, liveDates)) {
    if (!matchesSearchText(row.content, normalizedQuery)) {
      continue;
    }
    const item = catalog.itemById.get(row.itemId);
    const { category } = categoryFields(item, catalog.categoryById);
    hits.push({
      category,
      dateJst: row.dateJst,
      kind: "hitokoto",
      minutes: row.minutes,
      rowId: row._id,
      sortOrder: row.sortOrder,
      text: row.content,
      title: item?.name ?? "不明",
    });
  }
  hits.sort(byDateDescThenOrder);
  return {
    hits: hits.slice(0, SEARCH_RESULT_LIMIT).map(({ sortOrder: _sortOrder, ...hit }) => hit),
    truncated: hits.length > SEARCH_RESULT_LIMIT,
  };
}
