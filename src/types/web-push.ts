import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type SubscribePushInput = FunctionArgs<
  typeof api.mutations.notifications.subscribePush.subscribePush
>;
