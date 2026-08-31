import type { FunctionArgs } from "convex/server";

import type { api } from "~/../convex/_generated/api";

export type CreateLaneInput = FunctionArgs<typeof api.mutations.methods.createLane.createLane>;
export type RenameLaneInput = FunctionArgs<typeof api.mutations.methods.renameLane.renameLane>;
export type RemoveLaneInput = FunctionArgs<typeof api.mutations.methods.removeLane.removeLane>;
export type CreateMethodInput = FunctionArgs<
  typeof api.mutations.methods.createMethod.createMethod
>;
export type UpdateMethodInput = FunctionArgs<
  typeof api.mutations.methods.updateMethod.updateMethod
>;
export type RemoveMethodInput = FunctionArgs<
  typeof api.mutations.methods.removeMethod.removeMethod
>;
export type SetNowViewingInput = FunctionArgs<
  typeof api.mutations.methods.setNowViewing.setNowViewing
>;
export type ApplyMethodOrderInput = FunctionArgs<
  typeof api.mutations.methods.applyMethodOrder.applyMethodOrder
>;
