import { notifications } from "@mantine/notifications";
import { Result } from "better-result";

import { MutationFailedError } from "~/lib/errors";
import { notifyError, notifySuccess } from "~/lib/notify";

type RunMutationOptions<T> = {
  errorMessage?: string;
  //? 返り値で文言が変わるものがある(カスケード削除の件数)。string はそのまま使える
  successMessage?: ((value: T) => string) | string;
};

const UNSAVED_WARNING_MS = 5_000;
const UNSAVED_NOTIFICATION_ID = "run-mutation-unsaved";
//* 同時に複数の mutation が詰まっても通知は1枚、かつ「最後の1本が解決するまで消えない」。
//? id 固定だけで参照カウントを持たないと、先に解決した mutation が未解決分の警告を消してしまう。
const pending = new Set<symbol>();

export async function runMutation<T>(
  operation: () => Promise<T>,
  { errorMessage, successMessage }: RunMutationOptions<T> = {},
): Promise<void> {
  //? navigator.onLine は嘘をつく(LAN 接続だが到達不能)。だから「5秒未解決」という観測事実だけを条件にする。
  //? 送信自体は止めない — Convex は切断中の mutation をキューして再接続時に送る(pwa-mobile.md §9.2)。
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
