import { useState } from "react";

// React Compiler は finally 節つきの try を扱えず（BuildHIR::lowerStatement の TODO）、含むコンポーネント全体の最適化を諦める。
// そのため busy の解除は finally ではなく try/catch の後ろに置く。
export function useBusy(initialBusy: boolean | (() => boolean) = false) {
  const [busy, setBusy] = useState(initialBusy);

  async function withBusy(
    operation: () => Promise<unknown>,
    onError: (error: unknown) => void,
  ): Promise<void> {
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      onError(error);
    }
    setBusy(false);
  }

  return { busy, setBusy, withBusy };
}
