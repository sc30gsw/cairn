import type { FunctionReturnType } from "convex/server";

import { api } from "~/../convex/_generated/api";

type Goal = FunctionReturnType<typeof api.queries.goals.list.list>[number];

export type ExamGoal = Extract<Goal, { type: "exam" }>;
