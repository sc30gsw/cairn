const SHIMMER_ID_PREFIX = "shimmer-";

export function shimmerId<T extends string>(name: string) {
  return `${SHIMMER_ID_PREFIX}${name}` as T;
}

export function isShimmerId(id: string) {
  return id.startsWith(SHIMMER_ID_PREFIX);
}
