import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";
import { SLACK_REQUIRED_MESSAGE, SLACK_WEBHOOK_MESSAGE } from "~domain/notifications";
import type { NotificationSettingsDto } from "~domain/validators";

import { NotificationSettingsForm } from "~/features/my-page/components/notification-settings-form";
import { renderWithMantine } from "~/test-utils/render";

const BASE = {
  enabled: true,
  eveningHourJst: 21,
  quietFromHourJst: 22,
  quietToHourJst: 7,
  slackConfigured: false,
  slackEnabled: false,
  slackFailureStreak: 0,
  triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
} satisfies NotificationSettingsDto;

function formProps(settings: NotificationSettingsDto) {
  return {
    onDisconnectSlack: vi.fn(),
    onSave: vi.fn(),
    settings,
  };
}

test("Slack 有効かつ URL 未設定では保存できず、必要な旨を出す", () => {
  const props = formProps({ ...BASE, slackEnabled: true });
  const { getByRole, getByText } = renderWithMantine(<NotificationSettingsForm {...props} />);

  expect(getByRole("button", { name: "保存" })).toHaveProperty("disabled", true);
  expect(getByText(SLACK_REQUIRED_MESSAGE)).toBeDefined();
});

test("Slack 以外のホストの URL を入れて保存するとエラー文言が出る", async () => {
  const props = formProps(BASE);
  const { getByLabelText, getByRole, getByText } = renderWithMantine(
    <NotificationSettingsForm {...props} />,
  );

  fireEvent.input(getByLabelText(/Incoming Webhook URL/), {
    target: { value: "https://evil.example.com/services/T000/B000/abc" },
  });
  fireEvent.click(getByRole("button", { name: "保存" }));

  await waitFor(() => {
    expect(getByText(SLACK_WEBHOOK_MESSAGE)).toBeDefined();
  });
  expect(props.onSave).not.toHaveBeenCalled();
});

test("夜の催促の時刻が静穏窓の中にあると警告が出る", () => {
  const props = formProps({
    ...BASE,
    eveningHourJst: 23,
    slackConfigured: true,
    slackEnabled: true,
  });
  const { getByText } = renderWithMantine(<NotificationSettingsForm {...props} />);

  expect(
    getByText(
      "夜の催促の時刻が静穏時間の中にあります。Slack へは送られません（通知欄には残ります）。",
    ),
  ).toBeDefined();
});

test("通知が無効なときは有効化を促す注意を出す", () => {
  const props = formProps({ ...BASE, enabled: false });
  const { getByText } = renderWithMantine(<NotificationSettingsForm {...props} />);

  expect(getByText("通知はまだ有効になっていません。")).toBeDefined();
});

test("連続失敗が上限に達していると連携停止の注意を出す", () => {
  const props = formProps({ ...BASE, slackConfigured: true, slackFailureStreak: 3 });
  const { getByText } = renderWithMantine(<NotificationSettingsForm {...props} />);

  expect(
    getByText(
      "Slack への送信が3回続けて失敗したため、連携を停止しました。URL を確認してください。",
    ),
  ).toBeDefined();
});

test("URL 空欄のまま保存すると slackWebhookUrl を送らない", async () => {
  const props = formProps({ ...BASE, slackConfigured: true, slackEnabled: true });
  const { getByRole } = renderWithMantine(<NotificationSettingsForm {...props} />);

  fireEvent.click(getByRole("button", { name: "保存" }));

  await waitFor(() => {
    expect(props.onSave).toHaveBeenCalledTimes(1);
  });
  const [input] = props.onSave.mock.calls[0] ?? [];
  expect(input).toEqual({
    enabled: true,
    eveningHourJst: 21,
    quietFromHourJst: 22,
    quietToHourJst: 7,
    slackEnabled: true,
    triggers: { checkpointDeadline: true, eveningUntouched: true, weeklyTargetMiss: true },
  });
});

test("設定済みなら Slack 連携の解除ボタンを出す", () => {
  const props = formProps({ ...BASE, slackConfigured: true });
  const { getByRole } = renderWithMantine(<NotificationSettingsForm {...props} />);

  fireEvent.click(getByRole("button", { name: "Slack 連携を解除" }));

  expect(props.onDisconnectSlack).toHaveBeenCalledTimes(1);
});
