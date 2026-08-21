import type { Doc, Id } from "../../_generated/dataModel";
import type { loadCatalog } from "../../lib/catalogLoader";
import { categoryFields } from "../../lib/categoryFields";
import type { StatusDto } from "../../lib/validators";

type CatalogMaps = Awaited<ReturnType<typeof loadCatalog>>;

export type HistoryEventRow = {
  category: string;
  dateJst: string;
  minutes: number;
  rowId: Id<"rows">;
  status: StatusDto;
  title: string;
};

export function rowsToHistoryEvents(
  rows: Doc<"rows">[],
  catalog: Pick<CatalogMaps, "categoryById" | "itemById">,
): HistoryEventRow[] {
  return rows.map((row) => rowToHistoryEvent(row, catalog));
}

export function rowToHistoryEvent(
  row: Doc<"rows">,
  catalog: Pick<CatalogMaps, "categoryById" | "itemById">,
): HistoryEventRow {
  const item = catalog.itemById.get(row.itemId);
  const { category } = categoryFields(item, catalog.categoryById);
  return {
    category,
    dateJst: row.dateJst,
    minutes: row.minutes,
    rowId: row._id,
    status: row.status,
    title: item?.name ?? "不明",
  };
}
