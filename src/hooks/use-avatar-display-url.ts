import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { isExternalAvatarUrl, parseAvatarStorageRef } from "~/lib/avatar-image";
import { useOptionalAvatarDisplayUrlLiveQuery } from "~/lib/tanstack-db/collections";

export function useAvatarDisplayUrl(image: null | string | undefined): string | undefined {
  const storageId = parseAvatarStorageRef(image);
  const live = useOptionalAvatarDisplayUrlLiveQuery(storageId);
  const { data } = useQuery(
    convexQuery(
      api.queries.profile.getAvatarUrl.getAvatarUrl,
      storageId !== null ? { storageId } : "skip",
    ),
  );

  if (isExternalAvatarUrl(image)) {
    return image;
  }

  return (live.isReady && live.data !== undefined ? live.data : data) ?? undefined;
}
