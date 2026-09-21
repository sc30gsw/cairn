import { weekdayFromDateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import type { Id } from "~/../convex/_generated/dataModel";

type ConvexTestFns = {
  mutation: unknown;
  query: unknown;
};

export async function seedWeekdayDay(
  t: ConvexTestFns,
  dateJst: string,
  todayJst = dateJst,
): Promise<void> {
  const query = t.query as (fn: unknown, args: unknown) => Promise<unknown>;
  const mutation = t.mutation as (fn: unknown, args: unknown) => Promise<unknown>;
  const items = (await query(api.queries.items.list.list, {})) as { _id: Id<"items"> }[];
  const first = items[0];
  if (first === undefined) {
    throw new Error("catalog seed missing items");
  }
  await mutation(api.mutations.rows.add.add, {
    content: "",
    dateJst,
    itemId: first._id,
    minutes: 0,
    todayJst,
  });
  const presets = (await query(api.queries.presets.list.list, {})) as {
    _id: Id<"presets">;
    weekdays: number[];
  }[];
  const weekday = weekdayFromDateJst(dateJst);
  const preset = presets.find((entry) => entry.weekdays.includes(weekday));
  if (preset === undefined) {
    throw new Error(`no weekday preset for ${dateJst}`);
  }
  await mutation(api.mutations.rows.switchPreset.switchPreset, {
    dateJst,
    presetId: preset._id,
    todayJst,
  });
}
