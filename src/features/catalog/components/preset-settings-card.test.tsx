import { fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import {
  HOLIDAY_AS_SUNDAY_LABEL,
  PresetSettingsCard,
} from "~/features/catalog/components/preset-settings-card";
import { renderWithMantine } from "~/test-utils/render";

const { mutateAsync, settingsRef } = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue(null),
  settingsRef: { current: { holidayAsSunday: false } },
}));

vi.mock("~/features/catalog/hooks/catalog-queries", () => ({
  usePresetSettings: () => ({ data: settingsRef.current }),
}));

vi.mock("~/features/catalog/hooks/catalog-mutations", () => ({
  useSavePresetSettings: () => ({ mutateAsync }),
}));

vi.mock("~/lib/run-mutation", () => ({
  runMutation: (run: () => Promise<unknown>) => run(),
}));

test("スイッチを入れると祝日を日曜扱いにする設定を保存する", () => {
  settingsRef.current = { holidayAsSunday: false };
  const { getByRole } = renderWithMantine(<PresetSettingsCard />);
  const toggle = getByRole("switch", { name: new RegExp(HOLIDAY_AS_SUNDAY_LABEL) });

  expect((toggle as HTMLInputElement).checked).toBe(false);
  fireEvent.click(toggle);

  expect(mutateAsync).toHaveBeenCalledWith({ holidayAsSunday: true });
});

test("保存済みの設定が有効なら最初からオン", () => {
  settingsRef.current = { holidayAsSunday: true };
  const { getByRole } = renderWithMantine(<PresetSettingsCard />);

  expect(
    (getByRole("switch", { name: new RegExp(HOLIDAY_AS_SUNDAY_LABEL) }) as HTMLInputElement)
      .checked,
  ).toBe(true);
});
