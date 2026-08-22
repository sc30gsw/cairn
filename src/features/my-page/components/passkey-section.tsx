import type { Passkey } from "@better-auth/passkey/client";
import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";

import { addPasskey, deletePasskey } from "~/features/my-page/lib/profile-actions";
import { authClient } from "~/lib/auth-client";

export function PasskeySection() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [busyId, setBusyId] = useState<null | string>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      setLoading(true);
      try {
        const result = await authClient.passkey.listUserPasskeys();
        if (cancelled) {
          return;
        }
        if (result.error) {
          setErrorMessage(result.error.message ?? "パスキー一覧の取得に失敗しました");
          setPasskeys([]);
        } else {
          setErrorMessage(null);
          setPasskeys(result.data ?? []);
        }
      } finally {
        setLoading(false);
      }
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadPasskeys() {
    setLoading(true);
    try {
      const result = await authClient.passkey.listUserPasskeys();
      if (result.error) {
        setErrorMessage(result.error.message ?? "パスキー一覧の取得に失敗しました");
        setPasskeys([]);
      } else {
        setErrorMessage(null);
        setPasskeys(result.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setErrorMessage(null);
    const result = await addPasskey("Cairn");
    if (result.errorMessage !== null) {
      setErrorMessage(result.errorMessage);
      return;
    }
    await reloadPasskeys();
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setErrorMessage(null);
    try {
      const result = await deletePasskey(id);
      if (result.errorMessage !== null) {
        setErrorMessage(result.errorMessage);
      } else {
        await reloadPasskeys();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card padding="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>パスキー</Title>
          <Button onClick={handleAdd} size="xs" type="button">
            パスキーを追加
          </Button>
        </Group>
        <Text c="dimmed" size="sm">
          パスワードの代わりに端末の生体認証でログインできます。
        </Text>
        {loading ? <Text size="sm">読み込み中…</Text> : null}
        {!loading && passkeys.length === 0 ? (
          <Text c="dimmed" size="sm">
            登録済みのパスキーはありません。
          </Text>
        ) : null}
        {passkeys.map((passkey) => (
          <Group justify="space-between" key={passkey.id} wrap="nowrap">
            <Stack gap={0}>
              <Text size="sm">{passkey.name ?? "パスキー"}</Text>
              {passkey.deviceType ? (
                <Text c="dimmed" size="xs">
                  {passkey.deviceType}
                </Text>
              ) : null}
            </Stack>
            <Button
              color="red"
              loading={busyId === passkey.id}
              onClick={() => void handleDelete(passkey.id)}
              size="xs"
              type="button"
              variant="light"
            >
              削除
            </Button>
          </Group>
        ))}
        {errorMessage ? (
          <Text c="red" size="sm">
            {errorMessage}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
