import type { WebPushConfigDto } from "../../lib/validators";
import { WEB_PUSH_ENV } from "../../lib/webPush";

//? VAPID 公開鍵は秘匿しない。deployment の環境変数から配り、未設定なら null（UI が案内する）
export function webPushConfig(): WebPushConfigDto {
  const publicKey = process.env[WEB_PUSH_ENV.publicKey];
  return { publicKey: publicKey === undefined || publicKey === "" ? null : publicKey };
}
