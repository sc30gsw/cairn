import { Button, CopyButton, EmptyState, Stack, Textarea, Title } from "@mantine/core";
import { IconShare } from "@tabler/icons-react";

type ShareCopyProps = {
  emptyDescription?: string;
  markdown: string;
  title?: string;
};

//? 日ページと週次レビューの2箇所で使うので共有ゾーンに置く。文言だけ props で差し替える
export function ShareCopy({
  emptyDescription = "この日の記録を確定すると、共有文がここに生成されます。",
  markdown,
  title = "共有文",
}: ShareCopyProps) {
  if (markdown === "") {
    return (
      <Stack gap="sm">
        <Title order={3}>{title}</Title>
        <EmptyState
          description={emptyDescription}
          icon={<IconShare aria-hidden />}
          title="共有文はまだありません"
        />
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <Title order={3}>{title}</Title>
      <Textarea label={title} minRows={6} readOnly value={markdown} />
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
