import * as v from "valibot";
import {
  TARGET_DAYS_MESSAGE,
  TARGET_METRICS,
  TARGET_VALUE_LIMITS,
  TARGET_VALUE_MESSAGE,
} from "~domain/domain";

const TARGET_METRIC_MESSAGE = "計測方法を選んでください";

export const TargetSchema = v.pipe(
  v.object({
    metric: v.picklist(TARGET_METRICS, TARGET_METRIC_MESSAGE),
    targetValue: v.pipe(
      v.number(TARGET_VALUE_MESSAGE),
      v.integer(TARGET_VALUE_MESSAGE),
      v.minValue(TARGET_VALUE_LIMITS.min, TARGET_VALUE_MESSAGE),
    ),
  }),
  v.forward(
    v.partialCheck(
      [["metric"], ["targetValue"]],
      (input) => input.metric !== "days" || input.targetValue <= TARGET_VALUE_LIMITS.maxDays,
      TARGET_DAYS_MESSAGE,
    ),
    ["targetValue"],
  ),
);
