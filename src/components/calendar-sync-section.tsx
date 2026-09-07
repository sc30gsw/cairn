import { Button, Divider, Group, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { Result } from "better-result";

import { CalendarConnectionCard } from "~/components/calendar-connection-card";
import { CalendarOutputForm } from "~/components/calendar-output-form";
import { GoogleIcon } from "~/components/google-icon";
import { GoogleLabel } from "~/components/google-label";
import { useBusy } from "~/hooks/use-busy";
import { useCalendarAuthorizationReturn } from "~/hooks/use-calendar-authorization-return";
import {
  useBeginCalendarAuthorization,
  useCalendarSyncStatus,
  useDisconnectCalendarSync,
  useRetryCalendarOutput,
  useSetCalendarOutput,
  useSetVisibleCalendars,
  useSyncCalendarNow,
} from "~/hooks/use-calendar-sync";
import { linkGoogleCalendar } from "~/lib/calendar-sync-actions";
import {
  CALENDAR_SYNC_CONNECT_LABEL,
  CALENDAR_SYNC_DISCONNECT_LABEL,
} from "~/lib/calendar-sync-labels";
import type { CalendarConnection, CalendarOutput } from "~/lib/calendar-sync-types";
import { notifyError } from "~/lib/notify";
import { runMutation } from "~/lib/run-mutation";

export function CalendarSyncSection() {
  const { data: status } = useCalendarSyncStatus();
  const begin = useBeginCalendarAuthorization();
  const authorization = useCalendarAuthorizationReturn();
  const disconnect = useDisconnectCalendarSync();
  const syncNow = useSyncCalendarNow();
  const setVisible = useSetVisibleCalendars();
  const setOutput = useSetCalendarOutput();
  const retryOutput = useRetryCalendarOutput();
  const { busy: actionBusy, withBusy } = useBusy();
  const busy = actionBusy || authorization.busy;

  function startLink(input: Parameters<typeof begin>[0]) {
    return withBusy(async () => {
      const request = await runMutation(() => begin(input));
      if (Result.isError(request)) return;
      const result = await linkGoogleCalendar(request.value);
      if (Result.isError(result)) notifyError(result.error, result.error.message);
    }, notifyError);
  }

  function requestDisconnect(connection: CalendarConnection) {
    const isOutput = status.output?.connectionId === connection.connectionId;
    modals.openConfirmModal({
      children: isOutput
        ? "このアカウントのカレンダーに Cairn が作った予定を削除し、保存先の設定を解除します。Cairn の記録・学習予定と、Google で作られた予定は残ります。"
        : "このアカウントから取得した予定をボードから外します。Google 上の予定と、ほかのアカウントの連携は残ります。",
      confirmProps: { color: "red" },
      labels: { cancel: "キャンセル", confirm: CALENDAR_SYNC_DISCONNECT_LABEL },
      onConfirm: () => {
        void withBusy(
          () =>
            runMutation(() => disconnect({ connectionId: connection.connectionId }), {
              successMessage: (result) => result.warning ?? "カレンダーの連携を解除しました",
            }),
          notifyError,
        );
      },
      title: (
        <GoogleLabel>
          {connection.googleEmail ?? "このアカウント"} の連携を解除しますか？
        </GoogleLabel>
      ),
    });
  }

  async function saveOutput(output: CalendarOutput) {
    const connection = status.connections.find(
      (candidate) => candidate.connectionId === output.connectionId,
    );
    if (connection === undefined) return;
    if (!connection.canWrite) {
      await startLink({
        googleAccountId: connection.googleAccountId,
        purpose: "write",
        calendarId: output.calendarId,
      });
      return;
    }
    await withBusy(
      () =>
        runMutation(() => setOutput(output), {
          successMessage: (outcome) =>
            outcome === "moving"
              ? "Cairn の予定を新しい保存先へ移動しています"
              : "Cairn の予定の保存先を変更しました",
        }),
      notifyError,
    );
  }

  const disabled = busy || status.outputChanging;

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Text size="sm">
          個人用・仕事用の Google カレンダーを重ねて、ボードで空き時間を確認できます。
        </Text>
        <Text c="dimmed" size="xs">
          追加する Google アカウントは、カレンダーの連携にだけ使います。
        </Text>
        <Text c="dimmed" size="xs">
          スケジュールタブを開いたときと、毎日
          2:00・14:00（日本時間）に予定を取得します。すぐに反映したいときは「今すぐ同期」を使えます。
        </Text>
      </Stack>
      {authorization.canRetry ? (
        <Stack gap="xs">
          <Text component="output" size="sm">
            ほかの同期処理が終わるまで接続を待っています。
          </Text>
          <Button
            disabled={busy}
            onClick={() => void authorization.retry()}
            type="button"
            variant="light"
          >
            接続を完了する
          </Button>
        </Stack>
      ) : null}
      {status.connections.map((connection) => (
        <CalendarConnectionCard
          busy={busy}
          connection={connection}
          key={connection.connectionId}
          onDisconnect={() => requestDisconnect(connection)}
          onReconnect={() =>
            void startLink({
              googleAccountId: connection.googleAccountId,
              purpose: connection.canWrite ? "write" : "read",
            })
          }
          onSync={() =>
            void withBusy(
              () =>
                runMutation(() => syncNow({ connectionId: connection.connectionId }), {
                  successMessage: (outcome) => (outcome === "ok" ? "同期しました" : ""),
                }),
              notifyError,
            )
          }
          onVisibleChange={(calendarIds) =>
            void runMutation(() =>
              setVisible({ calendarIds, connectionId: connection.connectionId }),
            )
          }
          output={status.output}
          outputChanging={status.outputChanging}
        />
      ))}
      <Group justify="flex-end">
        <Button
          disabled={status.outputChanging}
          leftSection={<GoogleIcon />}
          loading={busy}
          onClick={() => void startLink({ purpose: "read" })}
          type="button"
          variant={status.connections.length === 0 ? "filled" : "default"}
        >
          {status.connections.length === 0
            ? CALENDAR_SYNC_CONNECT_LABEL
            : "Google アカウントを追加"}
        </Button>
      </Group>
      {status.connections.length > 0 ? (
        <>
          <Divider />
          {status.outputChanging ? (
            <Stack gap="xs">
              <Text component="output" size="sm">
                Cairn の予定を移動しています。途中で止まった場合は再開できます。
              </Text>
              <Button
                disabled={busy}
                onClick={() =>
                  void withBusy(
                    () =>
                      runMutation(() => retryOutput({}), {
                        successMessage: (outcome) =>
                          outcome === "ok"
                            ? "Cairn の予定の移動が完了しました"
                            : "Cairn の予定の移動を再開しました",
                      }),
                    notifyError,
                  )
                }
                type="button"
                variant="light"
              >
                移動を再開
              </Button>
            </Stack>
          ) : null}
          <CalendarOutputForm
            busy={disabled}
            connections={status.connections}
            key={JSON.stringify(status.output)}
            onSave={saveOutput}
            output={status.output}
          />
        </>
      ) : null}
    </Stack>
  );
}
