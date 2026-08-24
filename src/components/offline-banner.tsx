import { Alert } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";

import { useOnlineStatus } from "~/hooks/use-online-status";

//* 「オフラインでも書けそう」に見せないための3点のうちの1つ(docs/specs/pwa-mobile.md §3.3 / §9.1)。
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) {
    return null;
  }
  return (
    <Alert color="yellow" icon={<IconWifiOff aria-hidden size={18} />} mb="md" variant="light">
      オフラインです。記録の保存はできません。電波が戻ると自動でつながります。
    </Alert>
  );
}
