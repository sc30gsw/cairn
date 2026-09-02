import type { FunctionArgs, FunctionReturnType } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type SubscribePushInput = FunctionArgs<
  typeof api.mutations.notifications.subscribePush.subscribePush
>;
export type PushSubscriptionSummary = FunctionReturnType<
  typeof api.queries.notifications.pushSubscriptions.pushSubscriptions
>[number];
export type WebPushConfig = FunctionReturnType<
  typeof api.queries.notifications.webPushConfig.webPushConfig
>;
