import { Button, CopyButton, Stack, Text, Textarea, Title } from "@mantine/core";

export function ShareCopy({ markdown }: Record<"markdown", string>) {
  if (markdown === "") {
    return (
      <Stack gap="sm">
        <Title order={3}>共有文</Title>
        <Text c="dimmed">確定した記録がまだないので共有文はありません。</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Title order={3}>共有文</Title>
      <Textarea label="共有文" minRows={6} readOnly value={markdown} />
      <CopyButton value={markdown}>
        {({ copied, copy }) => (
          <Button onClick={copy} variant="light">
            {copied ? "コピーした" : "共有文をコピー"}
          </Button>
        )}
      </CopyButton>
    </Stack>
  );
}
