import { Field, Form, useForm } from "@formisch/react";
import type { DropResult } from "@hello-pangea/dnd";
import {
  ActionIcon,
  Button,
  Card,
  Grid,
  Group,
  Input,
  Menu,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { groupBy, mapValues, prop, sortBy } from "remeda";

import { useDnd } from "~/features/catalog/hooks/use-dnd";
import { CategorySchema } from "~/features/catalog/schemas/category-schema";
import { ItemNameSchema } from "~/features/catalog/schemas/item-schema";
import type { CategoryDto, ItemDto } from "~/features/catalog/types/item";
import { parseCategoryId } from "~/features/catalog/types/item";
import type {
  ApplyItemOrderInput,
  CreateCategoryInput,
  CreateItemInput,
  RemoveCategoryInput,
  RemoveItemInput,
  RenameCategoryInput,
  RenameItemInput,
} from "~/features/catalog/types/mutations";

type ItemListProps = {
  categories: CategoryDto[];
  items: ItemDto[];
  onCreateCategory: (input: CreateCategoryInput) => void;
  onCreateItem: (input: CreateItemInput) => void;
  onRemoveCategory: (categoryId: RemoveCategoryInput["categoryId"]) => void;
  onRemoveItem: (itemId: RemoveItemInput["itemId"]) => void;
  onRenameCategory: (input: RenameCategoryInput) => void;
  onRenameItem: (input: RenameItemInput) => void | Promise<void>;
  onApplyItemOrder: (input: ApplyItemOrderInput) => void | Promise<void>;
};

export function ItemList({
  categories,
  items,
  onCreateCategory,
  onCreateItem,
  onRemoveCategory,
  onRemoveItem,
  onRenameCategory,
  onRenameItem,
  onApplyItemOrder,
}: ItemListProps) {
  const { DragDropContext } = useDnd();
  const sortedCategories = sortBy(categories, prop("sortOrder"));
  const itemsByCategory = mapValues(groupBy(items, prop("categoryId")), (categoryItems) =>
    sortBy(categoryItems, prop("sortOrder")),
  );

  async function handleDragEnd(result: DropResult) {
    const { destination, draggableId, source } = result;
    if (destination === null) {
      return;
    }
    const sourceCategoryId = parseCategoryId(source.droppableId);
    const destinationCategoryId = parseCategoryId(destination.droppableId);
    const sourceItems = [...(itemsByCategory[sourceCategoryId] ?? [])];
    const movedIndex = sourceItems.findIndex((item) => item._id === draggableId);
    if (movedIndex === -1) {
      return;
    }
    const [moved] = sourceItems.splice(movedIndex, 1);
    if (moved === undefined) {
      return;
    }

    if (sourceCategoryId === destinationCategoryId) {
      sourceItems.splice(destination.index, 0, moved);
      await onApplyItemOrder({
        updates: [
          {
            categoryId: sourceCategoryId,
            orderedItemIds: sourceItems.map((item) => item._id),
          },
        ],
      });
      return;
    }

    const destinationItems = [...(itemsByCategory[destinationCategoryId] ?? [])].filter(
      (item) => item._id !== moved._id,
    );
    destinationItems.splice(destination.index, 0, moved);
    await onApplyItemOrder({
      updates: [
        {
          categoryId: sourceCategoryId,
          orderedItemIds: sourceItems.map((item) => item._id),
        },
        {
          categoryId: destinationCategoryId,
          orderedItemIds: destinationItems.map((item) => item._id),
        },
      ],
    });
  }

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={1}>項目</Title>
        <Text c="dimmed" size="sm">
          カードをドラッグして並べ替え・カテゴリー移動。キーボード操作は各カードの「移動」メニューから。
        </Text>
      </Stack>
      <AddCategoryForm onCreate={onCreateCategory} />
      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea offsetScrollbars type="auto">
          <Group align="flex-start" gap="md" wrap="nowrap">
            {sortedCategories.map((category) => (
              <KanbanColumn
                categories={sortedCategories}
                category={category}
                items={itemsByCategory[category._id] ?? []}
                key={category._id}
                onCreateItem={onCreateItem}
                onRemoveCategory={onRemoveCategory}
                onRemoveItem={onRemoveItem}
                onRenameCategory={onRenameCategory}
                onRenameItem={onRenameItem}
              />
            ))}
          </Group>
        </ScrollArea>
      </DragDropContext>
    </Stack>
  );
}

function AddCategoryForm({ onCreate }: { onCreate: ItemListProps["onCreateCategory"] }) {
  const form = useForm({
    initialInput: { name: "" },
    schema: CategorySchema,
  });

  return (
    <Card>
      <Form
        of={form}
        onSubmit={(output) => {
          onCreate(output);
        }}
      >
        <Grid align="flex-start" gap="sm">
          <Grid.Col span={{ base: 12, sm: 8 }}>
            <Field of={form} path={["name"]}>
              {(field) => (
                <TextInput
                  {...field.props}
                  error={field.errors?.[0]}
                  label="新しいカテゴリー"
                  placeholder="例: 多聴"
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Input.Wrapper label=" ">
              <Button aria-label="カテゴリーを追加" fullWidth type="submit">
                追加
              </Button>
            </Input.Wrapper>
          </Grid.Col>
        </Grid>
      </Form>
    </Card>
  );
}

function AddItemToColumnForm({
  category,
  onCreate,
}: {
  category: CategoryDto;
  onCreate: ItemListProps["onCreateItem"];
}) {
  const form = useForm({
    initialInput: { name: "" },
    schema: ItemNameSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onCreate({ categoryId: category._id, name: output.name });
      }}
    >
      <Stack gap="xs">
        <Field of={form} path={["name"]}>
          {(field) => (
            <TextInput
              {...field.props}
              aria-label={`${category.name}に学習内容を追加`}
              error={field.errors?.[0]}
              placeholder="学習内容を追加"
              value={field.input}
            />
          )}
        </Field>
        <Button
          aria-label={`${category.name}に学習内容を追加`}
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

function KanbanColumn({
  categories,
  category,
  items,
  onCreateItem,
  onRemoveCategory,
  onRemoveItem,
  onRenameCategory,
  onRenameItem,
}: {
  categories: CategoryDto[];
  category: CategoryDto;
  items: ItemDto[];
  onCreateItem: ItemListProps["onCreateItem"];
  onRemoveCategory: ItemListProps["onRemoveCategory"];
  onRemoveItem: ItemListProps["onRemoveItem"];
  onRenameCategory: ItemListProps["onRenameCategory"];
  onRenameItem: ItemListProps["onRenameItem"];
}) {
  const { Draggable, Droppable } = useDnd();

  return (
    <Paper miw={300} p="md" radius="sm" withBorder>
      <Stack gap="md">
        <CategoryEditor
          category={category}
          onRemove={onRemoveCategory}
          onRename={onRenameCategory}
        />
        <Droppable droppableId={category._id}>
          {(provided) => (
            <Stack gap="sm" ref={provided.innerRef} {...provided.droppableProps} mih={48}>
              {items.length === 0 ? (
                <Text c="dimmed" size="sm">
                  ここにドロップするか、下の欄から追加
                </Text>
              ) : null}
              {items.map((item, index) => (
                <Draggable draggableId={item._id} index={index} key={item._id}>
                  {(dragProvided) => (
                    <Card padding="sm" ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                      <Group align="flex-start" gap="xs" wrap="nowrap">
                        <Tooltip label="ドラッグして並べ替え・移動" withArrow>
                          <ActionIcon
                            aria-label={`${item.name}をドラッグ`}
                            color="gray"
                            size="sm"
                            variant="subtle"
                            {...dragProvided.dragHandleProps}
                          >
                            <IconGripVertical aria-hidden size={16} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        <ItemEditor
                          categories={categories}
                          categoryId={category._id}
                          item={item}
                          onRemove={onRemoveItem}
                          onRename={onRenameItem}
                        />
                      </Group>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Stack>
          )}
        </Droppable>
        <AddItemToColumnForm category={category} onCreate={onCreateItem} />
      </Stack>
    </Paper>
  );
}

function CategoryEditor({
  category,
  onRemove,
  onRename,
}: {
  category: CategoryDto;
  onRemove: ItemListProps["onRemoveCategory"];
  onRename: ItemListProps["onRenameCategory"];
}) {
  const form = useForm({
    initialInput: { name: category.name },
    schema: CategorySchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onRename({ categoryId: category._id, name: output.name });
      }}
    >
      <Stack gap="xs">
        <Field of={form} path={["name"]}>
          {(field) => (
            <TextInput
              {...field.props}
              aria-label={`${category.name}の名前`}
              error={field.errors?.[0]}
              value={field.input}
            />
          )}
        </Field>
        <Group gap="xs" grow preventGrowOverflow={false} wrap="nowrap">
          <Button aria-label={`${category.name}を保存`} fullWidth type="submit">
            保存
          </Button>
          <Button
            aria-label={`${category.name}を削除`}
            color="red"
            fullWidth
            onClick={() => onRemove(category._id)}
            type="button"
            rightSection={<IconTrash aria-hidden size={16} stroke={1.5} />}
            variant="subtle"
          >
            削除
          </Button>
        </Group>
      </Stack>
    </Form>
  );
}

function ItemEditor({
  categories,
  categoryId,
  item,
  onRemove,
  onRename,
}: {
  categories: CategoryDto[];
  categoryId: CategoryDto["_id"];
  item: ItemDto;
  onRemove: ItemListProps["onRemoveItem"];
  onRename: ItemListProps["onRenameItem"];
}) {
  const form = useForm({
    initialInput: { name: item.name },
    schema: ItemNameSchema,
  });
  const moveTargets = categories.filter((category) => category._id !== categoryId);

  return (
    <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
      <Form
        of={form}
        onSubmit={(output) => {
          onRename({
            categoryId,
            itemId: item._id,
            name: output.name,
          });
        }}
      >
        <Stack gap="xs">
          <Group align="flex-start" wrap="nowrap">
            <Field of={form} path={["name"]}>
              {(field) => (
                <TextInput
                  {...field.props}
                  aria-label={`${item.name}の名前`}
                  error={field.errors?.[0]}
                  value={field.input}
                />
              )}
            </Field>
            <Tooltip label={`${item.name}を削除`} withArrow>
              <ActionIcon
                aria-label={`${item.name}を削除`}
                color="red"
                onClick={() => onRemove(item._id)}
                size="input-sm"
                type="button"
                variant="white"
              >
                <IconTrash aria-hidden size={16} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group gap="xs" grow preventGrowOverflow={false} wrap="nowrap">
            <Button aria-label={`${item.name}を保存`} fullWidth type="submit">
              保存
            </Button>
            {moveTargets.length > 0 ? (
              <Menu withinPortal>
                <Menu.Target>
                  <Button
                    aria-label={`${item.name}を別のカテゴリーへ移動`}
                    fullWidth
                    type="button"
                    variant="default"
                  >
                    移動
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {moveTargets.map((category) => (
                    <Menu.Item
                      key={category._id}
                      onClick={() =>
                        onRename({ categoryId: category._id, itemId: item._id, name: item.name })
                      }
                    >
                      {category.name}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            ) : null}
          </Group>
        </Stack>
      </Form>
    </Stack>
  );
}
