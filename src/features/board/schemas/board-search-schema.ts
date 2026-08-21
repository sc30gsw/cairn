import * as v from "valibot";

const BoardTabSchema = v.picklist(["kanban", "schedule"]);

export const BoardSearchSchema = v.object({
  tab: v.optional(BoardTabSchema),
});

export type BoardSearch = v.InferOutput<typeof BoardSearchSchema>;
export type BoardTab = v.InferOutput<typeof BoardTabSchema>;

export const boardSearchDefaults = {
  tab: "kanban",
} as const satisfies BoardSearch;
