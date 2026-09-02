import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type ConfirmRowInput = FunctionArgs<typeof api.mutations.rows.confirm.confirm>;
export type SkipRowInput = FunctionArgs<typeof api.mutations.rows.skip.skip>;
export type AddRowInput = Omit<
  FunctionArgs<typeof api.mutations.rows.add.add>,
  "dateJst" | "todayJst"
>;
export type RemoveRowInput = Pick<FunctionArgs<typeof api.mutations.rows.remove.remove>, "rowId">;
export type SetConditionInput = Pick<
  FunctionArgs<typeof api.mutations.days.setCondition.setCondition>,
  "condition"
>["condition"];
export type SetMemoInput = Pick<
  FunctionArgs<typeof api.mutations.days.setMemo.setMemo>,
  "memo"
>["memo"];
export type FlagReviewInput = Omit<
  FunctionArgs<typeof api.mutations.reviews.flag.flag>,
  "todayJst"
>;
