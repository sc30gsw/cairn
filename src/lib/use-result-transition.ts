import { Result } from "better-result";
import { useEffect, useEffectEvent, useState, useTransition } from "react";

type ResultAction<T, E> = () => Promise<Result<T, E>>;

export function useResultTransition<T, E>(options?: { initialAction?: ResultAction<T, E> }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<null | Result<T, E>>(null);
  const initialAction = options?.initialAction;

  const runInitialAction = useEffectEvent(() => {
    if (initialAction !== undefined) {
      void run(initialAction);
    }
  });

  useEffect(() => {
    runInitialAction();
  }, []);

  function clear() {
    setResult(null);
  }

  function run(action: ResultAction<T, E>): Promise<Result<T, E>> {
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
    isError: result !== null && Result.isError(result),
    isPending,
    isSuccess: result !== null && Result.isOk(result),
    result,
    run,
  };
}
