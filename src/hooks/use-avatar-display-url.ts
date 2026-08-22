import { useQuery } from "convex/react";

import { api } from "~/../convex/_generated/api";
import { isExternalAvatarUrl, parseAvatarStorageRef } from "~/lib/avatar-image";

export function useAvatarDisplayUrl(image: null | string | undefined): string | undefined {
  const storageId = parseAvatarStorageRef(image);
  const resolvedUrl = useQuery(
    api.queries.profile.getAvatarUrl.getAvatarUrl,
    storageId !== null ? { storageId } : "skip",
  );

  if (isExternalAvatarUrl(image)) {
    return image;
  }

  return resolvedUrl ?? undefined;
}
