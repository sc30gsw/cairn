import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getDayByDate } from "../days/getDayByDate";

export type RowDayLiveness = "live" | "missing" | "trashed";

export async function rowDayLiveness(
  ctx: MutationCtx,
  ownerId: string,
  row: Pick<Doc<"rows">, "dateJst">,
): Promise<RowDayLiveness> {
  const day = await getDayByDate(ctx, ownerId, row.dateJst);
  if (day === null) {
    return "missing";
  }
  return day.deletedAt === undefined ? "live" : "trashed";
}
