import { Migrations } from "@convex-dev/migrations";
import type { ComponentApi } from "@convex-dev/migrations/_generated/component.js";
import { componentsGeneric } from "convex/server";

import type { DataModel } from "./_generated/dataModel";
import schema from "./schema";
import { getConnection } from "./services/calendarSync/getConnection";
import { migrateConnections } from "./services/calendarSync/migrateConnections";
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

export const backfillCalendarConnections = migrations.define({
  table: "calendarConnections",
  migrateOne: async (ctx, connection) => {
    await migrateConnections(ctx, connection.ownerId);
  },
});

export const backfillCalendarLinks = migrations.define({
  table: "calendarSyncLinks",
  migrateOne: async (ctx, row) => {
    if (row.connectionId !== undefined) return;
    await migrateConnections(ctx, row.ownerId);
    const connection = await getConnection(ctx, row.ownerId);
    return connection === null ? undefined : { connectionId: connection._id };
  },
});

export const backfillCalendarCursors = migrations.define({
  table: "calendarSyncCursors",
  migrateOne: async (ctx, row) => {
    if (row.connectionId !== undefined) return;
    await migrateConnections(ctx, row.ownerId);
    const connection = await getConnection(ctx, row.ownerId);
    return connection === null ? undefined : { connectionId: connection._id };
  },
});

export const backfillCalendarEvents = migrations.define({
  table: "externalCalendarEvents",
  migrateOne: async (ctx, row) => {
    if (row.connectionId !== undefined) return;
    await migrateConnections(ctx, row.ownerId);
    const connection = await getConnection(ctx, row.ownerId);
    return connection === null ? undefined : { connectionId: connection._id };
  },
});

export const backfillCalendarChanges = migrations.define({
  table: "calendarExternalChanges",
  migrateOne: async (ctx, row) => {
    if (row.connectionId !== undefined) return;
    await migrateConnections(ctx, row.ownerId);
    const connection = await getConnection(ctx, row.ownerId);
    return connection === null ? undefined : { connectionId: connection._id };
  },
});

export const backfillCalendarOperations = migrations.define({
  table: "calendarSyncOperations",
  migrateOne: async (ctx, row) => {
    if (row.connectionId !== undefined) return;
    await migrateConnections(ctx, row.ownerId);
    const connection = await getConnection(ctx, row.ownerId);
    return connection === null ? undefined : { connectionId: connection._id };
  },
});
