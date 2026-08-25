import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

//? 送信ペイロードの型は関数参照から導出する。手書きしない(CVX-16)。
export type SaveNotificationSettingsInput = FunctionArgs<
  typeof api.mutations.notifications.saveSettings.saveSettings
>;
