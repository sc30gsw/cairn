import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type TrashPage = FunctionReturnType<typeof api.queries.trash.list.list>;
export type TrashDay = TrashPage["days"][number];
export type TrashRow = TrashPage["rows"][number];
