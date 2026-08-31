import { Field, Form, reset, useForm } from "@formisch/react";
import type { DropResult } from "@hello-pangea/dnd";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Input,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconEye, IconEyeOff, IconGripVertical, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { groupBy, mapValues, prop, sortBy } from "remeda";

import { MethodCardModal } from "~/features/methods/components/method-card-modal";
import {
  useMethodCatalogActions,
  type MethodCatalogActions,
} from "~/features/methods/hooks/use-method-catalog-actions";
import { LaneSchema } from "~/features/methods/schemas/lane-schema";
import { MethodTitleSchema } from "~/features/methods/schemas/method-schema";
import type { Method, MethodCatalog, MethodLane } from "~/features/methods/types/method";
import { useDnd } from "~/hooks/use-dnd";

const METHOD_CATALOG_TITLE = "方法カタログ";
const METHOD_CATALOG_HINT =
  "「勉強方法どうやるのが効率なんだっけ」を思い出すための参照専用カタログ。今日の記録やプリセットには何も起こしません。";
export const METHOD_CATALOG_EMPTY =
  "まだ空のカタログです。まずレーン(例: 模試レーン / 単語レーン)を追加します。";

export function MethodCatalogBoard({ catalog }: Record<"catalog", MethodCatalog>) {
  const actions = useMethodCatalogActions();
  const { DragDropContext } = useDnd();
  const [openedMethodId, setOpenedMethodId] = useState<Method["_id"] | null>(null);
  const sortedLanes = sortBy(catalog.lanes, prop("sortOrder"));
  const methodsByLane = mapValues(groupBy(catalog.methods, prop("laneId")), (laneMethods) =>
    sortBy(laneMethods, prop("sortOrder")),
  );
  //? いま見るはカタログの正面(サーバが所有者ごとに高々1件を保証する)
  const nowViewing = catalog.methods.find((method) => method.nowViewing);
  //? 開いたカードは常に購読中のカタログから読む(別端末の編集にも追従する)
  const openedMethod = catalog.methods.find((method) => method._id === openedMethodId);

  async function handleDragEnd(result: DropResult) {
    const { destination, draggableId, source } = result;
    if (destination === null) {
      return;
    }
    const sourceLaneId = source.droppableId as MethodLane["_id"];
    const destinationLaneId = destination.droppableId as MethodLane["_id"];
    const sourceMethods = [...(methodsByLane[sourceLaneId] ?? [])];
    const movedIndex = sourceMethods.findIndex((method) => method._id === draggableId);
    if (movedIndex === -1) {
      return;
    }
    const [moved] = sourceMethods.splice(movedIndex, 1);
    if (moved === undefined) {
      return;
    }

    if (sourceLaneId === destinationLaneId) {
      sourceMethods.splice(destination.index, 0, moved);
      await actions.onApplyMethodOrder({
        updates: [
          { laneId: sourceLaneId, orderedMethodIds: sourceMethods.map((method) => method._id) },
        ],
      });
      return;
    }

    const destinationMethods = [...(methodsByLane[destinationLaneId] ?? [])].filter(
      (method) => method._id !== moved._id,
    );
    destinationMethods.splice(destination.index, 0, moved);
    await actions.onApplyMethodOrder({
      updates: [
        { laneId: sourceLaneId, orderedMethodIds: sourceMethods.map((method) => method._id) },
        {
          laneId: destinationLaneId,
          orderedMethodIds: destinationMethods.map((method) => method._id),
        },
      ],
    });
  }

  return (
    <Card>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={2}>{METHOD_CATALOG_TITLE}</Title>
          <Text c="dimmed" size="sm">
            {METHOD_CATALOG_HINT}
          </Text>
        </Stack>
        {nowViewing !== undefined && (
          <NowViewingCard method={nowViewing} onOpen={() => setOpenedMethodId(nowViewing._id)} />
        )}
        <AddLaneForm onCreate={actions.onCreateLane} />
        {sortedLanes.length === 0 ? (
          <Text c="dimmed" size="sm">
            {METHOD_CATALOG_EMPTY}
          </Text>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <ScrollArea offsetScrollbars type="auto">
              <Group align="flex-start" gap="md" wrap="nowrap">
                {sortedLanes.map((lane) => (
                  <LaneColumn
                    key={lane._id}
                    lane={lane}
                    methods={methodsByLane[lane._id] ?? []}
                    onCreateMethod={actions.onCreateMethod}
                    onOpenMethod={setOpenedMethodId}
                    onRemoveLane={actions.onRemoveLane}
                    onRenameLane={actions.onRenameLane}
                    onSetNowViewing={actions.onSetNowViewing}
                  />
                ))}
              </Group>
            </ScrollArea>
          </DragDropContext>
        )}
      </Stack>
      {openedMethod !== undefined && (
        <MethodCardModal
          key={openedMethod._id}
          method={openedMethod}
          onClose={() => setOpenedMethodId(null)}
          onRemove={async (methodId) => {
            setOpenedMethodId(null);
            await actions.onRemoveMethod(methodId);
          }}
          onUpdate={actions.onUpdateMethod}
        />
      )}
    </Card>
  );
}

//* カタログの正面。いま見ると印を付けた1件をレーンの上に大きく出す(進行中でも採用中でもない)。
function NowViewingCard({ method, onOpen }: { method: Method; onOpen: () => void }) {
  return (
    <Paper p="md" radius="sm" style={{ borderColor: "var(--mantine-color-orange-4)" }} withBorder>
      <Stack gap="xs">
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Badge color="orange" variant="filled">
              いま見る
            </Badge>
            <Text fw={600}>{method.name}</Text>
          </Group>
          <Button onClick={onOpen} size="compact-sm" type="button" variant="default">
            開く
          </Button>
        </Group>
        {method.bodyText !== "" && (
          <Text c="dimmed" lineClamp={2} size="sm" style={{ whiteSpace: "pre-line" }}>
            {method.bodyText}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

function AddLaneForm({ onCreate }: Record<"onCreate", MethodCatalogActions["onCreateLane"]>) {
  const form = useForm({
    initialInput: { name: "" },
    schema: LaneSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onCreate(output);
        reset(form);
      }}
    >
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <Field of={form} path={["name"]}>
            {(field) => (
              <TextInput
                {...field.props}
                error={field.errors?.[0]}
                label="新しいレーン"
                placeholder="例: 模試レーン"
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Input.Wrapper label=" ">
            <Button aria-label="レーンを追加" fullWidth type="submit">
              追加
            </Button>
          </Input.Wrapper>
        </Grid.Col>
      </Grid>
    </Form>
  );
}

type LaneColumnProps = {
  lane: MethodLane;
  methods: Method[];
  onCreateMethod: MethodCatalogActions["onCreateMethod"];
  onOpenMethod: (methodId: Method["_id"]) => void;
  onRemoveLane: MethodCatalogActions["onRemoveLane"];
  onRenameLane: MethodCatalogActions["onRenameLane"];
  onSetNowViewing: MethodCatalogActions["onSetNowViewing"];
};

function LaneColumn({
  lane,
  methods,
  onCreateMethod,
  onOpenMethod,
  onRemoveLane,
  onRenameLane,
  onSetNowViewing,
}: LaneColumnProps) {
  const { Draggable, Droppable } = useDnd();

  return (
    <Paper miw={300} p="md" radius="sm" withBorder>
      <Stack gap="md">
        <LaneEditor lane={lane} onRemove={onRemoveLane} onRename={onRenameLane} />
        <Droppable droppableId={lane._id}>
          {(provided) => (
            <Stack gap="sm" ref={provided.innerRef} {...provided.droppableProps} mih={48}>
              {methods.length === 0 ? (
                <Text c="dimmed" size="sm">
                  ここにドロップするか、下の欄から追加
                </Text>
              ) : null}
              {methods.map((method, index) => (
                <Draggable draggableId={method._id} index={index} key={method._id}>
                  {(dragProvided) => (
                    <Card padding="sm" ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                      <Group align="center" gap="xs" wrap="nowrap">
                        <Tooltip label="ドラッグして並べ替え・移動" withArrow>
                          <ActionIcon
                            aria-label={`${method.name}をドラッグ`}
                            color="gray"
                            size="sm"
                            variant="subtle"
                            {...dragProvided.dragHandleProps}
                          >
                            <IconGripVertical aria-hidden size={16} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} size="sm" truncate>
                            {method.name}
                          </Text>
                          {method.nowViewing && (
                            <Badge color="orange" size="sm" variant="filled" w="fit-content">
                              いま見る
                            </Badge>
                          )}
                        </Stack>
                        <Tooltip
                          label={
                            method.nowViewing ? "いま見るを外す" : "いま見るにする(正面に置く)"
                          }
                          withArrow
                        >
                          <ActionIcon
                            aria-label={
                              method.nowViewing
                                ? `${method.name}のいま見るを外す`
                                : `${method.name}をいま見るにする`
                            }
                            color="orange"
                            onClick={() =>
                              onSetNowViewing({
                                methodId: method._id,
                                nowViewing: !method.nowViewing,
                              })
                            }
                            size="sm"
                            type="button"
                            variant={method.nowViewing ? "filled" : "subtle"}
                          >
                            {method.nowViewing ? (
                              <IconEyeOff aria-hidden size={16} stroke={1.5} />
                            ) : (
                              <IconEye aria-hidden size={16} stroke={1.5} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                        <Button
                          aria-label={`${method.name}を開く`}
                          onClick={() => onOpenMethod(method._id)}
                          size="compact-sm"
                          type="button"
                          variant="default"
                        >
                          開く
                        </Button>
                      </Group>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Stack>
          )}
        </Droppable>
        <AddMethodToLaneForm lane={lane} onCreate={onCreateMethod} />
      </Stack>
    </Paper>
  );
}

function LaneEditor({
  lane,
  onRemove,
  onRename,
}: {
  lane: MethodLane;
  onRemove: MethodCatalogActions["onRemoveLane"];
  onRename: MethodCatalogActions["onRenameLane"];
}) {
  const form = useForm({
    initialInput: { name: lane.name },
    schema: LaneSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onRename({ laneId: lane._id, name: output.name });
      }}
    >
      <Stack gap="xs">
        <Field of={form} path={["name"]}>
          {(field) => (
            <TextInput
              {...field.props}
              aria-label={`${lane.name}の名前`}
              error={field.errors?.[0]}
              value={field.input}
            />
          )}
        </Field>
        <Group gap="xs" grow preventGrowOverflow={false} wrap="nowrap">
          <Button aria-label={`${lane.name}を保存`} fullWidth type="submit">
            保存
          </Button>
          <Button
            aria-label={`${lane.name}を削除`}
            color="red"
            fullWidth
            onClick={() => onRemove(lane._id)}
            rightSection={<IconTrash aria-hidden size={16} stroke={1.5} />}
            type="button"
            variant="subtle"
          >
            削除
          </Button>
        </Group>
      </Stack>
    </Form>
  );
}

function AddMethodToLaneForm({
  lane,
  onCreate,
}: {
  lane: MethodLane;
  onCreate: MethodCatalogActions["onCreateMethod"];
}) {
  const form = useForm({
    initialInput: { name: "" },
    schema: MethodTitleSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onCreate({ laneId: lane._id, name: output.name });
        reset(form);
      }}
    >
      <Stack gap="xs">
        <Field of={form} path={["name"]}>
          {(field) => (
            <TextInput
              {...field.props}
              aria-label={`${lane.name}に方法を追加`}
              error={field.errors?.[0]}
              placeholder="方法のタイトルを追加"
              value={field.input}
            />
          )}
        </Field>
        <Button
          aria-label={`${lane.name}に方法を追加`}
          fullWidth
          size="compact-sm"
          type="submit"
          variant="light"
        >
          追加
        </Button>
      </Stack>
    </Form>
  );
}
