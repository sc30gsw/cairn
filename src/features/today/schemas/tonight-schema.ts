import * as v from "valibot";

export const TonightSchema = v.object({
  bedHm: v.pipe(v.string(), v.minLength(1, "今夜の就寝を入れてください")),
});

export const WakeSchema = v.object({
  wakeHm: v.pipe(v.string(), v.minLength(1, "起床を入れてください")),
});
