import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, Input, Modal, Stack, TextInput, Textarea } from "@mantine/core";
import { getTaskListExtension, Link, RichTextEditor } from "@mantine/tiptap";
import TaskItem from "@tiptap/extension-task-item";
import TipTapTaskList from "@tiptap/extension-task-list";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { MethodEditSchema } from "~/features/methods/schemas/method-schema";
import type { Method } from "~/features/methods/types/method";
import type { RemoveMethodInput, UpdateMethodInput } from "~/features/methods/types/mutations";

import classes from "~/features/methods/components/method-card-modal.module.css";

type MethodCardModalProps = {
  method: Method;
  onClose: () => void;
  onRemove: (methodId: RemoveMethodInput["methodId"]) => void;
  onUpdate: (input: UpdateMethodInput) => void;
};

//* 開いたカード。タイトル + 本文(textarea) + 完了条件(タスクリスト) + メモ(リンク可)の4欄だけ。
//? タイトルと本文は Formisch(Valibot が SSoT)。完了条件・メモは TipTap が持ち、保存時に
//? getHTML() を合流させる。カレントの値は購読中のカタログから来る(親が method を渡し直す)。
export function MethodCardModal({ method, onClose, onRemove, onUpdate }: MethodCardModalProps) {
  const form = useForm({
    initialInput: { bodyText: method.bodyText, name: method.name },
    schema: MethodEditSchema,
  });
  //? SSR では描画しない(TanStack Start。エディタはクライアントで開くモーダル内だけに現れる)
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
    //? StarterKit v3 は link を内蔵する。Mantine の Link(コントロール連携つき)と二重登録しない
    extensions: [StarterKit.configure({ link: false }), Link],
    immediatelyRender: false,
  });

  return (
    <Modal onClose={onClose} opened size="lg" title={method.name}>
      <Form
        of={form}
        onSubmit={(output) => {
          onUpdate({
            bodyText: output.bodyText,
            completionHtml: completionEditor?.getHTML() ?? method.completionHtml,
            memoHtml: memoEditor?.getHTML() ?? method.memoHtml,
            methodId: method._id,
            name: output.name,
          });
          onClose();
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
            <RichTextEditor classNames={{ content: classes.content }} editor={memoEditor}>
              <RichTextEditor.Toolbar>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Italic />
                  <RichTextEditor.BulletList />
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
