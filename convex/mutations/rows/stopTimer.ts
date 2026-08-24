import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { stopTimer as stopRowTimer } from "../../services/rows/stopTimer";

export const stopTimer = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => stopRowTimer(ctx, ctx.ownerId, args),
  //? 確定モーダルのプレフィルに使うので、加算後の値を返す(クライアント時計を使わせない)。
  returns: v.number(),
});
