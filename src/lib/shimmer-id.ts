const SHIMMER_ID_PREFIX = "shimmer-";

//? shimmer テンプレートの疑似 id。Convex の v.id() は通らないので、これを渡す先ではサーバー問い合わせを行わない
export function shimmerId<T extends string>(name: string) {
  return `${SHIMMER_ID_PREFIX}${name}` as T;
}

export function isShimmerId(id: string) {
  return id.startsWith(SHIMMER_ID_PREFIX);
}
