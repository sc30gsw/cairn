import { Field, Form, useForm } from "@formisch/react";
import { Alert, Button, Grid, Title, TextInput } from "@mantine/core";
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
      <Grid gap="sm">
        <Grid.Col span={12}>
          <Title order={3}>今夜と睡眠</Title>
        </Grid.Col>
        {showBed ? (
          <Grid.Col span={12}>
            <Form
              of={bedForm}
              onSubmit={(output) => {
                onSaveBed(output.bedHm);
              }}
            >
              <Grid align="flex-end" gap="sm">
                <Grid.Col span="auto">
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
                </Grid.Col>
                <Grid.Col span="content">
                  <Button type="submit">就寝を保存</Button>
                </Grid.Col>
              </Grid>
            </Form>
          </Grid.Col>
        ) : null}
        <Grid.Col span={12}>
          <Form
            of={wakeForm}
            onSubmit={(output) => {
              onSaveWake(output.wakeHm);
            }}
          >
            <Grid align="flex-end" gap="sm">
              <Grid.Col span="auto">
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
              </Grid.Col>
              <Grid.Col span="content">
                <Button type="submit">起床を保存</Button>
              </Grid.Col>
            </Grid>
          </Form>
        </Grid.Col>
        {sleepHours === null ? null : (
          <Grid.Col span={12}>
            <TextInput label="睡眠時間" readOnly value={`${sleepHours}時間`} />
          </Grid.Col>
        )}
        {sleepWarning ? (
          <Grid.Col span={12}>
            <Alert color="yellow" title="睡眠">
              睡眠が7時間未満です。行の確定はできます。
            </Alert>
          </Grid.Col>
        ) : null}
      </Grid>
    </section>
  );
}
