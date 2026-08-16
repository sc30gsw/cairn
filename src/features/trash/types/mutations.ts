import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type RestoreDayInput = Pick<
  FunctionArgs<typeof api.mutations.trash.restoreDay.restoreDay>,
  "dayId"
>;
export type RestoreRowInput = Pick<
  FunctionArgs<typeof api.mutations.rows.restore.restore>,
  "rowId"
>;
export type PurgeDayInput = Pick<
  FunctionArgs<typeof api.mutations.trash.purgeDay.purgeDay>,
  "dayId"
>;
export type PurgeRowInput = Pick<
  FunctionArgs<typeof api.mutations.trash.purgeRow.purgeRow>,
  "rowId"
>;
