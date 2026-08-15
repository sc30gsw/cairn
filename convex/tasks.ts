import { query } from "./_generated/server";
import { v } from "convex/values";

//* クイックスタート用の tasks 一覧。認証は後続チケット。
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("tasks"),
      isCompleted: v.boolean(),
      text: v.string(),
    }),
  ),
});
