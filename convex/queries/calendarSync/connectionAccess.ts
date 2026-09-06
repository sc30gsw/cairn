import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { getConnection } from "../../services/calendarSync/getConnection";

//? 送信アクションがトークンを取るための最小の読み: 接続している Google アカウント ID だけ
export const connectionAccess = internalQuery({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const connection = await getConnection(ctx, args.ownerId);
    return connection === null ? null : { googleAccountId: connection.googleAccountId };
  },
  returns: v.union(v.null(), v.object({ googleAccountId: v.string() })),
});
