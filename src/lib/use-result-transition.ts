import { Result } from "better-result";
import { useState, useTransition } from "react";

export function useResultTransition<T, E>() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<null | Result<T, E>>(null);

  function clear() {
    setResult(null);
  }

  function run(action: () => Promise<Result<T, E>>): Promise<Result<T, E>> {
    setResult(null);
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        //? action() が(規約違反で)例外を投げても run() の Promise は必ず settle させる
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
    isError: result !== null && Result.isError(result),
    isPending,
    isSuccess: result !== null && Result.isOk(result),
    result,
    run,
  };
}
