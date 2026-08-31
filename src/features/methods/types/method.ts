import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type MethodCatalog = FunctionReturnType<typeof api.queries.methods.list.list>;
export type MethodLane = MethodCatalog["lanes"][number];
export type Method = MethodCatalog["methods"][number];
