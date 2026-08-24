import { Result } from "better-result";

import { MutationFailedError } from "~/lib/errors";
import { notifyError, notifySuccess } from "~/lib/notify";

type RunMutationOptions<T> = {
  errorMessage?: string;
  //? 返り値で文言が変わるものがある(カスケード削除の件数)。string はそのまま使える
  successMessage?: ((value: T) => string) | string;
};

export async function runMutation<T>(
  operation: () => Promise<T>,
  { errorMessage, successMessage }: RunMutationOptions<T> = {},
): Promise<void> {
  const result = await Result.tryPromise({
    catch: (cause) =>
      new MutationFailedError({ cause, message: errorMessage ?? "操作に失敗しました" }),
    try: operation,
  });

  if (Result.isError(result)) {
    notifyError(result.error.cause, result.error.message);
    return;
  }

  if (successMessage === undefined) {
    return;
  }

  const message =
    typeof successMessage === "string" ? successMessage : successMessage(result.value);
  if (message) {
    notifySuccess(message);
  }
}
