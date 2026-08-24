import type { FunctionArgs } from "convex/server";
import type { saveNotificationSettingsRef } from "~domain/notificationRefs";

//? 送信ペイロードの型は関数参照から導出する。手書きしない(CVX-16)。
export type SaveNotificationSettingsInput = FunctionArgs<typeof saveNotificationSettingsRef>;
