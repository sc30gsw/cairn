import { Alert, Anchor, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";

export function EmptyCatalogBanner() {
  return (
    <Alert color="orange" title="はじめにカタログを登録してください" variant="light">
      <Stack gap="xs">
        <Text size="sm">
          新規アカウントは空の状態から始まります。項目とプリセットを登録すると、今日の記録が自動で並びます。
        </Text>
        <Text size="sm">
          <Anchor component={Link} to="/items">
            項目
          </Anchor>
          {" → "}
          <Anchor component={Link} to="/presets">
            プリセット
          </Anchor>
          {" の順で設定してください。"}
        </Text>
      </Stack>
    </Alert>
  );
}
