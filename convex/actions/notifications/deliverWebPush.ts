"use node";

import { Result } from "better-result";
import { v } from "convex/values";
import webPush from "web-push";

import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalAction } from "../../_generated/server";
import { readVapidKeys, webPushOutcome } from "../../lib/webPush";

function statusCodeOf(cause: unknown): number | undefined {
  if (typeof cause === "object" && cause !== null && "statusCode" in cause) {
    const { statusCode } = cause;
    return typeof statusCode === "number" ? statusCode : undefined;
  }
  return undefined;
}

//? 読み1回（webPushDelivery）→ 外部送信（購読ごと）→ 書き1回（失効した購読の削除）。CVX-05/06/07
export const deliverWebPush = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const delivery = await ctx.runQuery(
      internal.queries.notifications.webPushDelivery.webPushDelivery,
      args,
    );
    if (delivery === null) {
      return null;
    }
    const vapid = readVapidKeys(process.env);
    if (vapid === null) {
      return null;
    }
    const body = JSON.stringify(delivery.message);
    const outcomes = await Promise.all(
      delivery.subscriptions.map(async (subscription) => {
        const sent = await Result.tryPromise({
          catch: (cause) => statusCodeOf(cause),
          try: () =>
            webPush.sendNotification(
              { endpoint: subscription.endpoint, keys: subscription.keys },
              body,
              {
                TTL: 60 * 60 * 6,
                urgency: "normal",
                vapidDetails: {
                  privateKey: vapid.privateKey,
                  publicKey: vapid.publicKey,
                  subject: vapid.subject,
                },
              },
            ),
        });
        const outcome = Result.isOk(sent)
          ? webPushOutcome(sent.value.statusCode)
          : webPushOutcome(sent.error);
        return { outcome, subscriptionId: subscription._id };
      }),
    );
    const gone: Id<"pushSubscriptions">[] = [];
    for (const entry of outcomes) {
      if (entry.outcome === "gone") {
        gone.push(entry.subscriptionId);
      }
    }
    if (gone.length > 0) {
      await ctx.runMutation(
        internal.mutations.notifications.pruneWebPushSubscriptions.pruneWebPushSubscriptions,
        { subscriptionIds: gone },
      );
    }
    return null;
  },
  returns: v.null(),
});
