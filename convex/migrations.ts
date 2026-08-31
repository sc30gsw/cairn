import { Migrations } from "@convex-dev/migrations";
import type { ComponentApi } from "@convex-dev/migrations/_generated/component.js";
import { componentsGeneric } from "convex/server";

import type { DataModel } from "./_generated/dataModel";
import schema from "./schema";
import { backfillCheckpointParents as backfillForOwner } from "./services/goals/backfillCheckpointParents";

const migrationsComponent: ComponentApi = componentsGeneric().migrations as unknown as ComponentApi;

export const migrations = new Migrations<DataModel, typeof schema>(migrationsComponent, {
  schema,
});

export const run = migrations.runner();

export const backfillCheckpointParents = migrations.define({
  migrateOne: async (ctx, goal) => {
    if (goal.type !== "mastery") {
      return;
    }
    if (goal.deadline === undefined) {
      return;
    }
    if (goal.parentGoalId !== undefined) {
      return;
    }
    await backfillForOwner(ctx, goal.ownerId);
  },
  table: "goals",
});

export const revertCheckpointParents = migrations.define({
  migrateOne: (_ctx, goal) =>
    goal.type === "mastery" && goal.parentGoalId !== undefined
      ? { parentGoalId: undefined }
      : undefined,
  table: "goals",
});
