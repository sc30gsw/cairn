import { convexQuery } from "@convex-dev/react-query";
import { Badge, Container, Group, List, Stack, Text, Title } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { api } from "~/../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(convexQuery(api.tasks.get, {}));

  return (
    <Container py="xl" size="sm">
      <Stack gap="md">
        <Title order={1}>Tasks</Title>
        <List listStyleType="none" spacing="sm">
          {data.map((task) => (
            <List.Item key={task._id}>
              <Group justify="space-between">
                <Text td={task.isCompleted ? "line-through" : undefined}>{task.text}</Text>
                <Badge color={task.isCompleted ? "green" : "gray"}>
                  {task.isCompleted ? "完了" : "未完了"}
                </Badge>
              </Group>
            </List.Item>
          ))}
        </List>
      </Stack>
    </Container>
  );
}
