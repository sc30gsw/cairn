import { Shimmer } from "@shimmer-from-structure/react";
import { Result } from "better-result";

import { TrashList } from "~/features/trash/components/trash-list";
import { trashShimmerPage } from "~/features/trash/lib/trash-shimmer-template";
import { shimmerNoop } from "~/lib/shimmer-noop";

export function TrashPending() {
  return (
    <Shimmer loading>
      <TrashList
        onPurgeDay={shimmerNoop}
        onPurgeMany={async () => Result.ok(null)}
        onPurgeRow={shimmerNoop}
        onRestoreDay={shimmerNoop}
        onRestoreMany={async () => null}
        onRestoreRow={shimmerNoop}
        trash={trashShimmerPage}
      />
    </Shimmer>
  );
}
