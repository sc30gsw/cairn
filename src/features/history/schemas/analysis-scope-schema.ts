import * as v from "valibot";

export const AnalysisScopeSchema = v.picklist(["day", "month", "week"]);

export type AnalysisScope = v.InferOutput<typeof AnalysisScopeSchema>;
