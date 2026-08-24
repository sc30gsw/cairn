import * as v from "valibot";
import {
  EVENING_HOUR_MESSAGE,
  EVENING_HOUR_RANGE,
  QUIET_HOUR_MESSAGE,
  QUIET_HOUR_RANGE,
  SLACK_WEBHOOK_MESSAGE,
  SLACK_WEBHOOK_PATTERN,
} from "~domain/notifications";

//? 検証メッセージも正規表現もサーバと共有のドメイン定数を使う。ここで手書きしない(CVX-16)。
const HourJstSchema = v.pipe(
  v.number(QUIET_HOUR_MESSAGE),
  v.integer(QUIET_HOUR_MESSAGE),
  v.minValue(QUIET_HOUR_RANGE.min, QUIET_HOUR_MESSAGE),
  v.maxValue(QUIET_HOUR_RANGE.max, QUIET_HOUR_MESSAGE),
);

const EveningHourSchema = v.pipe(
  v.number(EVENING_HOUR_MESSAGE),
  v.integer(EVENING_HOUR_MESSAGE),
  v.minValue(EVENING_HOUR_RANGE.min, EVENING_HOUR_MESSAGE),
  v.maxValue(EVENING_HOUR_RANGE.max, EVENING_HOUR_MESSAGE),
);

//? 空欄は「既存の URL を保つ」。undefined に畳んで mutation の引数から落とす。
const SlackWebhookSchema = v.pipe(
  v.string(SLACK_WEBHOOK_MESSAGE),
  v.trim(),
  v.check((value) => value === "" || SLACK_WEBHOOK_PATTERN.test(value), SLACK_WEBHOOK_MESSAGE),
  v.transform((value) => (value === "" ? undefined : value)),
);

export const NotificationSettingsSchema = v.object({
  enabled: v.boolean(),
  eveningHourJst: EveningHourSchema,
  quietFromHourJst: HourJstSchema,
  quietToHourJst: HourJstSchema,
  slackEnabled: v.boolean(),
  slackWebhookUrl: SlackWebhookSchema,
  triggers: v.object({
    checkpointDeadline: v.boolean(),
    eveningUntouched: v.boolean(),
    weeklyTargetMiss: v.boolean(),
  }),
});

export type NotificationSettingsFormOutput = v.InferOutput<typeof NotificationSettingsSchema>;
