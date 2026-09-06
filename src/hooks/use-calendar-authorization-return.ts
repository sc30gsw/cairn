import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";

import type { api } from "~/../convex/_generated/api";
import { useBusy } from "~/hooks/use-busy";
import { useConnectCalendarSync } from "~/hooks/use-calendar-sync";
import {
  clearCalendarSyncConnectPending,
  readCalendarSyncConnectPending,
  readCalendarSyncReturnError,
} from "~/lib/calendar-sync-actions";
import { notifyError } from "~/lib/notify";
import { runMutation } from "~/lib/run-mutation";

type Connect = ReturnType<typeof useConnectCalendarSync>;
type RequestId = NonNullable<ReturnType<typeof readCalendarSyncConnectPending>>;

function connectedMessage(
  outcome: FunctionReturnType<typeof api.actions.calendarSync.connect.connect>,
): string {
  if (outcome === "busy") return "";
  if (outcome === "notConnected") return "接続を完了できませんでした。もう一度連携してください";
  if (outcome === "moving") return "連携しました。Cairn の予定を新しい保存先へ移動しています";
  return outcome === "ok"
    ? "Google カレンダーと連携しました"
    : "連携しましたが、最初の同期に失敗しました。接続状態を確認してください";
}

async function finishConnection(connect: Connect, requestId: RequestId) {
  const result = await runMutation(() => connect({ requestId }), {
    errorMessage: "Google カレンダーの接続を完了できませんでした。もう一度連携してください",
    successMessage: connectedMessage,
  });
  if (Result.isOk(result) && result.value === "busy") return true;
  clearCalendarSyncConnectPending(requestId);
  return false;
}

export function useCalendarAuthorizationReturn() {
  const connect = useConnectCalendarSync();
  const [canRetry, setCanRetry] = useState(false);
  const started = useRef(false);
  const { busy, setBusy, withBusy } = useBusy(
    () => readCalendarSyncConnectPending() !== null && readCalendarSyncReturnError() === null,
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const requestId = readCalendarSyncConnectPending();
    if (requestId === null) return;
    const returnError = readCalendarSyncReturnError();
    if (returnError !== null) {
      clearCalendarSyncConnectPending(requestId);
      notifyError(
        new Error(returnError),
        "Google カレンダーの接続を完了できませんでした。もう一度接続してください。",
      );
      return;
    }
    void finishConnection(connect, requestId).then((retryable) => {
      setCanRetry(retryable);
      setBusy(false);
    });
  }, [connect, setBusy]);

  function retry() {
    const requestId = readCalendarSyncConnectPending();
    if (requestId === null) return;
    return withBusy(
      async () => setCanRetry(await finishConnection(connect, requestId)),
      notifyError,
    );
  }

  return { busy, canRetry, retry };
}
