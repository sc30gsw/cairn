import { Badge, Button, Card, List, Stack, Text, Title } from "@mantine/core";

import { useInstallPrompt } from "~/hooks/use-install-prompt";

//* ホーム画面追加の案内。自動では出さない(ナグ禁止)。8番目のナビタブも作らない
//? (docs/specs/pwa-mobile.md §8.3)。#56 はこのセクションに通知トグルを足す。
export function InstallAppSection() {
  const { canPrompt, promptInstall, standalone } = useInstallPrompt();

  return (
    <Card padding="md">
      <Stack gap="sm">
        <Title order={3}>アプリとして使う</Title>
        {standalone ? (
          <>
            <Badge color="green" variant="light" w="fit-content">
              ホーム画面アプリとして起動中
            </Badge>
            <Text size="sm">ログインの保持が長くなり、通知の前提も満たします。</Text>
            <Text c="dimmed" size="sm">
              オフラインでは記録できません。圏外では貼り紙だけが出ます。
            </Text>
          </>
        ) : (
          <>
            <Text size="sm">
              ホーム画面に追加すると、ブラウザの枠なしで起動できてログインも長く保たれます。
            </Text>
            {canPrompt ? (
              <Button onClick={promptInstall} type="button" w="fit-content">
                ホーム画面に追加
              </Button>
            ) : (
              <List size="sm" type="ordered">
                <List.Item>ブラウザの共有ボタンを開く</List.Item>
                <List.Item>「ホーム画面に追加」を選ぶ</List.Item>
              </List>
            )}
            <Text c="dimmed" size="sm">
              オフラインでは記録できません。圏外では貼り紙だけが出ます。
            </Text>
          </>
        )}
      </Stack>
    </Card>
  );
}
