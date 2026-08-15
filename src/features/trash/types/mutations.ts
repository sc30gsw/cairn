import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type RestoreDayInput = Pick<FunctionArgs<typeof api.trash.restoreDay>, "dayId">;
export type RestoreRowInput = Pick<FunctionArgs<typeof api.rows.restore>, "rowId">;
export type PurgeDayInput = Pick<FunctionArgs<typeof api.trash.purgeDay>, "dayId">;
export type PurgeRowInput = Pick<FunctionArgs<typeof api.trash.purgeRow>, "rowId">;
