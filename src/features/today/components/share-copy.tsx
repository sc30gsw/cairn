import { Button, CopyButton, EmptyState, Stack, Textarea, Title } from "@mantine/core";
import { IconShare } from "@tabler/icons-react";

export function ShareCopy({ markdown }: Record<"markdown", string>) {
  if (markdown === "") {
    return (
      <Stack gap="sm">
        <Title order={3}>共有文</Title>
        <EmptyState
          description="この日の記録を確定すると、共有文がここに生成されます。"
          icon={<IconShare aria-hidden />}
          title="共有文はまだありません"
        />
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
