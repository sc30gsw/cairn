import { type Infer, v } from "convex/values";

export const methodLaneDtoValidator = v.object({
  _id: v.id("methodLanes"),
  name: v.string(),
  sortOrder: v.number(),
});

export type MethodLaneDto = Infer<typeof methodLaneDtoValidator>;

export const methodDtoValidator = v.object({
  _id: v.id("methods"),
  bodyText: v.string(),
  completionHtml: v.string(),
  laneId: v.id("methodLanes"),
  memoHtml: v.string(),
  name: v.string(),
  nowViewing: v.boolean(),
  sortOrder: v.number(),
});

export type MethodDto = Infer<typeof methodDtoValidator>;

export const methodCatalogValidator = v.object({
  lanes: v.array(methodLaneDtoValidator),
  methods: v.array(methodDtoValidator),
});

export type MethodCatalogDto = Infer<typeof methodCatalogValidator>;

export const laneMethodOrderValidator = v.object({
  laneId: v.id("methodLanes"),
  orderedMethodIds: v.array(v.id("methods")),
});

export type LaneMethodOrder = Infer<typeof laneMethodOrderValidator>;

export const applyMethodOrderArgsValidator = v.object({
  updates: v.array(laneMethodOrderValidator),
});

export type ApplyMethodOrderInput = Infer<typeof applyMethodOrderArgsValidator>;
