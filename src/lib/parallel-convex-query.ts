const CONVEX_QUERY_STALE_TIME = Number.POSITIVE_INFINITY;

export function parallelConvexQuery<TOptions extends Partial<Record<"staleTime", unknown>>>(
  options: TOptions,
): Omit<TOptions, "staleTime"> & Record<"staleTime", number> {
  return { ...options, staleTime: CONVEX_QUERY_STALE_TIME };
}
