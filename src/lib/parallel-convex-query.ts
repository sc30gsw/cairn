/**
 * `useSuspenseQueries` に `convexQuery(...)` の戻り値をそのまま並べると型が合わない。
 *
 * `convexQuery` は `TError = Error` 固定のオプションを返すのに対し、`useSuspenseQueries` は
 * 各要素の `throwOnError` から `TError` を推論する。`convexQuery` の戻り値に `throwOnError` は
 * 無いため `TError` が `unknown` に落ち、`staleTime`(`StaleTimeFunction<..., TError, ...>` を含む
 * union)の反変位置で `Error` と `unknown` が衝突して overload 解決に失敗する。
 *
 * `staleTime` をプリミティブな `number` として明示すると union のうち関数型が消え、衝突しなくなる。
 * 値は `convexQuery` 自身の既定値(`Infinity`: Convex は購読で push 更新するため stale にならない)
 * と一致させる — ここが唯一の再宣言箇所なので、既定値が変わったらこの定数だけを直せばよい。
 *
 * 単発の読み取りは従来どおり `useSuspenseQuery(convexQuery(...))` を直接使う(この関数は不要)。
 */
const CONVEX_QUERY_STALE_TIME = Number.POSITIVE_INFINITY;

export function parallelConvexQuery<TOptions extends Partial<Record<"staleTime", unknown>>>(
  options: TOptions,
): Omit<TOptions, "staleTime"> & Record<"staleTime", number> {
  return { ...options, staleTime: CONVEX_QUERY_STALE_TIME };
}
