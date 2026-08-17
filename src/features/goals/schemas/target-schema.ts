import * as v from "valibot";
import {
  TARGET_DAYS_MESSAGE,
  TARGET_METRICS,
  TARGET_VALUE_LIMITS,
  TARGET_VALUE_MESSAGE,
} from "~domain/domain";

//? 検証メッセージはサーバと共有のドメイン定数を使う。文言も数値もここで手書きしない(CVX-16)。
const TARGET_METRIC_MESSAGE = "計測方法を選んでください";

//* 週間ターゲットの1件。カテゴリは Select 側が持つので、フォームは計器と目標値だけを扱う。
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
      //? 1週は7日しかないので、実施日の目標がそれを超えると原理的に達成できない
      (input) => input.metric !== "days" || input.targetValue <= TARGET_VALUE_LIMITS.maxDays,
      TARGET_DAYS_MESSAGE,
    ),
    ["targetValue"],
  ),
);

export type TargetFormOutput = v.InferOutput<typeof TargetSchema>;
