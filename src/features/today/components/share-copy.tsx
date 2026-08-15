import { CopyButton, Button, Text } from "@mantine/core";

export function ShareCopy({ markdown }: Record<"markdown", string>) {
  if (markdown === "") {
    return <Text c="dimmed">確定した行がまだないので共有文はありません。</Text>;
  }

  return (
    <CopyButton value={markdown}>
      {({ copied, copy }) => (
        <Button onClick={copy} variant="light">
          {copied ? "コピーした" : "共有文をコピー"}
        </Button>
      )}
    </CopyButton>
  );
}
