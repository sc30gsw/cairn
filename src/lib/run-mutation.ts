import { notifications } from "@mantine/notifications";
import { Result } from "better-result";

import { MutationFailedError } from "~/lib/errors";
import { notifyError, notifySuccess } from "~/lib/notify";

type RunMutationOptions<T> = {
  errorMessage?: string;
  silent?: boolean;
  successMessage?: ((value: T) => string) | string;
};

const UNSAVED_WARNING_MS = 5_000;
const UNSAVED_NOTIFICATION_ID = "run-mutation-unsaved";
const pending = new Set<symbol>();

export async function runMutation<T>(
  operation: () => Promise<T>,
  { errorMessage, silent = false, successMessage }: RunMutationOptions<T> = {},
): Promise<void> {
  if (silent) {
    const result = await Result.tryPromise({
      catch: (cause) =>
        new MutationFailedError({ cause, message: errorMessage ?? "操作に失敗しました" }),
      try: operation,
    });
    if (Result.isOk(result) && successMessage !== undefined) {
      const message =
        typeof successMessage === "string" ? successMessage : successMessage(result.value);
      if (message) {
        notifySuccess(message);
      }
    }
    return;
  }

  const token = Symbol("run-mutation");
  pending.add(token);
  const timer = setTimeout(() => {
    notifications.show({
      autoClose: false,
      color: "yellow",
      id: UNSAVED_NOTIFICATION_ID,
      message: "まだ保存されていません。アプリを閉じると失われます。",
      title: "送信中",
    });
  }, UNSAVED_WARNING_MS);

  const result = await Result.tryPromise({
    catch: (cause) =>
      new MutationFailedError({ cause, message: errorMessage ?? "操作に失敗しました" }),
    try: operation,
  });

  clearTimeout(timer);
  pending.delete(token);
  if (pending.size === 0) {
    notifications.hide(UNSAVED_NOTIFICATION_ID);
  }

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
