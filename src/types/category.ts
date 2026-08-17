import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

//? カテゴリーは catalog と goals の両方が使う共有の型。features 間 import を避けてここに置く
export type CategoryDto = FunctionReturnType<typeof api.queries.categories.list.list>[number];
export type CategoryId = CategoryDto["_id"];
