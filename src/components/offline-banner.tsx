import { Alert } from "@mantine/core";
import { IconWifiOff } from "@tabler/icons-react";

import { useOnlineStatus } from "~/hooks/use-online-status";

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
