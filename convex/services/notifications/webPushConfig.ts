import type { WebPushConfigDto } from "../../lib/validators";
import { WEB_PUSH_ENV } from "../../lib/webPush";

export function webPushConfig(): WebPushConfigDto {
  const publicKey = process.env[WEB_PUSH_ENV.publicKey];
  return { publicKey: publicKey === undefined || publicKey === "" ? null : publicKey };
}
