import { Center, Loader } from "@mantine/core";

export function PendingComponent() {
  return (
    <Center h="calc(100dvh - var(--app-shell-header-offset, 0px))">
      <Loader aria-label="読み込み中" color="blue" />
    </Center>
  );
}
