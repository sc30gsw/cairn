import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type ConfirmRowInput = FunctionArgs<typeof api.rows.confirm>;
export type SkipRowInput = FunctionArgs<typeof api.rows.skip>;
export type AddRowInput = Omit<FunctionArgs<typeof api.rows.add>, "dateJst" | "todayJst">;
export type RemoveRowInput = Pick<FunctionArgs<typeof api.rows.remove>, "rowId">;
export type SwitchPresetInput = Omit<
  FunctionArgs<typeof api.rows.switchPreset>,
  "dateJst" | "todayJst"
>;
export type SetConditionInput = Pick<
  FunctionArgs<typeof api.days.setCondition>,
  "condition"
>["condition"];
export type SetMemoInput = Pick<FunctionArgs<typeof api.days.setMemo>, "memo">["memo"];
export type RemoveDayInput = Pick<FunctionArgs<typeof api.trash.removeDay>, "dateJst">;
