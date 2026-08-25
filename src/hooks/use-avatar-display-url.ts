import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { isExternalAvatarUrl, parseAvatarStorageRef } from "~/lib/avatar-image";

//? convex/react の useQuery は render 中にクエリのエラーを rethrow するため、アバター取得の
//? 失敗がアプリシェルのアカウントメニューをルートのエラー境界まで巻き込んでいた。TanStack Query
//? の通常の useQuery(useSuspenseQuery ではない)は例外を投げず data が undefined のまま留まるので、
//? 失敗時も既定のイニシャル文字フォールバックへ静かに落ちる
export function useAvatarDisplayUrl(image: null | string | undefined): string | undefined {
  const storageId = parseAvatarStorageRef(image);
  const { data } = useQuery(
    convexQuery(
      api.queries.profile.getAvatarUrl.getAvatarUrl,
      storageId !== null ? { storageId } : "skip",
    ),
  );

  if (isExternalAvatarUrl(image)) {
    return image;
  }

  //? data は読み込み中(undefined)とアバター未登録/ストレージ削除済み(null)のどちらもあり得る。
  //? どちらも既存の undefined フォールバック経路と同じ扱いにする
  return data ?? undefined;
}
