import { Shimmer } from "@shimmer-from-structure/react";

import { TrashList } from "~/features/trash/components/trash-list";
import { trashShimmerPage } from "~/features/trash/lib/trash-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function TrashPending() {
  return (
    <Shimmer loading>
      <TrashList
        onPurgeDay={shimmerNoop}
        onPurgeRow={shimmerNoop}
        onRestoreDay={shimmerNoop}
        onRestoreRow={shimmerNoop}
        trash={trashShimmerPage}
      />
    </Shimmer>
  );
}
