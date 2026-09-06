import type { QueryCtx } from "../../_generated/server";
import { authComponent } from "../../auth";
import { UnauthenticatedError } from "../../lib/errors";
import { todayJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";

export async function serviceStartDate(ctx: QueryCtx, ownerId: string): Promise<string> {
  const user = await authComponent.getAnyUserById(ctx, ownerId);
  if (user === null) {
    throwDomain(new UnauthenticatedError({ message: "ログインしてください" }));
  }
  return todayJst(new Date(user.createdAt));
}
