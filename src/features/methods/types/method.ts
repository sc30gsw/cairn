import type { FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

//? クライアント側の型は Convex の関数参照から導出する(手書きの複製を作らない — CVX-16)
export type MethodCatalog = FunctionReturnType<typeof api.queries.methods.list.list>;
export type MethodLane = MethodCatalog["lanes"][number];
export type Method = MethodCatalog["methods"][number];
