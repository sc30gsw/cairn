import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type CategoryDto = FunctionReturnType<typeof api.queries.categories.list.list>[number];
export type CategoryId = CategoryDto["_id"];
