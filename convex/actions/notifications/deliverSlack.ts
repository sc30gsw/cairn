import { Result } from "better-result";
import { v } from "convex/values";

import { internalAction } from "../../_generated/server";
import { SlackDeliveryError } from "../../lib/errors";
import { markSlackDeliveredRef, notificationDeliveryPayloadRef } from "../../lib/notificationRefs";

//* 押し出しの本体。読み1回・外部1回・書き1回(CVX-07 の推奨形そのまま)。
//? "use node" は不要 — fetch は Convex ランタイムで動く。リトライしない(遅れて届く価値が低い)。
export const deliverSlack = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const delivery = await ctx.runQuery(notificationDeliveryPayloadRef, args);
    //? 通知が消えた/Slack が解除された場合は静かに終わる。
    if (delivery === null) {
      return null;
    }
    //? 外部呼び出しは Result で包む(better-result: 期待される失敗は throw にしない)。
    const posted = await Result.tryPromise({
      catch: (cause) => new SlackDeliveryError({ cause, message: "Slack への送信に失敗しました" }),
      try: () =>
        fetch(delivery.webhookUrl, {
          body: JSON.stringify({ text: delivery.text }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
    });
    const error = Result.isError(posted)
      ? posted.error.message
      : posted.value.ok
        ? undefined
        : `Slack から ${String(posted.value.status)} が返りました`;
    await ctx.runMutation(markSlackDeliveredRef, {
      error,
      notificationId: args.notificationId,
    });
    return null;
  },
  returns: v.null(),
});
