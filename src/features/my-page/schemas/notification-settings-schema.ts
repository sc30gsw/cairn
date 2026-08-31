import * as v from "valibot";
import { EVENING_HOUR_MESSAGE, EVENING_HOUR_RANGE } from "~domain/notifications";

const EveningHourSchema = v.pipe(
  v.number(EVENING_HOUR_MESSAGE),
  v.integer(EVENING_HOUR_MESSAGE),
  v.minValue(EVENING_HOUR_RANGE.min, EVENING_HOUR_MESSAGE),
  v.maxValue(EVENING_HOUR_RANGE.max, EVENING_HOUR_MESSAGE),
);

export const NotificationSettingsSchema = v.object({
  enabled: v.boolean(),
  eveningHourJst: EveningHourSchema,
  triggers: v.object({
    checkpointDeadline: v.boolean(),
    eveningUntouched: v.boolean(),
    weeklyTargetMiss: v.boolean(),
  }),
});

export type NotificationSettingsFormOutput = v.InferOutput<typeof NotificationSettingsSchema>;
