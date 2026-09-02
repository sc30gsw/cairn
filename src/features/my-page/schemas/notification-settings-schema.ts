import * as v from "valibot";
import {
  EVENING_HOUR_MESSAGE,
  EVENING_HOUR_RANGE,
  QUIET_HOUR_MESSAGE,
  QUIET_HOUR_RANGE,
} from "~domain/notifications";

const EveningHourSchema = v.pipe(
  v.number(EVENING_HOUR_MESSAGE),
  v.integer(EVENING_HOUR_MESSAGE),
  v.minValue(EVENING_HOUR_RANGE.min, EVENING_HOUR_MESSAGE),
  v.maxValue(EVENING_HOUR_RANGE.max, EVENING_HOUR_MESSAGE),
);

const QuietHourSchema = v.pipe(
  v.number(QUIET_HOUR_MESSAGE),
  v.integer(QUIET_HOUR_MESSAGE),
  v.minValue(QUIET_HOUR_RANGE.min, QUIET_HOUR_MESSAGE),
  v.maxValue(QUIET_HOUR_RANGE.max, QUIET_HOUR_MESSAGE),
);

export const NotificationSettingsSchema = v.object({
  enabled: v.boolean(),
  eveningHourJst: EveningHourSchema,
  quietFromHourJst: QuietHourSchema,
  quietToHourJst: QuietHourSchema,
  triggers: v.object({
    checkpointDeadline: v.boolean(),
    eveningUntouched: v.boolean(),
    weeklyTargetMiss: v.boolean(),
  }),
});

export type NotificationSettingsFormOutput = v.InferOutput<typeof NotificationSettingsSchema>;
