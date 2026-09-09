import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, Input, Modal, Stack, TextInput, Textarea } from "@mantine/core";
import { getTaskListExtension, Link, RichTextEditor } from "@mantine/tiptap";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import TaskItem from "@tiptap/extension-task-item";
import TipTapTaskList from "@tiptap/extension-task-list";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Result } from "better-result";

import { MethodEditSchema } from "~/features/methods/schemas/method-schema";
import type { Method } from "~/features/methods/types/method";
import type { RemoveMethodInput, UpdateMethodInput } from "~/features/methods/types/mutations";
import type { MutationResult } from "~/lib/run-mutation";

import classes from "~/features/methods/components/method-card-modal.module.css";

type MethodCardModalProps = {
  method: Method;
  onClose: () => void;
  onRemove: (methodId: RemoveMethodInput["methodId"]) => void;
  onUpdate: (input: UpdateMethodInput) => Promise<MutationResult>;
};

export function MethodCardModal({ method, onClose, onRemove, onUpdate }: MethodCardModalProps) {
  const form = useForm({
    initialInput: { bodyText: method.bodyText, name: method.name },
    schema: MethodEditSchema,
  });
  const completionEditor = useEditor({
    content: method.completionHtml === "" ? undefined : method.completionHtml,
    extensions: [
      StarterKit,
      getTaskListExtension(TipTapTaskList),
      TaskItem.configure({ nested: false }),
    ],
    immediatelyRender: false,
  });
  const memoEditor = useEditor({
    content: method.memoHtml === "" ? undefined : method.memoHtml,
    extensions: [
      StarterKit.configure({ link: false }),
      Link,
      Details.configure({
        persist: false,
        renderToggleButton: ({ element, isOpen }) => {
          element.setAttribute("aria-expanded", String(isOpen));
          element.setAttribute("aria-label", isOpen ? "補足を閉じる" : "補足を開く");
        },
      }),
      DetailsSummary,
      DetailsContent,
    ],
    immediatelyRender: false,
  });

  return (
    <Modal onClose={onClose} opened size="lg" title={method.name}>
      <Form
        of={form}
        onSubmit={async (output) => {
          const result = await onUpdate({
            bodyText: output.bodyText,
            completionHtml: completionEditor?.getHTML() ?? method.completionHtml,
            memoHtml: memoEditor?.getHTML() ?? method.memoHtml,
            methodId: method._id,
            name: output.name,
          });
          if (Result.isOk(result)) onClose();
        }}
      >
        <Stack gap="md">
          <Field of={form} path={["name"]}>
            {(field) => (
              <TextInput
                {...field.props}
                error={field.errors?.[0]}
                label="タイトル"
                value={field.input}
              />
            )}
          </Field>
          <Field of={form} path={["bodyText"]}>
            {(field) => (
              <Textarea
                {...field.props}
                autosize
                error={field.errors?.[0]}
                label="本文"
                minRows={4}
                placeholder="やり方をそのまま書く(例: 1回目は本番通り2時間で解く)"
                value={field.input}
              />
            )}
          </Field>
          <Input.Wrapper label="完了条件">
            <RichTextEditor classNames={{ content: classes.content }} editor={completionEditor}>
              <RichTextEditor.Toolbar>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.TaskList />
                  <RichTextEditor.Undo />
                  <RichTextEditor.Redo />
                </RichTextEditor.ControlsGroup>
              </RichTextEditor.Toolbar>
              <RichTextEditor.Content />
            </RichTextEditor>
          </Input.Wrapper>
          <Input.Wrapper label="メモ">
            <RichTextEditor
              classNames={{ content: classes.content }}
              editor={memoEditor}
              labels={{ detailsControlLabel: "折りたたみを挿入" }}
            >
              <RichTextEditor.Toolbar>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Italic />
                  <RichTextEditor.BulletList />
                  <RichTextEditor.Details />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Link />
                  <RichTextEditor.Unlink />
                </RichTextEditor.ControlsGroup>
              </RichTextEditor.Toolbar>
              <RichTextEditor.Content />
            </RichTextEditor>
          </Input.Wrapper>
          <Group justify="space-between">
            <Button
              aria-label={`${method.name}を削除`}
              color="red"
              onClick={() => onRemove(method._id)}
              type="button"
              variant="subtle"
            >
              削除
            </Button>
            <Group gap="xs">
              <Button onClick={onClose} type="button" variant="default">
                閉じる
              </Button>
              <Button aria-label={`${method.name}を保存`} type="submit">
                保存
              </Button>
            </Group>
          </Group>
        </Stack>
      </Form>
    </Modal>
  );
}
