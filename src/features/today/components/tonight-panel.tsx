import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, TextInput } from "@mantine/core";
import { TimeInput } from "@mantine/dates";

import { TonightSchema, WakeSchema } from "~/features/today/schemas/tonight-schema";

type TonightPanelProps = {
  onSaveBed: (bedHm: string) => void;
  onSaveWake: (wakeHm: string) => void;
  showBed: boolean;
  sleepHours: null | number;
  sleepWarning: boolean;
  tonightBedHm: null | string;
  wakeHm: null | string;
};

export function TonightPanel({
  onSaveBed,
  onSaveWake,
  showBed,
  sleepHours,
  sleepWarning,
  tonightBedHm,
  wakeHm,
}: TonightPanelProps) {
  const bedForm = useForm({
    initialInput: { bedHm: tonightBedHm ?? "" },
    schema: TonightSchema,
  });
  const wakeForm = useForm({
    initialInput: { wakeHm: wakeHm ?? "" },
    schema: WakeSchema,
  });

  return (
    <section aria-label="今夜と睡眠">
      {showBed ? (
        <Form
          of={bedForm}
          onSubmit={(output) => {
            onSaveBed(output.bedHm);
          }}
        >
          <Group align="flex-end" gap="xs">
            <Field of={bedForm} path={["bedHm"]}>
              {(field) => (
                <TimeInput
                  {...field.props}
                  error={field.errors?.[0]}
                  label="今夜の就寝"
                  value={field.input}
                />
              )}
            </Field>
            <Button type="submit">就寝を保存</Button>
          </Group>
        </Form>
      ) : null}
      <Form
        of={wakeForm}
        onSubmit={(output) => {
          onSaveWake(output.wakeHm);
        }}
      >
        <Group align="flex-end" gap="xs" mt="sm">
          <Field of={wakeForm} path={["wakeHm"]}>
            {(field) => (
              <TimeInput
                {...field.props}
                error={field.errors?.[0]}
                label={showBed ? "今日の起床" : "起床"}
                value={field.input}
              />
            )}
          </Field>
          <Button type="submit">起床を保存</Button>
        </Group>
      </Form>
      {sleepHours === null ? null : (
        <TextInput label="睡眠時間" mt="sm" readOnly value={`${sleepHours}時間`} />
      )}
      {sleepWarning ? <p>睡眠が7時間未満です。行の確定はできます。</p> : null}
    </section>
  );
}
