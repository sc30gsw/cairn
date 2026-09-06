"use node";

import { ownerAction } from "../../lib/ownerFunctions";
import { ownerSyncOutcomeValidator } from "../../lib/validators";
import { connect as connectCalendar } from "../../services/calendarSync/connect";

//? マイページ「Google カレンダーと連携」。戻り値は最初の同期の結果（ok 以外なら UI が状態を出す）
export const connect = ownerAction({
  args: {},
  handler: async (ctx) => connectCalendar(ctx, ctx.ownerId),
  returns: ownerSyncOutcomeValidator,
});
