export const convexModules = import.meta.glob([
  "../../convex/_generated/**/*.ts",
  "../../convex/actions/**/*.ts",
  "../../convex/lib/**/!(*.test).ts",
  "../../convex/mutations/**/*.ts",
  "../../convex/queries/**/*.ts",
  "../../convex/services/**/!(*.test).ts",
]);
