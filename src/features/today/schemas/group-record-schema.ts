import * as v from "valibot";

export const GroupRecordContentSchema = v.object({
  content: v.pipe(v.string(), v.trim()),
});
