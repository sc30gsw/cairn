import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type SaveNotificationSettingsInput = FunctionArgs<
  typeof api.mutations.notifications.saveSettings.saveSettings
>;
