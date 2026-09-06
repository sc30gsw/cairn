import * as v from "valibot";

export const CalendarOutputSchema = v.object({
  destination: v.pipe(v.string(), v.nonEmpty("保存先のカレンダーを選んでください")),
});
