import { Center, Container, Loader } from "@mantine/core";

export function PendingComponent() {
  return (
    <Container py="xl">
      <Center h={"100dvh"}>
        <Loader aria-label="読み込み中" />
      </Center>
    </Container>
  );
}
