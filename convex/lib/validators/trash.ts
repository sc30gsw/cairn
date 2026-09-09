import { type Infer, v } from "convex/values";

import { statusValidator } from "./core";

export const trashedDayValidator = v.object({
  _id: v.id("days"),
  dateJst: v.string(),
  deletedAt: v.number(),
});

export type TrashedDay = Infer<typeof trashedDayValidator>;

export const trashedRowValidator = v.object({
  _id: v.id("rows"),
  content: v.string(),
  dateJst: v.string(),
  deletedAt: v.number(),
  dayId: v.id("days"),
  itemName: v.string(),
  minutes: v.number(),
  status: statusValidator,
});

export type TrashedRow = Infer<typeof trashedRowValidator>;

export const trashPageValidator = v.object({
  days: v.array(trashedDayValidator),
  rows: v.array(trashedRowValidator),
});

export type TrashPageDto = Infer<typeof trashPageValidator>;

export const restoreTrashResultValidator = v.object({
  failedDayIds: v.array(v.id("days")),
  failedRowIds: v.array(v.id("rows")),
  restoredDayIds: v.array(v.id("days")),
  restoredRowIds: v.array(v.id("rows")),
});

export type RestoreTrashResult = Infer<typeof restoreTrashResultValidator>;
