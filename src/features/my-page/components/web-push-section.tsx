import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Result } from "better-result";
import { useEffect, useState } from "react";

import { useBusy } from "~/features/my-page/hooks/use-busy";
import { useInstallPrompt } from "~/hooks/use-install-prompt";
import { usePushSubscriptions, useWebPushConfig } from "~/hooks/use-notification-inbox";
import { useSubscribePush, useUnsubscribePush } from "~/hooks/use-notification-mutations";
import { notifyError } from "~/lib/notify";
import { runMutation } from "~/lib/run-mutation";
import { NUMERAL_FONT } from "~/lib/theme";
import {
  currentPushSubscription,
  isWebPushSupported,
  notificationPermission,
  subscribeWebPush,
  unsubscribeWebPush,
} from "~/lib/web-push";
import type { SubscribePushInput } from "~/types/web-push";

const WEB_PUSH_SECTION_TITLE = "この端末に届ける";
const WEB_PUSH_DESCRIPTION =
  "通知欄に加えて、登録した端末へ通知を押し出します。端末ごとに登録し、静穏時間は端末への通知だけを止めます。";
export const WEB_PUSH_ENABLE_LABEL = "この端末で通知を受け取る";
export const WEB_PUSH_DISABLE_LABEL = "この端末への通知を止める";
export const WEB_PUSH_RETRY_DISABLE_LABEL = "登録情報の削除を再試行";
export const WEB_PUSH_PENDING_REMOVAL_MESSAGE =
  "この端末への通知は停止しています。登録情報の削除をもう一度お試しください。";
export const WEB_PUSH_SUBSCRIBED_BADGE = "この端末に届きます";
export const WEB_PUSH_UNSUPPORTED_MESSAGE = "このブラウザは端末への通知に対応していません。";
export const WEB_PUSH_MISSING_KEY_MESSAGE =
  "サーバーに Web Push の鍵が設定されていないため、端末への通知はまだ使えません。";
export const WEB_PUSH_DENIED_MESSAGE =
  "通知がブラウザで拒否されています。ブラウザの設定から許可すると、ここで登録できます。";
export const WEB_PUSH_IOS_HINT =
  "iPhone / iPad では、共有メニューから「ホーム画面に追加」して、そのアプリから開いたときだけ端末に通知を届けられます。";
const WEB_PUSH_SUBSCRIBED_MESSAGE = "この端末で通知を受け取ります";
const WEB_PUSH_UNSUBSCRIBED_MESSAGE = "この端末への通知を止めました";
const WEB_PUSH_ENABLE_FAILED_MESSAGE = "この端末で通知を受け取れませんでした";
const WEB_PUSH_DISABLE_FAILED_MESSAGE = "この端末への通知を止められませんでした";

export function WebPushSection() {
  const { data: config } = useWebPushConfig();
  const { data: subscriptions } = usePushSubscriptions();
  const subscribePush = useSubscribePush();
  const unsubscribePush = useUnsubscribePush();
  const { standalone } = useInstallPrompt();
  const [current, setCurrent] = useState<SubscribePushInput | null>(null);
  const [pendingUnsubscribe, setPendingUnsubscribe] = useState<string | null>(null);
  const [permission, setPermission] = useState(notificationPermission);
  const { busy, withBusy } = useBusy();

  useEffect(() => {
    let cancelled = false;
    void currentPushSubscription().then((result) => {
      if (cancelled) return;
      if (Result.isError(result)) {
        notifyError(result.error, result.error.message);
        return;
      }
      setCurrent(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const supported = isWebPushSupported();
  const subscribedHere =
    current !== null && subscriptions.some((entry) => entry.endpoint === current.endpoint);

  function enable() {
    return withBusy(
      async () => {
        const result = await subscribeWebPush(config.publicKey);
        setPermission(notificationPermission());
        if (Result.isError(result)) {
          notifyError(result.error, result.error.message);
          return;
        }
        setCurrent(result.value);
        await runMutation(() => subscribePush.mutateAsync(result.value), {
          successMessage: WEB_PUSH_SUBSCRIBED_MESSAGE,
        });
      },
      (error) => notifyError(error, WEB_PUSH_ENABLE_FAILED_MESSAGE),
    );
  }

  function disable() {
    return withBusy(
      async () => {
        const result = await unsubscribeWebPush();
        if (Result.isError(result)) {
          notifyError(result.error, result.error.message);
          return;
        }
        const endpoint = result.value ?? pendingUnsubscribe ?? current?.endpoint;
        setCurrent(null);
        if (endpoint !== undefined) {
          setPendingUnsubscribe(endpoint);
          const saved = await runMutation(() => unsubscribePush.mutateAsync({ endpoint }), {
            successMessage: WEB_PUSH_UNSUBSCRIBED_MESSAGE,
          });
          if (Result.isError(saved)) return;
        }
        setPendingUnsubscribe(null);
      },
      (error) => notifyError(error, WEB_PUSH_DISABLE_FAILED_MESSAGE),
    );
  }

  function renderControls() {
    if (!supported) {
      return (
        <Alert color="yellow" variant="light">
          {WEB_PUSH_UNSUPPORTED_MESSAGE}
        </Alert>
      );
    }
    if (config.publicKey === null) {
      return (
        <Alert color="yellow" variant="light">
          {WEB_PUSH_MISSING_KEY_MESSAGE}
        </Alert>
      );
    }
    return (
      <Stack gap="sm">
        {permission === "denied" && (
          <Alert color="red" variant="light">
            {WEB_PUSH_DENIED_MESSAGE}
          </Alert>
        )}
        <Group gap="sm" wrap="wrap">
          {pendingUnsubscribe !== null ? (
            <>
              <Text size="sm">{WEB_PUSH_PENDING_REMOVAL_MESSAGE}</Text>
              <Button loading={busy} onClick={disable} type="button" variant="default">
                {WEB_PUSH_RETRY_DISABLE_LABEL}
              </Button>
            </>
          ) : subscribedHere ? (
            <>
              <Badge color="green" variant="light">
                {WEB_PUSH_SUBSCRIBED_BADGE}
              </Badge>
              <Button loading={busy} onClick={disable} type="button" variant="default">
                {WEB_PUSH_DISABLE_LABEL}
              </Button>
            </>
          ) : (
            <Button
              disabled={permission === "denied"}
              loading={busy}
              onClick={enable}
              type="button"
            >
              {WEB_PUSH_ENABLE_LABEL}
            </Button>
          )}
        </Group>
        <Text c="dimmed" size="sm">
          登録済みの端末:{" "}
          <Text ff={NUMERAL_FONT} span>
            {subscriptions.length}
          </Text>
        </Text>
      </Stack>
    );
  }

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={2}>{WEB_PUSH_SECTION_TITLE}</Title>
        <Text c="dimmed" size="sm">
          {WEB_PUSH_DESCRIPTION}
        </Text>
        {renderControls()}
        {!standalone && (
          <Text c="dimmed" size="xs">
            {WEB_PUSH_IOS_HINT}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
