import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
import type { NotificationSettingsDto } from "~domain/validators";

import { NotificationSettingsForm } from "~/features/my-page/components/notification-settings-form";
import { renderWithMantine } from "~/test-utils/render";

const BASE = {
  enabled: true,
  eveningHourJst: 21,
  triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
} satisfies NotificationSettingsDto;

function formProps(settings: NotificationSettingsDto) {
  return {
    onSave: vi.fn(),
    settings,
  };
}

test("通知が無効なときは有効化を促す注意を出す", () => {
  const props = formProps({ ...BASE, enabled: false });
  const { getByText } = renderWithMantine(<NotificationSettingsForm {...props} />);

  expect(getByText("通知はまだ有効になっていません。")).toBeDefined();
});

test("保存するとサーバ由来の設定をそのまま送る", async () => {
  const props = formProps(BASE);
  const { getByRole } = renderWithMantine(<NotificationSettingsForm {...props} />);

  fireEvent.click(getByRole("button", { name: "保存" }));

  await waitFor(() => {
    expect(props.onSave).toHaveBeenCalledTimes(1);
  });
  const [input] = props.onSave.mock.calls[0] ?? [];
  expect(input).toEqual({
    enabled: true,
    eveningHourJst: 21,
    triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
  });
});

//? 押し出しチャネルを撤回したので、入力は「使うか」「何を」「いつ」の3つだけ。
test("入力はトリガー3種と夜の時刻だけで、押し出し先の入力は無い", () => {
  const props = formProps(BASE);
  const { getByRole, queryByLabelText } = renderWithMantine(
    <NotificationSettingsForm {...props} />,
  );

  expect(getByRole("switch", { name: "通知を使う" })).toBeDefined();
  expect(getByRole("switch", { name: /チェックポイントの期限が近いとき/ })).toBeDefined();
  expect(getByRole("switch", { name: /週間ターゲットが未達のとき/ })).toBeDefined();
  expect(getByRole("switch", { name: "夜に未着手が残っているとき" })).toBeDefined();
  expect(getByRole("combobox", { name: "夜の催促の時刻" })).toBeDefined();
  expect(queryByLabelText(/Webhook/)).toBeNull();
});
