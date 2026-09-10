import type { Id, TableNames } from "~/../convex/_generated/dataModel";

export function optimisticId<Table extends TableNames>(table: Table): Id<Table> {
  const suffix =
    typeof crypto === "undefined" ? `${Date.now()}-${Math.random()}` : crypto.randomUUID();
  return `optimistic:${table}:${suffix}` as Id<Table>;
}
