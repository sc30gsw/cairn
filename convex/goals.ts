import { v } from "convex/values";

import { DEFAULT_EXAM_GOAL } from "./lib/catalog";
import { NotFoundError, ValidationFailedError } from "./lib/errors";
import { daysUntil } from "./lib/jst";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

export const getExam = ownerQuery({
  args: { todayJst: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db
      .query("examGoals")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
      .unique();
    const examDate = goal?.examDate ?? DEFAULT_EXAM_GOAL.examDate;
    const maxScore = goal?.maxScore ?? DEFAULT_EXAM_GOAL.maxScore;
    const minScore = goal?.minScore ?? DEFAULT_EXAM_GOAL.minScore;
    return {
      daysRemaining: daysUntil(args.todayJst, examDate),
      examDate,
      maxScore,
      minScore,
    };
  },
  returns: v.object({
    daysRemaining: v.number(),
    examDate: v.string(),
    maxScore: v.number(),
    minScore: v.number(),
  }),
});

export const saveExam = ownerMutation({
  args: { examDate: v.string(), maxScore: v.number(), minScore: v.number() },
  handler: async (ctx, args) => {
    if (args.minScore > args.maxScore) {
      throwDomain(new ValidationFailedError({ message: "目標点の下限が上限を超えています" }));
    }
    const existing = await ctx.db
      .query("examGoals")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
      .unique();
    if (existing === null) {
      await ctx.db.insert("examGoals", {
        examDate: args.examDate,
        maxScore: args.maxScore,
        minScore: args.minScore,
        ownerId: ctx.ownerId,
      });
    } else {
      await ctx.db.patch(existing._id, {
        examDate: args.examDate,
        maxScore: args.maxScore,
        minScore: args.minScore,
      });
    }
    return null;
  },
  returns: v.null(),
});

export const saveWeekly = ownerMutation({
  args: { minutes: v.number(), weekStartJst: v.string() },
  handler: async (ctx, args) => {
    if (args.minutes < 0) {
      throwDomain(new ValidationFailedError({ message: "週間ゴールは0分以上です" }));
    }
    const existing = await ctx.db
      .query("weeklyGoals")
      .withIndex("by_owner_and_week", (q) =>
        q.eq("ownerId", ctx.ownerId).eq("weekStartJst", args.weekStartJst),
      )
      .unique();
    if (existing === null) {
      await ctx.db.insert("weeklyGoals", {
        minutes: args.minutes,
        ownerId: ctx.ownerId,
        weekStartJst: args.weekStartJst,
      });
    } else {
      await ctx.db.patch(existing._id, { minutes: args.minutes });
    }
    return null;
  },
  returns: v.null(),
});

export const listObstacles = ownerQuery({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db
      .query("obstaclePlans")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
      .collect();
    return plans.map((plan) => ({
      _id: plan._id,
      ifText: plan.ifText,
      thenText: plan.thenText,
    }));
  },
  returns: v.array(
    v.object({
      _id: v.id("obstaclePlans"),
      ifText: v.string(),
      thenText: v.string(),
    }),
  ),
});

export const createObstacle = ownerMutation({
  args: { ifText: v.string(), thenText: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("obstaclePlans", {
      ifText: args.ifText,
      ownerId: ctx.ownerId,
      thenText: args.thenText,
    });
  },
  returns: v.id("obstaclePlans"),
});

export const updateObstacle = ownerMutation({
  args: { ifText: v.string(), planId: v.id("obstaclePlans"), thenText: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (plan === null || plan.ownerId !== ctx.ownerId) {
      throwDomain(
        new NotFoundError({ message: "障害プランが見つかりません", resource: "障害プラン" }),
      );
    }
    await ctx.db.patch(args.planId, { ifText: args.ifText, thenText: args.thenText });
    return null;
  },
  returns: v.null(),
});

export const removeObstacle = ownerMutation({
  args: { planId: v.id("obstaclePlans") },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (plan === null || plan.ownerId !== ctx.ownerId) {
      throwDomain(
        new NotFoundError({ message: "障害プランが見つかりません", resource: "障害プラン" }),
      );
    }
    await ctx.db.delete(args.planId);
    return null;
  },
  returns: v.null(),
});
