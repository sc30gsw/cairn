import { Result } from "better-result";
import { useState, useTransition } from "react";

import type { AuthActionResult } from "~/lib/auth-action-result";
import { authActionErrorMessage } from "~/lib/auth-action-result";

export function useAuthActionTransition() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult | null>(null);

  function clear() {
    setResult(null);
  }

  function run(action: () => Promise<AuthActionResult>): Promise<AuthActionResult> {
    setResult(null);
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          const next = await action();
          setResult(next);
          resolve(next);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  return {
    clear,
    errorMessage: result === null ? null : authActionErrorMessage(result),
    isPending,
    isSuccess: result !== null && Result.isOk(result),
    result,
    run,
  };
}
